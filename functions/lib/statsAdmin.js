"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSoloMatchSkillScores = fetchSoloMatchSkillScores;
exports.updatePlayerStatsAdmin = updatePlayerStatsAdmin;
exports.updateTeamStatsAdmin = updateTeamStatsAdmin;
exports.applyStatsAfterDisputeResolution = applyStatsAfterDisputeResolution;
const firestore_1 = require("firebase-admin/firestore");
function normalizeWinnerWallet(w) {
    if (w === "forfeit" || w === "tie" || w === "cancelled")
        return w;
    return w.toLowerCase();
}
const DEFAULT_PLAYER_SKILL_SCORE = 100;
const SKILL_SCORE_SOFT_CAP = 3000;
function skillScoreFromStoredAdmin(data) {
    const v = data?.skillScore;
    return Number.isFinite(v) ? v : DEFAULT_PLAYER_SKILL_SCORE;
}
function clampSkillScoreWrite(n) {
    return Math.max(0, Math.min(SKILL_SCORE_SOFT_CAP, n));
}
function skillScoreAfterWin(selfBefore, opponentSkill) {
    let delta = 5;
    if (opponentSkill > selfBefore)
        delta += 3;
    return Math.max(0, selfBefore + delta);
}
function skillScoreAfterLoss(selfBefore, opponentSkill) {
    let delta = -2;
    if (opponentSkill < selfBefore)
        delta -= 3;
    return Math.max(0, selfBefore + delta);
}
/** Pre-update skill for two participants (e.g. winner vs loser) using normalized player_stats doc ids. */
async function fetchSoloMatchSkillScores(db, walletA, walletB) {
    const keyA = normalizeWinnerWallet(walletA);
    const keyB = normalizeWinnerWallet(walletB);
    const [snapA, snapB] = await Promise.all([
        db.collection("player_stats").doc(keyA).get(),
        db.collection("player_stats").doc(keyB).get(),
    ]);
    return {
        skillA: skillScoreFromStoredAdmin(snapA.exists ? snapA.data() : undefined),
        skillB: skillScoreFromStoredAdmin(snapB.exists ? snapB.data() : undefined),
    };
}
function behaviorTrustBaseFromSnap(data) {
    if (!data)
        return 5;
    const bt = data.behaviorTrustScore;
    const ts = data.trustScore;
    const base = bt ?? ts ?? 5;
    return base || 5;
}
async function updatePlayerStatsAdmin(db, wallet, result, amountEarned, game, category, opts) {
    const key = wallet.toLowerCase();
    const playerRef = db.collection("player_stats").doc(key);
    const playerSnap = await playerRef.get();
    const resolutionType = opts?.resolutionType;
    const trustReviews = playerSnap.exists ? (playerSnap.data()?.trustReviews ?? 0) : 0;
    if (result === "forfeit") {
        const baseT = playerSnap.exists ? behaviorTrustBaseFromSnap(playerSnap.data()) : 5;
        const newBehavior = Math.max(0, baseT - 1);
        const skillAfterForfeit = clampSkillScoreWrite(skillScoreFromStoredAdmin(playerSnap.exists ? playerSnap.data() : undefined) - 10);
        if (!playerSnap.exists) {
            await playerRef.set({
                wallet: key,
                wins: 0,
                losses: 0,
                winRate: 0,
                totalEarned: 0,
                gamesPlayed: 0,
                lastActive: firestore_1.Timestamp.now(),
                behaviorTrustScore: newBehavior,
                trustReviews,
                forfeits: 1,
                skillScore: skillAfterForfeit,
                ogFirst1k: false,
                gameStats: {},
                categoryStats: {},
            });
            return;
        }
        const currentStats = playerSnap.data();
        await playerRef.update({
            forfeits: (currentStats.forfeits || 0) + 1,
            behaviorTrustScore: newBehavior,
            trustReviews,
            skillScore: skillAfterForfeit,
            lastActive: firestore_1.Timestamp.now(),
        });
        return;
    }
    const behaviorBefore = playerSnap.exists ? behaviorTrustBaseFromSnap(playerSnap.data()) : 5;
    let behaviorTrustScore = behaviorBefore;
    if (result === "win" && resolutionType === "admin") {
        behaviorTrustScore = Math.min(10, behaviorTrustScore + 0.5);
    }
    else if (result === "win") {
        behaviorTrustScore = Math.min(10, behaviorTrustScore + 0.2);
    }
    else if (result === "loss" && resolutionType === "admin") {
        behaviorTrustScore = Math.max(0, behaviorTrustScore - 0.7);
    }
    else if (result === "loss") {
        behaviorTrustScore = Math.max(0, behaviorTrustScore - 0.1);
    }
    const selfSkillBefore = skillScoreFromStoredAdmin(playerSnap.exists ? playerSnap.data() : undefined);
    const rawOpp = opts?.opponentSkillScore;
    const opponentSkill = Number.isFinite(rawOpp) ? rawOpp : selfSkillBefore;
    let newSkill = selfSkillBefore;
    if (result === "win") {
        newSkill = skillScoreAfterWin(selfSkillBefore, opponentSkill);
    }
    else if (result === "loss") {
        newSkill = skillScoreAfterLoss(selfSkillBefore, opponentSkill);
    }
    const skillWrite = clampSkillScoreWrite(newSkill);
    if (!playerSnap.exists) {
        const docData = {
            wallet: key,
            wins: result === "win" ? 1 : 0,
            losses: result === "loss" ? 1 : 0,
            winRate: result === "win" ? 100 : 0,
            totalEarned: amountEarned,
            gamesPlayed: 1,
            lastActive: firestore_1.Timestamp.now(),
            behaviorTrustScore,
            trustReviews,
            skillScore: skillWrite,
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
        }
        else if (result === "win") {
            docData.cleanWins = 1;
        }
        if (result === "loss" && resolutionType === "admin") {
            docData.disputesLost = 1;
        }
        await playerRef.set(docData);
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
    const updatePayload = {
        wins,
        losses,
        winRate: Math.round(winRate * 10) / 10,
        totalEarned: currentStats.totalEarned + amountEarned,
        gamesPlayed,
        lastActive: firestore_1.Timestamp.now(),
        behaviorTrustScore,
        trustReviews,
        skillScore: skillWrite,
        gameStats,
        categoryStats,
    };
    if (result === "win" && resolutionType === "admin") {
        updatePayload.disputesWon = (currentStats.disputesWon || 0) + 1;
    }
    else if (result === "win") {
        updatePayload.cleanWins = (currentStats.cleanWins || 0) + 1;
    }
    if (result === "loss" && resolutionType === "admin") {
        updatePayload.disputesLost = (currentStats.disputesLost || 0) + 1;
    }
    await playerRef.update(updatePayload);
}
async function updateTeamStatsAdmin(db, teamId, result, amountEarned, game, category) {
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
        throw new Error("Team not found");
    }
    const currentStats = teamSnap.data();
    if (result === "forfeit") {
        const base = behaviorTrustBaseFromSnap(currentStats);
        const newBehavior = Math.max(0, base - 1);
        await teamRef.update({
            forfeits: (currentStats.forfeits || 0) + 1,
            behaviorTrustScore: newBehavior,
            lastActive: firestore_1.Timestamp.now(),
        });
        return;
    }
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
    if (challengeData.statsApplied === true) {
        return;
    }
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
        const { skillA: winnerSkill, skillB: loserSkill } = await fetchSoloMatchSkillScores(db, winnerWallet, loser);
        await updatePlayerStatsAdmin(db, winnerWallet, "win", prizePool, game, category, {
            resolutionType: "admin",
            opponentSkillScore: loserSkill,
        });
        await updatePlayerStatsAdmin(db, loser, "loss", 0, game, category, {
            resolutionType: "admin",
            opponentSkillScore: winnerSkill,
        });
    }
}
//# sourceMappingURL=statsAdmin.js.map