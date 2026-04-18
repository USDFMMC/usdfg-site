"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyStatsAfterDisputeResolution = applyStatsAfterDisputeResolution;
const firestore_1 = require("firebase-admin/firestore");
function normalizeWinnerWallet(w) {
    if (w === "forfeit" || w === "tie" || w === "cancelled")
        return w;
    return w.toLowerCase();
}
async function updatePlayerStatsAdmin(db, wallet, result, amountEarned, game, category) {
    const key = wallet.toLowerCase();
    const playerRef = db.collection("player_stats").doc(key);
    const playerSnap = await playerRef.get();
    const trustScore = playerSnap.exists
        ? (playerSnap.data()?.trustScore ?? 0)
        : 0;
    const trustReviews = playerSnap.exists
        ? (playerSnap.data()?.trustReviews ?? 0)
        : 0;
    if (!playerSnap.exists) {
        await playerRef.set({
            wallet: key,
            wins: result === "win" ? 1 : 0,
            losses: result === "loss" ? 1 : 0,
            winRate: result === "win" ? 100 : 0,
            totalEarned: amountEarned,
            gamesPlayed: 1,
            lastActive: firestore_1.Timestamp.now(),
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
    const currentStats = playerSnap.data();
    const wins = currentStats.wins + (result === "win" ? 1 : 0);
    const losses = currentStats.losses + (result === "loss" ? 1 : 0);
    const gamesPlayed = currentStats.gamesPlayed + 1;
    const winRate = (wins / gamesPlayed) * 100;
    const gameStats = { ...(currentStats.gameStats || {}) };
    if (!gameStats[game]) {
        gameStats[game] = { wins: 0, losses: 0, earned: 0 };
    }
    gameStats[game].wins += result === "win" ? 1 : 0;
    gameStats[game].losses += result === "loss" ? 1 : 0;
    gameStats[game].earned += amountEarned;
    const categoryStats = { ...(currentStats.categoryStats || {}) };
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
        totalEarned: currentStats.totalEarned + amountEarned,
        gamesPlayed,
        lastActive: firestore_1.Timestamp.now(),
        trustScore,
        trustReviews,
        gameStats,
        categoryStats,
    });
}
async function updateTeamStatsAdmin(db, teamId, result, amountEarned, game, category) {
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
        throw new Error("Team not found");
    }
    const currentStats = teamSnap.data();
    const newWins = result === "win" ? currentStats.wins + 1 : currentStats.wins;
    const newLosses = result === "loss" ? currentStats.losses + 1 : currentStats.losses;
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newWinRate = newGamesPlayed > 0 ? (newWins / newGamesPlayed) * 100 : 0;
    const newTotalEarned = currentStats.totalEarned + amountEarned;
    const currentGameStats = currentStats.gameStats || {};
    const g = currentGameStats[game] || { wins: 0, losses: 0, earned: 0 };
    const newGameStats = {
        ...currentGameStats,
        [game]: {
            wins: result === "win" ? g.wins + 1 : g.wins,
            losses: result === "loss" ? g.losses + 1 : g.losses,
            earned: g.earned + amountEarned,
        },
    };
    const currentCategoryStats = currentStats.categoryStats || {};
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
        lastActive: firestore_1.Timestamp.now(),
        gameStats: newGameStats,
        categoryStats: newCategoryStats,
    });
}
async function applyStatsAfterDisputeResolution(challengeData, winnerWalletRaw) {
    const db = (0, firestore_1.getFirestore)();
    const winnerWallet = normalizeWinnerWallet(winnerWalletRaw);
    const players = challengeData.players || [];
    const isTeamChallenge = challengeData.challengeType === "team";
    const entryFee = challengeData.entryFee || 0;
    const totalPrize = entryFee * 2;
    const platformFee = totalPrize * 0.05;
    const prizePool = totalPrize - platformFee;
    const game = challengeData.game || "Unknown";
    const category = challengeData.category || "Sports";
    const loser = players.find((p) => normalizeWinnerWallet(p) !== winnerWallet);
    if (!loser)
        return;
    if (isTeamChallenge) {
        await updateTeamStatsAdmin(db, winnerWallet, "win", prizePool, game, category);
        await updateTeamStatsAdmin(db, loser, "loss", 0, game, category);
    }
    else {
        await updatePlayerStatsAdmin(db, winnerWallet, "win", prizePool, game, category);
        await updatePlayerStatsAdmin(db, loser, "loss", 0, game, category);
    }
}
//# sourceMappingURL=statsAdmin.js.map