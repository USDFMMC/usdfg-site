import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  setDoc,
  limit,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Test Firestore connection
export async function testFirestoreConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, "challenges"));
    console.log("✅ Firestore connected. Challenges found:", querySnapshot.size);
    return true;
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
    return false;
  }
}

// Collection references
const usersCollection = collection(db, 'users');

// Optimized Challenge Data - Minimal Collection
export interface ChallengeData {
  id?: string;
  creator: string;                    // Creator wallet (or team key for team challenges)
  challenger?: string;                // Challenger wallet (if accepted) or team key
  entryFee: number;                   // Entry fee amount
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'in-progress';
  createdAt: Timestamp;               // Creation time
  expiresAt: Timestamp;               // Expiration time
  winner?: string;                    // Winner wallet (if completed) or team key
  challengeType?: 'solo' | 'team';    // Challenge type - solo or team (defaults to solo for backward compatibility)
  teamOnly?: boolean;                 // For team challenges: true = only teams can accept, false = open to anyone (defaults to false)
  // Result submission fields
  results?: {
    [wallet: string]: {
      didWin: boolean;
      submittedAt: Timestamp;
    }
  };
  resultDeadline?: Timestamp;         // 2 hours after match starts
  // UI fields (minimal for display)
  players?: string[];                 // Array of player wallets
  maxPlayers?: number;                // Maximum players allowed
  // Prize claim fields
  canClaim?: boolean;                 // Whether winner can claim prize
  payoutTriggered?: boolean;          // Whether prize has been claimed
  payoutSignature?: string;            // Transaction signature of prize claim
  payoutTimestamp?: Timestamp;        // When prize was claimed
  pda?: string;                       // Challenge PDA for smart contract
  prizePool?: number;                 // Total prize pool amount
  // UI display fields
  title?: string;                     // Challenge title (contains game info)
  game?: string;                      // Game name for display
  category?: string;                  // Game category for filtering
  platform?: string;                  // Platform (PS5, PC, Xbox, etc.) for display
  // REMOVED: rules, mode, creatorTag, solanaAccountId, cancelRequests
  // These are not needed for leaderboard and increase storage costs unnecessarily
}

// Challenge operations
export const addChallenge = async (challengeData: Omit<ChallengeData, 'id' | 'createdAt'>) => {
  try {
    // Check if creator is eligible for OG First 2.1K trophy (only when creating their first challenge)
    const creatorWallet = challengeData.creator;
    const playerRef = doc(db, 'player_stats', creatorWallet);
    const playerSnap = await getDoc(playerRef);
    
    let shouldAwardOgFirst1k = false;
    
    // Only award if player doesn't exist yet (first challenge creation)
    if (!playerSnap.exists()) {
      // Count total users BEFORE adding this one
      const statsCollection = collection(db, 'player_stats');
      const allUsersSnapshot = await getDocs(statsCollection);
      const totalUsersBefore = allUsersSnapshot.size;
      shouldAwardOgFirst1k = totalUsersBefore < 2100; // Represents USDFG's 21M token supply
      
      if (shouldAwardOgFirst1k) {
        console.log(`🏆 OG First 2.1K Trophy eligible for ${creatorWallet.slice(0, 8)}... (Total users: ${totalUsersBefore})`);
      }
    }
    
    const docRef = await addDoc(collection(db, "challenges"), {
      ...challengeData,
      createdAt: Timestamp.now(),
      players: [challengeData.creator], // Creator is first player
    });
    
    // If eligible, create/update player stats with trophy flag
    if (shouldAwardOgFirst1k) {
      const newStats: any = {
        wallet: creatorWallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        ogFirst1k: true, // Award the trophy!
        gameStats: {},
        categoryStats: {}
      };
      // Note: displayName will be set on first challenge completion (only include if it exists)
      
      await setDoc(playerRef, newStats);
      console.log(`🏆 OG First 2.1K Trophy awarded to ${creatorWallet.slice(0, 8)}... for creating their first challenge!`);
    }
    
    console.log('✅ Challenge created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating challenge:', error);
    throw error;
  }
};

export const updateChallenge = async (challengeId: string, updates: Partial<ChallengeData>) => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    await updateDoc(challengeRef, updates);
    console.log('✅ Challenge updated:', challengeId);
  } catch (error) {
    console.error('❌ Error updating challenge:', error);
    throw error;
  }
};

export const updateChallengeStatus = async (challengeId: string, status: 'active' | 'pending' | 'completed' | 'cancelled' | 'disputed' | 'expired') => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    // Get current status to check if dispute is being resolved
    const currentSnap = await getDoc(challengeRef);
    const wasDisputed = currentSnap.exists() && currentSnap.data()?.status === 'disputed';
    const isResolvingDispute = wasDisputed && (status === 'completed' || status === 'cancelled');
    
    await updateDoc(challengeRef, { 
      status,
      updatedAt: Timestamp.now()
    });
    console.log('✅ Challenge status updated:', challengeId, 'to', status);
    
    // If resolving a dispute, clean up chat messages (no longer needed for evidence)
    if (isResolvingDispute) {
      console.log('🔧 Dispute resolved - cleaning up chat messages for:', challengeId);
      try {
        await cleanupChatMessages(challengeId);
        console.log('✅ Chat messages cleaned up after dispute resolution');
      } catch (error) {
        console.error('⚠️ Failed to cleanup chat after dispute resolution (non-critical):', error);
        // Don't throw - status update succeeded, cleanup is secondary
      }
    }
  } catch (error) {
    console.error('❌ Error updating challenge status:', error);
    throw error;
  }
};

export const deleteChallenge = async (challengeId: string) => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    await deleteDoc(challengeRef);
    console.log('✅ Challenge deleted:', challengeId);
  } catch (error) {
    console.error('❌ Error deleting challenge:', error);
    throw error;
  }
};

// Real-time listeners
export const listenToChallenges = (callback: (challenges: ChallengeData[]) => void) => {
  const q = query(collection(db, "challenges"), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('🔄 Real-time update: Received', challenges.length, 'challenges');
    callback(challenges);
  }, (error) => {
    console.error('❌ Firestore listener error:', error);
  });
};

export const listenToUserChallenges = (userId: string, callback: (challenges: ChallengeData[]) => void) => {
  const q = query(
    collection(db, "challenges"), 
    where('creator', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('🔄 User challenges update:', challenges.length, 'challenges');
    callback(challenges);
  }, (error) => {
    console.error('❌ User challenges listener error:', error);
  });
};

// One-time fetch operations
export const fetchChallenges = async (): Promise<ChallengeData[]> => {
  try {
    const q = query(collection(db, "challenges"), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('📦 Fetched', challenges.length, 'challenges');
    return challenges;
  } catch (error) {
    console.error('❌ Error fetching challenges:', error);
    return [];
  }
};

export const fetchChallengeById = async (challengeId: string): Promise<ChallengeData | null> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snapshot = await getDocs(query(collection(db, "challenges"), where('__name__', '==', challengeId)));
    
    if (snapshot.empty) {
      console.log('❌ Challenge not found:', challengeId);
      return null;
    }
    
    const challenge = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as ChallengeData;
    
    return challenge;
  } catch (error) {
    console.error('❌ Error fetching challenge:', error);
    return null;
  }
};

// Join challenge with proper Firestore operations
export const joinChallenge = async (challengeId: string, wallet: string, isFounderChallenge: boolean = false, isTeam?: boolean) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
    // Check if this is a team challenge with teamOnly restriction
    if (data.challengeType === 'team' && data.teamOnly === true) {
      // Only teams can accept - check if challenger is part of a team
      const challengerTeam = await getTeamByMember(wallet);
      if (!challengerTeam) {
        throw new Error("This challenge is only open to teams. You must be part of a team to accept.");
      }
      // Use team key for team challenges - only team key holder can accept
      const teamKey = challengerTeam.teamKey;
      if (teamKey !== wallet) {
        throw new Error("Only the team key holder can accept team challenges. You are a team member, not the key holder.");
      }
      // Use team key as challenger
      wallet = teamKey;
      isTeam = true;
    } else if (data.challengeType === 'team' && data.teamOnly === false) {
      // Team challenge open to anyone - if challenger is a team, use team key
      const challengerTeam = await getTeamByMember(wallet);
      if (challengerTeam) {
        // Challenger is part of a team - only team key holder can accept
        if (challengerTeam.teamKey !== wallet) {
          throw new Error("Only the team key holder can accept challenges. You are a team member, not the key holder.");
        }
        // Use team key as challenger
        wallet = challengerTeam.teamKey;
        isTeam = true;
      }
      // If challenger is not part of a team, they can accept as solo player (isTeam remains false)
    } else if (data.challengeType === 'team') {
      // Team challenge without teamOnly specified (backward compatibility) - treat as open to all
      const challengerTeam = await getTeamByMember(wallet);
      if (challengerTeam) {
        // Challenger is part of a team - only team key holder can accept
        if (challengerTeam.teamKey !== wallet) {
          throw new Error("Only the team key holder can accept challenges. You are a team member, not the key holder.");
        }
        // Use team key as challenger
        wallet = challengerTeam.teamKey;
        isTeam = true;
      }
      // If challenger is not part of a team, they can accept as solo player (isTeam remains false)
    }
    
    if (data.players && data.players.length >= data.maxPlayers) {
      throw new Error("Challenge already full");
    }

    // Check if player/team is already in the challenge
    if (data.players && data.players.includes(wallet)) {
      throw new Error("You are already in this challenge");
    }

    const newPlayers = data.players ? [...data.players, wallet] : [wallet];
    const isFull = newPlayers.length >= data.maxPlayers;

    // If challenge is now full, start result submission phase (2-hour timer)
    const updates: any = {
      players: newPlayers,
      status: isFull ? "in-progress" : "active",
      joinedBy: arrayUnion(wallet),
      updatedAt: serverTimestamp(),
    };

    if (isFull) {
      // Set deadline to 2 hours from now for result submission
      updates.resultDeadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
      console.log('⏰ Challenge is full! Result submission phase started (2-hour deadline)');
    }

    await updateDoc(challengeRef, updates);

    // If this is a Founder Challenge, mark player as having participated
    if (isFounderChallenge) {
      const playerRef = doc(db, 'player_stats', wallet);
      const playerSnap = await getDoc(playerRef);
      
      if (playerSnap.exists()) {
        // Update existing stats to mark Founder Challenge participation
        await updateDoc(playerRef, {
          founderChallenge: true,
          lastActive: serverTimestamp(),
        });
      } else {
        // Create new player stats with Founder Challenge flag
        await setDoc(playerRef, {
          wallet,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          lastActive: serverTimestamp(),
          trustScore: 0,
          trustReviews: 0,
          founderChallenge: true, // Mark Founder Challenge participation
          gameStats: {},
          categoryStats: {},
        });
      }
    }

    // Note: For Founder Challenges, USDFG transfer tracking happens separately
    // when the actual token transfer occurs (via recordFounderChallengeReward)
    // We don't track calculated amounts here - only actual transfers

    console.log('✅ Player joined challenge:', challengeId, isFounderChallenge ? '(Founder Challenge - USDFG will be tracked when transferred)' : '');
    return true;
  } catch (error) {
    console.error('❌ Error joining challenge:', error);
    throw error;
  }
};

/**
 * Record actual USDFG transfer given to player from Founder Challenge
 * This should be called when the actual token transfer happens (from admin/backend)
 * 
 * @param wallet - Player wallet address
 * @param challengeId - Challenge ID
 * @param amount - Actual USDFG amount transferred (from on-chain transaction)
 * @param txSignature - Solana transaction signature (optional, for verification)
 */
export async function recordFounderChallengeReward(
  wallet: string,
  challengeId: string,
  amount: number,
  txSignature?: string
): Promise<void> {
  try {
    // Record in founder_rewards collection (tracks actual USDFG given)
    await addDoc(collection(db, 'founder_rewards'), {
      wallet,
      challengeId,
      amount, // Actual USDFG transferred
      txSignature: txSignature || null, // Optional: Solana transaction signature
      timestamp: Timestamp.now(),
    });
    
    // Update cached total stats (increment by amount)
    const statsRef = doc(db, 'stats', 'total_rewarded');
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const currentData = statsSnap.data();
      await updateDoc(statsRef, {
        total: (currentData.total || 0) + amount,
        lastUpdated: Timestamp.now(),
      });
    } else {
      // Create stats document if it doesn't exist
      await setDoc(statsRef, {
        total: amount,
        lastUpdated: Timestamp.now(),
      });
    }

    // Update player stats (totalEarned) with actual amount
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      const currentStats = playerSnap.data() as PlayerStats;
      await updateDoc(playerRef, {
        totalEarned: (currentStats.totalEarned || 0) + amount,
        lastActive: Timestamp.now(),
      });
    } else {
      // Create new player stats
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: amount,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {},
      });
    }

    // Update challenge to mark prize as transferred and set actual prize pool
    const challengeRef = doc(db, 'challenges', challengeId);
    await updateDoc(challengeRef, {
      payoutTriggered: true,
      prizePool: amount, // Update with actual amount transferred
      payoutTimestamp: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ Recorded Founder Challenge reward: ${wallet.slice(0,8)}... received ${amount} USDFG from challenge ${challengeId}${txSignature ? ` (tx: ${txSignature.slice(0,8)}...)` : ''}`);
  } catch (error) {
    console.error('❌ Error recording Founder Challenge reward:', error);
    throw error; // Throw so caller knows if tracking failed
  }
}

// Real-time active challenge functions
export function listenActiveForCreator(creator: string, cb: (active: any[]) => void) {
  const q = query(collection(db, "challenges"), where("creator", "==", creator), where("status", "in", ["active", "pending"]));
  return onSnapshot(q, (snap) => {
    const active = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('🔒 Active challenges for creator:', active.length);
    cb(active);
  });
}

export async function addChallengeDoc(data: any) {
  const docRef = await addDoc(collection(db, "challenges"), {
    ...data,
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('✅ Challenge document created with ID:', docRef.id);
  return docRef.id;
}

// Auto-cleanup for completed challenges (delete after 24 hours)
export async function cleanupCompletedChallenge(id: string) {
  try {
    // First, clean up all chat messages for this challenge
    console.log('🗑️ Cleaning up chat messages for challenge:', id);
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', id)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    // Delete all chat messages
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for challenge:`, id);
    
    // Then delete the challenge document
    const challengeRef = doc(db, "challenges", id);
    await deleteDoc(challengeRef);
    console.log('🗑️ Completed challenge cleaned up:', id);
  } catch (error) {
    console.error('❌ Failed to cleanup completed challenge:', error);
  }
}

// Auto-cleanup for expired challenges (delete immediately)
export async function cleanupExpiredChallenge(id: string) {
  try {
    // First, clean up all chat messages for this challenge
    console.log('🗑️ Cleaning up chat messages for expired challenge:', id);
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', id)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    // Delete all chat messages
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for expired challenge:`, id);
    
    // Then delete the challenge document
    const challengeRef = doc(db, "challenges", id);
    await deleteDoc(challengeRef);
    console.log('🗑️ Expired challenge cleaned up:', id);
  } catch (error) {
    console.error('❌ Failed to cleanup expired challenge:', error);
  }
}

// Legacy function - now redirects to cleanup
export async function archiveChallenge(id: string) {
  console.log('⚠️ archiveChallenge is deprecated, using cleanup instead');
  await cleanupCompletedChallenge(id);
}

// ============================================
// RESULT SUBMISSION SYSTEM
// ============================================

/**
 * Submit a player's result for a challenge
 * @param challengeId - The challenge ID
 * @param wallet - The player's wallet address
 * @param didWin - Whether the player won (true) or lost (false)
 */
export const submitChallengeResult = async (
  challengeId: string,
  wallet: string,
  didWin: boolean
): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
    // Verify player is part of this challenge
    if (!data.players || !data.players.includes(wallet)) {
      throw new Error("You are not part of this challenge");
    }

    // Check if player already submitted
    if (data.results && data.results[wallet]) {
      throw new Error("You have already submitted your result");
    }

    // Add result
    const results = data.results || {};
    results[wallet] = {
      didWin,
      submittedAt: Timestamp.now(),
    };

    await updateDoc(challengeRef, {
      results,
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Result submitted:', { challengeId, wallet, didWin });

    // NEW: If player submitted "I lost", automatically mark opponent as winner
    if (!didWin && data.players && data.players.length === 2) {
      const opponentWallet = data.players.find((p: string) => p !== wallet);
      
      if (opponentWallet && !results[opponentWallet]) {
        // Opponent hasn't submitted yet - automatically mark them as winner
        console.log(`🎯 Player ${wallet.slice(0, 8)}... submitted loss - automatically marking ${opponentWallet.slice(0, 8)}... as winner`);
        
        // Add automatic win result for opponent
        results[opponentWallet] = {
          didWin: true,
          submittedAt: Timestamp.now(),
          autoDetermined: true // Flag to indicate this was auto-determined
        };
        
        await updateDoc(challengeRef, {
          results,
          updatedAt: Timestamp.now(),
        });
        
        console.log('✅ Auto-marked opponent as winner');
        
        // Now both players have "submitted" (one manually, one auto), determine winner
        const updatedSnap = await getDoc(challengeRef);
        const updatedData = updatedSnap.data() as ChallengeData;
        await determineWinner(challengeId, updatedData);
        return; // Exit early since we've already determined winner
      }
    }

    // Check if both players have submitted
    if (Object.keys(results).length === data.maxPlayers) {
      console.log('🎯 Both players submitted! Determining winner...');
      // Re-fetch the updated data to pass to determineWinner
      const updatedSnap = await getDoc(challengeRef);
      const updatedData = updatedSnap.data() as ChallengeData;
      await determineWinner(challengeId, updatedData);
    }
  } catch (error) {
    console.error('❌ Error submitting result:', error);
    throw error;
  }
};

/**
 * Clean up chat messages for a challenge
 * Exported so it can be called when admin resolves disputes
 */
export async function cleanupChatMessages(challengeId: string): Promise<void> {
  try {
    console.log('🗑️ Cleaning up chat messages for resolved challenge:', challengeId);
    
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', challengeId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages after dispute resolution:`, challengeId);
  } catch (error) {
    console.error('❌ Error cleaning up chat messages:', error);
    throw error;
  }
}

/**
 * Clean up chat messages and voice signals for a challenge
 * Only deletes for normal completions - keeps chat for disputes (needed for evidence)
 * This balances data minimization with dispute resolution needs
 * 
 * Legal compliance: Chat kept temporarily for dispute resolution (legitimate business purpose),
 * then deleted after resolution to minimize data retention
 */
async function cleanupChallengeData(challengeId: string, isDispute: boolean = false): Promise<void> {
  try {
    console.log('🗑️ Cleaning up challenge data for:', challengeId, isDispute ? '(DISPUTE - keeping chat)' : '(Normal completion - deleting chat)');
    
    // Always delete voice signals (not needed after challenge ends)
    try {
      const voiceSignalRef = doc(db, 'voice_signals', challengeId);
      await deleteDoc(voiceSignalRef);
      console.log('🗑️ Deleted voice signals for challenge:', challengeId);
    } catch (error: any) {
      // Voice signal may not exist, ignore error
      if (error.code !== 'not-found') {
        console.log('⚠️ Could not delete voice signals (may not exist):', error);
      }
    }
    
    // Only delete chat messages if NOT a dispute (need chat for dispute resolution)
    if (!isDispute) {
      const chatQuery = query(
        collection(db, 'challenge_chats'),
        where('challengeId', '==', challengeId)
      );
      const chatSnapshot = await getDocs(chatQuery);
      
      const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
      );
      await Promise.all(chatDeletePromises);
      console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for challenge:`, challengeId);
    } else {
      console.log('📋 Keeping chat messages for dispute resolution:', challengeId);
      console.log('   Note: Chat will be auto-deleted after dispute is resolved by admin');
    }
    
    console.log('✅ Challenge data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up challenge data:', error);
    // Don't throw - cleanup failure shouldn't block winner determination
  }
}

/**
 * Determine winner based on submitted results
 * Logic:
 * - One YES, One NO → YES player wins (clear winner)
 * - Both YES → Dispute (both claim victory, requires review)
 * - Both NO → Both forfeit (suspicious collusion, both lose entry fees as penalty)
 */
async function determineWinner(challengeId: string, data: ChallengeData): Promise<void> {
  try {
    const results = data.results || {};
    const players = Object.keys(results);
    
    console.log('🎯 Determining winner for challenge:', challengeId);
    console.log('📊 Results:', results);
    console.log('👥 Players who submitted:', players);
    
    if (players.length !== 2) {
      console.log('⏳ Waiting for both players to submit results');
      return;
    }

    const player1 = players[0];
    const player2 = players[1];
    const player1Won = results[player1].didWin;
    const player2Won = results[player2].didWin;
    
    console.log(`Player 1 (${player1.slice(0,8)}...): didWin=${player1Won}`);
    console.log(`Player 2 (${player2.slice(0,8)}...): didWin=${player2Won}`);

    const challengeRef = doc(db, "challenges", challengeId);

    // Case 1: Both claim they won → Dispute (KEEP CHAT for evidence)
    if (player1Won && player2Won) {
      await updateDoc(challengeRef, {
        status: 'disputed',
        winner: null,
        updatedAt: Timestamp.now(),
      });
      console.log('🔴 DISPUTE: Both players claim they won');
      // Keep chat messages for dispute resolution - admin may need them
      await cleanupChallengeData(challengeId, true); // true = isDispute
      return;
    }

    // Case 2: Both claim they lost → FORFEIT (delete chat - no dispute)
    if (!player1Won && !player2Won) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'forfeit', // Special value: both players forfeit, no refund
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ FORFEIT: Both players claim they lost - Suspicious collusion detected, both lose entry fees');
      // Delete chat - no dispute, no need to keep
      await cleanupChallengeData(challengeId, false); // false = not dispute
      return;
    }

    // Case 3: Clear winner (one YES, one NO) - DELETE CHAT (no dispute)
    const winner = player1Won ? player1 : player2;
    const loser = player1Won ? player2 : player1;
    
    await updateDoc(challengeRef, {
      status: 'completed',
      winner,
      updatedAt: Timestamp.now(),
    });
    console.log('🏆 WINNER DETERMINED:', winner);
    // Delete chat messages - clear winner, no dispute resolution needed
    await cleanupChallengeData(challengeId, false); // false = not dispute
    console.log('📊 Updating stats...');
    
    // Check if this is a team challenge
    const isTeamChallenge = data.challengeType === 'team';
    
    // Calculate prize pool if not stored (for backward compatibility with old challenges)
    let prizePool = data.prizePool;
    if (!prizePool || prizePool === 0) {
      // Calculate from entry fee: 2x entry fee minus 5% platform fee
      const entryFee = data.entryFee || 0;
      const totalPrize = entryFee * 2;
      const platformFee = totalPrize * 0.05; // 5% platform fee
      prizePool = totalPrize - platformFee;
      console.log(`⚠️ Prize pool not found in challenge data, calculated from entry fee: ${entryFee} USDFG → ${prizePool} USDFG`);
    }
    
    console.log('   Game:', data.game, 'Category:', data.category, 'Prize:', prizePool, 'Type:', isTeamChallenge ? 'Team' : 'Solo');
    
    // Update stats (player or team)
    if (isTeamChallenge) {
      // Update team stats for team challenges
      console.log('   Updating winner team stats:', winner);
      await updateTeamStats(winner, 'win', prizePool, data.game || 'Unknown', data.category || 'Sports');
      console.log('   Updating loser team stats:', loser);
      await updateTeamStats(loser, 'loss', 0, data.game || 'Unknown', data.category || 'Sports');
    } else {
      // Update player stats for solo challenges
      // Get display names from challenge data and sanitize
      const rawWinnerName = winner === data.creator ? data.creatorTag : undefined;
      const rawLoserName = loser === data.creator ? data.creatorTag : undefined;
      
      const winnerDisplayName = sanitizeDisplayName(rawWinnerName);
      const loserDisplayName = sanitizeDisplayName(rawLoserName);
      
      console.log('   Updating winner stats:', winner, 'as', winnerDisplayName || 'Anonymous');
      await updatePlayerStats(winner, 'win', prizePool, data.game || 'Unknown', data.category || 'Sports', winnerDisplayName);
      console.log('   Updating loser stats:', loser, 'as', loserDisplayName || 'Anonymous');
      await updatePlayerStats(loser, 'loss', 0, data.game || 'Unknown', data.category || 'Sports', loserDisplayName);
    }
    
    // Mark challenge as ready for winner to claim (Player pays gas, not admin!)
    await updateDoc(challengeRef, {
      status: 'completed', // Keep status as completed!
      needsPayout: true,
      payoutTriggered: false,
      canClaim: true,
      updatedAt: Timestamp.now(),
    });
    
    console.log('💰 Prize pool ready for claim:', prizePool, 'USDFG to', winner);
    console.log('✅ Winner can now claim their prize (they pay gas, not you!)');
    
  } catch (error) {
    console.error('❌ Error determining winner:', error);
    throw error;
  }
}

/**
 * Sync Firestore challenge status with on-chain status
 * This helps prevent showing "Join Challenge" for already joined challenges
 */
export const syncChallengeStatus = async (challengeId: string, challengePDA: string): Promise<void> => {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const connection = new Connection('https://api.devnet.solana.com');
    
    const accountInfo = await connection.getAccountInfo(new PublicKey(challengePDA));
    if (!accountInfo || !accountInfo.data) {
      console.log('Challenge not found on-chain:', challengePDA);
      return;
    }
    
    // Parse the challenge data to get on-chain status
    const data = accountInfo.data;
    const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator (8), creator (32), challenger Option (33), entry_fee (8), then status
    
    let firestoreStatus: string;
    switch (statusByte) {
      case 0: // Open
        firestoreStatus = 'active';
        break;
      case 1: // InProgress
        firestoreStatus = 'in-progress';
        break;
      case 2: // Completed
        firestoreStatus = 'completed';
        break;
      case 3: // Cancelled
        firestoreStatus = 'cancelled';
        break;
      case 4: // Disputed
        firestoreStatus = 'disputed';
        break;
      default:
        console.log('Unknown on-chain status:', statusByte);
        return;
    }
    
    // Update Firestore if status differs
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (snap.exists()) {
      const currentData = snap.data();
      
      // Don't overwrite 'completed' status with 'in-progress' from on-chain
      // This happens because Firestore marks as completed when both submit, but on-chain is still InProgress
      if (currentData.status === 'completed' && firestoreStatus === 'in-progress') {
        console.log(`⏭️  Skipping sync: Firestore is 'completed', on-chain is 'in-progress' (waiting for claim)`);
        return;
      }
      
      if (currentData.status !== firestoreStatus) {
        await updateDoc(challengeRef, {
          status: firestoreStatus,
          updatedAt: Timestamp.now(),
        });
        console.log(`🔄 Synced challenge status: ${currentData.status} → ${firestoreStatus}`);
      }
    }
  } catch (error) {
    console.error('❌ Error syncing challenge status:', error);
  }
};

/**
 * Start result submission phase when challenge goes in-progress
 * Sets a 2-hour deadline for result submission
 */
export const startResultSubmissionPhase = async (challengeId: string): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    
    // Set deadline to 2 hours from now
    const deadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
    
    await updateDoc(challengeRef, {
      resultDeadline: deadline,
      status: 'in-progress',
      updatedAt: Timestamp.now(),
    });
    
    console.log('⏰ Result submission phase started. Deadline:', deadline.toDate());
  } catch (error) {
    console.error('❌ Error starting result submission phase:', error);
    throw error;
  }
};

/**
 * Check if result submission deadline has passed
 * If only one player submitted, they win by default
 * If no one submitted, challenge goes to dispute
 */
export const checkResultDeadline = async (challengeId: string): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) return;
    
    const data = snap.data() as ChallengeData;
    
    if (!data.resultDeadline || data.status !== 'in-progress') return;
    
    const now = Timestamp.now();
    const deadlinePassed = now.toMillis() > data.resultDeadline.toMillis();
    
    if (!deadlinePassed) return;
    
    const results = data.results || {};
    const submittedCount = Object.keys(results).length;
    
    // Case 1: No one submitted → FORFEIT (no refund to prevent exploitation)
    if (submittedCount === 0) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'forfeit', // Special value indicating both players forfeited
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ DEADLINE PASSED: No results submitted - FORFEIT (no refund)');
      return;
    }
    
    // Case 2: Only one player submitted → Determine winner based on their claim
    if (submittedCount === 1) {
      const submittedWallet = Object.keys(results)[0];
      const didTheyClaimWin = results[submittedWallet].didWin;
      
      if (didTheyClaimWin) {
        // They claimed they won → They win by default
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: submittedWallet,
          updatedAt: Timestamp.now(),
        });
        console.log('🏆 DEADLINE PASSED: Winner by default (opponent no-show):', submittedWallet);
      } else {
        // They claimed they lost → The OTHER player wins by default
        const opponentWallet = data.players.find((p: string) => p !== submittedWallet);
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: opponentWallet || 'tie',
          updatedAt: Timestamp.now(),
        });
        console.log('🏆 DEADLINE PASSED: Opponent wins (player admitted defeat, opponent no-show):', opponentWallet);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking result deadline:', error);
    throw error;
  }
};

/**
 * Request to cancel an in-progress challenge
 * Requires mutual agreement from both players
 */
export const requestCancelChallenge = async (
  challengeId: string,
  walletAddress: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeSnap = await getDoc(challengeRef);
    
    if (!challengeSnap.exists()) {
      throw new Error('Challenge not found');
    }
    
    const challenge = challengeSnap.data() as ChallengeData;
    
    // Check if user is a participant
    if (!challenge.players.includes(walletAddress)) {
      throw new Error('Only participants can request cancellation');
    }
    
    // Get current cancel requests
    const cancelRequests = challenge.cancelRequests || [];
    
    // If user already requested, check if we need to resend notification
    if (cancelRequests.includes(walletAddress)) {
      console.log('⚠️ User already requested cancellation - checking chat for notification');
      
      // Check if system message was already sent
      console.log('🔍 Checking for existing system messages...');
      const chatQuery = query(
        collection(db, 'challenge_chats'),
        where('challengeId', '==', challengeId),
        where('sender', '==', 'SYSTEM')
      );
      const chatSnap = await getDocs(chatQuery);
      console.log('📊 System messages in DB:', chatSnap.size);
      chatSnap.docs.forEach(doc => {
        console.log('  -', doc.data().text);
      });
      
      const hasSystemMessage = chatSnap.docs.some(doc => 
        doc.data().text?.includes('requested to cancel')
      );
      
      if (!hasSystemMessage) {
        // Send system message if it wasn't sent before
        console.log('📨 Resending system message to chat (was missing)');
        const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
        const chatDoc = await addDoc(collection(db, 'challenge_chats'), {
          challengeId,
          text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
          sender: 'SYSTEM',
          timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for immediate visibility
        });
        console.log('✅ System message sent to chat:', chatDoc.id);
      } else {
        console.log('✅ System message already exists in chat (found "requested to cancel")');
      }
      
      return;
    }
    
    // Add this user's cancel request
    const newCancelRequests = [...cancelRequests, walletAddress];
    
    // If both players agreed (all players requested cancel)
    if (newCancelRequests.length === challenge.players.length) {
      console.log('✅ Both players agreed to cancel - Cancelling challenge and refunding');
      await updateDoc(challengeRef, {
        status: 'cancelled',
        cancelRequests: newCancelRequests,
        winner: 'cancelled',
        updatedAt: Timestamp.now(),
      });
      
      // Send system message to chat
      await addDoc(collection(db, 'challenge_chats'), {
        challengeId,
        text: '🤝 Both players agreed to cancel. Challenge cancelled, entry fees will be returned.',
        sender: 'SYSTEM',
        timestamp: Timestamp.now(),
      });
    } else {
      // Just one player requested so far
      console.log('⏳ Cancel requested, waiting for other player to agree');
      await updateDoc(challengeRef, {
        cancelRequests: newCancelRequests,
        updatedAt: Timestamp.now(),
      });
      
      // Send system message to chat notifying opponent
      const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
      console.log('📨 Sending system message to chat:', challengeId);
      const chatDoc = await addDoc(collection(db, 'challenge_chats'), {
        challengeId,
        text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
        sender: 'SYSTEM',
        timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for immediate visibility
      });
      console.log('✅ System message sent to chat:', chatDoc.id);
    }
  } catch (error) {
    console.error('❌ Error requesting cancel:', error);
    throw error;
  }
};

// ============================================
// PLAYER STATS TRACKING
// ============================================

// Basic profanity filter (simple word list - can be expanded)
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 
  'dick', 'cock', 'pussy', 'nigger', 'nigga', 'fag', 'faggot',
  'retard', 'retarded', 'nazi', 'hitler'
];

function sanitizeDisplayName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  
  const lowerName = name.toLowerCase();
  
  // Check if name contains blocked words
  for (const word of BLOCKED_WORDS) {
    if (lowerName.includes(word)) {
      console.log('⚠️ Blocked inappropriate username:', name);
      return undefined; // Return undefined to use wallet address instead
    }
  }
  
  // Trim whitespace and limit length
  const sanitized = name.trim().slice(0, 20);
  
  return sanitized || undefined;
}

export interface PlayerStats {
  wallet: string;
  displayName?: string; // Player's chosen username (from creatorTag)
  country?: string; // Player's country code (e.g., "US", "GB", "CA")
  wins: number;
  losses: number;
  winRate: number;
  totalEarned: number;
  gamesPlayed: number;
  lastActive: Timestamp;
  // Trust score fields
  trustScore?: number; // Average trust score (0-10)
  trustReviews?: number; // Number of trust reviews received
  // Special trophies
  ogFirst1k?: boolean; // OG First 2.1K Members trophy - automatically awarded if joined before 2100 users (represents 21M token supply)
  founderChallenge?: boolean; // Founder Challenge trophy - awarded when player participates in a Founder Challenge
  gameStats: {
    [game: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
  categoryStats: {
    [category: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
}

// Team Stats Interface - Elite Esports Teams
export interface TeamStats {
  teamId: string; // Unique team ID (wallet address of team key holder)
  teamName: string; // Team name
  teamKey: string; // Main wallet that controls the team (team owner)
  members: string[]; // Array of member wallet addresses (up to 69)
  wins: number;
  losses: number;
  winRate: number;
  totalEarned: number;
  gamesPlayed: number;
  lastActive: Timestamp;
  createdAt: Timestamp;
  // Team trust score (average of all members)
  trustScore?: number;
  trustReviews?: number;
  // Team game stats
  gameStats: {
    [game: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
  categoryStats: {
    [category: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
}

/**
 * Calculate trust score for a player from Firestore
 */
async function calculateTrustScore(wallet: string): Promise<{ trustScore: number; trustReviews: number }> {
  try {
    const walletLower = wallet.toLowerCase();
    const reviewsRef = collection(db, 'trust_reviews');
    const q = query(
      reviewsRef,
      where('opponent', '==', walletLower)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`   📊 No trust reviews found for ${wallet.slice(0, 8)}... (searched for: ${walletLower})`);
      return { trustScore: 0, trustReviews: 0 };
    }
    
    let totalScore = 0;
    let reviewCount = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const score = data.review?.trustScore10 || 0;
      totalScore += score;
      reviewCount++;
      console.log(`   📊 Found review ${reviewCount}: score ${score}/10 from ${data.reviewer?.slice(0, 8)}...`);
    });
    
    const averageScore = totalScore / reviewCount;
    const trustScore = Math.round(averageScore * 10) / 10; // Round to 1 decimal
    
    console.log(`   ✅ Calculated trust score for ${wallet.slice(0, 8)}...: ${trustScore}/10 from ${reviewCount} reviews`);
    
    return {
      trustScore,
      trustReviews: reviewCount
    };
  } catch (error: any) {
    // If it's a permission error, log it but don't fail - just return 0
    if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
      console.warn(`   ⚠️ Permission denied when calculating trust score for ${wallet.slice(0, 8)}... - Firestore rules may need to be updated`);
      console.warn(`   ⚠️ This is non-fatal - player stats will be updated without trust score`);
    } else {
      console.error(`❌ Error calculating trust score for ${wallet.slice(0, 8)}...:`, error);
    }
    return { trustScore: 0, trustReviews: 0 };
  }
}

/**
 * Calculate trust score from Firestore (synchronous fallback for backward compatibility)
 */
function calculateTrustScoreSync(wallet: string): { trustScore: number; trustReviews: number } {
  try {
    // Try localStorage as fallback (for backward compatibility)
    const trustReviews = JSON.parse(localStorage.getItem('trustReviews') || '[]');
    
    // Filter reviews for this specific player
    const playerReviews = trustReviews.filter((review: any) => 
      review.opponent && review.opponent.toLowerCase() === wallet.toLowerCase()
    );
    
    if (playerReviews.length === 0) {
      return { trustScore: 0, trustReviews: 0 };
    }
    
    // Calculate average trust score
    const totalScore = playerReviews.reduce((sum: number, review: any) => {
      return sum + (review.review?.trustScore10 || 0);
    }, 0);
    
    const averageScore = totalScore / playerReviews.length;
    
    return {
      trustScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      trustReviews: playerReviews.length
    };
  } catch (error) {
    console.error('❌ Error calculating trust score:', error);
    return { trustScore: 0, trustReviews: 0 };
  }
}

/**
 * Update player stats after a challenge completes
 */
async function updatePlayerStats(
  wallet: string,
  result: 'win' | 'loss',
  amountEarned: number,
  game: string,
  category: string,
  displayName?: string
): Promise<void> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);

    // Calculate trust score for this player from Firestore
    // If calculation fails due to permissions, use 0 as fallback
    let trustScore = 0;
    let trustReviews = 0;
    try {
      const result = await calculateTrustScore(wallet);
      trustScore = result.trustScore;
      trustReviews = result.trustReviews;
    } catch (error) {
      // If trust score calculation fails, continue with 0
      // This prevents the entire stats update from failing
      console.warn(`   ⚠️ Trust score calculation failed for ${wallet.slice(0, 8)}..., using 0 as fallback`);
    }

    if (!playerSnap.exists()) {
      // Create new player stats
      // Note: OG First 1k trophy is awarded when creating first challenge, not here
      const newStats: any = {
        wallet,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        winRate: result === 'win' ? 100 : 0,
        totalEarned: amountEarned,
        gamesPlayed: 1,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        ogFirst1k: false, // Trophy is awarded at challenge creation, not completion
        gameStats: {
          [game]: {
            wins: result === 'win' ? 1 : 0,
            losses: result === 'loss' ? 1 : 0,
            earned: amountEarned
          }
        },
        categoryStats: {
          [category]: {
            wins: result === 'win' ? 1 : 0,
            losses: result === 'loss' ? 1 : 0,
            earned: amountEarned
          }
        }
      };
      
      // Only include displayName if it exists (Firestore doesn't allow undefined)
      if (displayName) {
        newStats.displayName = displayName;
      }
      
      await setDoc(playerRef, newStats);
      console.log(`✅ Created new player stats: ${wallet} - ${result} (+${amountEarned} USDFG) - Trust: ${trustScore}/10 (${trustReviews} reviews) - ${displayName || 'Anonymous'}`);
    } else {
      // Update existing player stats
      const currentStats = playerSnap.data() as PlayerStats;
      const newWins = currentStats.wins + (result === 'win' ? 1 : 0);
      const newLosses = currentStats.losses + (result === 'loss' ? 1 : 0);
      const newGamesPlayed = currentStats.gamesPlayed + 1;
      const newWinRate = (newWins / newGamesPlayed) * 100;

      // Update game-specific stats
      const gameStats = currentStats.gameStats || {};
      if (!gameStats[game]) {
        gameStats[game] = { wins: 0, losses: 0, earned: 0 };
      }
      gameStats[game].wins += result === 'win' ? 1 : 0;
      gameStats[game].losses += result === 'loss' ? 1 : 0;
      gameStats[game].earned += amountEarned;

      // Update category-specific stats
      const categoryStats = currentStats.categoryStats || {};
      if (!categoryStats[category]) {
        categoryStats[category] = { wins: 0, losses: 0, earned: 0 };
      }
      categoryStats[category].wins += result === 'win' ? 1 : 0;
      categoryStats[category].losses += result === 'loss' ? 1 : 0;
      categoryStats[category].earned += amountEarned;

      const updateData: any = {
        wins: newWins,
        losses: newLosses,
        winRate: Math.round(newWinRate * 10) / 10, // Round to 1 decimal
        totalEarned: currentStats.totalEarned + amountEarned,
        gamesPlayed: newGamesPlayed,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        gameStats,
        categoryStats
      };
      
      // 🔒 LOCKED: Username can only be set once on first challenge
      // If player doesn't have a displayName yet, set it now (first time only)
      if (displayName && !currentStats.displayName) {
        updateData.displayName = displayName;
        console.log(`🔒 Username locked for ${wallet}: "${displayName}"`);
      }
      
      await updateDoc(playerRef, updateData);

      console.log(`✅ Updated player stats: ${wallet} - ${result} (+${amountEarned} USDFG) - Trust: ${trustScore}/10 (${trustReviews} reviews)`);
    }
  } catch (error) {
    console.error('❌ Error updating player stats:', error);
    // Don't throw - stats update failure shouldn't block challenge completion
  }
}

/**
 * Get player stats by wallet address
 */
export async function getPlayerStats(wallet: string): Promise<PlayerStats | null> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) {
      return null;
    }
    
    return playerSnap.data() as PlayerStats;
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    return null;
  }
}

/**
 * Update player's lastActive timestamp when they connect/view the page
 * This ensures they show as "online" in the stats
 */
export async function updatePlayerLastActive(wallet: string): Promise<void> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      // Update existing player's lastActive
      await updateDoc(playerRef, {
        lastActive: Timestamp.now(),
      });
    } else {
      // Create new player stats with current timestamp
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {},
      });
    }
  } catch (error) {
    console.error('❌ Error updating player lastActive:', error);
    // Don't throw - this is a background update, shouldn't block the app
  }
}

/**
 * Get total USDFG rewarded from cached stats document
 * Uses a single document to avoid querying all founder_rewards records
 */
export async function getTotalUSDFGRewarded(): Promise<number> {
  try {
    const statsRef = doc(db, 'stats', 'total_rewarded');
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      return data.total || 0;
    }
    
    // If stats document doesn't exist yet, calculate from founder_rewards and create it
    const rewardsCollection = collection(db, 'founder_rewards');
    const snapshot = await getDocs(rewardsCollection);
    
    let total = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      total += data.amount || 0;
    });
    
    // Create cached stats document for future reads
    await setDoc(statsRef, {
      total,
      lastUpdated: Timestamp.now(),
    });
    
    return total;
  } catch (error) {
    console.error('❌ Error getting total USDFG rewarded:', error);
    return 0; // Return 0 on error
  }
}

/**
 * Get count of players who are currently online (active in last 10 minutes)
 */
export async function getPlayersOnlineCount(): Promise<number> {
  try {
    const tenMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000));
    const statsCollection = collection(db, 'player_stats');
    const q = query(
      statsCollection,
      where('lastActive', '>=', tenMinutesAgo)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting players online count:', error);
    return 0;
  }
}

/**
 * Update player display name in Firestore
 */
/**
 * Store a trust review in Firestore and update the reviewed player's trust score
 */
export async function storeTrustReview(
  reviewer: string,
  opponent: string,
  challengeId: string,
  review: {
    honesty: number;
    fairness: number;
    sportsmanship: number;
    tags: string[];
    trustScore10: number;
    comment?: string;
  }
): Promise<void> {
  try {
    const reviewerLower = reviewer.toLowerCase();
    const opponentLower = opponent.toLowerCase();
    
    // Check if a review already exists for this reviewer + opponent + challenge combination
    const reviewsRef = collection(db, 'trust_reviews');
    const existingReviewQuery = query(
      reviewsRef,
      where('reviewer', '==', reviewerLower),
      where('opponent', '==', opponentLower),
      where('challengeId', '==', challengeId)
    );
    
    const existingSnapshot = await getDocs(existingReviewQuery);
    
    if (!existingSnapshot.empty) {
      console.warn(`⚠️ Trust review already exists for challenge ${challengeId.slice(0, 8)}... by ${reviewer.slice(0, 8)}... for ${opponent.slice(0, 8)}...`);
      console.warn(`   Skipping duplicate review. Reviews are one per challenge.`);
      return; // Skip duplicate review - one review per challenge
    }
    
    // Clean review object - remove undefined fields (Firestore doesn't allow undefined)
    const cleanReview: any = {
      honesty: review.honesty,
      fairness: review.fairness,
      sportsmanship: review.sportsmanship,
      tags: review.tags,
      trustScore10: review.trustScore10
    };
    
    // Only include comment if it exists and is not empty
    if (review.comment && review.comment.trim()) {
      cleanReview.comment = review.comment.trim();
    }
    
    // Store the review in Firestore
    await addDoc(collection(db, 'trust_reviews'), {
      reviewer: reviewerLower,
      opponent: opponentLower,
      challengeId,
      review: cleanReview,
      timestamp: Timestamp.now()
    });
    
    console.log(`✅ Trust review stored for ${opponent.slice(0, 8)}... by ${reviewer.slice(0, 8)}... (challenge: ${challengeId.slice(0, 8)}...)`);
    
    // Update the opponent's trust score in player_stats
    await updatePlayerTrustScore(opponent);
  } catch (error) {
    console.error('❌ Error storing trust review:', error);
    throw error;
  }
}

/**
 * Update a player's trust score in Firestore based on all their reviews
 */
export async function updatePlayerTrustScore(wallet: string): Promise<void> {
  try {
    console.log(`🔄 Recalculating trust score for ${wallet.slice(0, 8)}...`);
    const { trustScore, trustReviews } = await calculateTrustScore(wallet);
    
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      const currentData = playerSnap.data() as PlayerStats;
      const currentTrustScore = currentData.trustScore || 0;
      const currentTrustReviews = currentData.trustReviews || 0;
      
      // Only update if the score has changed
      if (currentTrustScore !== trustScore || currentTrustReviews !== trustReviews) {
        await updateDoc(playerRef, {
          trustScore,
          trustReviews
        });
        console.log(`✅ Updated trust score for ${wallet.slice(0, 8)}...: ${currentTrustScore} → ${trustScore}/10 (${currentTrustReviews} → ${trustReviews} reviews)`);
      } else {
        console.log(`   ℹ️ Trust score unchanged for ${wallet.slice(0, 8)}...: ${trustScore}/10 (${trustReviews} reviews)`);
      }
    } else {
      // Player doesn't exist yet, create with trust score
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        gameStats: {},
        categoryStats: {}
      });
      console.log(`✅ Created player stats with trust score for ${wallet.slice(0, 8)}...: ${trustScore}/10 (${trustReviews} reviews)`);
    }
  } catch (error) {
    console.error(`❌ Error updating player trust score for ${wallet.slice(0, 8)}...:`, error);
    throw error;
  }
}

export async function updatePlayerDisplayName(wallet: string, displayName: string): Promise<void> {
  try {
    const sanitized = sanitizeDisplayName(displayName);
    if (!sanitized) {
      console.warn('⚠️ Display name failed sanitization:', displayName);
      return;
    }
    
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      await updateDoc(playerRef, {
        displayName: sanitized
      });
      console.log(`✅ Updated display name for ${wallet}: "${sanitized}"`);
    } else {
      // Player doesn't exist yet, create with display name
      await setDoc(playerRef, {
        wallet,
        displayName: sanitized,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {}
      });
      console.log(`✅ Created player stats with display name for ${wallet}: "${sanitized}"`);
    }
  } catch (error) {
    console.error('❌ Error updating display name:', error);
    throw error;
  }
}

/**
 * Update player's country in Firestore
 */
export async function updatePlayerCountry(wallet: string, countryCode: string | null): Promise<void> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      if (countryCode) {
        await updateDoc(playerRef, {
          country: countryCode
        });
        console.log(`✅ Updated country for ${wallet}: ${countryCode}`);
      } else {
        // Remove country if null
        await updateDoc(playerRef, {
          country: null
        });
        console.log(`✅ Removed country for ${wallet}`);
      }
    } else {
      // Player doesn't exist yet, create with country
      if (countryCode) {
        await setDoc(playerRef, {
          wallet,
          country: countryCode,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          lastActive: Timestamp.now(),
          trustScore: 0,
          trustReviews: 0,
          gameStats: {},
          categoryStats: {}
        });
        console.log(`✅ Created player stats with country for ${wallet}: ${countryCode}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating country:', error);
    throw error;
  }
}

/**
 * Create a new team
 */
export async function createTeam(teamKey: string, teamName: string): Promise<string> {
  try {
    const teamRef = doc(db, 'teams', teamKey);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      throw new Error("Team already exists with this wallet");
    }
    
    const newTeam: TeamStats = {
      teamId: teamKey,
      teamName: teamName.trim(),
      teamKey: teamKey,
      members: [teamKey], // Team key holder is first member
      wins: 0,
      losses: 0,
      winRate: 0,
      totalEarned: 0,
      gamesPlayed: 0,
      lastActive: Timestamp.now(),
      createdAt: Timestamp.now(),
      trustScore: 0,
      trustReviews: 0,
      gameStats: {},
      categoryStats: {}
    };
    
    await setDoc(teamRef, newTeam);
    console.log(`✅ Created team: ${teamName} (${teamKey})`);
    return teamKey;
  } catch (error) {
    console.error('❌ Error creating team:', error);
    throw error;
  }
}

/**
 * Join a team
 */
export async function joinTeam(teamId: string, memberWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const teamData = teamSnap.data() as TeamStats;
    
    if (teamData.members.includes(memberWallet)) {
      throw new Error("Already a member of this team");
    }
    
    if (teamData.members.length >= 69) {
      throw new Error("Team is full (69 members max)");
    }
    
    await updateDoc(teamRef, {
      members: arrayUnion(memberWallet),
      lastActive: Timestamp.now()
    });
    
    console.log(`✅ ${memberWallet} joined team: ${teamData.teamName}`);
  } catch (error) {
    console.error('❌ Error joining team:', error);
    throw error;
  }
}

/**
 * Leave a team
 */
export async function leaveTeam(teamId: string, memberWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const teamData = teamSnap.data() as TeamStats;
    
    if (teamData.teamKey === memberWallet) {
      throw new Error("Team key holder cannot leave. If you need to transfer leadership, share the wallet seed phrase with another team member.");
    }
    
    if (!teamData.members.includes(memberWallet)) {
      throw new Error("Not a member of this team");
    }
    
    await updateDoc(teamRef, {
      members: teamData.members.filter(m => m !== memberWallet),
      lastActive: Timestamp.now()
    });
    
    console.log(`✅ ${memberWallet} left team: ${teamData.teamName}`);
  } catch (error) {
    console.error('❌ Error leaving team:', error);
    throw error;
  }
}

/**
 * Remove a member from a team (team key holder only)
 */
export async function removeTeamMember(teamId: string, memberWallet: string, requesterWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }

    const teamData = teamSnap.data() as TeamStats;

    if (teamData.teamKey !== requesterWallet) {
      throw new Error("Only the team key holder can remove members");
    }

    if (memberWallet === teamData.teamKey) {
      throw new Error("Team key holder cannot be removed");
    }

    if (!teamData.members.includes(memberWallet)) {
      throw new Error("Player is not a member of this team");
    }

    await updateDoc(teamRef, {
      members: arrayRemove(memberWallet),
      lastActive: Timestamp.now()
    });

    console.log(`✅ ${memberWallet} was removed from team: ${teamData.teamName} by ${requesterWallet}`);
  } catch (error) {
    console.error('❌ Error removing team member:', error);
    throw error;
  }
}

/**
 * Get team stats by team ID
 */
export async function getTeamStats(teamId: string): Promise<TeamStats | null> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return null;
    }
    
    return teamSnap.data() as TeamStats;
  } catch (error) {
    console.error('❌ Error fetching team stats:', error);
    return null;
  }
}

/**
 * Get team by member wallet
 */
export async function getTeamByMember(memberWallet: string): Promise<TeamStats | null> {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('members', 'array-contains', memberWallet));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data() as TeamStats;
  } catch (error) {
    console.error('❌ Error fetching team by member:', error);
    return null;
  }
}

/**
 * Update team stats after a challenge completes
 */
export async function updateTeamStats(
  teamId: string,
  result: 'win' | 'loss',
  amountEarned: number,
  game: string,
  category: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const currentStats = teamSnap.data() as TeamStats;
    const newWins = result === 'win' ? currentStats.wins + 1 : currentStats.wins;
    const newLosses = result === 'loss' ? currentStats.losses + 1 : currentStats.losses;
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newWinRate = newGamesPlayed > 0 ? (newWins / newGamesPlayed) * 100 : 0;
    const newTotalEarned = currentStats.totalEarned + amountEarned;
    
    // Update game stats
    const currentGameStats = currentStats.gameStats[game] || { wins: 0, losses: 0, earned: 0 };
    const newGameStats = {
      ...currentStats.gameStats,
      [game]: {
        wins: result === 'win' ? currentGameStats.wins + 1 : currentGameStats.wins,
        losses: result === 'loss' ? currentGameStats.losses + 1 : currentGameStats.losses,
        earned: currentGameStats.earned + amountEarned
      }
    };
    
    // Update category stats
    const currentCategoryStats = currentStats.categoryStats[category] || { wins: 0, losses: 0, earned: 0 };
    const newCategoryStats = {
      ...currentStats.categoryStats,
      [category]: {
        wins: result === 'win' ? currentCategoryStats.wins + 1 : currentCategoryStats.wins,
        losses: result === 'loss' ? currentCategoryStats.losses + 1 : currentCategoryStats.losses,
        earned: currentCategoryStats.earned + amountEarned
      }
    };
    
    await updateDoc(teamRef, {
      wins: newWins,
      losses: newLosses,
      winRate: newWinRate,
      totalEarned: newTotalEarned,
      gamesPlayed: newGamesPlayed,
      lastActive: Timestamp.now(),
      gameStats: newGameStats,
      categoryStats: newCategoryStats
    });
    
    console.log(`✅ Updated team stats: ${teamId} - ${result} (+${amountEarned} USDFG)`);
  } catch (error) {
    console.error('❌ Error updating team stats:', error);
    throw error;
  }
}

/**
 * Get top teams for leaderboard
 */
export async function getTopTeams(limitCount: number = 10, sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned'): Promise<TeamStats[]> {
  try {
    const teamsRef = collection(db, 'teams');
    let q;
    
    switch (sortBy) {
      case 'wins':
        q = query(teamsRef, orderBy('wins', 'desc'), limit(limitCount));
        break;
      case 'winRate':
        q = query(teamsRef, orderBy('winRate', 'desc'), limit(limitCount));
        break;
      case 'totalEarned':
      default:
        q = query(teamsRef, orderBy('totalEarned', 'desc'), limit(limitCount));
        break;
    }
    
    const querySnapshot = await getDocs(q);
    const teams: TeamStats[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as TeamStats;
      // Ensure trustScore is always a number (default to 0 if undefined)
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      teams.push(data);
    });
    
    return teams;
  } catch (error) {
    console.error('❌ Error fetching top teams:', error);
    return [];
  }
}

/**
 * Get top players for leaderboard
 */
export async function getTopPlayers(limitCount: number = 10, sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned'): Promise<PlayerStats[]> {
  try {
    console.log(`📊 Fetching top ${limitCount} players (sorted by ${sortBy})...`);
    const statsCollection = collection(db, 'player_stats');
    
    // Simple query without where clause to avoid compound index requirement
    const q = query(
      statsCollection,
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const players: PlayerStats[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as PlayerStats;
      const displayName = data.displayName ? `"${data.displayName}"` : '(no display name)';
      const trustScore = data.trustScore !== undefined ? data.trustScore : 0;
      const trustReviews = data.trustReviews || 0;
      console.log(`   Player: ${data.wallet.slice(0, 8)}... - Name: ${displayName} - ${data.totalEarned} USDFG - ${data.winRate}% WR - Trust: ${trustScore}/10 (${trustReviews} reviews)`);
      
      // Ensure trustScore is always a number (default to 0 if undefined)
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      
      players.push(data);
    });
    
    console.log(`✅ Fetched ${players.length} players total`);
    return players;
  } catch (error) {
    console.error('❌ Error fetching top players:', error);
    console.error('   Error details:', error);
    return [];
  }
}

/**
 * Check if a user has already submitted a trust review for a specific challenge
 */
export async function hasUserReviewedChallenge(reviewer: string, challengeId: string): Promise<boolean> {
  try {
    const reviewsRef = collection(db, 'trust_reviews');
    const reviewQuery = query(
      reviewsRef,
      where('reviewer', '==', reviewer.toLowerCase()),
      where('challengeId', '==', challengeId)
    );
    
    const snapshot = await getDocs(reviewQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ Error checking if user has reviewed challenge:', error);
    return false; // On error, assume not reviewed (allows review to be submitted)
  }
}

/**
 * Recalculate trust scores for all players (useful for fixing integrity stats)
 * This will update all players' trust scores based on their reviews in Firestore
 */
export async function recalculateAllTrustScores(): Promise<void> {
  try {
    console.log('🔄 Recalculating trust scores for all players...');
    const statsCollection = collection(db, 'player_stats');
    const snapshot = await getDocs(statsCollection);
    
    let updated = 0;
    let skipped = 0;
    
    for (const doc of snapshot.docs) {
      const wallet = doc.id;
      try {
        await updatePlayerTrustScore(wallet);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update trust score for ${wallet.slice(0, 8)}...:`, error);
        skipped++;
      }
    }
    
    console.log(`✅ Recalculated trust scores: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error('❌ Error recalculating all trust scores:', error);
    throw error;
  }
}

// ============================================
// PLAYER-PAID PAYOUT SYSTEM
// ============================================

/**
 * Claim prize for a completed challenge (WINNER ONLY)
 * 
 * Winner determines automatically, but winner must claim their prize themselves.
 * This way the WINNER pays the gas fee (~$0.0005), not the platform admin.
 * 
 * @param challengeId - Firestore challenge ID
 * @param winnerWallet - Winner's wallet (must sign transaction)
 * @param connection - Solana connection
 */
export async function claimChallengePrize(
  challengeId: string,
  winnerWallet: any,
  connection: any
): Promise<void> {
  try {
    console.log('🏆 Claiming prize for challenge:', challengeId);
    
    // Get challenge data from Firestore
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('❌ Challenge not found in Firestore');
    }
    
    const data = snap.data() as ChallengeData;
    
    // Validate challenge is ready for claim
    if (data.status !== 'completed') {
      throw new Error('❌ Challenge is not completed');
    }
    
    if (!data.winner || data.winner === 'forfeit' || data.winner === 'tie') {
      throw new Error('❌ No valid winner to pay out');
    }
    
    // Check if this is a Founder Challenge (no PDA, entryFee is 0, creator is ADMIN_WALLET)
    const entryFee = data.entryFee || 0;
    const creatorWallet = data.creator || '';
    const isFree = entryFee === 0 || entryFee < 0.000000001;
    
    // Import ADMIN_WALLET to check if creator is admin
    const { ADMIN_WALLET } = await import('../chain/config');
    const isAdmin = creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const isFounderChallenge = !data.pda && (isFree || isAdmin);
    
    if (isFounderChallenge) {
      // Founder Challenge prizes are transferred manually by the founder, not via smart contract
      throw new Error('🏆 This is a Founder Challenge. Prizes are transferred manually by the founder after the challenge completes. Please contact the founder to receive your prize.');
    }
    
    // If no PDA, try to derive it from the challenge data
    let challengePDA = data.pda;
    if (!challengePDA) {
      console.log('⚠️ No PDA found, attempting to derive from challenge data...');
      
      // For existing challenges without PDA, we need to manually add it
      // This is a temporary fix for challenges created before PDA field was added
      console.log('🔧 Attempting to fix missing PDA for existing challenge...');
      
      // Try to find the PDA by looking up the challenge on-chain
      // For now, we'll need to manually add the PDA to the challenge document
      throw new Error('❌ Challenge has no on-chain PDA. This challenge was created before the PDA field was added. Please create a new challenge to use the claim prize functionality.');
    }
    
    if (!data.canClaim) {
      throw new Error('❌ Challenge is not ready for claim yet');
    }
    
    // Validate caller is the winner
    if (!winnerWallet || !winnerWallet.publicKey) {
      throw new Error('❌ Wallet not connected');
    }
    
    const callerAddress = winnerWallet.publicKey.toString();
    if (callerAddress !== data.winner) {
      throw new Error('❌ Only the winner can claim the prize');
    }
    
    // Prevent duplicate claims
    if (data.payoutTriggered) {
      throw new Error('⚠️  Prize already claimed');
    }
    
    console.log('✅ Validation passed - calling smart contract...');
    console.log('   Winner:', data.winner);
    console.log('   Prize Pool:', data.prizePool, 'USDFG');
    console.log('   Challenge PDA:', challengePDA);
    
    // ✅ REMOVED: Expiration check for prize claims
    // Winners can claim prizes ANYTIME after challenge completion (no expiration).
    // Once both players submit results and challenge is completed in Firestore,
    // the winner should be able to claim their prize whenever they want.
    // The dispute_timer only prevents joining expired challenges, not claiming prizes.
    
    // Import the resolveChallenge function
    const { resolveChallenge } = await import('../chain/contract');
    
    // Call smart contract (winner pays gas!)
    console.log('🚀 Winner calling smart contract to release escrow...');
    console.log('   Note: Prize claims have NO expiration - winners can claim anytime!');
    
    try {
      const signature = await resolveChallenge(
        winnerWallet,
        connection,
        challengePDA,
        data.winner
      );
    
      // Update Firestore to mark prize as claimed
      await updateDoc(challengeRef, {
        payoutTriggered: true,
        payoutSignature: signature,
        payoutTimestamp: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log('✅ PRIZE CLAIMED!');
      console.log('   Transaction:', signature);
      console.log('   Winner received:', data.prizePool, 'USDFG');
    } catch (contractError: any) {
      // Handle specific smart contract errors
      // Note: ChallengeExpired should no longer occur for prize claims since we removed the check
      // But keep this handler for backwards compatibility with old deployed contracts
      if (contractError.message?.includes('ChallengeExpired') || 
          contractError.message?.includes('6005') ||
          contractError.logs?.some((log: string) => log.includes('ChallengeExpired') || log.includes('Challenge has expired'))) {
        console.error('⚠️ Old contract version detected - still has expiration check. Please redeploy with updated contract.');
        const expiredError = new Error('❌ Old contract version detected. Please contact support to redeploy the contract without expiration check for prize claims.');
        expiredError.name = 'ChallengeExpired';
        throw expiredError;
      }
      throw contractError;
    }
    
  } catch (error) {
    console.error('❌ Error claiming prize:', error);
    throw error;
  }
}

// ============================================
// FREE USDFG CLAIM SYSTEM - REMOVED
// ============================================
// This feature was replaced with Founder Challenges
// Free claim functions removed as they are no longer used
