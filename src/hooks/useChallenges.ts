import { useState, useEffect, useRef } from 'react';
import type { ChallengeData } from '@/lib/firebase/firestore';
import { listenToChallenges, fetchChallenges, listenToUserChallenges } from '@/lib/firebase/firestore';

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSyncedAtRef = useRef<Map<string, number>>(new Map());
  const inFlightSyncRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = listenToChallenges(async (newChallenges) => {
      setChallenges(newChallenges);
      setLoading(false);
      setError(null);
      
      // Lightweight reconciliation (throttled per challenge id).
      // Purpose: self-heal when on-chain tx succeeds but Firestore write fails.
      // Safe guards:
      // - Never overwrite Firestore 'completed' with on-chain 'active' (handled in syncChallengeStatus).
      // - Only sync when a PDA exists.
      const now = Date.now();
      const minIntervalMs = 30_000;
      for (const challenge of newChallenges) {
        const challengeId = challenge.id;
        if (!challengeId) continue;

        const challengePDA = (challenge.rawData as any)?.pda || (challenge as any).pda;
        if (!challengePDA) continue;

        if (inFlightSyncRef.current.has(challengeId)) continue;

        const last = lastSyncedAtRef.current.get(challengeId) ?? 0;
        if (now - last < minIntervalMs) continue;

        inFlightSyncRef.current.add(challengeId);
        void (async () => {
          try {
            const { syncChallengeStatus } = await import('@/lib/firebase/firestore');
            await syncChallengeStatus(challengeId, challengePDA);
            // Only advance throttle timestamp after a successful sync call.
            lastSyncedAtRef.current.set(challengeId, Date.now());
          } catch (syncError) {
            console.error('Error syncing challenge status:', syncError);
            // Don't advance the throttle timestamp on failure so we can retry soon.
          } finally {
            inFlightSyncRef.current.delete(challengeId);
          }
        })();
      }
    });

    // Fallback: fetch challenges once if listener fails
    const fetchInitialChallenges = async () => {
      try {
        const initialChallenges = await fetchChallenges();
        if (initialChallenges.length > 0) {
          setChallenges(initialChallenges);
          
          // Trigger a one-time reconciliation pass for fetched data (same throttling rules).
          const now = Date.now();
          const minIntervalMs = 30_000;
          for (const challenge of initialChallenges) {
            const challengeId = challenge.id;
            if (!challengeId) continue;
            const challengePDA = (challenge.rawData as any)?.pda || (challenge as any).pda;
            if (!challengePDA) continue;
            if (inFlightSyncRef.current.has(challengeId)) continue;
            const last = lastSyncedAtRef.current.get(challengeId) ?? 0;
            if (now - last < minIntervalMs) continue;
            inFlightSyncRef.current.add(challengeId);
            try {
              const { syncChallengeStatus } = await import('@/lib/firebase/firestore');
              await syncChallengeStatus(challengeId, challengePDA);
              lastSyncedAtRef.current.set(challengeId, Date.now());
            } catch (syncError) {
              console.error('Error syncing challenge status:', syncError);
            } finally {
              inFlightSyncRef.current.delete(challengeId);
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch initial challenges:', err);
        setError('Failed to load challenges');
      }
    };

    fetchInitialChallenges();

    return () => unsubscribe();
  }, []);

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
