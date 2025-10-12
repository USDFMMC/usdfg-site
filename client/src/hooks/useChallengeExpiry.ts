import { useEffect, useRef } from "react";
import { updateChallengeStatus, archiveChallenge } from "../lib/firebase/firestore";

/**
 * Watches all active challenges and auto-marks them completed when expired.
 * Displays an "Expired" tag for 5 seconds before archiving.
 */
export function useChallengeExpiry(challenges: any[]) {
  const processedChallenges = useRef(new Set<string>());

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        if (!challenge.expiresAt) continue;
        
        // Skip if already processed
        if (processedChallenges.current.has(challenge.id)) continue;

        const expMs = challenge.expiresAt.toMillis ? challenge.expiresAt.toMillis() : challenge.expiresAt;
        const isExpired = expMs < now && (challenge.status === "active" || challenge.status === "pending");

        if (isExpired) {
          console.log("⏰ Auto-expiring challenge:", challenge.id);
          
          // Mark as processed to avoid duplicate processing
          processedChallenges.current.add(challenge.id);

          try {
            // Step 1: mark as completed
            await updateChallengeStatus(challenge.id, "completed");
            console.log("✅ Challenge marked as completed:", challenge.id);

            // Step 2: wait 5s so UI shows "Expired" before deleting
            setTimeout(async () => {
              try {
                await archiveChallenge(challenge.id);
                console.log("🏁 Challenge archived:", challenge.id);
                // Remove from processed set after archiving
                processedChallenges.current.delete(challenge.id);
              } catch (error) {
                console.error("❌ Failed to archive challenge:", error);
                processedChallenges.current.delete(challenge.id);
              }
            }, 5000);
          } catch (error) {
            console.error("❌ Failed to expire challenge:", error);
            processedChallenges.current.delete(challenge.id);
          }
        }
      }
    };

    // Check immediately
    checkExpired();

    // Then check every 5 seconds (TESTING - normally 30 seconds)
    const interval = setInterval(checkExpired, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [challenges]);
}
