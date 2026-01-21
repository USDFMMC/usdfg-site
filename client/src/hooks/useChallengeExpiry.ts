import { useEffect, useRef } from "react";
import { updateChallengeStatus, cleanupExpiredChallenge, cleanupCompletedChallenge, archiveChallenge, revertCreatorTimeout } from "../lib/firebase/firestore";

/**
 * Watches all active challenges and auto-marks them completed when expired.
 * Displays an "Expired" tag for 5 seconds before archiving.
 */
export function useChallengeExpiry(challenges: any[]) {
  const processedChallenges = useRef(new Set<string>());
  const archiveTimers = useRef(new Map<string, NodeJS.Timeout>());
  const completedRetentionHours = 2;

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        // Check creator funding deadline expiry (auto-revert if deadline passed)
        if (challenge.status === "creator_confirmation_required" && challenge.creatorFundingDeadline) {
          const deadlineMs = challenge.creatorFundingDeadline.toMillis ? challenge.creatorFundingDeadline.toMillis() : challenge.creatorFundingDeadline;
          if (deadlineMs < now) {
            // Deadline expired - revert challenge to pending
            if (!processedChallenges.current.has(challenge.id + '_revert_creator')) {
              console.log("⏰ Creator funding deadline expired - reverting challenge:", challenge.id);
              processedChallenges.current.add(challenge.id + '_revert_creator');
              
              revertCreatorTimeout(challenge.id).then(() => {
                console.log("✅ Challenge reverted after creator deadline expiry:", challenge.id);
                processedChallenges.current.delete(challenge.id + '_revert_creator');
              }).catch((error) => {
                console.error("❌ Failed to revert challenge after deadline:", error);
                processedChallenges.current.delete(challenge.id + '_revert_creator');
              });
            }
            continue; // Skip other expiry checks for this challenge
          }
        }
        
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
            // Mark as expired (NOT completed - we use "expired" for time-outs)
            await updateChallengeStatus(challenge.id, "expired");
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
        
        // Auto-cleanup expired challenges (delete immediately to save storage)
        if (challenge.status === "expired" && !archiveTimers.current.has(challenge.id) && !processedChallenges.current.has(challenge.id + '_cleanup')) {
          console.log("🗑️ Found expired challenge that needs cleanup:", challenge.id);
          processedChallenges.current.add(challenge.id + '_cleanup');

          // Cleanup immediately (no need to wait since it's already expired)
          setTimeout(async () => {
            try {
              await cleanupExpiredChallenge(challenge.id);
              console.log("🏁 Expired challenge cleaned up:", challenge.id);
              processedChallenges.current.delete(challenge.id + '_cleanup');
            } catch (error) {
              console.error("❌ Failed to cleanup expired challenge:", error);
              processedChallenges.current.delete(challenge.id + '_cleanup');
            }
          }, 1000); // Short delay to show "Expired" status
        }

        // Auto-cleanup completed challenges (delete after short retention window)
        if (challenge.status === "completed" && !archiveTimers.current.has(challenge.id) && !processedChallenges.current.has(challenge.id + '_cleanup_completed')) {
          const completedTime = challenge.results ? 
            Math.max(...Object.values(challenge.results).map(r => r.submittedAt.toMillis())) : 
            challenge.createdAt.toMillis();
          
          const hoursSinceCompletion = (Date.now() - completedTime) / (1000 * 60 * 60);
          
          if (hoursSinceCompletion >= completedRetentionHours) {
            console.log(`🗑️ Found completed challenge that needs cleanup (${completedRetentionHours}h old):`, challenge.id);
            processedChallenges.current.add(challenge.id + '_cleanup_completed');

            setTimeout(async () => {
              try {
                await cleanupCompletedChallenge(challenge.id);
                console.log("🏁 Completed challenge cleaned up (24h old):", challenge.id);
                processedChallenges.current.delete(challenge.id + '_cleanup_completed');
              } catch (error) {
                console.error("❌ Failed to cleanup completed challenge:", error);
                processedChallenges.current.delete(challenge.id + '_cleanup_completed');
              }
            }, 1000);
          }
        }
      }
    };

    // Check immediately
    checkExpired();

    // Then check every 30 seconds
    const interval = setInterval(checkExpired, 30000);

    return () => {
      clearInterval(interval);
      // Clear any pending archive timers on cleanup
      archiveTimers.current.forEach(timer => clearTimeout(timer));
      archiveTimers.current.clear();
    };
  }, [challenges]);
}
