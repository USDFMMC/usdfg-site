// Copy and paste this entire code into your browser console on the Arena page
// Then call: createFreeClaimEvent()

window.createFreeClaimEvent = async function() {
  try {
    // Import Firebase functions (already available on the page)
    const { db } = await import('/src/lib/firebase/config.ts');
    const { collection, addDoc, Timestamp } = await import('firebase/firestore');
    
    const claimEvent = {
      isActive: true,
      totalAmount: 500,
      amountPerClaim: 10,
      maxClaims: 50,
      currentClaims: 0,
      claimedBy: [],
      activatedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 3600000), // 1 hour from now
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'free_claims'), claimEvent);
    console.log('✅ Claim event created successfully!');
    console.log('   Document ID:', docRef.id);
    console.log('   Amount per claim:', claimEvent.amountPerClaim, 'USDFG');
    console.log('   Max claims:', claimEvent.maxClaims);
    console.log('   Expires at:', new Date(claimEvent.expiresAt.toMillis()).toLocaleString());
    
    alert('✅ Claim event created! Refresh the page to see it.');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error: ' + error.message);
    throw error;
  }
};

console.log('✅ Function loaded! Call createFreeClaimEvent() to create a claim event.');

