"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRateLimit = enforceRateLimit;
exports.clientIpFromRequest = clientIpFromRequest;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;
/**
 * Sliding window rate limit (Firestore-backed for multi-instance safety).
 */
async function enforceRateLimit(bucketId) {
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("_rate_limits").doc(bucketId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        if (!snap.exists) {
            tx.set(ref, {
                count: 1,
                windowStart: firestore_1.Timestamp.fromMillis(now),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return;
        }
        const d = snap.data();
        const start = d.windowStart.toMillis();
        const count = d.count ?? 0;
        if (now - start > WINDOW_MS) {
            tx.set(ref, {
                count: 1,
                windowStart: firestore_1.Timestamp.fromMillis(now),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return;
        }
        if (count >= MAX_PER_WINDOW) {
            throw new https_1.HttpsError("resource-exhausted", "Too many requests. Try again in a minute.");
        }
        tx.update(ref, {
            count: count + 1,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
}
function clientIpFromRequest(raw) {
    if (!raw?.headers)
        return "unknown";
    const xf = raw.headers["x-forwarded-for"];
    const first = typeof xf === "string"
        ? xf.split(",")[0]?.trim()
        : Array.isArray(xf)
            ? xf[0]?.split(",")[0]?.trim()
            : undefined;
    if (first)
        return first.replace(/[^a-fA-F0-9.:]/g, "_").slice(0, 128);
    const ip = raw.socket?.remoteAddress ?? "unknown";
    return String(ip).replace(/[^a-fA-F0-9.:]/g, "_").slice(0, 128);
}
//# sourceMappingURL=rateLimit.js.map