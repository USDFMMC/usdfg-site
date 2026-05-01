import { Firestore, Timestamp, getFirestore } from "firebase-admin/firestore";

function normalizeWinnerWallet(w: string): string {
  if (w === "forfeit" || w === "tie" || w === "cancelled") return w;
  return w.toLowerCase();
}

export type StatsAdminResult = "win" | "loss" | "forfeit";

export type StatsAdminOpts = {
  resolutionType?: "auto" | "admin" | "forfeit";
};

function behaviorTrustBaseFromSnap(data: Record<string, unknown> | undefined): number {
  if (!data) return 5;
  const bt = data.behaviorTrustScore as number | undefined;
  const ts = data.trustScore as number | undefined;
  const base = bt ?? ts ?? 5;
  return base || 5;
}

export async function updatePlayerStatsAdmin(
  db: Firestore,
  wallet: string,
  result: StatsAdminResult,
  amountEarned: number,
  game: string,
  category: string,
  opts?: StatsAdminOpts
): Promise<void> {
  const key = wallet.toLowerCase();
  const playerRef = db.collection("player_stats").doc(key);
  const playerSnap = await playerRef.get();

  const resolutionType = opts?.resolutionType;

  const trustReviews = playerSnap.exists ? ((playerSnap.data()?.trustReviews as number) ?? 0) : 0;

  if (result === "forfeit") {
    const baseT = playerSnap.exists ? behaviorTrustBaseFromSnap(playerSnap.data() as Record<string, unknown>) : 5;
    const newBehavior = Math.max(0, baseT - 1);
    if (!playerSnap.exists) {
      await playerRef.set({
        wallet: key,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        behaviorTrustScore: newBehavior,
        trustReviews,
        forfeits: 1,
        ogFirst1k: false,
        gameStats: {},
        categoryStats: {},
      });
      return;
    }
    const currentStats = playerSnap.data() as Record<string, unknown>;
    await playerRef.update({
      forfeits: ((currentStats.forfeits as number) || 0) + 1,
      behaviorTrustScore: newBehavior,
      trustReviews,
      lastActive: Timestamp.now(),
    });
    return;
  }

  const behaviorBefore = playerSnap.exists ? behaviorTrustBaseFromSnap(playerSnap.data() as Record<string, unknown>) : 5;
  let behaviorTrustScore = behaviorBefore;
  if (result === "win" && resolutionType === "admin") {
    behaviorTrustScore = Math.min(10, behaviorTrustScore + 0.5);
  } else if (result === "win") {
    behaviorTrustScore = Math.min(10, behaviorTrustScore + 0.2);
  } else if (result === "loss" && resolutionType === "admin") {
    behaviorTrustScore = Math.max(0, behaviorTrustScore - 0.7);
  } else if (result === "loss") {
    behaviorTrustScore = Math.max(0, behaviorTrustScore - 0.1);
  }

  if (!playerSnap.exists) {
    const docData: Record<string, unknown> = {
      wallet: key,
      wins: result === "win" ? 1 : 0,
      losses: result === "loss" ? 1 : 0,
      winRate: result === "win" ? 100 : 0,
      totalEarned: amountEarned,
      gamesPlayed: 1,
      lastActive: Timestamp.now(),
      behaviorTrustScore,
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
    };
    if (result === "win" && resolutionType === "admin") {
      docData.disputesWon = 1;
    } else if (result === "win") {
      docData.cleanWins = 1;
    }
    if (result === "loss" && resolutionType === "admin") {
      docData.disputesLost = 1;
    }
    await playerRef.set(docData);
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

  const updatePayload: Record<string, unknown> = {
    wins,
    losses,
    winRate: Math.round(winRate * 10) / 10,
    totalEarned: (currentStats.totalEarned as number) + amountEarned,
    gamesPlayed,
    lastActive: Timestamp.now(),
    behaviorTrustScore,
    trustReviews,
    gameStats,
    categoryStats,
  };

  if (result === "win" && resolutionType === "admin") {
    updatePayload.disputesWon = ((currentStats.disputesWon as number) || 0) + 1;
  } else if (result === "win") {
    updatePayload.cleanWins = ((currentStats.cleanWins as number) || 0) + 1;
  }
  if (result === "loss" && resolutionType === "admin") {
    updatePayload.disputesLost = ((currentStats.disputesLost as number) || 0) + 1;
  }

  await playerRef.update(updatePayload);
}

export async function updateTeamStatsAdmin(
  db: Firestore,
  teamId: string,
  result: "win" | "loss" | "forfeit",
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

  if (result === "forfeit") {
    const base = behaviorTrustBaseFromSnap(currentStats);
    const newBehavior = Math.max(0, base - 1);
    await teamRef.update({
      forfeits: ((currentStats.forfeits as number) || 0) + 1,
      behaviorTrustScore: newBehavior,
      lastActive: Timestamp.now(),
    });
    return;
  }

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
  if (challengeData.statsApplied === true) {
    return;
  }
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
    await updatePlayerStatsAdmin(db, winnerWallet, "win", prizePool, game, category, {
      resolutionType: "admin",
    });
    await updatePlayerStatsAdmin(db, loser, "loss", 0, game, category, { resolutionType: "admin" });
  }
}
