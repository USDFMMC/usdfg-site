/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase-admin/firestore";

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  status: string;
  player1?: string;
  player2?: string;
  winner?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  player1Result?: string;
  player2Result?: string;
  disputeId?: string;
  disputedAt?: Timestamp;
}

export interface BracketRound {
  roundNumber: number;
  matches: BracketMatch[];
}

export interface TournamentState {
  format: "tournament";
  maxPlayers: number;
  currentRound: number;
  stage: string;
  bracket: BracketRound[];
  champion?: string;
  completedAt?: FirebaseFirestore.Timestamp;
}

export function deepCloneBracket(bracket: BracketRound[] | undefined): BracketRound[] {
  if (!bracket) return [];
  return bracket.map((round) => ({
    roundNumber: round.roundNumber,
    matches: round.matches.map((match) => ({ ...match })),
  }));
}

export function activateRoundMatches(
  bracket: BracketRound[],
  roundNumber: number
): BracketRound[] {
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
          startedAt: hasBothPlayers ? match.startedAt || Timestamp.now() : match.startedAt,
        };
      }),
    };
  });
}

export function sanitizeTournamentState(state: TournamentState): TournamentState {
  const sanitized: TournamentState = {
    format: "tournament",
    maxPlayers: state.maxPlayers,
    currentRound: state.currentRound,
    stage: state.stage,
    bracket: state.bracket.map((round) => ({
      roundNumber: round.roundNumber,
      matches: round.matches.map((match) => {
        const sanitizedMatch: any = {
          id: match.id,
          round: match.round,
          slot: match.slot,
          status: match.status,
        };

        if (match.player1) sanitizedMatch.player1 = match.player1;
        if (match.player2) sanitizedMatch.player2 = match.player2;
        if (match.winner) sanitizedMatch.winner = match.winner;
        if (match.startedAt) sanitizedMatch.startedAt = match.startedAt;
        if (match.completedAt) sanitizedMatch.completedAt = match.completedAt;
        if (match.player1Result) sanitizedMatch.player1Result = match.player1Result;
        if (match.player2Result) sanitizedMatch.player2Result = match.player2Result;
        if (match.disputeId) sanitizedMatch.disputeId = match.disputeId;
        if (match.disputedAt) sanitizedMatch.disputedAt = match.disputedAt;

        return sanitizedMatch;
      }),
    })),
  };

  if (state.champion) {
    sanitized.champion = state.champion;
  }

  return sanitized;
}
