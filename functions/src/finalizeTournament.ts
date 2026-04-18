import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireAdminClaims, writeAdminLog } from "./adminHelpers";
import {
  deepCloneBracket,
  sanitizeTournamentState,
  activateRoundMatches,
  type TournamentState,
} from "./tournamentBracket";

export const finalizeAdminTournamentDispute = onCall(async (request) => {
  const adminWallet = requireAdminClaims(request);

  const challengeId = request.data?.challengeId as string | undefined;
  const matchId = request.data?.matchId as string | undefined;
  const winnerWalletRaw = request.data?.winnerWallet as string | undefined;

  if (!challengeId || !matchId || !winnerWalletRaw) {
    throw new HttpsError(
      "invalid-argument",
      "challengeId, matchId, and winnerWallet are required"
    );
  }

  const db = getFirestore();
  const challengeRef = db.collection("challenges").doc(challengeId);
  const snap = await challengeRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Challenge not found");
  }

  const data = snap.data() as Record<string, unknown>;
  const tournament = data.tournament as TournamentState | undefined;
  if (!tournament?.bracket) {
    throw new HttpsError("failed-precondition", "Tournament bracket not found");
  }

  const bracket = deepCloneBracket(tournament.bracket);
  let found = false;
  let currentRoundIndex = -1;
  let matchIndex = -1;
  let disputeId: string | undefined;

  const winnerLower = winnerWalletRaw.trim().toLowerCase();

  for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
    const round = bracket[roundIdx];
    for (let mi = 0; mi < round.matches.length; mi++) {
      const m = round.matches[mi];
      if (m.id === matchId) {
        const isP1 = m.player1?.toLowerCase() === winnerLower;
        const isP2 = m.player2?.toLowerCase() === winnerLower;
        if (!isP1 && !isP2) {
          throw new HttpsError("invalid-argument", "Winner is not a participant in this match");
        }

        disputeId = m.disputeId;

        m.winner = winnerWalletRaw.trim();
        m.status = "completed";
        m.completedAt = Timestamp.now();
        delete (m as { disputeId?: string }).disputeId;
        delete (m as unknown as Record<string, unknown>).disputedAt;

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
    if (found) break;
  }

  if (!found) {
    throw new HttpsError("not-found", "Match not found in bracket");
  }

  const currentRound = bracket[currentRoundIndex];
  if (!currentRound) {
    throw new HttpsError("failed-precondition", "Current round not found");
  }

  const updates: Record<string, unknown> = {
    "tournament.bracket": sanitizeTournamentState({ ...tournament, bracket }).bracket,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (currentRoundIndex === bracket.length - 1) {
    updates["tournament.champion"] = winnerWalletRaw.trim();
    updates["tournament.stage"] = "completed";
    updates["tournament.completedAt"] = FieldValue.serverTimestamp();
    updates["tournament.currentRound"] = bracket.length;
    updates.status = "completed";
    updates.canClaim = true;
  } else {
    const nextRound = bracket[currentRoundIndex + 1];
    if (!nextRound) {
      throw new HttpsError("failed-precondition", "Next round not found");
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];
    if (!nextMatch) {
      throw new HttpsError("failed-precondition", "Next round match not found");
    }

    const w = winnerWalletRaw.trim();
    if (matchIndex % 2 === 0) nextMatch.player1 = w;
    else nextMatch.player2 = w;
    if (nextMatch.player1 && nextMatch.player2) nextMatch.status = "ready";

    const allMatchesCompleted = currentRound.matches.every((m) => m.status === "completed");
    if (allMatchesCompleted) {
      const nextRoundNumber = currentRound.roundNumber + 1;
      updates["tournament.currentRound"] = nextRoundNumber;
      updates["tournament.stage"] = "round_in_progress";
      const updatedBracket = activateRoundMatches(bracket, nextRoundNumber);
      updates["tournament.bracket"] = sanitizeTournamentState({
        ...tournament,
        bracket: updatedBracket,
      }).bracket;
    } else {
      updates["tournament.bracket"] = sanitizeTournamentState({ ...tournament, bracket }).bracket;
    }
  }

  await challengeRef.update(updates);

  if (disputeId) {
    try {
      await db.collection("tournament_disputes").doc(disputeId).update({
        status: "resolved",
        resolvedAt: Timestamp.now(),
        resolvedByUid: adminWallet,
        resolvedByEmail: `wallet:${adminWallet}`,
        winnerWallet: winnerWalletRaw.trim(),
      });
    } catch (e) {
      console.warn("Failed to mark tournament dispute resolved:", e);
    }
  }

  const targetId = `${challengeId}:${matchId}`;
  await writeAdminLog("resolve_tournament_dispute", adminWallet, targetId);

  await db.collection("admin_audit_log").add({
    adminUid: adminWallet,
    adminEmail: `wallet:${adminWallet}`,
    challengeId,
    matchId,
    winner: winnerWalletRaw.trim(),
    action: "resolve_tournament_dispute",
    timestamp: Timestamp.now(),
    notes: "server_finalize",
  });

  return { ok: true };
});
