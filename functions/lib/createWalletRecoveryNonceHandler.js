"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWalletRecoveryNonce = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
const normalizeAddress_1 = require("./normalizeAddress");
const rateLimit_1 = require("./rateLimit");
const walletSignatureVerify_1 = require("./walletSignatureVerify");
const COLLECTION = "wallet_recovery_nonces";
const MAX_ACTIVE_NONCES_PER_ADDRESS = 2;
/**
 * Creates a wallet-bound nonce before the holder signs to recover a stale usersByWallet mapping.
 * Requires Firebase Auth (anonymous is fine).
 */
exports.createWalletRecoveryNonce = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required");
    }
    const addressRaw = request.data?.address;
    if (!addressRaw || typeof addressRaw !== "string") {
        throw new https_1.HttpsError("invalid-argument", "address is required");
    }
    const normalized = (0, normalizeAddress_1.normalizeAddress)(addressRaw.trim());
    if (!normalized) {
        throw new https_1.HttpsError("invalid-argument", "Invalid address");
    }
    await (0, rateLimit_1.enforceRateLimit)(`wallet_recovery_nonce_addr_${normalized}`);
    await (0, rateLimit_1.enforceRateLimit)(`wallet_recovery_nonce_ip_${(0, rateLimit_1.clientIpFromRequest)(request.rawRequest)}`);
    const db = (0, firestore_1.getFirestore)();
    const since = firestore_1.Timestamp.fromMillis(Date.now() - walletSignatureVerify_1.WALLET_NONCE_TTL_MS);
    const recent = await db
        .collection(COLLECTION)
        .where("address", "==", normalized)
        .where("createdAt", ">=", since)
        .select("address", "createdAt")
        .limit(MAX_ACTIVE_NONCES_PER_ADDRESS)
        .get();
    if (recent.size >= MAX_ACTIVE_NONCES_PER_ADDRESS) {
        throw new https_1.HttpsError("resource-exhausted", "Too many active recovery nonces for this wallet. Wait and try again.");
    }
    const nonce = (0, crypto_1.randomUUID)();
    await db.collection(COLLECTION).doc(nonce).set({
        nonce,
        address: normalized,
        requestedByUid: request.auth.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        used: false,
    });
    return { nonce };
});
//# sourceMappingURL=createWalletRecoveryNonceHandler.js.map