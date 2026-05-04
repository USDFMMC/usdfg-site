import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

/**
 * Spark plan: no Firestore TTL — delete expired `challenge_submissions` by `expiresAt`.
 * Gameplay / submit paths unchanged; this job only removes audit rows past retention.
 */
export const cleanupAuditLogs = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Etc/UTC",
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();

    const snapshot = await db
      .collection("challenge_submissions")
      .where("expiresAt", "<=", now)
      .limit(100)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    try {
      await batch.commit();
    } catch (e) {
      logger.error("cleanupAuditLogs batch failed", { error: String(e) });
    }
  }
);
