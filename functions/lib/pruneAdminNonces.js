"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneStaleAdminNonces = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const MAX_AGE_MS = 10 * 60 * 1000;
const BATCH_SIZE = 450;
/**
 * Removes stale nonce docs (older than 10 minutes) to limit database growth.
 */
exports.pruneStaleAdminNonces = (0, scheduler_1.onSchedule)({ schedule: "every 60 minutes", timeZone: "Etc/UTC" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - MAX_AGE_MS);
    for (let i = 0; i < 50; i++) {
        const snap = await db
            .collection("admin_auth_nonces")
            .where("createdAt", "<", cutoff)
            .limit(BATCH_SIZE)
            .get();
        if (snap.empty) {
            break;
        }
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
});
//# sourceMappingURL=pruneAdminNonces.js.map