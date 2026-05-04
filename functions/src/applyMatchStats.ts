import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import {
  normalizeWinnerWallet,
  fetchSoloMatchSkillScores,
  fetchTeamMatchSkillScores,
  updatePlayerStatsAdmin,
  updateTeamStatsAdmin,
} from "./statsAdmin";

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

function sanitizeDisplayNameAdmin(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const lowerName = name.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lowerName.includes(word)) {
      return undefined;
    }
  }
  const sanitized = name.trim().slice(0, 20);
  return sanitized || undefined;
}

function sameWallet(a: string, b: string | undefined): boolean {
  if (!b) return false;
  return normalizeWinnerWallet(a) === normalizeWinnerWallet(b);
}

function tournamentPrizePoolForStatsAdmin(data: Record<string, unknown>): number {
  const stored = data.prizePool as number | undefined;
  if (stored && stored > 0) return stored;
  const tournament = data.tournament as Record<string, unknown> | undefined;
  const bracket = tournament?.bracket as Array<{ matches: unknown[] }> | undefined;
  const entryFee = (data.entryFee as number) || 0;
  const maxPlayers = (data.maxPlayers as number) || bracket?.[0]?.matches?.length || 2;
  const totalPrize = entryFee * maxPlayers;
  const platformFee = totalPrize * 0.05;
  return totalPrize - platformFee;
}

function tournamentFinalLoserWalletAdmin(
  match: { player1?: string | null; player2?: string | null },
  winnerWallet: string
): string | null {
  const w = winnerWallet.toLowerCase();
  if (match.player1?.toLowerCase() === w && match.player2) return match.player2;
  if (match.player2?.toLowerCase() === w && match.player1) return match.player1;
  return null;
}

function getTournamentFinalLoserFromChallenge(
  data: Record<string, unknown>,
  winnerNorm: string
): string | null {
  const tournament = data.tournament as
    | {
        bracket?: Array<{
          matches: Array<{
            status?: string;
            winner?: string;
            player1?: string | null;
            player2?: string | null;
          }>;
        }>;
      }
    | undefined;
  const bracket = tournament?.bracket;
  if (!bracket?.length) return null;
  const lastRound = bracket[bracket.length - 1];
  const finalMatch = lastRound.matches?.find((m) => m.status === "completed" && m.winner);
  if (!finalMatch) return null;
  const wNorm = normalizeWinnerWallet(String(finalMatch.winner || ""));
  if (wNorm !== winnerNorm) return null;
  return tournamentFinalLoserWalletAdmin(finalMatch, winnerNorm);
}

function assertCallerIsParticipant(request: CallableRequest, data: Record<string, unknown>): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in");
  }
  const tok = request.auth.token as { admin?: boolean };
  if (tok?.admin === true) {
    return;
  }
  const players = (data.players as string[]) || [];
  const playersUid = (data.playersUid as (string | null)[]) || [];
  const uid = request.auth.uid;
  const idx = playersUid.findIndex((u) => u === uid);
  if (idx !== -1 && players[idx]) {
    return;
  }
  const walletClaim = (request.auth.token as { wallet?: string }).wallet;
  if (
    walletClaim &&
    players.some((p) => normalizeWinnerWallet(p) === normalizeWinnerWallet(walletClaim))
  ) {
    return;
  }
  if (players.some((p) => normalizeWinnerWallet(p) === normalizeWinnerWallet(uid))) {
    return;
  }
  throw new HttpsError("permission-denied", "Caller is not a challenge participant");
}

/**
 * Applies the same win/loss/forfeit/tournament stats the client used to write via updatePlayerStats,
 * then sets challenges.statsApplied. Idempotent when statsApplied is already true.
 */
export async function executeApplyMatchStatsForChallenge(
  db: Firestore,
  challengeId: string
): Promise<{ ok: boolean; skipped: boolean }> {
  const ref = db.collection("challenges").doc(challengeId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Challenge not found");
  }
  const d = snap.data() as Record<string, unknown>;

  if (d.statsApplied === true) {
    return { ok: true, skipped: true };
  }

  if (d.status !== "completed") {
    throw new HttpsError("failed-precondition", "Challenge is not completed");
  }

  const game = (d.game as string) || "Unknown";
  const category = (d.category as string) || "Sports";
  const isTeam = d.challengeType === "team";
  const players = (d.players as string[]) || [];
  const winnerRaw = d.winner as string | undefined;
  if (!winnerRaw) {
    throw new HttpsError("failed-precondition", "Missing winner");
  }

  const isTournament =
    (d.format as string) === "tournament" || !!(d.tournament as Record<string, unknown> | undefined);

  let prizePool = (d.prizePool as number) || 0;
  if (!prizePool || prizePool <= 0) {
    if (isTournament) {
      prizePool = tournamentPrizePoolForStatsAdmin(d);
    } else {
      const entryFee = (d.entryFee as number) || 0;
      const totalPrize = entryFee * 2;
      const platformFee = totalPrize * 0.05;
      prizePool = totalPrize - platformFee;
    }
  }

  const resolutionType = (d.resolutionType as string) === "admin" ? "admin" : "auto";
  const creator = (d.creator as string) || "";

  if (winnerRaw === "forfeit" || winnerRaw === "tie") {
    if (isTeam) {
      for (const tid of players) {
        await updateTeamStatsAdmin(db, normalizeWinnerWallet(tid), "forfeit", 0, game, category);
      }
    } else {
      for (const w of players) {
        const rawName = sameWallet(w, creator) ? (d.creatorTag as string | undefined) : undefined;
        const displayName = sanitizeDisplayNameAdmin(rawName);
        await updatePlayerStatsAdmin(db, normalizeWinnerWallet(w), "forfeit", 0, game, category, {
          resolutionType: "forfeit",
          ...(displayName ? { displayName } : {}),
        });
      }
    }
    await ref.update({
      statsApplied: true,
      needsStats: false,
      updatedAt: Timestamp.now(),
    });
    return { ok: true, skipped: false };
  }

  const winnerNorm = normalizeWinnerWallet(winnerRaw);

  if (isTeam) {
    const loserWallet = players.find((p) => normalizeWinnerWallet(p) !== winnerNorm);
    if (!loserWallet) {
      throw new HttpsError("failed-precondition", "Could not resolve loser team");
    }
    const loserNorm = normalizeWinnerWallet(loserWallet);
    const { skillA: winnerSkill, skillB: loserSkill } = await fetchTeamMatchSkillScores(
      db,
      winnerNorm,
      loserNorm
    );
    await updateTeamStatsAdmin(db, winnerNorm, "win", prizePool, game, category, {
      opponentSkillScore: loserSkill,
    });
    await updateTeamStatsAdmin(db, loserNorm, "loss", 0, game, category, {
      opponentSkillScore: winnerSkill,
    });
    await ref.update({
      statsApplied: true,
      needsStats: false,
      updatedAt: Timestamp.now(),
    });
    return { ok: true, skipped: false };
  }

  let loserNorm: string | null = null;

  if (isTournament) {
    const fromBracket = getTournamentFinalLoserFromChallenge(d, winnerNorm);
    if (fromBracket) {
      loserNorm = normalizeWinnerWallet(fromBracket);
    } else if (players.length === 2) {
      const other = players.find((p) => normalizeWinnerWallet(p) !== winnerNorm);
      if (other) loserNorm = normalizeWinnerWallet(other);
    }
  } else if (players.length === 2) {
    const other = players.find((p) => normalizeWinnerWallet(p) !== winnerNorm);
    if (other) loserNorm = normalizeWinnerWallet(other);
  }

  if (!loserNorm) {
    throw new HttpsError("failed-precondition", "Could not resolve loser wallet");
  }

  const rawWinnerName = sameWallet(winnerNorm, creator) ? (d.creatorTag as string | undefined) : undefined;
  const rawLoserName = sameWallet(loserNorm, creator) ? (d.creatorTag as string | undefined) : undefined;
  const winnerDisplayName = sanitizeDisplayNameAdmin(rawWinnerName);
  const loserDisplayName = sanitizeDisplayNameAdmin(rawLoserName);

  const { skillA: winnerSkill, skillB: loserSkill } = await fetchSoloMatchSkillScores(
    db,
    winnerNorm,
    loserNorm
  );
  await updatePlayerStatsAdmin(db, winnerNorm, "win", prizePool, game, category, {
    resolutionType,
    opponentSkillScore: loserSkill,
    ...(winnerDisplayName ? { displayName: winnerDisplayName } : {}),
  });
  await updatePlayerStatsAdmin(db, loserNorm, "loss", 0, game, category, {
    resolutionType,
    opponentSkillScore: winnerSkill,
    ...(loserDisplayName ? { displayName: loserDisplayName } : {}),
  });

  await ref.update({
    statsApplied: true,
    needsStats: false,
    updatedAt: Timestamp.now(),
  });
  return { ok: true, skipped: false };
}

export const applyMatchStats = onCall({ region: "us-central1" }, async (request) => {
  const challengeId = request.data?.challengeId as string | undefined;
  if (!challengeId) {
    throw new HttpsError("invalid-argument", "challengeId is required");
  }

  const db = getFirestore();
  const preSnap = await db.collection("challenges").doc(challengeId).get();
  if (!preSnap.exists) {
    throw new HttpsError("not-found", "Challenge not found");
  }
  assertCallerIsParticipant(request, preSnap.data() as Record<string, unknown>);

  const result = await executeApplyMatchStatsForChallenge(db, challengeId);
  return { ok: result.ok, skipped: result.skipped };
});
