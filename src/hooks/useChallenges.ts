import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { ChallengeData } from '@/lib/firebase/firestore';
import {
  listenToRecentChallenges,
  listenToUserChallenges,
  fetchChallenges,
  repairChallengeFinalizationIfNeeded,
  repairLegacyCompletedActivityExpiresAt,
  RECENT_CHALLENGES_FEED_LIMIT,
} from '@/lib/firebase/firestore';
import { isLegacyCreateTimeExpiresAt } from '@/lib/utils/challenge-visibility';
import { auth } from '@/lib/firebase/config';
import { isLikelyRpcNetworkError } from '@/lib/chain/transaction-errors';
import { logSyncAudit, logSyncEligibilitySummary } from '@/lib/debug/sync-audit';

function challengeParticipantUidMatches(challenge: ChallengeData, uid: string | null): boolean {
  if (!uid) return false;
  if (challenge.createdByUid === uid) return true;
  if (challenge.opponentUid === uid) return true;
  const pu = challenge.playersUid;
  if (Array.isArray(pu) && pu.includes(uid)) return true;
  return false;
}

async function syncChallengeStatusWithRetry(challengeId: string, challengePDA: string): Promise<void> {
  const { syncChallengeStatus } = await import('@/lib/firebase/firestore');
  let lastError: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await syncChallengeStatus(challengeId, challengePDA);
      return;
    } catch (e) {
      lastError = e;
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, attempt === 0 ? 500 : 1000));
    }
  }
  throw lastError;
}

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** `undefined` = auth not resolved yet; do not attach Firestore listener. */
  const [authUid, setAuthUid] = useState<string | null | undefined>(undefined);
  const lastSyncedAtRef = useRef<Map<string, number>>(new Map());
  const inFlightSyncRef = useRef<Set<string>>(new Set());
  const legacyExpiresRepairRef = useRef<Set<string>>(new Set());
  const devListenerActiveLoggedRef = useRef(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid ?? null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (authUid === undefined) {
      setLoading(true);
      return;
    }

    if (authUid === null) {
      lastSyncedAtRef.current.clear();
      inFlightSyncRef.current.clear();
      setChallenges([]);
      setLoading(false);
      setError(null);
      return;
    }

    devListenerActiveLoggedRef.current = false;

    const unsubscribe = listenToRecentChallenges(
      100,
      async (newChallenges) => {
        if (import.meta.env.DEV) {
          if (!devListenerActiveLoggedRef.current) {
            devListenerActiveLoggedRef.current = true;
            console.log('[Challenges] listener active');
          }
          console.log('[Challenges] count:', newChallenges.length);
        }

        setChallenges(newChallenges);
        setLoading(false);
        setError(null);

        for (const challenge of newChallenges) {
          const challengeId = challenge.id;
          if (!challengeId || challenge.status !== 'completed') continue;
          if (legacyExpiresRepairRef.current.has(challengeId)) continue;
          const legacyInput = { ...challenge, rawData: challenge };
          if (!isLegacyCreateTimeExpiresAt(legacyInput)) continue;
          legacyExpiresRepairRef.current.add(challengeId);
          void repairLegacyCompletedActivityExpiresAt(challengeId).catch(() => {
            legacyExpiresRepairRef.current.delete(challengeId);
          });
        }

        const now = Date.now();
        const minIntervalMs = 30_000;
        let participantWithPda = 0;
        let skippedThrottle = 0;
        let skippedInFlight = 0;
        let startedSync = 0;
        const pdaChallengeIds: string[] = [];

        for (const challenge of newChallenges) {
          const challengeId = challenge.id;
          if (!challengeId) continue;
          if (import.meta.env.DEV) {
            console.log("CHALLENGE SNAPSHOT", challenge.id, challenge.status, challenge.pendingJoiner);
          }

          if (!challengeParticipantUidMatches(challenge, authUid)) continue;

          const snapStatus = challenge.status;
          if (
            snapStatus === 'active' ||
            snapStatus === 'in-progress' ||
            snapStatus === 'awaiting_auto_resolution'
          ) {
            void repairChallengeFinalizationIfNeeded(challengeId).catch(() => {});
          }

          const challengePDA = (challenge.rawData as any)?.pda || (challenge as any).pda;
          if (!challengePDA) continue;

          participantWithPda += 1;
          pdaChallengeIds.push(challengeId);

          if (inFlightSyncRef.current.has(challengeId)) {
            skippedInFlight += 1;
            continue;
          }

          const last = lastSyncedAtRef.current.get(challengeId) ?? 0;
          if (now - last < minIntervalMs) {
            skippedThrottle += 1;
            continue;
          }

          startedSync += 1;
          inFlightSyncRef.current.add(challengeId);
          void (async () => {
            try {
              logSyncAudit('syncChallengeStatus-start', {
                challengeId,
                firestoreStatus: challenge.status ?? null,
                pda: challengePDA,
              });
              await syncChallengeStatusWithRetry(challengeId, challengePDA);
              lastSyncedAtRef.current.set(challengeId, Date.now());
            } catch (syncError) {
              console.error('Error syncing challenge status:', syncError);
            } finally {
              inFlightSyncRef.current.delete(challengeId);
            }
          })();
        }

        logSyncEligibilitySummary({
          authUid: authUid ?? null,
          snapshotCount: 1,
          totalInSnapshot: newChallenges.length,
          participantWithPda,
          skippedThrottle,
          skippedInFlight,
          startedSync,
          pdaChallengeIds,
        });
      },
      (err) => {
        if ((err as any)?.code === 'resource-exhausted') {
          console.warn('[Firestore] quota hit — switching to fail-soft mode');
          setError(null);
          setLoading(false);
          return;
        }
        console.error('[Challenges] listener error:', err);
        if (isLikelyRpcNetworkError(err)) {
          setLoading(false);
          return;
        }
        setError('Failed to load challenges');
        setLoading(false);
      }
    );

    return () => {
      lastSyncedAtRef.current.clear();
      inFlightSyncRef.current.clear();
      legacyExpiresRepairRef.current.clear();
      unsubscribe();
    };
  }, [authUid]);

  /** One-shot fetch to align with Firestore when the realtime snapshot lags (same query as listener). */
  const refetchChallenges = useCallback(async (): Promise<ChallengeData[] | null> => {
    try {
      const data = await fetchChallenges();
      if (Array.isArray(data)) {
        setChallenges(data);
      }
      return data;
    } catch (err) {
      console.error('refetchChallenges failed', err);
      return null;
    }
  }, []);

  return { challenges, loading, error, refetchChallenges };
};

export const useUserChallenges = (userId: string) => {
  const [userChallenges, setUserChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUserChallenges([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenToUserChallenges(userId, (challenges) => {
      setUserChallenges(challenges);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [userId]);

  return { userChallenges, loading, error };
};
