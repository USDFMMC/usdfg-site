/**
 * BROWSER CONSOLE SCRIPT - Fix Completed Challenges
 * 
 * HOW TO USE:
 * 1. Open https://usdfg.pro/app in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy-paste this ENTIRE script
 * 5. Press Enter
 * 
 * This will add the `canClaim: true` field to completed challenges
 */

(async function fixCompletedChallenges() {
  console.log('🔧 Starting fix for completed challenges...\n');
  
  try {
    // Import Firestore from the global context (assuming it's loaded)
    const { getDocs, collection, doc, updateDoc, getDoc, query, where } = window.firebaseFirestore;
    const { db } = window.firebaseConfig || {};
    
    if (!db) {
      console.error('❌ Firestore not initialized. Make sure you\'re on the app page.');
      return;
    }
    
    console.log('✅ Firestore connected\n');
    
    // Get all completed challenges
    const challengesRef = collection(db, 'challenges');
    const q = query(challengesRef, where('status', '==', 'completed'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.size} completed challenges\n`);
    
    let fixedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const challengeId = docSnap.id;
      
      console.log(`\n🎮 Challenge: ${challengeId}`);
      console.log(`   Winner: ${data.winner || 'None'}`);
      console.log(`   canClaim: ${data.canClaim}`);
      console.log(`   payoutTriggered: ${data.payoutTriggered}`);
      
      // Skip if already has canClaim
      if (data.canClaim !== undefined) {
        console.log('   ⏭️  Already has canClaim - skipping');
        continue;
      }
      
      // Skip if no valid winner
      if (!data.winner || data.winner === 'forfeit' || data.winner === 'tie') {
        console.log(`   ⚠️  No valid winner - skipping`);
        continue;
      }
      
      // Skip if already paid out
      if (data.payoutTriggered) {
        console.log('   ✅ Already paid out - skipping');
        continue;
      }
      
      // Fix: Add canClaim field
      console.log('   🔧 Adding canClaim: true');
      await updateDoc(doc(db, 'challenges', challengeId), {
        canClaim: true,
        payoutTriggered: false,
        needsPayout: true
      });
      
      console.log('   ✅ Fixed!');
      fixedCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fixed ${fixedCount} challenges!`);
    console.log('='.repeat(60));
    console.log('\n🎉 Done! Refresh the page to see the Claim Prize button.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n💡 TIP: Make sure you\'re logged in with your wallet on the app page.');
  }
})();


