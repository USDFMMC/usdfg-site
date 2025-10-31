// 🏆 Trophy System - Mystery Marketing Approach
// All trophy images are preserved in /assets/trophies/ folder

export interface Trophy {
  id: string;
  name: string;
  description: string;
  requiredGames: number;
  color: string;
  icon: string;
}

// 7-Tier Trophy System with Mystery Requirements
export const USDFG_RELICS: Trophy[] = [
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



