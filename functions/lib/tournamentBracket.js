"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepCloneBracket = deepCloneBracket;
exports.activateRoundMatches = activateRoundMatches;
exports.sanitizeTournamentState = sanitizeTournamentState;
/* eslint-disable @typescript-eslint/no-explicit-any */
const firestore_1 = require("firebase-admin/firestore");
function deepCloneBracket(bracket) {
    if (!bracket)
        return [];
    return bracket.map((round) => ({
        roundNumber: round.roundNumber,
        matches: round.matches.map((match) => ({ ...match })),
    }));
}
function activateRoundMatches(bracket, roundNumber) {
    return bracket.map((round) => {
        if (round.roundNumber !== roundNumber) {
            return round;
        }
        return {
            ...round,
            matches: round.matches.map((match) => {
                const hasBothPlayers = Boolean(match.player1 && match.player2);
                return {
                    ...match,
                    status: hasBothPlayers ? "in-progress" : match.status,
                    startedAt: hasBothPlayers ? match.startedAt || firestore_1.Timestamp.now() : match.startedAt,
                };
            }),
        };
    });
}
function sanitizeTournamentState(state) {
    const sanitized = {
        format: "tournament",
        maxPlayers: state.maxPlayers,
        currentRound: state.currentRound,
        stage: state.stage,
        bracket: state.bracket.map((round) => ({
            roundNumber: round.roundNumber,
            matches: round.matches.map((match) => {
                const sanitizedMatch = {
                    id: match.id,
                    round: match.round,
                    slot: match.slot,
                    status: match.status,
                };
                if (match.player1)
                    sanitizedMatch.player1 = match.player1;
                if (match.player2)
                    sanitizedMatch.player2 = match.player2;
                if (match.winner)
                    sanitizedMatch.winner = match.winner;
                if (match.startedAt)
                    sanitizedMatch.startedAt = match.startedAt;
                if (match.completedAt)
                    sanitizedMatch.completedAt = match.completedAt;
                if (match.player1Result)
                    sanitizedMatch.player1Result = match.player1Result;
                if (match.player2Result)
                    sanitizedMatch.player2Result = match.player2Result;
                if (match.disputeId)
                    sanitizedMatch.disputeId = match.disputeId;
                if (match.disputedAt)
                    sanitizedMatch.disputedAt = match.disputedAt;
                return sanitizedMatch;
            }),
        })),
    };
    if (state.champion) {
        sanitized.champion = state.champion;
    }
    return sanitized;
}
//# sourceMappingURL=tournamentBracket.js.map