import { useEffect, useRef } from "react";
import {
  canActOnChallengeAsParticipant,
  handleExpiredCreatorFundingDeadline,
  handleExpiredJoinerFundingDeadline,
} from "../lib/firebase/firestore";

/**
 * Pre-fund funding deadlines: auto-cancel/revert when expired.
 * Participant-gated (Firestore rules require creator or opponent UID).
 */
export function useChallengeExpiry(
  challenges: any[],
  actingWallet: string | null | undefined,
  callbacks?: {
    onCreatorFundingCancelled?: (challengeId: string) => void;
    onJoinerFundingExpired?: (challengeId: string) => void;
  }
) {
  const processedChallenges = useRef(new Set<string>());

  useEffect(() => {
    if (!challenges?.length) return;

    const checkExpired = async () => {
      const now = Date.now();

      for (const challenge of challenges) {
        if (!canActOnChallengeAsParticipant(challenge, actingWallet)) continue;

        if (challenge.status === "creator_confirmation_required") {
          const deadline = challenge.creatorFundingDeadline;
          if (!deadline) continue;
          const deadlineMs = deadline.toMillis ? deadline.toMillis() : deadline;
          if (deadlineMs >= now) continue;

          const processKey = `${challenge.id}_creator_funding_expiry`;
          if (processedChallenges.current.has(processKey)) continue;
          processedChallenges.current.add(processKey);

          handleExpiredCreatorFundingDeadline(challenge.id, actingWallet)
            .then((result) => {
              processedChallenges.current.delete(processKey);
              if (result === "cancelled") {
                callbacks?.onCreatorFundingCancelled?.(challenge.id);
              }
            })
            .catch((error) => {
              console.error("❌ Failed to handle creator funding deadline:", error);
              processedChallenges.current.delete(processKey);
            });
          continue;
        }

        if (challenge.status === "creator_funded") {
          const deadline = challenge.joinerFundingDeadline;
          if (!deadline) continue;
          const deadlineMs = deadline.toMillis ? deadline.toMillis() : deadline;
          if (deadlineMs >= now) continue;

          const processKey = `${challenge.id}_joiner_funding_expiry`;
          if (processedChallenges.current.has(processKey)) continue;
          processedChallenges.current.add(processKey);

          handleExpiredJoinerFundingDeadline(challenge.id, actingWallet)
            .then((handled) => {
              processedChallenges.current.delete(processKey);
              if (handled) {
                callbacks?.onJoinerFundingExpired?.(challenge.id);
              }
            })
            .catch((error) => {
              console.error("❌ Failed to handle joiner funding deadline:", error);
              processedChallenges.current.delete(processKey);
            });
        }
      }
    };

    checkExpired();
    const interval = setInterval(checkExpired, 60000);
    return () => clearInterval(interval);
  }, [challenges, actingWallet, callbacks]);
}
