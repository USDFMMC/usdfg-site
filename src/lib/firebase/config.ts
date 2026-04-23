import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFunctions } from "firebase/functions";

/**
 * Cloudflare Pages: set all `VITE_FIREBASE_*` in Project → Settings → Environment variables
 * (Production / Preview). Source: Firebase Console → Project settings → Your apps → Web app.
 * No baked-in fallbacks — missing vars yield empty strings at build time.
 */
if (import.meta.env.PROD && !import.meta.env.VITE_FIREBASE_API_KEY?.trim()) {
  console.error(
    "[Firebase] Production build has no VITE_FIREBASE_API_KEY. Set all VITE_FIREBASE_* in Cloudflare Pages and redeploy."
  );
}

console.log("FIREBASE CONFIG:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export { app };

export const auth = getAuth(app);

signInAnonymously(auth).catch((err) => {
  console.error("ANON AUTH ERROR:", err);
});

onAuthStateChanged(auth, (user) => {
  console.log("AUTH USER:", user);
});

export const db = getFirestore(app);
/** Callable functions (must match Cloud Functions region deployment). */
export const functions = getFunctions(app, "us-central1");
