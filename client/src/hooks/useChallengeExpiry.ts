import { useEffect, useRef } from "react";
import { cleanupCompletedChallenge, revertCreatorTimeout } from "../lib/firebase/firestore";

/**
 * Watches challenges for time-based maintenance.
 * - Reverts creator funding timeout
 * - Auto-cleans completed challenges after retention window
 */
export function useChallengeExpiry(challenges: any[]) {
  const processedChallenges = useRef(new Set<string>());
  const completedRetentionHours = 24;

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
        // Auto-cleanup completed challenges (delete after short retention window)
        if (challenge.status === "completed" && !processedChallenges.current.has(challenge.id + '_cleanup_completed')) {
          const toMillisSafe = (value: any): number | null => {
            if (!value) return null;
            if (typeof value === 'number') return value;
            if (typeof value.toMillis === 'function') return value.toMillis();
            if (value.seconds) return value.seconds * 1000;
            return null;
          };

          const resultTimes = challenge.results
            ? (Object.values(challenge.results)
                .map((r: any) => toMillisSafe(r?.submittedAt))
                .filter((ms: number | null) => ms !== null) as number[])
            : [];
          const completionFromResults = resultTimes.length ? Math.max(...resultTimes) : null;

          const completionTime =
            toMillisSafe(challenge.tournament?.completedAt) ??
            toMillisSafe(challenge.completedAt) ??
            completionFromResults ??
            toMillisSafe(challenge.resultDeadline) ??
            toMillisSafe(challenge.updatedAt);

          if (!completionTime) {
            // If we can't determine completion time, skip cleanup to avoid early deletion.
            continue;
          }

          const hoursSinceCompletion = (Date.now() - completionTime) / (1000 * 60 * 60);
          if (hoursSinceCompletion >= completedRetentionHours) {
            console.log(`🗑️ Found completed challenge that needs cleanup (${completedRetentionHours}h old):`, challenge.id);
            processedChallenges.current.add(challenge.id + '_cleanup_completed');

            setTimeout(async () => {
              try {
                await cleanupCompletedChallenge(challenge.id);
                console.log(`🏁 Completed challenge cleaned up (${completedRetentionHours}h old):`, challenge.id);
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
    };
  }, [challenges]);
}
