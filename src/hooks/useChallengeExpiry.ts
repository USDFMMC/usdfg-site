import { useEffect, useRef } from "react";
import {
  canActOnChallengeAsParticipant,
  handleExpiredCreatorFundingDeadline,
} from "../lib/firebase/firestore";

/**
 * Creator funding deadline: auto-cancel when joiner bound; auto-revert when no joiner.
 * Participant-gated for cancel path (Firestore rules).
 */
export function useChallengeExpiry(
  challenges: any[],
  actingWallet: string | null | undefined,
  onCreatorFundingCancelled?: (challengeId: string) => void
) {
  const processedChallenges = useRef(new Set<string>());

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        if (challenge.status !== "creator_confirmation_required") continue;
        const deadline = challenge.creatorFundingDeadline;
        if (!deadline) continue;

        const deadlineMs = deadline.toMillis ? deadline.toMillis() : deadline;
        if (deadlineMs >= now) continue;

        if (!canActOnChallengeAsParticipant(challenge, actingWallet)) continue;

        const processKey = `${challenge.id}_creator_funding_expiry`;
        if (processedChallenges.current.has(processKey)) continue;
        processedChallenges.current.add(processKey);

        handleExpiredCreatorFundingDeadline(challenge.id, actingWallet)
          .then((result) => {
            processedChallenges.current.delete(processKey);
            if (result === "cancelled") {
              onCreatorFundingCancelled?.(challenge.id);
            }
          })
          .catch((error) => {
            console.error("❌ Failed to handle creator funding deadline:", error);
            processedChallenges.current.delete(processKey);
          });
      }
    };

    checkExpired();
    const interval = setInterval(checkExpired, 60000);
    return () => clearInterval(interval);
  }, [challenges, actingWallet, onCreatorFundingCancelled]);
}
