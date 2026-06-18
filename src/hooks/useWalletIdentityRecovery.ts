import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { auth, db } from "@/lib/firebase/config";
import { walletIndexKey } from "@/lib/firebase/canonicalUid";
import { recoverWalletIdentityWithSignature } from "@/lib/firebase/walletRecoveryApi";
import { clearWalletBindBlocked } from "@/lib/wallet/walletBindingState";

export type WalletBindingMismatch = {
  walletKey: string;
  walletAddress: string;
  linkedUid: string;
  sessionUid: string;
};

type RecoveryPhase = "idle" | "checking" | "ready" | "recovering" | "recovered" | "error";

/**
 * Detects usersByWallet canonical UID != active Firebase session and offers
 * wallet-signature recovery (Cloud Function rebind).
 */
export function useWalletIdentityRecovery() {
  const { publicKey, connected, signMessage } = useWallet();
  const [sessionUid, setSessionUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [mismatch, setMismatch] = useState<WalletBindingMismatch | null>(null);
  const [phase, setPhase] = useState<RecoveryPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const walletAddress = useMemo(() => {
    if (!connected || !publicKey) return null;
    return publicKey.toString();
  }, [connected, publicKey]);

  const walletKey = useMemo(
    () => (walletAddress ? walletIndexKey(walletAddress) : null),
    [walletAddress]
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setSessionUid(user?.uid ?? null);
    });
  }, []);

  useEffect(() => {
    if (!walletKey || !walletAddress || !sessionUid) {
      setMismatch(null);
      setPhase("idle");
      return;
    }

    let cancelled = false;

    (async () => {
      setPhase("checking");
      setError(null);
      try {
        const snap = await getDoc(doc(db, "usersByWallet", walletKey));
        if (cancelled) return;

        if (!snap.exists()) {
          setMismatch(null);
          setPhase("idle");
          return;
        }

        const linkedUid = String(snap.data()?.uid ?? "").trim();
        if (!linkedUid || linkedUid === sessionUid) {
          setMismatch(null);
          setPhase("idle");
          return;
        }

        setMismatch({
          walletKey,
          walletAddress,
          linkedUid,
          sessionUid,
        });
        setPhase("ready");
      } catch (e) {
        if (!cancelled) {
          setMismatch(null);
          setPhase("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [walletKey, walletAddress, sessionUid]);

  const recover = useCallback(async (): Promise<boolean> => {
    if (!mismatch || !signMessage) {
      setError("Wallet must support message signing to recover identity.");
      return false;
    }

    setPhase("recovering");
    setError(null);

    try {
      const result = await recoverWalletIdentityWithSignature({
        address: mismatch.walletAddress,
        signMessage,
        migrateChallenges: true,
      });

      clearWalletBindBlocked(mismatch.walletKey);
      setMismatch(null);
      setPhase("recovered");
      console.info("[wallet-recovery] rebound", result);
      return true;
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setPhase("ready");
      setError(msg);
      return false;
    }
  }, [mismatch, signMessage]);

  return {
    mismatch,
    phase,
    error,
    canRecover: phase === "ready" && !!signMessage,
    isRecovering: phase === "recovering",
    isRecovered: phase === "recovered",
    recover,
  };
}
