import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { enforceRateLimit, clientIpFromRequest } from "./rateLimit";
import { verifyAndConsumeWalletNonce } from "./walletSignatureVerify";
import { migrateChallengeParticipantUids } from "./migrateChallengeParticipantUids";

const NONCE_COLLECTION = "wallet_recovery_nonces";
const REGION = { region: "us-central1" as const };

/**
 * Rebind usersByWallet to the active Firebase session after wallet signature proof.
 * Preserves usersByWallet as source of truth; updates stale anonymous UID mappings only.
 */
export const rebindWalletIdentity = onCall(REGION, async (request) => {
  const newUid = request.auth?.uid;
  if (!newUid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }

  const addressRaw = request.data?.address as string | undefined;
  const signatureB64 = request.data?.signature as string | undefined;
  const nonce = request.data?.nonce as string | undefined;
  const migrateChallenges = request.data?.migrateChallenges !== false;

  if (!addressRaw || !signatureB64 || nonce === undefined || nonce === null) {
    throw new HttpsError("invalid-argument", "address, signature, and nonce are required");
  }

  const { normalized, displayAddress } = await verifyAndConsumeWalletNonce({
    collection: NONCE_COLLECTION,
    nonce,
    addressRaw,
    signatureB64,
  });

  await enforceRateLimit(`wallet_rebind_addr_${normalized}`);
  await enforceRateLimit(`wallet_rebind_ip_${clientIpFromRequest(request.rawRequest)}`);

  const db = getFirestore();
  const walletRef = db.collection("usersByWallet").doc(normalized);
  const walletSnap = await walletRef.get();

  if (!walletSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Wallet is not linked yet. Connect normally to create a binding."
    );
  }

  const walletData = walletSnap.data() ?? {};
  const previousUid = typeof walletData.uid === "string" ? walletData.uid.trim() : "";

  if (!previousUid) {
    throw new HttpsError("failed-precondition", "Invalid usersByWallet record");
  }

  if (previousUid === newUid) {
    return {
      ok: true,
      alreadyBound: true,
      wallet: normalized,
      uid: newUid,
      challengeMigration: { scanned: 0, updated: 0, challengeIds: [] },
    };
  }

  const originalCreatedAt = walletData.createdAt;

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(walletRef);
    if (!fresh.exists) {
      throw new HttpsError("failed-precondition", "Wallet binding disappeared during recovery");
    }
    const currentUid = String(fresh.data()?.uid ?? "").trim();
    if (currentUid !== previousUid) {
      throw new HttpsError(
        "aborted",
        "Wallet binding changed during recovery. Retry."
      );
    }

    tx.delete(walletRef);
    tx.set(walletRef, {
      uid: newUid,
      walletAddress: displayAddress,
      createdAt: originalCreatedAt ?? FieldValue.serverTimestamp(),
      recoveredAt: FieldValue.serverTimestamp(),
      previousUid,
      recoveredBy: "wallet_signature",
    });

    const userRef = db.collection("users").doc(newUid);
    tx.set(
      userRef,
      {
        walletAddress: displayAddress,
        recoveredFromUid: previousUid,
        recoveredAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  let challengeMigration = { scanned: 0, updated: 0, challengeIds: [] as string[] };
  if (migrateChallenges) {
    challengeMigration = await migrateChallengeParticipantUids(
      previousUid,
      newUid,
      normalized
    );
  }

  await db.collection("wallet_identity_recovery").add({
    wallet: normalized,
    walletAddress: displayAddress,
    previousUid,
    newUid,
    migrateChallenges,
    challengeMigration,
    recoveredAt: FieldValue.serverTimestamp(),
    method: "wallet_signature",
  });

  return {
    ok: true,
    alreadyBound: false,
    wallet: normalized,
    uid: newUid,
    previousUid,
    challengeMigration,
  };
});
