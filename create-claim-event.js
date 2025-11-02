// Script to create a free claim event in Firestore
// Run with: node create-claim-event.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config - same as client config
const firebaseConfig = {
  apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "10599746981",
  appId: "1:10599746981:web:97ce124f98f9b96872c4c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createClaimEvent() {
  try {
    const claimEvent = {
      isActive: true,
      totalAmount: 500,        // 500 USDFG total
      amountPerClaim: 10,      // 10 USDFG per user
      maxClaims: 50,           // 50 people can claim
      currentClaims: 0,
      claimedBy: [],
      activatedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 3600000), // 1 hour from now
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'free_claims'), claimEvent);
    console.log('✅ Claim event created successfully!');
    console.log('   Document ID:', docRef.id);
    console.log('   Amount per claim:', claimEvent.amountPerClaim, 'USDFG');
    console.log('   Max claims:', claimEvent.maxClaims);
    console.log('   Expires at:', new Date(claimEvent.expiresAt.toMillis()).toLocaleString());
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating claim event:', error);
    process.exit(1);
  }
}

createClaimEvent();

