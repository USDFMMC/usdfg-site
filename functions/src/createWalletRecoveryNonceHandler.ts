import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { normalizeAddress } from "./normalizeAddress";
import { enforceRateLimit, clientIpFromRequest } from "./rateLimit";
import { WALLET_NONCE_TTL_MS } from "./walletSignatureVerify";

const COLLECTION = "wallet_recovery_nonces";
const MAX_ACTIVE_NONCES_PER_ADDRESS = 2;
const REGION = { region: "us-central1" as const };

/**
 * Creates a wallet-bound nonce before the holder signs to recover a stale usersByWallet mapping.
 * Requires Firebase Auth (anonymous is fine).
 */
export const createWalletRecoveryNonce = onCall(REGION, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }

  const addressRaw = request.data?.address as string | undefined;
  if (!addressRaw || typeof addressRaw !== "string") {
    throw new HttpsError("invalid-argument", "address is required");
  }

  const normalized = normalizeAddress(addressRaw.trim());
  if (!normalized) {
    throw new HttpsError("invalid-argument", "Invalid address");
  }

  await enforceRateLimit(`wallet_recovery_nonce_addr_${normalized}`);
  await enforceRateLimit(
    `wallet_recovery_nonce_ip_${clientIpFromRequest(request.rawRequest)}`
  );

  const db = getFirestore();
  const since = Timestamp.fromMillis(Date.now() - WALLET_NONCE_TTL_MS);

  const recent = await db
    .collection(COLLECTION)
    .where("address", "==", normalized)
    .where("createdAt", ">=", since)
    .select("address", "createdAt")
    .limit(MAX_ACTIVE_NONCES_PER_ADDRESS)
    .get();

  if (recent.size >= MAX_ACTIVE_NONCES_PER_ADDRESS) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many active recovery nonces for this wallet. Wait and try again."
    );
  }

  const nonce = randomUUID();
  await db.collection(COLLECTION).doc(nonce).set({
    nonce,
    address: normalized,
    requestedByUid: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    used: false,
  });

  return { nonce };
});
