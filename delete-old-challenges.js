import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWRetqF_6HBm-I3PfBCRJighnTOnJ-bVw",
  authDomain: "usdfg-site.firebaseapp.com",
  projectId: "usdfg-site",
  storageBucket: "usdfg-site.firebasestorage.app",
  messagingSenderId: "322715456990",
  appId: "1:322715456990:web:7f33a53a0b9f3e2b85be1e",
  measurementId: "G-4R5CXBJTQZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteOldChallenges() {
  console.log('🗑️  Deleting ALL old challenges...\n');

  try {
    const challengesRef = collection(db, 'challenges');
    const snapshot = await getDocs(challengesRef);

    console.log(`Found ${snapshot.size} challenges total`);

    let deletedCount = 0;

    for (const challengeDoc of snapshot.docs) {
      const id = challengeDoc.id;
      const data = challengeDoc.data();
      
      console.log(`\nChallenge ${id}:`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Created: ${new Date(data.createdAt?.toDate()).toLocaleString()}`);
      
      // Delete it
      await deleteDoc(doc(db, 'challenges', id));
      console.log(`  ✅ Deleted`);
      deletedCount++;
    }

    console.log(`\n🎉 Deleted ${deletedCount} old challenges!`);
    console.log(`\n✅ Now you can create NEW challenges with the new contract!`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteOldChallenges().then(() => process.exit(0));

