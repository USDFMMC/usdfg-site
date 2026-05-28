import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

const SIGN_IN_TIMEOUT_MS = 15_000;

/**
 * Resolves when Firebase Auth has a user (anonymous sign-in from config.ts or retry).
 * Required before Firestore writes that need request.auth / createdByUid.
 */
export function ensureFirebaseSignedIn(): Promise<User> {
  const existing = auth.currentUser;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(
        new Error(
          "Firebase sign-in timed out. Check that Anonymous auth is enabled and refresh the page."
        )
      );
    }, SIGN_IN_TIMEOUT_MS);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timeout);
      unsub();
      resolve(user);
    });

    signInAnonymously(auth).catch((err) => {
      clearTimeout(timeout);
      unsub();
      reject(err);
    });
  });
}
