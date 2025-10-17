import { useState, useEffect } from 'react';
import { ChallengeData, listenToChallenges, fetchChallenges, listenToUserChallenges } from '@/lib/firebase/firestore';

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = listenToChallenges(async (newChallenges) => {
      setChallenges(newChallenges);
      setLoading(false);
      setError(null);
      
      // Sync status for challenges that have PDAs
      for (const challenge of newChallenges) {
        const challengePDA = challenge.rawData?.pda || challenge.pda;
        if (challengePDA) {
          try {
            const { syncChallengeStatus } = await import('@/lib/firebase/firestore');
            await syncChallengeStatus(challenge.id, challengePDA);
          } catch (error) {
            console.error('Error syncing challenge status:', error);
          }
        }
      }
    });

    // Fallback: fetch challenges once if listener fails
    const fetchInitialChallenges = async () => {
      try {
        const initialChallenges = await fetchChallenges();
        if (initialChallenges.length > 0) {
          setChallenges(initialChallenges);
          
          // Sync status for challenges that have PDAs
          for (const challenge of initialChallenges) {
            const challengePDA = challenge.rawData?.pda || challenge.pda;
            if (challengePDA) {
              try {
                const { syncChallengeStatus } = await import('@/lib/firebase/firestore');
                await syncChallengeStatus(challenge.id, challengePDA);
              } catch (error) {
                console.error('Error syncing challenge status:', error);
              }
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
