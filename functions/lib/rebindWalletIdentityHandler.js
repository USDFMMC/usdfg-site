"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebindWalletIdentity = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const rateLimit_1 = require("./rateLimit");
const walletSignatureVerify_1 = require("./walletSignatureVerify");
const migrateChallengeParticipantUids_1 = require("./migrateChallengeParticipantUids");
const NONCE_COLLECTION = "wallet_recovery_nonces";
/**
 * Rebind usersByWallet to the active Firebase session after wallet signature proof.
 * Preserves usersByWallet as source of truth; updates stale anonymous UID mappings only.
 */
exports.rebindWalletIdentity = (0, https_1.onCall)(async (request) => {
    const newUid = request.auth?.uid;
    if (!newUid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required");
    }
    const addressRaw = request.data?.address;
    const signatureB64 = request.data?.signature;
    const nonce = request.data?.nonce;
    const migrateChallenges = request.data?.migrateChallenges !== false;
    if (!addressRaw || !signatureB64 || nonce === undefined || nonce === null) {
        throw new https_1.HttpsError("invalid-argument", "address, signature, and nonce are required");
    }
    const { normalized, displayAddress } = await (0, walletSignatureVerify_1.verifyAndConsumeWalletNonce)({
        collection: NONCE_COLLECTION,
        nonce,
        addressRaw,
        signatureB64,
    });
    await (0, rateLimit_1.enforceRateLimit)(`wallet_rebind_addr_${normalized}`);
    await (0, rateLimit_1.enforceRateLimit)(`wallet_rebind_ip_${(0, rateLimit_1.clientIpFromRequest)(request.rawRequest)}`);
    const db = (0, firestore_1.getFirestore)();
    const walletRef = db.collection("usersByWallet").doc(normalized);
    const walletSnap = await walletRef.get();
    if (!walletSnap.exists) {
        throw new https_1.HttpsError("failed-precondition", "Wallet is not linked yet. Connect normally to create a binding.");
    }
    const walletData = walletSnap.data() ?? {};
    const previousUid = typeof walletData.uid === "string" ? walletData.uid.trim() : "";
    if (!previousUid) {
        throw new https_1.HttpsError("failed-precondition", "Invalid usersByWallet record");
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
            throw new https_1.HttpsError("failed-precondition", "Wallet binding disappeared during recovery");
        }
        const currentUid = String(fresh.data()?.uid ?? "").trim();
        if (currentUid !== previousUid) {
            throw new https_1.HttpsError("aborted", "Wallet binding changed during recovery. Retry.");
        }
        tx.delete(walletRef);
        tx.set(walletRef, {
            uid: newUid,
            walletAddress: displayAddress,
            createdAt: originalCreatedAt ?? firestore_1.FieldValue.serverTimestamp(),
            recoveredAt: firestore_1.FieldValue.serverTimestamp(),
            previousUid,
            recoveredBy: "wallet_signature",
        });
        const userRef = db.collection("users").doc(newUid);
        tx.set(userRef, {
            walletAddress: displayAddress,
            recoveredFromUid: previousUid,
            recoveredAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    let challengeMigration = { scanned: 0, updated: 0, challengeIds: [] };
    if (migrateChallenges) {
        challengeMigration = await (0, migrateChallengeParticipantUids_1.migrateChallengeParticipantUids)(previousUid, newUid, normalized);
    }
    await db.collection("wallet_identity_recovery").add({
        wallet: normalized,
        walletAddress: displayAddress,
        previousUid,
        newUid,
        migrateChallenges,
        challengeMigration,
        recoveredAt: firestore_1.FieldValue.serverTimestamp(),
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
//# sourceMappingURL=rebindWalletIdentityHandler.js.map