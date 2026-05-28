import { useEffect, useRef } from "react";
import { updateChallengeStatus, revertCreatorTimeout } from "../lib/firebase/firestore";

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

        // Founder Tournaments (admin-created, free entry, founder rewards): never auto-expire or auto-delete; admin deletes manually
        let isFounderTournament = false;
        try {
          const { ADMIN_WALLET } = await import("../lib/chain/config");
          const creator = (challenge.creator || challenge.rawData?.creator || '').toString().toLowerCase();
          const isAdmin = creator === ADMIN_WALLET.toString().toLowerCase();
          const isTournament = challenge.format === 'tournament' || !!challenge.tournament || !!challenge.rawData?.tournament;
          const isFree = (challenge.entryFee ?? challenge.rawData?.entryFee ?? 0) === 0 || (challenge.entryFee ?? 0) < 0.000000001;
          const hasFounderRewards = (challenge.founderParticipantReward ?? challenge.rawData?.founderParticipantReward ?? 0) > 0 || (challenge.founderWinnerBonus ?? challenge.rawData?.founderWinnerBonus ?? 0) > 0;
          isFounderTournament = isTournament && isAdmin && isFree && hasFounderRewards;
        } catch (_) {}
        if (isFounderTournament) continue; // Skip all auto-expire and auto-cleanup for Founder Tournaments

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

            // Wave 1A: client delete disabled — keep expired status only (no archive/delete).
          } catch (error) {
            console.error("❌ Failed to mark challenge as expired:", error);
            processedChallenges.current.delete(challenge.id);
          }
        }
        
        // Wave 1A: client cleanupExpiredChallenge disabled (allow delete: if false on challenges).
        // Expired rows may remain until server-side cleanup is implemented.

        // Wave 1A: completed auto-cleanup off until server job exists.
      }
    };

    // Check immediately
    checkExpired();

    // Then check every 30 seconds
    const interval = setInterval(checkExpired, 60000);

    return () => {
      clearInterval(interval);
      // Clear any pending archive timers on cleanup
      archiveTimers.current.forEach(timer => clearTimeout(timer));
      archiveTimers.current.clear();
    };
  }, [challenges]);
}
