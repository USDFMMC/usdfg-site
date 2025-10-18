/**
 * Fix Specific Challenge - Manually Trigger Winner Determination
 * 
 * This script manually processes a challenge where both players submitted
 * but the winner wasn't automatically determined.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

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

async function fixChallenge() {
  try {
    // Challenge ID from the console logs
    const challengeId = "hPPKNaZhiIRUhXiREGDI";
    
    console.log('🔧 Fixing challenge:', challengeId);
    console.log('');
    
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      console.log('❌ Challenge not found!');
      process.exit(1);
    }
    
    const data = snap.data();
    
    console.log('📊 CURRENT STATUS:');
    console.log('   Status:', data.status);
    console.log('   Winner:', data.winner || 'Not set');
    console.log('');
    
    // Check results
    const results = data.results || {};
    const players = Object.keys(results);
    
    console.log('📝 RESULTS SUBMITTED:');
    console.log('   Total:', players.length, '/', data.maxPlayers);
    
    if (players.length < data.maxPlayers) {
      console.log('');
      console.log('⚠️  ERROR: Not all players have submitted results!');
      console.log('');
      data.players.forEach((player) => {
        if (results[player]) {
          console.log(`   ✅ ${player.slice(0, 8)}...${player.slice(-4)} - didWin: ${results[player].didWin}`);
        } else {
          console.log(`   ❌ ${player.slice(0, 8)}...${player.slice(-4)} - NOT SUBMITTED`);
        }
      });
      console.log('');
      console.log('💡 Waiting for all players to submit before determining winner.');
      process.exit(0);
    }
    
    // Both players submitted - determine winner
    console.log('');
    players.forEach((player) => {
      console.log(`   ${player.slice(0, 8)}...${player.slice(-4)} - Claimed Win: ${results[player].didWin ? 'YES ✅' : 'NO ❌'}`);
    });
    console.log('');
    
    const player1 = players[0];
    const player2 = players[1];
    const player1Won = results[player1].didWin;
    const player2Won = results[player2].didWin;
    
    // Determine outcome
    let winner = null;
    let status = 'completed';
    let canClaim = false;
    let needsPayout = false;
    
    // Case 1: Both claim they won → Dispute
    if (player1Won && player2Won) {
      console.log('🔴 DISPUTE: Both players claim they won');
      status = 'disputed';
      winner = null;
    }
    // Case 2: Both claim they lost → Forfeit
    else if (!player1Won && !player2Won) {
      console.log('⚠️  FORFEIT: Both players claim they lost');
      status = 'completed';
      winner = 'forfeit';
    }
    // Case 3: Clear winner
    else {
      winner = player1Won ? player1 : player2;
      const loser = player1Won ? player2 : player1;
      console.log('🏆 WINNER:', winner.slice(0, 8) + '...' + winner.slice(-4));
      console.log('💀 LOSER:', loser.slice(0, 8) + '...' + loser.slice(-4));
      status = 'completed';
      canClaim = true;
      needsPayout = true;
    }
    
    console.log('');
    console.log('🔧 APPLYING FIX...');
    
    // Update the challenge
    const updateData = {
      status,
      winner,
      updatedAt: Timestamp.now(),
    };
    
    if (canClaim) {
      updateData.canClaim = true;
      updateData.needsPayout = true;
      updateData.payoutTriggered = false;
    }
    
    await updateDoc(challengeRef, updateData);
    
    console.log('');
    console.log('✅ CHALLENGE FIXED!');
    console.log('');
    console.log('📊 NEW STATUS:');
    console.log('   Status:', status);
    console.log('   Winner:', winner);
    if (canClaim) {
      console.log('   Can Claim: true');
      console.log('   Needs Payout: true');
      console.log('   Payout Triggered: false');
      console.log('');
      console.log('🎉 Winner can now claim their prize!');
      console.log('   Prize Pool:', data.prizePool, 'USDFG');
    }
    console.log('');
    console.log('✨ Done! Refresh your app to see the changes.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
fixChallenge();

