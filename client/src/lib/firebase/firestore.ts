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
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  players: string[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
  solanaAccountId?: string;
  category: string;
  prizePool: number;
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

export const updateChallengeStatus = async (challengeId: string, status: 'active' | 'pending' | 'completed' | 'cancelled' | 'disputed') => {
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

    await updateDoc(challengeRef, {
      players: newPlayers,
      status: isFull ? "in-progress" : "active",
      joinedBy: arrayUnion(wallet),
      updatedAt: serverTimestamp(),
    });

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
