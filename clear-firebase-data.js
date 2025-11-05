import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

// Collections to clear
const collectionsToClear = [
  'challenges',
  'player_stats',
  'challenge_chats',
  'voice_signals',
  'challenges_archive',
  'founder_rewards',
  'stats',
  'free_claims',
  'users'
];

async function deleteCollection(collectionName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`   ✅ ${collectionName}: Already empty`);
      return { deleted: 0 };
    }
    
    console.log(`   📊 ${collectionName}: Found ${snapshot.size} documents`);
    
    let deletedCount = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, collectionName, docSnapshot.id));
      deletedCount++;
      if (deletedCount % 10 === 0) {
        console.log(`      Deleted ${deletedCount}/${snapshot.size} documents...`);
      }
    }
    
    console.log(`   ✅ ${collectionName}: Deleted ${deletedCount} documents`);
    return { deleted: deletedCount };
  } catch (error) {
    console.error(`   ❌ Error deleting ${collectionName}:`, error);
    return { deleted: 0, error: error.message };
  }
}

async function clearAllData() {
  console.log('🔥 Starting Firebase data cleanup...\n');
  console.log('⚠️  This will delete ALL data from the following collections:');
  collectionsToClear.forEach(col => console.log(`   - ${col}`));
  console.log('\n');
  
  const results = {};
  let totalDeleted = 0;
  
  for (const collectionName of collectionsToClear) {
    const result = await deleteCollection(collectionName);
    results[collectionName] = result;
    totalDeleted += result.deleted || 0;
    console.log(''); // Empty line between collections
  }
  
  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  
  for (const [collectionName, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`   ❌ ${collectionName}: ${result.error}`);
    } else {
      console.log(`   ✅ ${collectionName}: ${result.deleted} documents deleted`);
    }
  }
  
  console.log('='.repeat(60));
  console.log(`🎉 Total documents deleted: ${totalDeleted}`);
  console.log('='.repeat(60));
  console.log('\n✨ Firebase data cleared! You can now create a fresh challenge.');
  console.log('💡 Create a new challenge and check that stats are accurate.\n');
}

// Run the cleanup
clearAllData()
  .then(() => {
    console.log('✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
