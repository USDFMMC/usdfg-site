/**
 * Script to check challenge status
 * Usage: node check-challenge-status.js <challengeId>
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkChallengeStatus() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node check-challenge-status.js <challengeId>');
    process.exit(1);
  }

  const challengeId = args[0];

  try {
    console.log(`🔍 Checking challenge: ${challengeId}...\n`);
    
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeSnap = await getDoc(challengeRef);
    
    if (!challengeSnap.exists()) {
      console.error(`❌ Challenge ${challengeId} not found!`);
      process.exit(1);
    }
    
    const data = challengeSnap.data();
    
    console.log(`📊 Challenge Details:`);
    console.log(`   ID: ${challengeId}`);
    console.log(`   Status: ${data.status || 'undefined'}`);
    console.log(`   Creator: ${data.creator || 'N/A'}`);
    console.log(`   Players: ${JSON.stringify(data.players || [])}`);
    console.log(`   Winner: ${data.winner || 'N/A'}`);
    console.log(`   Entry Fee: ${data.entryFee || 0}`);
    console.log(`   Prize Pool: ${data.prizePool || 0}`);
    console.log(`   Can Claim: ${data.canClaim || false}`);
    console.log(`   Payout Triggered: ${data.payoutTriggered || false}`);
    console.log(`   Results: ${JSON.stringify(data.results || {})}`);
    
    // Check if status should block
    const isBlocking = data.status === 'active' || data.status === 'pending' || data.status === 'in-progress';
    const isCompleted = data.status === 'completed' || data.status === 'cancelled' || data.status === 'disputed' || data.status === 'expired';
    
    console.log(`\n📋 Status Analysis:`);
    console.log(`   Is Blocking (active/pending/in-progress): ${isBlocking}`);
    console.log(`   Is Completed: ${isCompleted}`);
    console.log(`   Should Allow New Challenge: ${!isBlocking || isCompleted}`);
    
  } catch (error) {
    console.error('❌ Error checking challenge:', error);
    process.exit(1);
  }
}

checkChallengeStatus();

