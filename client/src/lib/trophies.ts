// 🏆 Trophy System - Mystery Marketing Approach
// All trophy images are preserved in /assets/trophies/ folder

export interface Trophy {
  id: string;
  name: string;
  description: string;
  requiredGames: number;
  color: string;
  icon: string;
  specialCondition?: {
    type: 'totalUsers' | 'founderChallenge';
    maxUsers?: number; // Unlock only if total users < this number (for totalUsers type)
    requires?: string; // Special requirement (for founderChallenge type)
  };
}

// Trophy System with Mystery Requirements + Special Trophies
export const USDFG_RELICS: Trophy[] = [
  {
    id: 'og-1k',
    name: 'OG FIRST 2.1K MEMBERS',
    description: 'Pioneer of the Arena. You joined when we were just getting started. Exclusive to the first 2,100 members - representing USDFG\'s 21M token supply.',
    requiredGames: 0, // Not games-based
    color: 'gold',
    icon: '/assets/trophies/usdfg-21k.png',
    specialCondition: {
      type: 'totalUsers',
      maxUsers: 2100 // Unlock only if total unique users < 2100 (represents 21M token supply)
    }
  },
  {
    id: 'initiate',
    name: 'USDFG INITIATE',
    description: 'Your first steps into the arena. Every legend begins here.',
    requiredGames: 2,
    color: 'brown',
    icon: '/assets/trophies/usdfg-initiate.png'
  },
  {
    id: 'contender',
    name: 'USDFG CONTENDER',
    description: "You've proven you belong. The competition takes notice.",
    requiredGames: 10,
    color: 'gray',
    icon: '/assets/trophies/usdfg-contender.png'
  },
  {
    id: 'veteran',
    name: 'USDFG VETERAN',
    description: 'Battle-tested and battle-ready. Experience is your weapon.',
    requiredGames: 15,
    color: 'amber',
    icon: '/assets/trophies/usdfg-veteran.png'
  },
  {
    id: 'enforcer',
    name: 'USDFG ENFORCER',
    description: 'You maintain order in chaos. Justice through victory.',
    requiredGames: 30,
    color: 'cyan',
    icon: '/assets/trophies/usdfg-enforcer.png'
  },
  {
    id: 'unbroken',
    name: 'USDFG UNBROKEN',
    description: 'Through fire and fury, you stand unshaken. Unbreakable spirit.',
    requiredGames: 60,
    color: 'purple',
    icon: '/assets/trophies/usdfg-unbroken.png'
  },
  {
    id: 'disciple',
    name: 'USDFG DISCIPLE',
    description: "You've mastered the cycle. Every challenge remembers you.",
    requiredGames: 90,
    color: 'red',
    icon: '/assets/trophies/usdfg-disciple.png'
  },
  {
    id: 'immortal',
    name: 'USDFG IMMORTAL',
    description: 'Transcendent. Your legacy echoes through the ages.',
    requiredGames: 120,
    color: 'yellow',
    icon: '/assets/trophies/usdfg-immortal.png'
  },
  {
    id: 'founder-challenge',
    name: '🏆 FOUNDER CHALLENGE',
    description: 'You participated in a Founder Challenge. Earned free USDFG through skill-based competition.',
    requiredGames: 0, // Not games-based - special trophy
    color: 'purple',
    icon: '/assets/trophies/usdfg-founder-challenge.png',
    specialCondition: {
      type: 'founderChallenge',
      requires: 'participation' // Unlocked by participating in Founder Challenges
    }
  }
];

// Get all unlocked trophies for a player
export function getUnlockedTrophies(gamesPlayed: number): Trophy[] {
  return USDFG_RELICS.filter(trophy => gamesPlayed >= trophy.requiredGames);
}

// Get the next trophy a player is working towards
export function getNextTrophy(gamesPlayed: number): Trophy | null {
  return USDFG_RELICS.find(trophy => gamesPlayed < trophy.requiredGames) || null;
}

// Get progress percentage for a trophy (0-100)
export function getTrophyProgress(gamesPlayed: number, trophy: Trophy): number {
  if (gamesPlayed >= trophy.requiredGames) return 100;
  
  const previousTrophy = USDFG_RELICS.findLast(t => t.requiredGames < trophy.requiredGames);
  const startGames = previousTrophy ? previousTrophy.requiredGames : 0;
  const requiredGames = trophy.requiredGames - startGames;
  const currentProgress = gamesPlayed - startGames;
  
  return Math.min(100, Math.max(0, (currentProgress / requiredGames) * 100));
}

// Get CSS color class for trophy border/text
export function getTrophyColorClass(color: string): string {
  const colorMap: { [key: string]: string } = {
    'gold': 'text-yellow-400',
    'brown': 'text-amber-700',
    'gray': 'text-gray-400',
    'amber': 'text-amber-400',
    'cyan': 'text-cyan-400',
    'purple': 'text-purple-400',
    'red': 'text-red-400',
    'yellow': 'text-yellow-400'
  };
  return colorMap[color] || 'text-zinc-400';
}

/**
 * Get total unique wallet users from player_stats collection
 * This is used for special trophies like OG First 2.1K Members
 */
export async function getTotalUniqueUsers(): Promise<number> {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase/firestore');
    
    const statsCollection = collection(db, 'player_stats');
    const snapshot = await getDocs(statsCollection);
    
    return snapshot.size; // Each document is a unique wallet
  } catch (error) {
    console.error('❌ Error getting total unique users:', error);
    return 0; // Return 0 on error to be safe
  }
}

/**
 * Check if a special trophy should be unlocked
 */
export async function checkSpecialTrophy(trophy: Trophy): Promise<boolean> {
  if (!trophy.specialCondition) return false;
  
  if (trophy.specialCondition.type === 'totalUsers') {
    const totalUsers = await getTotalUniqueUsers();
    return totalUsers < trophy.specialCondition.maxUsers;
  }
  
  return false;
}

/**
 * Check if player has OG First 2.1K trophy from their stats
 */
export async function checkPlayerHasOgFirst1k(wallet: string): Promise<boolean> {
  try {
    const { getPlayerStats } = await import('./firebase/firestore');
    const playerStats = await getPlayerStats(wallet);
    return playerStats?.ogFirst1k === true;
  } catch (error) {
    console.error('❌ Error checking OG First 2.1K trophy:', error);
    return false;
  }
}

/**
 * Check if player has Founder Challenge trophy from their stats
 */
export async function checkPlayerHasFounderChallenge(wallet: string): Promise<boolean> {
  try {
    const { getPlayerStats } = await import('./firebase/firestore');
    const playerStats = await getPlayerStats(wallet);
    return playerStats?.founderChallenge === true;
  } catch (error) {
    console.error('❌ Error checking Founder Challenge trophy:', error);
    return false;
  }
}

/**
 * Get all unlocked trophies for a player (including special trophies)
 */
export async function getUnlockedTrophiesAdvanced(
  gamesPlayed: number,
  wallet?: string
): Promise<Trophy[]> {
  const unlocked: Trophy[] = [];
  
  for (const trophy of USDFG_RELICS) {
    // Check games-based trophies
    if (!trophy.specialCondition && gamesPlayed >= trophy.requiredGames) {
      unlocked.push(trophy);
    }
    // Check special condition trophies
    if (trophy.specialCondition && wallet) {
      if (trophy.id === 'og-1k') {
        // Check if player has it stored in their stats
        const hasTrophy = await checkPlayerHasOgFirst1k(wallet);
        if (hasTrophy) {
          unlocked.push(trophy);
        }
      } else if (trophy.id === 'founder-challenge') {
        // Check if player has participated in Founder Challenge
        const hasTrophy = await checkPlayerHasFounderChallenge(wallet);
        if (hasTrophy) {
          unlocked.push(trophy);
        }
      } else {
        // For other special trophies, check the condition
        const isUnlocked = await checkSpecialTrophy(trophy);
        if (isUnlocked) {
          unlocked.push(trophy);
        }
      }
    }
  }
  
  return unlocked;
}



