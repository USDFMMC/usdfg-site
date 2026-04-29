import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { ChallengeData } from '@/lib/firebase/firestore';
import { listenToRecentChallenges, listenToUserChallenges } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase/config';

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
  const lastChallengesKeyRef = useRef<string>('');
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
      lastChallengesKeyRef.current = '';
      setChallenges([]);
      setLoading(false);
      setError(null);
      return;
    }

    lastChallengesKeyRef.current = '';
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

        const listKey = `${newChallenges.length}\u0001${newChallenges.map((c) => c.id ?? '').join('\u0001')}`;
        if (listKey !== lastChallengesKeyRef.current) {
          lastChallengesKeyRef.current = listKey;
          setChallenges(newChallenges);
        }

        setLoading(false);
        setError(null);

        const now = Date.now();
        const minIntervalMs = 30_000;
        for (const challenge of newChallenges) {
          const challengeId = challenge.id;
          if (!challengeId) continue;

          if (!challengeParticipantUidMatches(challenge, authUid)) continue;

          const challengePDA = (challenge.rawData as any)?.pda || (challenge as any).pda;
          if (!challengePDA) continue;

          if (inFlightSyncRef.current.has(challengeId)) continue;

          const last = lastSyncedAtRef.current.get(challengeId) ?? 0;
          if (now - last < minIntervalMs) continue;

          inFlightSyncRef.current.add(challengeId);
          void (async () => {
            try {
              await syncChallengeStatusWithRetry(challengeId, challengePDA);
              lastSyncedAtRef.current.set(challengeId, Date.now());
            } catch (syncError) {
              console.error('Error syncing challenge status:', syncError);
            } finally {
              inFlightSyncRef.current.delete(challengeId);
            }
          })();
        }
      },
      () => {
        setError('Failed to load challenges');
        setLoading(false);
      }
    );

    return () => {
      lastSyncedAtRef.current.clear();
      inFlightSyncRef.current.clear();
      lastChallengesKeyRef.current = '';
      unsubscribe();
    };
  }, [authUid]);

  return { challenges, loading, error };
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
