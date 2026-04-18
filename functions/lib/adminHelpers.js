"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminClaims = requireAdminClaims;
exports.writeAdminLog = writeAdminLog;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const normalizeAddress_1 = require("./normalizeAddress");
/** 15 minutes + 60s clock drift buffer */
const MAX_TOKEN_AGE_SEC = 960;
function staleAdminTokenError() {
    throw new https_1.HttpsError("permission-denied", "Stale admin token", {
        code: "STALE_ADMIN_TOKEN",
    });
}
function requireAdminClaims(request) {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError("permission-denied", "Admin verification required");
    }
    const token = request.auth.token;
    const now = Date.now() / 1000;
    const issuedAt = token.iat;
    if (!issuedAt || now - issuedAt > MAX_TOKEN_AGE_SEC) {
        staleAdminTokenError();
    }
    const uid = (0, normalizeAddress_1.normalizeAddress)(request.auth.uid);
    const wallet = (0, normalizeAddress_1.normalizeAddress)(token.wallet);
    if (!wallet || wallet !== uid) {
        throw new https_1.HttpsError("permission-denied", "Token integrity violation");
    }
    return wallet;
}
async function writeAdminLog(action, admin, targetId) {
    const db = (0, firestore_1.getFirestore)();
    await db.collection("admin_logs").add({
        action,
        admin,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
        targetId,
    });
}
//# sourceMappingURL=adminHelpers.js.map