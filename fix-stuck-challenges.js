// Quick script to fix stuck challenges in Firestore
// Run this with: node fix-stuck-challenges.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_MXPy7i1zrFWTwN8F4_0v4ZqYQX7cXKc",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "615187444595",
  appId: "1:615187444595:web:b9c3e3e3d0e3f3e3e3e3e3",
  measurementId: "G-XXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixStuckChallenges() {
  console.log('🔍 Finding stuck challenges...');
  
  const challengesRef = collection(db, 'challenges');
  const snapshot = await getDocs(challengesRef);
  
  let fixed = 0;
  let deleted = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const players = data.players || [];
    
    // If status is "in-progress" but only 1 player, it's stuck
    if (data.status === 'in-progress' && players.length < 2) {
      console.log(`\n🐛 Found stuck challenge: ${docSnap.id}`);
      console.log(`   Status: ${data.status}, Players: ${players.length}`);
      
      // Option 1: Reset to active
      console.log('   ✅ Resetting to "active" status');
      await updateDoc(doc(db, 'challenges', docSnap.id), {
        status: 'active',
        updatedAt: new Date()
      });
      fixed++;
      
      // Option 2: Delete if very old (uncomment if you want to delete instead)
      // console.log('   🗑️  Deleting stuck challenge');
      // await deleteDoc(doc(db, 'challenges', docSnap.id));
      // deleted++;
    }
  }
  
  console.log('\n✅ Done!');
  console.log(`   Fixed: ${fixed} challenges`);
  console.log(`   Deleted: ${deleted} challenges`);
  process.exit(0);
}

fixStuckChallenges().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

