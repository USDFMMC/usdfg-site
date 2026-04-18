import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const MAX_AGE_MS = 10 * 60 * 1000;
const BATCH_SIZE = 450;

/**
 * Removes stale nonce docs (older than 10 minutes) to limit database growth.
 */
export const pruneStaleAdminNonces = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Etc/UTC" },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.fromMillis(Date.now() - MAX_AGE_MS);

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
  }
);
