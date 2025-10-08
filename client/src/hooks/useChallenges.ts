import { useState, useEffect } from 'react';
import { ChallengeData, listenToChallenges, fetchChallenges } from '@/lib/firebase/firestore';

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 Setting up real-time challenge listener...');
    
    // Set up real-time listener
    const unsubscribe = listenToChallenges((newChallenges) => {
      console.log('📡 Real-time update received:', newChallenges.length, 'challenges');
      setChallenges(newChallenges);
      setLoading(false);
      setError(null);
    });

    // Fallback: fetch challenges once if listener fails
    const fetchInitialChallenges = async () => {
      try {
        const initialChallenges = await fetchChallenges();
        if (initialChallenges.length > 0) {
          setChallenges(initialChallenges);
        }
      } catch (err) {
        console.error('❌ Failed to fetch initial challenges:', err);
        setError('Failed to load challenges');
      }
    };

    fetchInitialChallenges();

    return () => {
      console.log('🧹 Cleaning up challenge listener...');
      unsubscribe();
    };
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

    console.log('🔄 Setting up user challenge listener for:', userId);
    
    const { listenToUserChallenges } = require('@/lib/firebase/firestore');
    
    const unsubscribe = listenToUserChallenges(userId, (challenges) => {
      console.log('📡 User challenges update:', challenges.length, 'challenges');
      setUserChallenges(challenges);
      setLoading(false);
      setError(null);
    });

    return () => {
      console.log('🧹 Cleaning up user challenge listener...');
      unsubscribe();
    };
  }, [userId]);

  return { userChallenges, loading, error };
};
