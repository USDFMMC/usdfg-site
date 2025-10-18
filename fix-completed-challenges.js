/**
 * Fix Completed Challenges - Add canClaim Field
 * 
 * This script adds the `canClaim: true` field to all completed challenges
 * that have a valid winner but don't have the field set yet.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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

async function fixCompletedChallenges() {
  try {
    console.log('🔍 Searching for completed challenges without canClaim field...\n');
    
    // Get all completed challenges
    const challengesRef = collection(db, 'challenges');
    const q = query(challengesRef, where('status', '==', 'completed'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.size} completed challenges\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let forfeitCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const challengeId = docSnap.id;
      
      console.log(`\n🎮 Challenge ID: ${challengeId}`);
      console.log(`   Winner: ${data.winner || 'None'}`);
      console.log(`   canClaim: ${data.canClaim}`);
      console.log(`   payoutTriggered: ${data.payoutTriggered}`);
      console.log(`   PDA: ${data.pda ? 'Present' : 'Missing'}`);
      
      // Skip if already has canClaim set
      if (data.canClaim !== undefined) {
        console.log('   ⏭️  Already has canClaim field - skipping');
        skippedCount++;
        continue;
      }
      
      // Skip if no valid winner
      if (!data.winner || data.winner === 'forfeit' || data.winner === 'tie') {
        console.log(`   ⚠️  No valid winner (${data.winner}) - marking as forfeit`);
        await updateDoc(doc(db, 'challenges', challengeId), {
          canClaim: false,
          payoutTriggered: false
        });
        forfeitCount++;
        continue;
      }
      
      // Skip if already paid out
      if (data.payoutTriggered) {
        console.log('   ✅ Already paid out - setting canClaim: false');
        await updateDoc(doc(db, 'challenges', challengeId), {
          canClaim: false
        });
        fixedCount++;
        continue;
      }
      
      // Fix: Add canClaim field
      console.log('   🔧 Fixing: Adding canClaim: true');
      await updateDoc(doc(db, 'challenges', challengeId), {
        canClaim: true,
        payoutTriggered: false,
        needsPayout: true
      });
      
      console.log('   ✅ Fixed!');
      fixedCount++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Fixed: ${fixedCount} challenges`);
    console.log(`⏭️  Skipped: ${skippedCount} challenges (already had canClaim)`);
    console.log(`⚠️  Forfeit: ${forfeitCount} challenges (no valid winner)`);
    console.log(`📝 Total: ${snapshot.size} challenges processed`);
    console.log('='.repeat(50));
    
    console.log('\n✨ Done! Refresh your app to see the Claim Prize button.\n');
    
  } catch (error) {
    console.error('\n❌ Error fixing challenges:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
fixCompletedChallenges();


