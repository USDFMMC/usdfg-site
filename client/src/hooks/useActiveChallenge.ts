import { useEffect, useState } from "react";
import { listenActiveForCreator } from "../lib/firebase/firestore";

export function useActiveChallenge(walletAddress?: string | null) {
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) { 
      setActive([]); 
      setLoading(false);
      return; 
    }

    console.log("🔍 Checking active challenges for:", walletAddress.slice(0, 8) + "...");
    setLoading(true);
    setError(null);

    const unsubscribe = listenActiveForCreator(walletAddress, (activeChallenges) => {
      console.log("📡 Active challenge update:", activeChallenges.length, "challenges");
      setActive(activeChallenges);
      setLoading(false);
      setError(null);
    });

    return () => {
      console.log("🧹 Cleaning up active challenge listener...");
      unsubscribe();
    };
  }, [walletAddress]);

  return { active, loading, error };
}