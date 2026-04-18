"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeAdminChallengeDispute = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const adminHelpers_1 = require("./adminHelpers");
const statsAdmin_1 = require("./statsAdmin");
function normalizeWinnerWallet(w) {
    if (w === "forfeit" || w === "tie" || w === "cancelled")
        return w;
    return w.toLowerCase();
}
exports.finalizeAdminChallengeDispute = (0, https_1.onCall)(async (request) => {
    const adminWallet = (0, adminHelpers_1.requireAdminClaims)(request);
    const challengeId = request.data?.challengeId;
    const winnerWalletRaw = request.data?.winnerWallet;
    const onChainTx = request.data?.onChainTx ?? null;
    if (!challengeId || !winnerWalletRaw) {
        throw new https_1.HttpsError("invalid-argument", "challengeId and winnerWallet are required");
    }
    const db = (0, firestore_1.getFirestore)();
    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) {
        throw new https_1.HttpsError("not-found", "Challenge not found");
    }
    const challengeData = challengeSnap.data();
    if (challengeData.status !== "disputed") {
        throw new https_1.HttpsError("failed-precondition", `Challenge is not in dispute. Current status: ${String(challengeData.status)}`);
    }
    const players = challengeData.players || [];
    const winnerNorm = normalizeWinnerWallet(winnerWalletRaw);
    if (!players.some((p) => normalizeWinnerWallet(p) === winnerNorm)) {
        throw new https_1.HttpsError("invalid-argument", "Winner must be one of the challenge participants");
    }
    await challengeRef.update({
        status: "completed",
        winner: normalizeWinnerWallet(winnerWalletRaw),
        resolvedBy: adminWallet,
        resolvedAt: firestore_1.Timestamp.now(),
        adminResolutionTx: onChainTx,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
        timestamp: firestore_1.Timestamp.now(),
        onChainTx,
        notes: "server_finalize",
    });
    await (0, adminHelpers_1.writeAdminLog)("resolve_dispute", adminWallet, challengeId);
    try {
        await (0, statsAdmin_1.applyStatsAfterDisputeResolution)(challengeData, winnerWalletRaw);
    }
    catch (e) {
        console.error("Stats update failed (non-fatal):", e);
    }
    return { ok: true };
});
//# sourceMappingURL=finalizeChallenge.js.map