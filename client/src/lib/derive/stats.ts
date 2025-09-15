import { ChallengeEvent } from './chain/events';

export interface PlayerStats {
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  currentStreak: number;
  bestStreak: number;
  last10: Array<{
    result: 'win' | 'loss';
    game: string;
    amount: number;
    timestamp: number;
  }>;
  gamesByCategory: Record<string, {
    wins: number;
    losses: number;
    totalEarnings: number;
  }>;
  monthlyStats: Array<{
    month: string;
    wins: number;
    losses: number;
    earnings: number;
  }>;
}

/**
 * Derive comprehensive player statistics from challenge events
 */
export function deriveStats(events: ChallengeEvent[]): PlayerStats {
  if (events.length === 0) {
    return getEmptyStats();
  }

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  // Basic win/loss counts
  const wins = events.filter(e => e.result === 'win').length;
  const losses = events.filter(e => e.result === 'loss').length;
  const winRate = events.length > 0 ? (wins / events.length) * 100 : 0;

  // Calculate total earnings
  const totalEarnings = events.reduce((sum, event) => {
    return sum + (event.result === 'win' ? event.amount : 0);
  }, 0);

  // Calculate current streak
  const currentStreak = calculateCurrentStreak(sortedEvents);

  // Calculate best streak
  const bestStreak = calculateBestStreak(sortedEvents);

  // Get last 10 games
  const last10 = sortedEvents.slice(0, 10).map(event => ({
    result: event.result,
    game: event.game,
    amount: event.amount,
    timestamp: event.timestamp
  }));

  // Group by game category
  const gamesByCategory = groupByCategory(events);

  // Calculate monthly stats
  const monthlyStats = calculateMonthlyStats(events);

  return {
    wins,
    losses,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
    totalEarnings,
    currentStreak,
    bestStreak,
    last10,
    gamesByCategory,
    monthlyStats
  };
}

/**
 * Calculate current win/loss streak
 */
function calculateCurrentStreak(events: ChallengeEvent[]): number {
  if (events.length === 0) return 0;

  const firstResult = events[0].result;
  let streak = 1;

  for (let i = 1; i < events.length; i++) {
    if (events[i].result === firstResult) {
      streak++;
    } else {
      break;
    }
  }

  return firstResult === 'win' ? streak : -streak;
}

/**
 * Calculate the best winning streak
 */
function calculateBestStreak(events: ChallengeEvent[]): number {
  if (events.length === 0) return 0;

  let bestStreak = 0;
  let currentStreak = 0;

  for (const event of events) {
    if (event.result === 'win') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return bestStreak;
}

/**
 * Group events by game category
 */
function groupByCategory(events: ChallengeEvent[]): Record<string, { wins: number; losses: number; totalEarnings: number }> {
  const categories: Record<string, { wins: number; losses: number; totalEarnings: number }> = {};

  for (const event of events) {
    const category = getGameCategory(event.game);
    
    if (!categories[category]) {
      categories[category] = { wins: 0, losses: 0, totalEarnings: 0 };
    }

    if (event.result === 'win') {
      categories[category].wins++;
      categories[category].totalEarnings += event.amount;
    } else {
      categories[category].losses++;
    }
  }

  return categories;
}

/**
 * Get game category from game name
 */
function getGameCategory(game: string): string {
  const gameLower = game.toLowerCase();
  
  if (gameLower.includes('street fighter') || gameLower.includes('tekken') || gameLower.includes('mortal kombat') || gameLower.includes('guilty gear')) {
    return 'Fighting';
  } else if (gameLower.includes('f1') || gameLower.includes('mario kart') || gameLower.includes('gran turismo') || gameLower.includes('forza')) {
    return 'Racing';
  } else if (gameLower.includes('call of duty') || gameLower.includes('fortnite') || gameLower.includes('valorant') || gameLower.includes('apex')) {
    return 'Shooting';
  } else if (gameLower.includes('ufc') || gameLower.includes('fifa') || gameLower.includes('madden') || gameLower.includes('nba')) {
    return 'Sports';
  }
  
  return 'Other';
}

/**
 * Calculate monthly statistics
 */
function calculateMonthlyStats(events: ChallengeEvent[]): Array<{ month: string; wins: number; losses: number; earnings: number }> {
  const monthlyData: Record<string, { wins: number; losses: number; earnings: number }> = {};

  for (const event of events) {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { wins: 0, losses: 0, earnings: 0 };
    }

    if (event.result === 'win') {
      monthlyData[monthKey].wins++;
      monthlyData[monthKey].earnings += event.amount;
    } else {
      monthlyData[monthKey].losses++;
    }
  }

  // Convert to array and sort by month
  return Object.entries(monthlyData)
    .map(([month, stats]) => ({ month, ...stats }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months
}

/**
 * Get empty stats for new players
 */
function getEmptyStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    winRate: 0,
    totalEarnings: 0,
    currentStreak: 0,
    bestStreak: 0,
    last10: [],
    gamesByCategory: {},
    monthlyStats: []
  };
}

/**
 * Calculate win rate for a specific game category
 */
export function getCategoryWinRate(stats: PlayerStats, category: string): number {
  const categoryStats = stats.gamesByCategory[category];
  if (!categoryStats) return 0;
  
  const total = categoryStats.wins + categoryStats.losses;
  return total > 0 ? (categoryStats.wins / total) * 100 : 0;
}

/**
 * Get player's best performing game category
 */
export function getBestCategory(stats: PlayerStats): string | null {
  let bestCategory = null;
  let bestWinRate = 0;

  for (const [category, categoryStats] of Object.entries(stats.gamesByCategory)) {
    const total = categoryStats.wins + categoryStats.losses;
    if (total >= 5) { // Only consider categories with at least 5 games
      const winRate = (categoryStats.wins / total) * 100;
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        bestCategory = category;
      }
    }
  }

  return bestCategory;
}

/**
 * Calculate average earnings per win
 */
export function getAverageEarningsPerWin(stats: PlayerStats): number {
  return stats.wins > 0 ? stats.totalEarnings / stats.wins : 0;
}
