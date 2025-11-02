// Run this script in your browser console on the Arena page
// Copy and paste the entire code below into your browser console

(async function() {
  try {
    // Import Firebase functions (they're already loaded in the page)
    const { getFirestore, collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Get the db instance (already initialized on the page)
    // We need to access it through the Firebase app
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
    const { getFirestore: getDb } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    const firebaseConfig = {
      apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
      authDomain: "usdfg-app.firebaseapp.com",
      projectId: "usdfg-app",
      storageBucket: "usdfg-app.firebasestorage.app",
      messagingSenderId: "10599746981",
      appId: "1:10599746981:web:97ce124f98f9b96872c4c"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getDb(app);
    
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
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error: ' + error.message);
  }
})();

