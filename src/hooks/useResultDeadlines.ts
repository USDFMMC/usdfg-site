import { useEffect, useRef } from 'react';
import type { ChallengeData } from '@/lib/firebase/firestore';
import { checkResultDeadline } from '@/lib/firebase/firestore';

/**
 * Hook to monitor and enforce result submission deadlines
 * Checks in-progress challenges every minute and applies deadline logic
 */
export function useResultDeadlines(challenges: ChallengeData[]) {
  const checkedChallenges = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!challenges || challenges.length === 0) return;

    // Filter to only in-progress challenges with deadlines
    const inProgressChallenges = challenges.filter(
      (c) =>
        (c.status === 'active' || c.status === 'in-progress') && c.resultDeadline
    );

    if (inProgressChallenges.length === 0) return;

    // Check each challenge's deadline
    const checkDeadlines = async () => {
      for (const challenge of inProgressChallenges) {
        const cid = challenge.id;
        if (!cid || !challenge.resultDeadline) continue;

        // Skip if already checked recently
        if (checkedChallenges.current.has(cid)) continue;

        const now = Date.now();
        const deadline = challenge.resultDeadline.toMillis();
        const timeSinceDeadline = now - deadline;

        // Check if deadline has passed (no time window restriction)
        if (timeSinceDeadline > 0) {
          try {
            await checkResultDeadline(cid);
            checkedChallenges.current.add(cid);
            
            // Remove from checked set after 10 minutes (allow re-check)
            setTimeout(() => {
              checkedChallenges.current.delete(cid);
            }, 10 * 60 * 1000);
          } catch (error) {
            console.error('❌ Error checking result deadline:', error);
          }
        }
      }
    };

    // Initial check
    checkDeadlines();

    // Check every minute
    const interval = setInterval(checkDeadlines, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [challenges]);
}

