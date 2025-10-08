import { useEffect } from "react";
import { updateChallengeStatus, archiveChallenge } from "../lib/firebase/firestore";

/**
 * Watches all active challenges and auto-marks them completed when expired.
 * Displays an "Expired" tag for 5 seconds before archiving.
 */
export function useChallengeExpiry(challenges: any[]) {
  useEffect(() => {
    if (!challenges?.length) return;

    const now = Date.now();

    challenges.forEach(async (c) => {
      if (!c.expiresAt) return;

      const expMs = c.expiresAt.toMillis ? c.expiresAt.toMillis() : c.expiresAt;
      const isExpired = expMs < now && (c.status === "active" || c.status === "pending");

      if (isExpired) {
        console.log("⏰ Auto-expiring challenge:", c.id);

        // Step 1: mark as completed
        await updateChallengeStatus(c.id, "completed");

        // Step 2: wait 5s so UI shows "Expired" before deleting
        setTimeout(async () => {
          await archiveChallenge(c.id);
          console.log("🏁 Challenge archived:", c.id);
        }, 5000);
      }
    });
  }, [challenges]);
}
