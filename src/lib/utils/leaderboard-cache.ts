import type { PlayerStats } from "@/lib/firebase/firestore";

const CACHE_KEY = "usdfg_leaderboard_top5_v1";
const TTL_MS = 5 * 60 * 1000;

type CachedPayload = {
  players: PlayerStats[];
  cachedAt: number;
};

export function readLeaderboardTop5Cache(): PlayerStats[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed?.cachedAt || !Array.isArray(parsed.players)) return null;
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.players;
  } catch {
    return null;
  }
}

export function writeLeaderboardTop5Cache(players: PlayerStats[]): void {
  try {
    const payload: CachedPayload = { players, cachedAt: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable or quota — ignore
  }
}

export function clearLeaderboardTop5Cache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
