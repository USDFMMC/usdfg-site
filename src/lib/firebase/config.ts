import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
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

let resolveAuthReady: () => void = () => {};
/** Resolves after persisted auth is restored (or anonymous sign-in attempted). */
export const authReady: Promise<void> = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

function formatAuthError(err: unknown): string {
  const code = String((err as { code?: string })?.code ?? "");
  const msg = String((err as { message?: string })?.message ?? err);
  if (code === "auth/requests-from-referer-blocked" || msg.includes("referer")) {
    return (
      "Firebase Auth blocked this site URL. In Google Cloud → Credentials → your Web API key, " +
      "add this origin under HTTP referrers (or set Application restrictions to None for dev)."
    );
  }
  if (code === "auth/operation-not-allowed") {
    return "Anonymous sign-in is disabled. Enable Anonymous in Firebase Console → Authentication → Sign-in method.";
  }
  return msg || "Firebase sign-in failed";
}

void (async () => {
  try {
    await auth.authStateReady();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (err: unknown) {
    console.error("[Firebase Auth]", formatAuthError(err), err);
  } finally {
    resolveAuthReady();
  }
})();

/** Wait for bootstrap, then ensure a signed-in Firebase user (reuses persisted anonymous session). */
export async function ensureFirebaseSignedIn(): Promise<string> {
  await authReady;
  await auth.authStateReady();

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err: unknown) {
      throw new Error(formatAuthError(err));
    }
  }

  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Firebase sign-in failed. Refresh the page and try again.");
  }
  return uid;
}

export const db = getFirestore(app);
/** Callable functions (must match Cloud Functions region deployment). */
export const functions = getFunctions(app, "us-central1");
