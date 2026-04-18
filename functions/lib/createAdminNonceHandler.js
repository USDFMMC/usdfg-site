"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminNonce = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
const normalizeAddress_1 = require("./normalizeAddress");
const rateLimit_1 = require("./rateLimit");
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const MAX_ACTIVE_NONCES_PER_ADDRESS = 2;
/**
 * Creates a bound nonce document before the client signs (admin_auth_nonces).
 */
exports.createAdminNonce = (0, https_1.onCall)(async (request) => {
    const addressRaw = request.data?.address;
    if (!addressRaw || typeof addressRaw !== "string") {
        throw new https_1.HttpsError("invalid-argument", "address is required");
    }
    const normalized = (0, normalizeAddress_1.normalizeAddress)(addressRaw.trim());
    if (!normalized) {
        throw new https_1.HttpsError("invalid-argument", "Invalid address");
    }
    await (0, rateLimit_1.enforceRateLimit)(`nonce_create_addr_${normalized}`);
    await (0, rateLimit_1.enforceRateLimit)(`nonce_create_ip_${(0, rateLimit_1.clientIpFromRequest)(request.rawRequest)}`);
    const db = (0, firestore_1.getFirestore)();
    const since = firestore_1.Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
    const recent = await db
        .collection("admin_auth_nonces")
        .where("address", "==", normalized)
        .where("createdAt", ">=", since)
        .select("address", "createdAt")
        .limit(2)
        .get();
    if (recent.size >= MAX_ACTIVE_NONCES_PER_ADDRESS) {
        throw new https_1.HttpsError("resource-exhausted", "Too many active nonces for this wallet. Wait or use an existing nonce.");
    }
    const nonce = (0, crypto_1.randomUUID)();
    const ref = db.collection("admin_auth_nonces").doc(nonce);
    await ref.set({
        nonce,
        address: normalized,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        used: false,
    });
    return { nonce };
});
//# sourceMappingURL=createAdminNonceHandler.js.map