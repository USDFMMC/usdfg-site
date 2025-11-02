/**
 * Manual script to record Founder Challenge USDFG reward in Firestore
 * 
 * Run this after manually transferring USDFG to a player:
 * node record-founder-reward.js <wallet> <challengeId> <amount> [txSignature]
 * 
 * Example:
 * node record-founder-reward.js 3SeLoDGs...abc challenge123 50 5xK8j...
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Firebase config - same as client config
const firebaseConfig = {
  apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "10599746981",
  appId: "1:10599746981:web:97ce124f98f9b96872c4c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function recordFounderReward() {
  // Get input from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
📝 Usage: node record-founder-reward.js <wallet> <challengeId> <amount> [txSignature]
  
Example:
  node record-founder-reward.js 3SeLoDGs...abc challenge123 50 5xK8j...
  
Arguments:
  wallet       - Player wallet address
  challengeId  - Challenge ID from Firestore
  amount       - Actual USDFG amount transferred
  txSignature  - (Optional) Solana transaction signature
    `);
    process.exit(1);
  }

  const wallet = args[0];
  const challengeId = args[1];
  const amount = parseFloat(args[2]);
  const txSignature = args[3] || null;

  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount. Must be a positive number.');
    process.exit(1);
  }

  try {
    console.log('📝 Recording Founder Challenge reward...');
    console.log(`   Wallet: ${wallet}`);
    console.log(`   Challenge: ${challengeId}`);
    console.log(`   Amount: ${amount} USDFG`);
    if (txSignature) console.log(`   TX: ${txSignature}`);

    // Record in founder_rewards collection
    await addDoc(collection(db, 'founder_rewards'), {
      wallet,
      challengeId,
      amount,
      txSignature,
      timestamp: Timestamp.now(),
    });

    // Update player stats (totalEarned)
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      const currentStats = playerSnap.data();
      await updateDoc(playerRef, {
        totalEarned: (currentStats.totalEarned || 0) + amount,
        lastActive: Timestamp.now(),
      });
      console.log(`✅ Updated player stats: ${(currentStats.totalEarned || 0) + amount} USDFG total earned`);
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
      console.log(`✅ Created new player stats: ${amount} USDFG total earned`);
    }

    console.log(`✅ Successfully recorded Founder Challenge reward!`);
    console.log(`   ${wallet.slice(0, 8)}... received ${amount} USDFG from challenge ${challengeId}`);
    
  } catch (error) {
    console.error('❌ Error recording reward:', error);
    process.exit(1);
  }
}

// Run if called directly
recordFounderReward();

