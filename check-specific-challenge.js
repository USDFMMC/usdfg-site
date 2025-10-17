// Check a specific challenge in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkChallenge() {
  const challengeId = 'sSVOIGwUydA4DPWAFFu5';
  console.log('🔍 Checking challenge:', challengeId);
  
  const docRef = doc(db, 'challenges', challengeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    console.log('❌ Challenge not found');
    return;
  }
  
  const data = docSnap.data();
  console.log('\n📊 Challenge Data:');
  console.log('   Status:', data.status);
  console.log('   Players:', data.players);
  console.log('   Max Players:', data.maxPlayers);
  console.log('   Winner:', data.winner || 'Not determined');
  console.log('   Can Claim:', data.canClaim || false);
  console.log('   Payout Triggered:', data.payoutTriggered || false);
  console.log('\n📝 Results:');
  
  if (data.results) {
    const resultEntries = Object.entries(data.results);
    console.log(`   Total submissions: ${resultEntries.length}/${data.maxPlayers}`);
    resultEntries.forEach(([wallet, result]) => {
      console.log(`   - ${wallet.slice(0, 8)}...: ${result.didWin ? '✅ Won' : '❌ Lost'}`);
    });
  } else {
    console.log('   No results yet');
  }
  
  console.log('\n🎯 Analysis:');
  if (data.results && Object.keys(data.results).length === 2) {
    console.log('   ✅ Both players submitted');
    if (data.winner) {
      console.log('   ✅ Winner determined:', data.winner.slice(0, 8) + '...');
      if (data.canClaim) {
        console.log('   ✅ Winner can claim prize');
      } else {
        console.log('   ❌ canClaim not set - BUG!');
      }
    } else {
      console.log('   ❌ Winner NOT determined - BUG!');
    }
  } else {
    console.log('   ⏳ Waiting for both players to submit');
  }
  
  process.exit(0);
}

checkChallenge().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

