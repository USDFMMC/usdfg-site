import { useEffect, useMemo, useState } from "react";
import {
  signInAnonymously,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { auth } from "@/lib/firebase/config";
import { invokeAdminCallableWithRefresh } from "@/lib/firebase/adminApi";
import { normalizeAddress } from "@/utils/normalizeAddress";

const ADMIN_SESSION_MS = 10 * 60 * 1000;

function uint8ToBase64(u8: Uint8Array): string {
  let s = "";
  u8.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function clearAdminSessionStorage(): void {
  sessionStorage.removeItem("usdfg_admin_verified");
  sessionStorage.removeItem("usdfg_admin_verified_at");
}

function isClientSessionStale(): boolean {
  const at = sessionStorage.getItem("usdfg_admin_verified_at");
  if (!at) return true;
  const n = Number(at);
  if (Number.isNaN(n)) return true;
  return Date.now() - n > ADMIN_SESSION_MS;
}

type Phase =
  | "idle"
  | "checking"
  | "verifying"
  | "verified"
  | "unauthorized";

/**
 * Wallet proof + Firestore allowlist via createAdminNonce → sign → verifyAdmin → custom token.
 */
export function useAdminWalletAuth() {
  const { publicKey, connecting, signMessage, disconnect, connected } =
    useWallet();
  const [phase, setPhase] = useState<Phase>("idle");

  const address = useMemo(
    () => normalizeAddress(publicKey?.toString()),
    [publicKey]
  );

  useEffect(() => {
    if (connecting) return;

    if (!address || !connected || !publicKey) {
      setPhase("idle");
      return;
    }

    let cancelled = false;

    (async () => {
      setPhase("checking");

      try {
        if (isClientSessionStale()) {
          clearAdminSessionStorage();
          const u = auth.currentUser;
          if (u && !u.isAnonymous) {
            await signOut(auth);
            await signInAnonymously(auth);
          } else if (!u) {
            await signInAnonymously(auth);
          }
        }

        const user = auth.currentUser;
        if (user && !isClientSessionStale()) {
          const id = await user.getIdTokenResult(true);
          const claimWallet = normalizeAddress(
            id.claims.wallet as string | undefined
          );
          if (
            id.claims.admin === true &&
            claimWallet &&
            claimWallet === address
          ) {
            sessionStorage.setItem("usdfg_admin_verified", "1");
            if (!sessionStorage.getItem("usdfg_admin_verified_at")) {
              sessionStorage.setItem(
                "usdfg_admin_verified_at",
                String(Date.now())
              );
            }
            if (!cancelled) setPhase("verified");
            return;
          }
          if (id.claims.admin && claimWallet && claimWallet !== address) {
            await signOut(auth);
            await signInAnonymously(auth).catch(() => undefined);
          }
        }

        if (!signMessage) {
          clearAdminSessionStorage();
          if (!cancelled) setPhase("unauthorized");
          try {
            await disconnect();
          } catch {
            /* ignore */
          }
          return;
        }

        if (!cancelled) setPhase("verifying");

        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const nonceRes = await invokeAdminCallableWithRefresh<
          { address: string },
          { nonce: string }
        >("createAdminNonce", {
          address: publicKey.toString(),
        });
        const nonce = nonceRes.data?.nonce;
        if (!nonce) {
          throw new Error("Server did not return a nonce");
        }

        const message = new TextEncoder().encode(nonce);
        const sigBytes = await signMessage(message);
        const signature = uint8ToBase64(sigBytes);

        const result = await invokeAdminCallableWithRefresh<
          { address: string; signature: string; nonce: string },
          { customToken: string }
        >("verifyAdmin", {
          address: publicKey.toString(),
          signature,
          nonce,
        });

        const customToken = result.data?.customToken;
        if (!customToken) {
          throw new Error("Missing custom token");
        }

        await signInWithCustomToken(auth, customToken);
        sessionStorage.setItem("usdfg_admin_verified", "1");
        sessionStorage.setItem("usdfg_admin_verified_at", String(Date.now()));
        if (!cancelled) setPhase("verified");
      } catch {
        clearAdminSessionStorage();
        if (!cancelled) setPhase("unauthorized");
        try {
          await disconnect();
        } catch {
          /* ignore */
        }
        try {
          await signOut(auth);
          await signInAnonymously(auth);
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, connected, connecting, disconnect, publicKey, signMessage]);

  useEffect(() => {
    if (phase !== "verified") return;
    const id = setInterval(() => {
      auth.currentUser?.getIdToken(true).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [phase]);

  const isVerifying =
    !!address &&
    connected &&
    !connecting &&
    phase !== "verified" &&
    phase !== "unauthorized";

  return {
    address,
    connecting,
    isAdminVerified: phase === "verified",
    isUnauthorized: phase === "unauthorized",
    isVerifying,
  };
}
