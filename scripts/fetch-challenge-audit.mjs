#!/usr/bin/env node
/** One-off: read challenge doc with anonymous Firebase auth (audit). */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const challengeId = process.argv[2] || 'KLQz3TpQoEtklCJIYDUr';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInAnonymously(auth);
console.log('auth.uid (anonymous probe):', auth.currentUser?.uid);

const snap = await getDoc(doc(db, 'challenges', challengeId));
if (!snap.exists()) {
  console.log('Challenge not found:', challengeId);
  process.exit(1);
}

const d = snap.data();
const pick = {
  id: challengeId,
  status: d.status,
  createdByUid: d.createdByUid ?? null,
  opponentUid: d.opponentUid ?? null,
  creator: d.creator ?? null,
  creatorWallet: d.creatorWallet ?? null,
  challenger: d.challenger ?? null,
  pendingJoiner: d.pendingJoiner ?? null,
  opponentWallet: d.opponentWallet ?? null,
  pda: d.pda ?? null,
  creatorFundingDeadline: d.creatorFundingDeadline?.toDate?.()?.toISOString?.() ?? null,
  joinerFundingDeadline: d.joinerFundingDeadline?.toDate?.()?.toISOString?.() ?? null,
  playersUid: d.playersUid ?? null,
};

console.log(JSON.stringify(pick, null, 2));
