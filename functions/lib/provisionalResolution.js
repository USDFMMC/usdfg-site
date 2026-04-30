"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeProvisionalChallengeResolutions = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const statsAdmin_1 = require("./statsAdmin");
function normalizeWinnerWallet(w) {
    if (w === "forfeit" || w === "tie" || w === "cancelled")
        return w;
    return w.toLowerCase();
}
function prizePoolFromChallenge(data) {
    const stored = data.prizePool;
    if (stored && stored > 0)
        return stored;
    const entryFee = data.entryFee || 0;
    const totalPrize = entryFee * 2;
    const platformFee = totalPrize * 0.05;
    return totalPrize - platformFee;
}
function resultForWallet(results, wallet) {
    const target = normalizeWinnerWallet(wallet);
    const key = Object.keys(results).find((k) => normalizeWinnerWallet(k) === target);
    return key ? results[key] : undefined;
}
async function applyClearWinnerStats(db, data, winnerWallet, loserWallet) {
    if (!data.needsStats || data.statsApplied) {
        return;
    }
    const prizePool = prizePoolFromChallenge(data);
    const game = data.game || "Unknown";
    const category = data.category || "Sports";
    if (data.challengeType === "team") {
        await (0, statsAdmin_1.updateTeamStatsAdmin)(db, winnerWallet, "win", prizePool, game, category);
        await (0, statsAdmin_1.updateTeamStatsAdmin)(db, loserWallet, "loss", 0, game, category);
    }
    else {
        await (0, statsAdmin_1.updatePlayerStatsAdmin)(db, winnerWallet, "win", prizePool, game, category);
        await (0, statsAdmin_1.updatePlayerStatsAdmin)(db, loserWallet, "loss", 0, game, category);
    }
}
async function processOneChallenge(ref) {
    const db = (0, firestore_1.getFirestore)();
    const txResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            return { kind: "skip" };
        }
        const data = snap.data();
        if (data.status === "completed") {
            return { kind: "skip" };
        }
        if (data.status !== "awaiting_auto_resolution") {
            return { kind: "skip" };
        }
        const st = data.status;
        if (st === "disputed") {
            return { kind: "skip" };
        }
        if (st !== "awaiting_auto_resolution") {
            return { kind: "skip" };
        }
        const resolveAfter = data.resolveAfter;
        const nowMs = Date.now();
        if (!resolveAfter || resolveAfter.toMillis() > nowMs) {
            return { kind: "skip" };
        }
        const players = data.players || [];
        if (players.length !== 2) {
            return { kind: "skip" };
        }
        const prov = data.provisionalWinner;
        const lossBy = data.lossReportedBy;
        if (!prov || !lossBy) {
            return { kind: "skip" };
        }
        const provNorm = normalizeWinnerWallet(String(prov));
        const lossNorm = normalizeWinnerWallet(String(lossBy));
        const playerNorms = players.map((p) => normalizeWinnerWallet(p));
        if (!playerNorms.includes(provNorm) || !playerNorms.includes(lossNorm) || provNorm === lossNorm) {
            return { kind: "skip" };
        }
        const results = { ...(data.results || {}) };
        const lossEntry = resultForWallet(results, lossBy);
        if (!lossEntry || lossEntry.didWin !== false) {
            return { kind: "skip" };
        }
        const provKey = players.find((p) => normalizeWinnerWallet(p) === provNorm) || prov;
        if (!results[provKey]) {
            results[provKey] = {
                didWin: true,
                submittedAt: firestore_1.Timestamp.now(),
                autoDetermined: true,
            };
        }
        const [p1, p2] = [players[0], players[1]];
        const r1 = resultForWallet(results, p1)?.didWin;
        const r2 = resultForWallet(results, p2)?.didWin;
        if (r1 === undefined || r2 === undefined) {
            return { kind: "skip" };
        }
        if (data.finalizedAt) {
            return { kind: "skip" };
        }
        const clearFields = {
            provisionalWinner: firestore_1.FieldValue.delete(),
            lossReportedBy: firestore_1.FieldValue.delete(),
            resolveAfter: firestore_1.FieldValue.delete(),
        };
        const finalizeMeta = {
            finalizedAt: firestore_1.Timestamp.now(),
            resolutionMeta: {
                type: "cron_finalize",
                triggeredAt: firestore_1.Timestamp.now(),
            },
        };
        if (r1 && r2) {
            tx.update(ref, {
                ...clearFields,
                ...finalizeMeta,
                results,
                status: "disputed",
                winner: null,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return { kind: "disputed" };
        }
        if (!r1 && !r2) {
            tx.update(ref, {
                ...clearFields,
                ...finalizeMeta,
                results,
                status: "completed",
                winner: "forfeit",
                needsStats: false,
                statsApplied: true,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return { kind: "forfeit" };
        }
        const winner = r1 ? p1 : p2;
        const loser = r1 ? p2 : p1;
        const winnerNorm = normalizeWinnerWallet(winner);
        const loserNorm = normalizeWinnerWallet(loser);
        tx.update(ref, {
            ...clearFields,
            ...finalizeMeta,
            results,
            status: "completed",
            winner: winnerNorm,
            needsStats: true,
            needsPayout: true,
            payoutStatus: "pending",
            payoutTriggered: false,
            canClaim: true,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { kind: "clear", winner: winnerNorm, loser: loserNorm };
    });
    if (txResult.kind === "clear") {
        const after = await ref.get();
        const d = after.data();
        if (d && d.status === "completed" && typeof d.winner === "string" && d.winner !== "forfeit") {
            if (!d.needsStats || d.statsApplied) {
                return;
            }
            try {
                await applyClearWinnerStats(db, d, txResult.winner, txResult.loser);
                await ref.update({ statsApplied: true, needsStats: false });
            }
            catch (e) {
                logger.error("stats after provisional finalize failed", { challengeId: ref.id, error: String(e) });
            }
        }
    }
}
exports.finalizeProvisionalChallengeResolutions = (0, scheduler_1.onSchedule)({
    schedule: "every 1 minutes",
    timeZone: "Etc/UTC",
    memory: "256MiB",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    // Disputed challenges never have status awaiting_auto_resolution; re-check disputed inside the transaction too.
    const q = await db
        .collection("challenges")
        .where("status", "==", "awaiting_auto_resolution")
        .where("resolveAfter", "<=", now)
        .limit(25)
        .get();
    if (q.empty) {
        return;
    }
    for (const docSnap of q.docs) {
        try {
            await processOneChallenge(docSnap.ref);
        }
        catch (e) {
            logger.error("provisional resolution failed", { challengeId: docSnap.id, error: String(e) });
        }
    }
});
//# sourceMappingURL=provisionalResolution.js.map