"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMatchStats = void 0;
exports.executeApplyMatchStatsForChallenge = executeApplyMatchStatsForChallenge;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const statsAdmin_1 = require("./statsAdmin");
const BLOCKED_WORDS = [
    "fuck",
    "shit",
    "ass",
    "bitch",
    "damn",
    "hell",
    "crap",
    "dick",
    "cock",
    "pussy",
    "nigger",
    "nigga",
    "fag",
    "faggot",
    "retard",
    "retarded",
    "nazi",
    "hitler",
];
function sanitizeDisplayNameAdmin(name) {
    if (!name)
        return undefined;
    const lowerName = name.toLowerCase();
    for (const word of BLOCKED_WORDS) {
        if (lowerName.includes(word)) {
            return undefined;
        }
    }
    const sanitized = name.trim().slice(0, 20);
    return sanitized || undefined;
}
function sameWallet(a, b) {
    if (!b)
        return false;
    return (0, statsAdmin_1.normalizeWinnerWallet)(a) === (0, statsAdmin_1.normalizeWinnerWallet)(b);
}
function tournamentPrizePoolForStatsAdmin(data) {
    const stored = data.prizePool;
    if (stored && stored > 0)
        return stored;
    const tournament = data.tournament;
    const bracket = tournament?.bracket;
    const entryFee = data.entryFee || 0;
    const maxPlayers = data.maxPlayers || bracket?.[0]?.matches?.length || 2;
    const totalPrize = entryFee * maxPlayers;
    const platformFee = totalPrize * 0.05;
    return totalPrize - platformFee;
}
function tournamentFinalLoserWalletAdmin(match, winnerWallet) {
    const w = winnerWallet.toLowerCase();
    if (match.player1?.toLowerCase() === w && match.player2)
        return match.player2;
    if (match.player2?.toLowerCase() === w && match.player1)
        return match.player1;
    return null;
}
function getTournamentFinalLoserFromChallenge(data, winnerNorm) {
    const tournament = data.tournament;
    const bracket = tournament?.bracket;
    if (!bracket?.length)
        return null;
    const lastRound = bracket[bracket.length - 1];
    const finalMatch = lastRound.matches?.find((m) => m.status === "completed" && m.winner);
    if (!finalMatch)
        return null;
    const wNorm = (0, statsAdmin_1.normalizeWinnerWallet)(String(finalMatch.winner || ""));
    if (wNorm !== winnerNorm)
        return null;
    return tournamentFinalLoserWalletAdmin(finalMatch, winnerNorm);
}
function assertCallerIsParticipant(request, data) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Not signed in");
    }
    const tok = request.auth.token;
    if (tok?.admin === true) {
        return;
    }
    const players = data.players || [];
    const playersUid = data.playersUid || [];
    const uid = request.auth.uid;
    const idx = playersUid.findIndex((u) => u === uid);
    if (idx !== -1 && players[idx]) {
        return;
    }
    const walletClaim = request.auth.token.wallet;
    if (walletClaim &&
        players.some((p) => (0, statsAdmin_1.normalizeWinnerWallet)(p) === (0, statsAdmin_1.normalizeWinnerWallet)(walletClaim))) {
        return;
    }
    if (players.some((p) => (0, statsAdmin_1.normalizeWinnerWallet)(p) === (0, statsAdmin_1.normalizeWinnerWallet)(uid))) {
        return;
    }
    throw new https_1.HttpsError("permission-denied", "Caller is not a challenge participant");
}
/**
 * Applies the same win/loss/forfeit/tournament stats the client used to write via updatePlayerStats,
 * then sets challenges.statsApplied. Idempotent when statsApplied is already true.
 */
async function executeApplyMatchStatsForChallenge(db, challengeId) {
    const ref = db.collection("challenges").doc(challengeId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Challenge not found");
    }
    const d = snap.data();
    if (d.statsApplied === true) {
        return { ok: true, skipped: true };
    }
    if (d.status !== "completed") {
        throw new https_1.HttpsError("failed-precondition", "Challenge is not completed");
    }
    const game = d.game || "Unknown";
    const category = d.category || "Sports";
    const isTeam = d.challengeType === "team";
    const players = d.players || [];
    const winnerRaw = d.winner;
    if (!winnerRaw) {
        throw new https_1.HttpsError("failed-precondition", "Missing winner");
    }
    const isTournament = d.format === "tournament" || !!d.tournament;
    let prizePool = d.prizePool || 0;
    if (!prizePool || prizePool <= 0) {
        if (isTournament) {
            prizePool = tournamentPrizePoolForStatsAdmin(d);
        }
        else {
            const entryFee = d.entryFee || 0;
            const totalPrize = entryFee * 2;
            const platformFee = totalPrize * 0.05;
            prizePool = totalPrize - platformFee;
        }
    }
    const resolutionType = d.resolutionType === "admin" ? "admin" : "auto";
    const creator = d.creator || "";
    if (winnerRaw === "forfeit" || winnerRaw === "tie") {
        if (isTeam) {
            for (const tid of players) {
                await (0, statsAdmin_1.updateTeamStatsAdmin)(db, (0, statsAdmin_1.normalizeWinnerWallet)(tid), "forfeit", 0, game, category);
            }
        }
        else {
            for (const w of players) {
                const rawName = sameWallet(w, creator) ? d.creatorTag : undefined;
                const displayName = sanitizeDisplayNameAdmin(rawName);
                await (0, statsAdmin_1.updatePlayerStatsAdmin)(db, (0, statsAdmin_1.normalizeWinnerWallet)(w), "forfeit", 0, game, category, {
                    resolutionType: "forfeit",
                    ...(displayName ? { displayName } : {}),
                });
            }
        }
        await ref.update({
            statsApplied: true,
            needsStats: false,
            updatedAt: firestore_1.Timestamp.now(),
        });
        return { ok: true, skipped: false };
    }
    const winnerNorm = (0, statsAdmin_1.normalizeWinnerWallet)(winnerRaw);
    if (isTeam) {
        const loserWallet = players.find((p) => (0, statsAdmin_1.normalizeWinnerWallet)(p) !== winnerNorm);
        if (!loserWallet) {
            throw new https_1.HttpsError("failed-precondition", "Could not resolve loser team");
        }
        const loserNorm = (0, statsAdmin_1.normalizeWinnerWallet)(loserWallet);
        const { skillA: winnerSkill, skillB: loserSkill } = await (0, statsAdmin_1.fetchTeamMatchSkillScores)(db, winnerNorm, loserNorm);
        await (0, statsAdmin_1.updateTeamStatsAdmin)(db, winnerNorm, "win", prizePool, game, category, {
            opponentSkillScore: loserSkill,
        });
        await (0, statsAdmin_1.updateTeamStatsAdmin)(db, loserNorm, "loss", 0, game, category, {
            opponentSkillScore: winnerSkill,
        });
        await ref.update({
            statsApplied: true,
            needsStats: false,
            updatedAt: firestore_1.Timestamp.now(),
        });
        return { ok: true, skipped: false };
    }
    let loserNorm = null;
    if (isTournament) {
        const fromBracket = getTournamentFinalLoserFromChallenge(d, winnerNorm);
        if (fromBracket) {
            loserNorm = (0, statsAdmin_1.normalizeWinnerWallet)(fromBracket);
        }
        else if (players.length === 2) {
            const other = players.find((p) => (0, statsAdmin_1.normalizeWinnerWallet)(p) !== winnerNorm);
            if (other)
                loserNorm = (0, statsAdmin_1.normalizeWinnerWallet)(other);
        }
    }
    else if (players.length === 2) {
        const other = players.find((p) => (0, statsAdmin_1.normalizeWinnerWallet)(p) !== winnerNorm);
        if (other)
            loserNorm = (0, statsAdmin_1.normalizeWinnerWallet)(other);
    }
    if (!loserNorm) {
        throw new https_1.HttpsError("failed-precondition", "Could not resolve loser wallet");
    }
    const rawWinnerName = sameWallet(winnerNorm, creator) ? d.creatorTag : undefined;
    const rawLoserName = sameWallet(loserNorm, creator) ? d.creatorTag : undefined;
    const winnerDisplayName = sanitizeDisplayNameAdmin(rawWinnerName);
    const loserDisplayName = sanitizeDisplayNameAdmin(rawLoserName);
    const { skillA: winnerSkill, skillB: loserSkill } = await (0, statsAdmin_1.fetchSoloMatchSkillScores)(db, winnerNorm, loserNorm);
    await (0, statsAdmin_1.updatePlayerStatsAdmin)(db, winnerNorm, "win", prizePool, game, category, {
        resolutionType,
        opponentSkillScore: loserSkill,
        ...(winnerDisplayName ? { displayName: winnerDisplayName } : {}),
    });
    await (0, statsAdmin_1.updatePlayerStatsAdmin)(db, loserNorm, "loss", 0, game, category, {
        resolutionType,
        opponentSkillScore: winnerSkill,
        ...(loserDisplayName ? { displayName: loserDisplayName } : {}),
    });
    await ref.update({
        statsApplied: true,
        needsStats: false,
        updatedAt: firestore_1.Timestamp.now(),
    });
    return { ok: true, skipped: false };
}
exports.applyMatchStats = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    const challengeId = request.data?.challengeId;
    if (!challengeId) {
        throw new https_1.HttpsError("invalid-argument", "challengeId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const preSnap = await db.collection("challenges").doc(challengeId).get();
    if (!preSnap.exists) {
        throw new https_1.HttpsError("not-found", "Challenge not found");
    }
    assertCallerIsParticipant(request, preSnap.data());
    const result = await executeApplyMatchStatsForChallenge(db, challengeId);
    return { ok: result.ok, skipped: result.skipped };
});
//# sourceMappingURL=applyMatchStats.js.map