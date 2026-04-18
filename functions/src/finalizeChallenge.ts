import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireAdminClaims, writeAdminLog } from "./adminHelpers";
import { applyStatsAfterDisputeResolution } from "./statsAdmin";

function normalizeWinnerWallet(w: string): string {
  if (w === "forfeit" || w === "tie" || w === "cancelled") return w;
  return w.toLowerCase();
}

export const finalizeAdminChallengeDispute = onCall(async (request) => {
  const adminWallet = requireAdminClaims(request);

  const challengeId = request.data?.challengeId as string | undefined;
  const winnerWalletRaw = request.data?.winnerWallet as string | undefined;
  const onChainTx = (request.data?.onChainTx as string | undefined) ?? null;

  if (!challengeId || !winnerWalletRaw) {
    throw new HttpsError("invalid-argument", "challengeId and winnerWallet are required");
  }

  const db = getFirestore();
  const challengeRef = db.collection("challenges").doc(challengeId);
  const challengeSnap = await challengeRef.get();

  if (!challengeSnap.exists) {
    throw new HttpsError("not-found", "Challenge not found");
  }

  const challengeData = challengeSnap.data() as Record<string, unknown>;

  if (challengeData.status !== "disputed") {
    throw new HttpsError(
      "failed-precondition",
      `Challenge is not in dispute. Current status: ${String(challengeData.status)}`
    );
  }

  const players = (challengeData.players as string[]) || [];
  const winnerNorm = normalizeWinnerWallet(winnerWalletRaw);
  if (!players.some((p) => normalizeWinnerWallet(p) === winnerNorm)) {
    throw new HttpsError("invalid-argument", "Winner must be one of the challenge participants");
  }

  await challengeRef.update({
    status: "completed",
    winner: normalizeWinnerWallet(winnerWalletRaw),
    resolvedBy: adminWallet,
    resolvedAt: Timestamp.now(),
    adminResolutionTx: onChainTx,
    updatedAt: FieldValue.serverTimestamp(),
    needsPayout: true,
    payoutTriggered: false,
    canClaim: true,
  });

  await db.collection("admin_audit_log").add({
    adminUid: adminWallet,
    adminEmail: `wallet:${adminWallet}`,
    challengeId,
    winner: normalizeWinnerWallet(winnerWalletRaw),
    action: "resolve_dispute",
    timestamp: Timestamp.now(),
    onChainTx,
    notes: "server_finalize",
  });

  await writeAdminLog("resolve_dispute", adminWallet, challengeId);

  try {
    await applyStatsAfterDisputeResolution(challengeData, winnerWalletRaw);
  } catch (e) {
    console.error("Stats update failed (non-fatal):", e);
  }

  return { ok: true };
});
