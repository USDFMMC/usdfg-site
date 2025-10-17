// Check and fix a specific challenge
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_MXPy7i1zrFWTwN8F4_0v4ZqYQX7cXKc",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "615187444595",
  appId: "1:615187444595:web:b9c3e3e3d0e3f3e3e3e3e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAndFixChallenge() {
  const challengeId = process.argv[2] || 'fRYFsR9A4qxRcIM0WtGE';
  console.log('🔍 Checking challenge:', challengeId);
  
  const docRef = doc(db, 'challenges', challengeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    console.log('❌ Challenge not found');
    process.exit(1);
  }
  
  const data = docSnap.data();
  const results = data.results || {};
  const players = Object.keys(results);
  
  console.log('\n📊 Current State:');
  console.log('   Status:', data.status);
  console.log('   Results submitted:', players.length);
  console.log('   Winner:', data.winner || 'Not set');
  console.log('   Can Claim:', data.canClaim || false);
  
  if (players.length === 2 && data.status === 'in-progress') {
    console.log('\n🐛 BUG DETECTED: Both submitted but status still in-progress');
    console.log('🔧 Analyzing results to determine winner...');
    
    const player1 = players[0];
    const player2 = players[1];
    const player1Won = results[player1].didWin;
    const player2Won = results[player2].didWin;
    
    console.log(`   Player 1 (${player1.slice(0,8)}...): ${player1Won ? 'Won' : 'Lost'}`);
    console.log(`   Player 2 (${player2.slice(0,8)}...): ${player2Won ? 'Won' : 'Lost'}`);
    
    let winner, fixNeeded = true;
    
    if (player1Won && player2Won) {
      console.log('\n⚠️  Both claimed they won - DISPUTE');
      winner = null;
      await updateDoc(docRef, {
        status: 'disputed',
        winner: null,
        updatedAt: Timestamp.now()
      });
    } else if (!player1Won && !player2Won) {
      console.log('\n⚠️  Both claimed they lost - FORFEIT');
      await updateDoc(docRef, {
        status: 'completed',
        winner: 'forfeit',
        updatedAt: Timestamp.now()
      });
    } else {
      winner = player1Won ? player1 : player2;
      console.log(`\n✅ Clear winner: ${winner.slice(0,8)}...`);
      await updateDoc(docRef, {
        status: 'completed',
        winner,
        canClaim: true,
        needsPayout: true,
        payoutTriggered: false,
        updatedAt: Timestamp.now()
      });
    }
    
    console.log('✅ Challenge fixed!');
  } else {
    console.log('\n✅ Challenge looks OK');
  }
  
  process.exit(0);
}

checkAndFixChallenge().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

