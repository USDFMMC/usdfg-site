import { useEffect, useRef } from "react";
import { updateChallengeStatus, archiveChallenge } from "../lib/firebase/firestore";

/**
 * Watches all active challenges and auto-marks them completed when expired.
 * Displays an "Expired" tag for 5 seconds before archiving.
 */
export function useChallengeExpiry(challenges: any[]) {
  const processedChallenges = useRef(new Set<string>());
  const archiveTimers = useRef(new Map<string, NodeJS.Timeout>());

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        if (!challenge.expiresAt) continue;
        
        const expMs = challenge.expiresAt.toMillis ? challenge.expiresAt.toMillis() : challenge.expiresAt;
        const isExpired = expMs < now;

        // Handle challenges that need to be marked as expired
        if (isExpired && (challenge.status === "active" || challenge.status === "pending")) {
          // Skip if already being processed
          if (processedChallenges.current.has(challenge.id)) continue;

          console.log("⏰ Auto-expiring challenge:", challenge.id);
          processedChallenges.current.add(challenge.id);

          try {
            // Mark as completed (expired)
            await updateChallengeStatus(challenge.id, "completed");
            console.log("✅ Challenge marked as expired:", challenge.id);

            // Schedule archival after 5 seconds
            const timer = setTimeout(async () => {
              try {
                await archiveChallenge(challenge.id);
                console.log("🏁 Challenge archived:", challenge.id);
                processedChallenges.current.delete(challenge.id);
                archiveTimers.current.delete(challenge.id);
              } catch (error) {
                console.error("❌ Failed to archive challenge:", error);
                processedChallenges.current.delete(challenge.id);
                archiveTimers.current.delete(challenge.id);
              }
            }, 5000);

            archiveTimers.current.set(challenge.id, timer);
          } catch (error) {
            console.error("❌ Failed to mark challenge as expired:", error);
            processedChallenges.current.delete(challenge.id);
          }
        }
        
        // Handle challenges that are already marked as completed but not archived
        // This catches any that failed to archive on previous attempts
        if (challenge.status === "completed" && !archiveTimers.current.has(challenge.id) && !processedChallenges.current.has(challenge.id + '_archive')) {
          console.log("🗑️ Found expired challenge that needs archiving:", challenge.id);
          processedChallenges.current.add(challenge.id + '_archive');

          // Archive immediately (no need to wait 5s since it's already been marked)
          setTimeout(async () => {
            try {
              await archiveChallenge(challenge.id);
              console.log("🏁 Challenge archived (cleanup):", challenge.id);
              processedChallenges.current.delete(challenge.id + '_archive');
            } catch (error) {
              console.error("❌ Failed to archive challenge (cleanup):", error);
              processedChallenges.current.delete(challenge.id + '_archive');
            }
          }, 2000); // Short delay to show "Expired" status
        }
      }
    };

    // Check immediately
    checkExpired();

    // Then check every 5 seconds (TESTING - normally 30 seconds)
    const interval = setInterval(checkExpired, 5000);

    return () => {
      clearInterval(interval);
      // Clear any pending archive timers on cleanup
      archiveTimers.current.forEach(timer => clearTimeout(timer));
      archiveTimers.current.clear();
    };
  }, [challenges]);
}
