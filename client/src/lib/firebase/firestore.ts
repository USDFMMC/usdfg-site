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
  creator: string;                    // Creator wallet
  challenger?: string;                // Challenger wallet (if accepted)
  entryFee: number;                   // Entry fee amount
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'in-progress';
  createdAt: Timestamp;               // Creation time
  expiresAt: Timestamp;               // Expiration time
  winner?: string;                    // Winner wallet (if completed)
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
  // REMOVED: game, rules, platform, mode, category, creatorTag, solanaAccountId, cancelRequests
  // These are not needed for leaderboard and increase storage costs unnecessarily
}

// Challenge operations
export const addChallenge = async (challengeData: Omit<ChallengeData, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, "challenges"), {
      ...challengeData,
      createdAt: Timestamp.now(),
      players: [challengeData.creator], // Creator is first player
    });
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
    await updateDoc(challengeRef, { 
      status,
      updatedAt: Timestamp.now()
    });
    console.log('✅ Challenge status updated:', challengeId, 'to', status);
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
export const joinChallenge = async (challengeId: string, wallet: string) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data();
    if (data.players && data.players.length >= data.maxPlayers) {
      throw new Error("Challenge already full");
    }

    // Check if player is already in the challenge
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

    console.log('✅ Player joined challenge:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error joining challenge:', error);
    throw error;
  }
};

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

    // Case 1: Both claim they won → Dispute
    if (player1Won && player2Won) {
      await updateDoc(challengeRef, {
        status: 'disputed',
        winner: null,
        updatedAt: Timestamp.now(),
      });
      console.log('🔴 DISPUTE: Both players claim they won');
      return;
    }

    // Case 2: Both claim they lost → FORFEIT (both lose entry fees as penalty)
    if (!player1Won && !player2Won) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'forfeit', // Special value: both players forfeit, no refund
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ FORFEIT: Both players claim they lost - Suspicious collusion detected, both lose entry fees');
      return;
    }

    // Case 3: Clear winner (one YES, one NO)
    const winner = player1Won ? player1 : player2;
    const loser = player1Won ? player2 : player1;
    
    await updateDoc(challengeRef, {
      status: 'completed',
      winner,
      updatedAt: Timestamp.now(),
    });
    console.log('🏆 WINNER DETERMINED:', winner);
    console.log('📊 Updating player stats...');
    console.log('   Game:', data.game, 'Category:', data.category, 'Prize:', data.prizePool);
    
    // Get display names from challenge data and sanitize
    const rawWinnerName = winner === data.creator ? data.creatorTag : undefined;
    const rawLoserName = loser === data.creator ? data.creatorTag : undefined;
    
    const winnerDisplayName = sanitizeDisplayName(rawWinnerName);
    const loserDisplayName = sanitizeDisplayName(rawLoserName);
    
    // Update player stats
    console.log('   Updating winner stats:', winner, 'as', winnerDisplayName || 'Anonymous');
    await updatePlayerStats(winner, 'win', data.prizePool, data.game, data.category, winnerDisplayName);
    console.log('   Updating loser stats:', loser, 'as', loserDisplayName || 'Anonymous');
    await updatePlayerStats(loser, 'loss', 0, data.game, data.category, loserDisplayName);
    
    // Mark challenge as ready for winner to claim (Player pays gas, not admin!)
    await updateDoc(challengeRef, {
      status: 'completed', // Keep status as completed!
      needsPayout: true,
      payoutTriggered: false,
      canClaim: true,
      updatedAt: Timestamp.now(),
    });
    
    console.log('💰 Prize pool ready for claim:', data.prizePool, 'USDFG to', winner);
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
  wins: number;
  losses: number;
  winRate: number;
  totalEarned: number;
  gamesPlayed: number;
  lastActive: Timestamp;
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

    if (!playerSnap.exists()) {
      // Create new player stats
      const newStats: PlayerStats = {
        wallet,
        displayName: displayName || undefined, // Store display name if provided
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        winRate: result === 'win' ? 100 : 0,
        totalEarned: amountEarned,
        gamesPlayed: 1,
        lastActive: Timestamp.now(),
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
      
      await setDoc(playerRef, newStats);
      console.log('✅ Created new player stats:', wallet, 'as', displayName || 'Anonymous');
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

      console.log(`✅ Updated player stats: ${wallet} - ${result} (+${amountEarned} USDFG)`);
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
      console.log(`   Player: ${data.wallet.slice(0, 8)}... - ${data.totalEarned} USDFG - ${data.winRate}% WR`);
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
    
    // Import the resolveChallenge function
    const { resolveChallenge } = await import('../chain/contract');
    
    // Call smart contract (winner pays gas!)
    console.log('🚀 Winner calling smart contract to release escrow...');
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
    
  } catch (error) {
    console.error('❌ Error claiming prize:', error);
    throw error;
  }
}
