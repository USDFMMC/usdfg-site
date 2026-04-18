"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeAdminTournamentDispute = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const adminHelpers_1 = require("./adminHelpers");
const tournamentBracket_1 = require("./tournamentBracket");
exports.finalizeAdminTournamentDispute = (0, https_1.onCall)(async (request) => {
    const adminWallet = (0, adminHelpers_1.requireAdminClaims)(request);
    const challengeId = request.data?.challengeId;
    const matchId = request.data?.matchId;
    const winnerWalletRaw = request.data?.winnerWallet;
    if (!challengeId || !matchId || !winnerWalletRaw) {
        throw new https_1.HttpsError("invalid-argument", "challengeId, matchId, and winnerWallet are required");
    }
    const db = (0, firestore_1.getFirestore)();
    const challengeRef = db.collection("challenges").doc(challengeId);
    const snap = await challengeRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Challenge not found");
    }
    const data = snap.data();
    const tournament = data.tournament;
    if (!tournament?.bracket) {
        throw new https_1.HttpsError("failed-precondition", "Tournament bracket not found");
    }
    const bracket = (0, tournamentBracket_1.deepCloneBracket)(tournament.bracket);
    let found = false;
    let currentRoundIndex = -1;
    let matchIndex = -1;
    let disputeId;
    const winnerLower = winnerWalletRaw.trim().toLowerCase();
    for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
        const round = bracket[roundIdx];
        for (let mi = 0; mi < round.matches.length; mi++) {
            const m = round.matches[mi];
            if (m.id === matchId) {
                const isP1 = m.player1?.toLowerCase() === winnerLower;
                const isP2 = m.player2?.toLowerCase() === winnerLower;
                if (!isP1 && !isP2) {
                    throw new https_1.HttpsError("invalid-argument", "Winner is not a participant in this match");
                }
                disputeId = m.disputeId;
                m.winner = winnerWalletRaw.trim();
                m.status = "completed";
                m.completedAt = firestore_1.Timestamp.now();
                delete m.disputeId;
                delete m.disputedAt;
                if (m.player1 && m.player2) {
                    m.player1Result = isP1 ? "win" : "loss";
                    m.player2Result = isP2 ? "win" : "loss";
                }
                found = true;
                currentRoundIndex = roundIdx;
                matchIndex = mi;
                break;
            }
        }
        if (found)
            break;
    }
    if (!found) {
        throw new https_1.HttpsError("not-found", "Match not found in bracket");
    }
    const currentRound = bracket[currentRoundIndex];
    if (!currentRound) {
        throw new https_1.HttpsError("failed-precondition", "Current round not found");
    }
    const updates = {
        "tournament.bracket": (0, tournamentBracket_1.sanitizeTournamentState)({ ...tournament, bracket }).bracket,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (currentRoundIndex === bracket.length - 1) {
        updates["tournament.champion"] = winnerWalletRaw.trim();
        updates["tournament.stage"] = "completed";
        updates["tournament.completedAt"] = firestore_1.FieldValue.serverTimestamp();
        updates["tournament.currentRound"] = bracket.length;
        updates.status = "completed";
        updates.canClaim = true;
    }
    else {
        const nextRound = bracket[currentRoundIndex + 1];
        if (!nextRound) {
            throw new https_1.HttpsError("failed-precondition", "Next round not found");
        }
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound.matches[nextMatchIndex];
        if (!nextMatch) {
            throw new https_1.HttpsError("failed-precondition", "Next round match not found");
        }
        const w = winnerWalletRaw.trim();
        if (matchIndex % 2 === 0)
            nextMatch.player1 = w;
        else
            nextMatch.player2 = w;
        if (nextMatch.player1 && nextMatch.player2)
            nextMatch.status = "ready";
        const allMatchesCompleted = currentRound.matches.every((m) => m.status === "completed");
        if (allMatchesCompleted) {
            const nextRoundNumber = currentRound.roundNumber + 1;
            updates["tournament.currentRound"] = nextRoundNumber;
            updates["tournament.stage"] = "round_in_progress";
            const updatedBracket = (0, tournamentBracket_1.activateRoundMatches)(bracket, nextRoundNumber);
            updates["tournament.bracket"] = (0, tournamentBracket_1.sanitizeTournamentState)({
                ...tournament,
                bracket: updatedBracket,
            }).bracket;
        }
        else {
            updates["tournament.bracket"] = (0, tournamentBracket_1.sanitizeTournamentState)({ ...tournament, bracket }).bracket;
        }
    }
    await challengeRef.update(updates);
    if (disputeId) {
        try {
            await db.collection("tournament_disputes").doc(disputeId).update({
                status: "resolved",
                resolvedAt: firestore_1.Timestamp.now(),
                resolvedByUid: adminWallet,
                resolvedByEmail: `wallet:${adminWallet}`,
                winnerWallet: winnerWalletRaw.trim(),
            });
        }
        catch (e) {
            console.warn("Failed to mark tournament dispute resolved:", e);
        }
    }
    const targetId = `${challengeId}:${matchId}`;
    await (0, adminHelpers_1.writeAdminLog)("resolve_tournament_dispute", adminWallet, targetId);
    await db.collection("admin_audit_log").add({
        adminUid: adminWallet,
        adminEmail: `wallet:${adminWallet}`,
        challengeId,
        matchId,
        winner: winnerWalletRaw.trim(),
        action: "resolve_tournament_dispute",
        timestamp: firestore_1.Timestamp.now(),
        notes: "server_finalize",
    });
    return { ok: true };
});
//# sourceMappingURL=finalizeTournament.js.map