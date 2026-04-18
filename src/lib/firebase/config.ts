import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "10599746981",
  appId: "1:10599746981:web:97ce124f98f9b96872c4c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Ensure a Firebase user exists before Firestore traffic (rules use request.auth).
// Email/password admin sessions replace this user; sign-out returns to unauthenticated
// and we sign in anonymously again.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((err: unknown) => {
      console.error("[Firebase Auth] Anonymous sign-in failed:", err);
    });
  }
});
