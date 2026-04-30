import { Firestore, Timestamp, getFirestore } from "firebase-admin/firestore";

function normalizeWinnerWallet(w: string): string {
  if (w === "forfeit" || w === "tie" || w === "cancelled") return w;
  return w.toLowerCase();
}

export async function updatePlayerStatsAdmin(
  db: Firestore,
  wallet: string,
  result: "win" | "loss",
  amountEarned: number,
  game: string,
  category: string
): Promise<void> {
  const key = wallet.toLowerCase();
  const playerRef = db.collection("player_stats").doc(key);
  const playerSnap = await playerRef.get();

  const trustScore = playerSnap.exists
    ? ((playerSnap.data()?.trustScore as number) ?? 0)
    : 0;
  const trustReviews = playerSnap.exists
    ? ((playerSnap.data()?.trustReviews as number) ?? 0)
    : 0;

  if (!playerSnap.exists) {
    await playerRef.set({
      wallet: key,
      wins: result === "win" ? 1 : 0,
      losses: result === "loss" ? 1 : 0,
      winRate: result === "win" ? 100 : 0,
      totalEarned: amountEarned,
      gamesPlayed: 1,
      lastActive: Timestamp.now(),
      trustScore,
      trustReviews,
      ogFirst1k: false,
      gameStats: {
        [game]: {
          wins: result === "win" ? 1 : 0,
          losses: result === "loss" ? 1 : 0,
          earned: amountEarned,
        },
      },
      categoryStats: {
        [category]: {
          wins: result === "win" ? 1 : 0,
          losses: result === "loss" ? 1 : 0,
          earned: amountEarned,
        },
      },
    });
    return;
  }

  const currentStats = playerSnap.data() as Record<string, unknown>;
  const wins = (currentStats.wins as number) + (result === "win" ? 1 : 0);
  const losses = (currentStats.losses as number) + (result === "loss" ? 1 : 0);
  const gamesPlayed = (currentStats.gamesPlayed as number) + 1;
  const winRate = (wins / gamesPlayed) * 100;

  const gameStats = { ...((currentStats.gameStats as object) || {}) } as Record<
    string,
    { wins: number; losses: number; earned: number }
  >;
  if (!gameStats[game]) {
    gameStats[game] = { wins: 0, losses: 0, earned: 0 };
  }
  gameStats[game].wins += result === "win" ? 1 : 0;
  gameStats[game].losses += result === "loss" ? 1 : 0;
  gameStats[game].earned += amountEarned;

  const categoryStats = { ...((currentStats.categoryStats as object) || {}) } as Record<
    string,
    { wins: number; losses: number; earned: number }
  >;
  if (!categoryStats[category]) {
    categoryStats[category] = { wins: 0, losses: 0, earned: 0 };
  }
  categoryStats[category].wins += result === "win" ? 1 : 0;
  categoryStats[category].losses += result === "loss" ? 1 : 0;
  categoryStats[category].earned += amountEarned;

  await playerRef.update({
    wins,
    losses,
    winRate: Math.round(winRate * 10) / 10,
    totalEarned: (currentStats.totalEarned as number) + amountEarned,
    gamesPlayed,
    lastActive: Timestamp.now(),
    trustScore,
    trustReviews,
    gameStats,
    categoryStats,
  });
}

export async function updateTeamStatsAdmin(
  db: Firestore,
  teamId: string,
  result: "win" | "loss",
  amountEarned: number,
  game: string,
  category: string
): Promise<void> {
  const teamRef = db.collection("teams").doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new Error("Team not found");
  }
  const currentStats = teamSnap.data() as Record<string, unknown>;
  const newWins = result === "win" ? (currentStats.wins as number) + 1 : (currentStats.wins as number);
  const newLosses =
    result === "loss" ? (currentStats.losses as number) + 1 : (currentStats.losses as number);
  const newGamesPlayed = (currentStats.gamesPlayed as number) + 1;
  const newWinRate = newGamesPlayed > 0 ? (newWins / newGamesPlayed) * 100 : 0;
  const newTotalEarned = (currentStats.totalEarned as number) + amountEarned;

  const currentGameStats = (currentStats.gameStats as Record<string, { wins: number; losses: number; earned: number }>) || {};
  const g = currentGameStats[game] || { wins: 0, losses: 0, earned: 0 };
  const newGameStats = {
    ...currentGameStats,
    [game]: {
      wins: result === "win" ? g.wins + 1 : g.wins,
      losses: result === "loss" ? g.losses + 1 : g.losses,
      earned: g.earned + amountEarned,
    },
  };

  const currentCategoryStats =
    (currentStats.categoryStats as Record<string, { wins: number; losses: number; earned: number }>) || {};
  const c = currentCategoryStats[category] || { wins: 0, losses: 0, earned: 0 };
  const newCategoryStats = {
    ...currentCategoryStats,
    [category]: {
      wins: result === "win" ? c.wins + 1 : c.wins,
      losses: result === "loss" ? c.losses + 1 : c.losses,
      earned: c.earned + amountEarned,
    },
  };

  await teamRef.update({
    wins: newWins,
    losses: newLosses,
    winRate: newWinRate,
    totalEarned: newTotalEarned,
    gamesPlayed: newGamesPlayed,
    lastActive: Timestamp.now(),
    gameStats: newGameStats,
    categoryStats: newCategoryStats,
  });
}

export async function applyStatsAfterDisputeResolution(
  challengeData: Record<string, unknown>,
  winnerWalletRaw: string
): Promise<void> {
  const db = getFirestore();
  const winnerWallet = normalizeWinnerWallet(winnerWalletRaw);
  const players = (challengeData.players as string[]) || [];
  const isTeamChallenge = challengeData.challengeType === "team";
  const entryFee = (challengeData.entryFee as number) || 0;
  const totalPrize = entryFee * 2;
  const platformFee = totalPrize * 0.05;
  const prizePool = totalPrize - platformFee;
  const game = (challengeData.game as string) || "Unknown";
  const category = (challengeData.category as string) || "Sports";

  const loser = players.find((p) => normalizeWinnerWallet(p) !== winnerWallet);
  if (!loser) return;

  if (isTeamChallenge) {
    await updateTeamStatsAdmin(db, winnerWallet, "win", prizePool, game, category);
    await updateTeamStatsAdmin(db, loser, "loss", 0, game, category);
  } else {
    await updatePlayerStatsAdmin(db, winnerWallet, "win", prizePool, game, category);
    await updatePlayerStatsAdmin(db, loser, "loss", 0, game, category);
  }
}
