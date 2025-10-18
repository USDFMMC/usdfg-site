/**
 * Check Challenge Results Status
 * 
 * This script checks the current status of challenge results submission
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6l4CAfq3hgNgHjfVzMDMFfNqy9J5CG8I",
  authDomain: "usdfg-site.firebaseapp.com",
  projectId: "usdfg-site",
  storageBucket: "usdfg-site.firebasestorage.app",
  messagingSenderId: "430856682179",
  appId: "1:430856682179:web:a4e8b9b9aa7af8db7e9c8a",
  measurementId: "G-J0HQKNRJHB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkChallengeResults() {
  try {
    console.log('🔍 Checking challenge results...\n');
    
    // Get the specific challenge ID from console logs
    const challengeId = "hPPKNaZhiIRUhXiREGDI";
    
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      console.log('❌ Challenge not found!');
      process.exit(1);
    }
    
    const data = snap.data();
    
    console.log('📊 CHALLENGE STATUS:');
    console.log('='.repeat(60));
    console.log(`Challenge ID: ${challengeId}`);
    console.log(`Status: ${data.status}`);
    console.log(`Winner: ${data.winner || 'Not determined yet'}`);
    console.log(`\n👥 PLAYERS:`);
    console.log(`   Player 1: ${data.players[0]}`);
    console.log(`   Player 2: ${data.players[1]}`);
    
    console.log(`\n📝 RESULTS SUBMITTED:`);
    const results = data.results || {};
    const resultsCount = Object.keys(results).length;
    
    console.log(`   Total submissions: ${resultsCount}/${data.maxPlayers}`);
    
    if (resultsCount > 0) {
      Object.keys(results).forEach((wallet, index) => {
        console.log(`\n   Player ${index + 1} (${wallet.slice(0, 8)}...${wallet.slice(-4)}):`);
        console.log(`     - Claimed Win: ${results[wallet].didWin ? 'YES ✅' : 'NO ❌'}`);
        console.log(`     - Submitted At: ${results[wallet].submittedAt.toDate().toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  NO RESULTS SUBMITTED YET');
    }
    
    console.log(`\n💰 PRIZE POOL:`);
    console.log(`   Amount: ${data.prizePool} USDFG`);
    console.log(`   Can Claim: ${data.canClaim !== undefined ? data.canClaim : 'Not set'}`);
    console.log(`   Payout Triggered: ${data.payoutTriggered || false}`);
    console.log(`   Needs Payout: ${data.needsPayout || false}`);
    
    console.log('\n' + '='.repeat(60));
    
    if (resultsCount < data.maxPlayers) {
      console.log(`\n⏳ WAITING: ${data.maxPlayers - resultsCount} more player(s) need to submit results`);
      console.log(`\n🔍 WHO NEEDS TO SUBMIT?`);
      data.players.forEach((player) => {
        if (!results[player]) {
          console.log(`   ❌ ${player}`);
        } else {
          console.log(`   ✅ ${player} (submitted)`);
        }
      });
    } else if (data.status === 'completed') {
      console.log(`\n✅ CHALLENGE COMPLETED!`);
      console.log(`   Winner: ${data.winner}`);
    } else {
      console.log(`\n⚠️  ISSUE: Both players submitted but status is still "${data.status}"`);
      console.log(`   This might indicate an error in the winner determination logic.`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking challenge:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
checkChallengeResults();

