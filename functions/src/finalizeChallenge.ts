import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireAdminClaims, writeAdminLog } from "./adminHelpers";
import { applyStatsAfterDisputeResolution } from "./statsAdmin";

function normalizeWinnerWallet(w: string): string {
  if (w === "forfeit" || w === "tie" || w === "cancelled") return w;
  return w.toLowerCase();
}

const hasAnyProofImageData = (results?: Record<string, any>) =>
  !!results &&
  Object.values(results).some((r: any) => r && r.proofImageData != null);

const stripProofImageDataFromResults = (results?: Record<string, any>) => {
  if (!results) return results;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(results)) {
    if (!v) {
      out[k] = v;
      continue;
    }
    const { proofImageData, ...rest } = v as Record<string, any>;
    out[k] = { ...rest };
  }
  return out;
};

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

  const resultsRaw = challengeData.results as Record<string, any> | undefined;
  const completionPatch: Record<string, unknown> = {
    status: "completed",
    winner: normalizeWinnerWallet(winnerWalletRaw),
    resolutionType: "admin",
    resolvedBy: adminWallet,
    resolvedAt: Timestamp.now(),
    adminResolutionTx: onChainTx,
    updatedAt: FieldValue.serverTimestamp(),
    needsPayout: true,
    payoutTriggered: false,
    canClaim: true,
  };
  if (hasAnyProofImageData(resultsRaw)) {
    completionPatch.results = stripProofImageDataFromResults(resultsRaw);
  }
  await challengeRef.update(completionPatch);

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
    const afterSnap = await challengeRef.get();
    const afterData = afterSnap.data() as Record<string, unknown> | undefined;
    if (afterData?.statsApplied !== true) {
      await applyStatsAfterDisputeResolution(challengeData, winnerWalletRaw);
      await challengeRef.update({ statsApplied: true });
    }
  } catch (e) {
    console.error("Stats update failed (non-fatal):", e);
  }

  return { ok: true };
});
