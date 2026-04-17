import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

type AuthState = {
  user: User | null;
  loading: boolean;
};

/**
 * Ensures a Firebase Auth user exists (anonymous) and exposes auth state.
 * Firestore rules rely on request.auth and custom claims on the token.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState<boolean>(() => auth.currentUser == null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);

      if (!next) {
        signInAnonymously(auth).catch((err: unknown) => {
          console.error("[Firebase Auth] Anonymous sign-in failed:", err);
        });
      }
    });

    // Best-effort: if auth hasn't initialized yet, kick anonymous sign-in.
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err: unknown) => {
        console.error("[Firebase Auth] Anonymous sign-in failed:", err);
      });
    }

    return () => unsub();
  }, []);

  return useMemo(() => ({ user, loading }), [user, loading]);
}

