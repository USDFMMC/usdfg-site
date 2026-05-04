import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const CHAT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — chats are not retained
/** Settled challenges removed after 1h; long-term state lives in `player_stats` / `teams` only. */
const CHALLENGE_SETTLED_MIN_AGE_MS = 60 * 60 * 1000;

/**
 * Stateless platform housekeeping (runs on schedule when project supports v2 deploy):
 * - Chat messages older than 1h (`challenge_chats.timestamp`)
 * - Completed + paid + non-disputed challenges with `updatedAt` older than 1h
 * Does not touch gameplay, submit, payout, or stats writes — deletes only expired rows.
 */
export const cleanupPlatformData = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Etc/UTC",
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
    const nowMs = now.toMillis();
    const chatCutoff = Timestamp.fromMillis(nowMs - CHAT_MAX_AGE_MS);

    const chatSnapshot = await db
      .collectionGroup("challenge_chats")
      .where("timestamp", "<=", chatCutoff)
      .limit(100)
      .get();

    const challengeSnapshot = await db
      .collection("challenges")
      .where("status", "==", "completed")
      .where("payoutStatus", "==", "paid")
      .limit(50)
      .get();

    const batch = db.batch();
    let ops = 0;

    chatSnapshot.docs.forEach((d) => {
      batch.delete(d.ref);
      ops++;
    });

    challengeSnapshot.docs.forEach((d) => {
      const data = d.data();
      const updatedAt = data.updatedAt as Timestamp | undefined;
      if (
        updatedAt &&
        nowMs - updatedAt.toMillis() > CHALLENGE_SETTLED_MIN_AGE_MS &&
        !data.disputedBy
      ) {
        batch.delete(d.ref);
        ops++;
      }
    });

    if (ops === 0) {
      return;
    }

    try {
      await batch.commit();
    } catch (e) {
      logger.error("cleanupPlatformData batch failed", { error: String(e), ops });
    }
  }
);
