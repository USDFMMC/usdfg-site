import { useEffect, useRef } from "react";
import { revertCreatorTimeout } from "../lib/firebase/firestore";

/**
 * Creator funding deadline: auto-revert when joiner never bound (no joiner on doc).
 * Matchmaking (expirationTimer) and completed activity (expiresAt) are UI-only in filters.
 */
export function useChallengeExpiry(challenges: any[]) {
  const processedChallenges = useRef(new Set<string>());

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        if (challenge.status === "creator_confirmation_required" && challenge.creatorFundingDeadline) {
          const deadlineMs = challenge.creatorFundingDeadline.toMillis
            ? challenge.creatorFundingDeadline.toMillis()
            : challenge.creatorFundingDeadline;
          if (deadlineMs < now) {
            if (!processedChallenges.current.has(challenge.id + '_revert_creator')) {
              processedChallenges.current.add(challenge.id + '_revert_creator');

              revertCreatorTimeout(challenge.id)
                .then(() => {
                  processedChallenges.current.delete(challenge.id + '_revert_creator');
                })
                .catch((error) => {
                  console.error("❌ Failed to revert challenge after deadline:", error);
                  processedChallenges.current.delete(challenge.id + '_revert_creator');
                });
            }
          }
        }
      }
    };

    checkExpired();
    const interval = setInterval(checkExpired, 60000);
    return () => clearInterval(interval);
  }, [challenges]);
}
