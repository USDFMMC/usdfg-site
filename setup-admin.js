/**
 * Setup script to enable Firebase Auth and create first admin user
 * 
 * This script:
 * 1. Creates a Firebase Auth user (email/password)
 * 2. Creates the admin document in Firestore admins collection
 * 
 * Usage:
 * node setup-admin.js <email> <password>
 * 
 * Example:
 * node setup-admin.js admin@usdfg.pro MySecurePassword123
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "10599746981",
  appId: "1:10599746981:web:97ce124f98f9b96872c4c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📝 Usage: node setup-admin.js <email> <password>

Example:
  node setup-admin.js admin@usdfg.pro MySecurePassword123

This script will:
  1. Create a Firebase Auth user with email/password
  2. Create an admin document in Firestore admins collection
  
⚠️  IMPORTANT: Before running this script:
  1. Go to Firebase Console: https://console.firebase.google.com/project/usdfg-app/authentication/providers
  2. Enable "Email/Password" authentication provider
  3. Then run this script
    `);
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];

  // Validate email format
  if (!email.includes('@')) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  // Validate password length
  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  try {
    console.log('🔧 Setting up admin user...');
    console.log(`   Email: ${email}`);
    
    // Step 1: Create Firebase Auth user
    console.log('\n📝 Step 1: Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    console.log(`✅ Firebase Auth user created!`);
    console.log(`   UID: ${uid}`);
    
    // Step 2: Create admin document in Firestore
    console.log('\n📝 Step 2: Creating admin document in Firestore...');
    const adminRef = doc(db, 'admins', uid);
    
    await setDoc(adminRef, {
      uid: uid,
      email: email,
      createdAt: Timestamp.now(),
      active: true,
      addedBy: 'system' // First admin added by system
    });
    
    console.log(`✅ Admin document created!`);
    console.log(`   Collection: admins`);
    console.log(`   Document ID: ${uid}`);
    
    console.log('\n🎉 Admin setup complete!');
    console.log('\n📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${uid}`);
    console.log(`   Status: Active`);
    console.log(`\n✅ You can now log in at: https://usdfg.pro/admin/disputes`);
    console.log(`\n⚠️  Next steps:`);
    console.log(`   1. Deploy updated Firestore rules: firebase deploy --only firestore:rules`);
    console.log(`   2. Test login at /admin/disputes`);
    console.log(`   3. Connect wallet to resolve disputes`);
    
  } catch (error) {
    console.error('\n❌ Error setting up admin:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.error('\n⚠️  User already exists. You can:');
      console.error('   1. Use a different email');
      console.error('   2. Or manually create admin document in Firestore:');
      console.error(`      Collection: admins`);
      console.error(`      Document ID: <user-uid>`);
      console.error(`      Fields: { uid, email, createdAt, active: true }`);
    } else if (error.code === 'auth/operation-not-allowed') {
      console.error('\n⚠️  Email/Password authentication is not enabled!');
      console.error('   Please enable it in Firebase Console:');
      console.error('   https://console.firebase.google.com/project/usdfg-app/authentication/providers');
      console.error('   Then click "Email/Password" → Enable → Save');
    } else if (error.code === 'permission-denied') {
      console.error('\n⚠️  Permission denied. Make sure Firestore rules allow creating admin documents.');
      console.error('   You may need to temporarily allow writes to admins collection,');
      console.error('   or create the admin document manually in Firebase Console.');
    }
    
    process.exit(1);
  }
}

setupAdmin();
