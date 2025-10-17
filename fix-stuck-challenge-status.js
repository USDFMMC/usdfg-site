// Fix the stuck challenge by setting status to completed
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, Timestamp } from 'firebase/firestore';

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

async function fixChallenge() {
  const challengeId = 'sSVOIGwUydA4DPWAFFu5';
  console.log('🔧 Fixing challenge:', challengeId);
  
  const challengeRef = doc(db, 'challenges', challengeId);
  
  await updateDoc(challengeRef, {
    status: 'completed',
    updatedAt: Timestamp.now()
  });
  
  console.log('✅ Challenge status updated to "completed"');
  console.log('🎉 The "Claim Prize" button should now appear!');
  
  process.exit(0);
}

fixChallenge().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

