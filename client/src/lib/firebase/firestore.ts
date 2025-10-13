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

// Challenge interfaces
export interface ChallengeData {
  id?: string;
  creator: string;
  creatorTag: string;
  game: string;
  mode: string;
  platform: string;
  entryFee: number;
  maxPlayers: number;
  rules: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'in-progress';
  players: string[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
  solanaAccountId?: string;
  category: string;
  prizePool: number;
  // Cancel requests (for mutual cancellation)
  cancelRequests?: string[]; // Array of wallet addresses that requested cancel
  // Result submission fields
  results?: {
    [wallet: string]: {
      didWin: boolean;
      submittedAt: Timestamp;
    }
  };
  resultDeadline?: Timestamp; // 2 hours after match starts
  winner?: string;
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

export async function archiveChallenge(id: string) {
  const src = doc(db, "challenges", id);
  const dst = doc(db, "challenges_archive", id);
  const batch = writeBatch(db);
  batch.set(dst, { refId: id, movedAt: Timestamp.now() });
  batch.delete(src);
  await batch.commit();
  console.log('🗄️ Challenge archived:', id);
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
      await determineWinner(challengeId, data);
    }
  } catch (error) {
    console.error('❌ Error submitting result:', error);
    throw error;
  }
};

/**
 * Determine winner based on submitted results
 * Logic:
 * - One YES, One NO → YES player wins
 * - Both YES → Dispute
 * - Both NO → Tie/Refund
 */
async function determineWinner(challengeId: string, data: ChallengeData): Promise<void> {
  try {
    const results = data.results || {};
    const players = Object.keys(results);
    
    if (players.length !== 2) {
      console.log('⏳ Waiting for both players to submit results');
      return;
    }

    const player1 = players[0];
    const player2 = players[1];
    const player1Won = results[player1].didWin;
    const player2Won = results[player2].didWin;

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

    // Case 2: Both claim they lost → Tie/Refund
    if (!player1Won && !player2Won) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'tie',
        updatedAt: Timestamp.now(),
      });
      console.log('🤝 TIE: Both players claim they lost - Refund initiated');
      return;
    }

    // Case 3: Clear winner (one YES, one NO)
    const winner = player1Won ? player1 : player2;
    await updateDoc(challengeRef, {
      status: 'completed',
      winner,
      updatedAt: Timestamp.now(),
    });
    console.log('🏆 WINNER DETERMINED:', winner);
    
    // TODO: Trigger smart contract to release prize pool to winner
    
  } catch (error) {
    console.error('❌ Error determining winner:', error);
    throw error;
  }
}

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
    
    // Case 1: No one submitted → Dispute/Refund
    if (submittedCount === 0) {
      await updateDoc(challengeRef, {
        status: 'disputed',
        winner: null,
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ DEADLINE PASSED: No results submitted - Dispute');
      return;
    }
    
    // Case 2: Only one player submitted → They win by default
    if (submittedCount === 1) {
      const submittedWallet = Object.keys(results)[0];
      const didTheyClaimWin = results[submittedWallet].didWin;
      
      // Only award win if they claimed they won
      if (didTheyClaimWin) {
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: submittedWallet,
          updatedAt: Timestamp.now(),
        });
        console.log('🏆 DEADLINE PASSED: Winner by default (opponent no-show):', submittedWallet);
      } else {
        // They claimed they lost and opponent didn't submit → Refund
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: 'tie',
          updatedAt: Timestamp.now(),
        });
        console.log('🤝 DEADLINE PASSED: Refund (player claimed loss, opponent no-show)');
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
    
    // If user already requested, do nothing
    if (cancelRequests.includes(walletAddress)) {
      console.log('⚠️ User already requested cancellation');
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
        timestamp: serverTimestamp(),
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
        timestamp: serverTimestamp(),
      });
      console.log('✅ System message sent to chat:', chatDoc.id);
    }
  } catch (error) {
    console.error('❌ Error requesting cancel:', error);
    throw error;
  }
};
