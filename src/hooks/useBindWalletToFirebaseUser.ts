import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";

/**
 * Binds the currently connected wallet address to the current Firebase UID.
 * Writes to:
 * - users/{uid} (canonical)
 * - usersByWallet/{walletAddress} (index)
 *
 * Requirements:
 * - Do not overwrite walletAddress if it already exists.
 * - createdAt is only set on first creation.
 */
export function useBindWalletToFirebaseUser(): void {
  console.log("BIND HOOK START");

  const wallet = useWallet();
  const { connected, publicKey } = wallet;

  const walletAddress = useMemo(() => {
    if (!connected || !publicKey) return null;
    return publicKey.toString();
  }, [connected, publicKey]);

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      console.log("AUTH READY:", user?.uid);
      setUid(user?.uid ?? null);
    });
  }, []);

  useEffect(() => {
    console.log("WALLET:", walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    console.log("ATTEMPT BIND:", { uid, walletAddress });
    if (!uid || !walletAddress) return;

    let cancelled = false;

    (async () => {
      try {
        // Step B — check wallet is not already linked
        const walletRef = doc(db, "usersByWallet", walletAddress);
        const walletSnap = await getDoc(walletRef);

        if (cancelled) return;

        if (walletSnap.exists()) {
          const data = walletSnap.data() as { uid?: unknown } | undefined;
          const linkedUid = typeof data?.uid === "string" ? data.uid : "";
          if (linkedUid !== uid) {
            console.error("Wallet already linked to another user");
            return;
          }
        }

        // Step C — write canonical user (DO NOT overwrite createdAt)
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (cancelled) return;

        if (!userSnap.exists()) {
          console.log("WRITING USER DOC:", uid);
          await setDoc(userRef, {
            walletAddress,
            createdAt: serverTimestamp(),
          });
        } else {
          const data = userSnap.data() as { walletAddress?: unknown } | undefined;
          const existing =
            typeof data?.walletAddress === "string" ? data.walletAddress : "";
          if (!existing) {
            console.log("WRITING USER DOC:", uid);
            await updateDoc(userRef, {
              walletAddress,
            });
          }
        }

        // Step D — write wallet index
        if (!walletSnap.exists()) {
          await setDoc(walletRef, {
            uid,
            walletAddress,
            createdAt: serverTimestamp(),
          });
        }

        if (!cancelled) {
          console.log("BOUND USER:", { uid, walletAddress });
        }
      } catch (e) {
        console.error("[BindWalletToFirebaseUser] Failed to bind user", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, walletAddress]);
}

