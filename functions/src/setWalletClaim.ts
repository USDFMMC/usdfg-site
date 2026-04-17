import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

function isBase58Like(wallet: string): boolean {
  // Solana pubkeys are base58, typically 32 bytes => 43-44 chars, but allow a safe range.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
}

/**
 * Callable: setWalletClaim
 * Input: { walletAddress: string }
 * Requires: authenticated Firebase user (including anonymous).
 * Sets custom claim: { wallet: walletAddressLowercase }
 */
export const setWalletClaim = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in to link wallet.");
  }

  const walletAddress = String((request.data as any)?.walletAddress || "").trim();
  if (!walletAddress || !isBase58Like(walletAddress)) {
    throw new HttpsError("invalid-argument", "Invalid wallet address.");
  }

  const walletLower = walletAddress.toLowerCase();
  const uid = request.auth.uid;

  const user = await admin.auth().getUser(uid);
  const existing = (user.customClaims || {}) as Record<string, unknown>;

  await admin.auth().setCustomUserClaims(uid, {
    ...existing,
    wallet: walletLower,
  });

  return { ok: true, wallet: walletLower };
});

