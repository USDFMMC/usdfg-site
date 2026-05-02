import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore, Timestamp, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {
  fetchSoloMatchSkillScores,
  fetchTeamMatchSkillScores,
  updatePlayerStatsAdmin,
  updateTeamStatsAdmin,
} from "./statsAdmin";

function normalizeWinnerWallet(w: string): string {
  if (w === "forfeit" || w === "tie" || w === "cancelled") return w;
  return w.toLowerCase();
}

type ResultEntry = { didWin: boolean; submittedAt?: Timestamp; autoDetermined?: boolean };

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

function prizePoolFromChallenge(data: Record<string, unknown>): number {
  const stored = data.prizePool as number | undefined;
  if (stored && stored > 0) return stored;
  const entryFee = (data.entryFee as number) || 0;
  const totalPrize = entryFee * 2;
  const platformFee = totalPrize * 0.05;
  return totalPrize - platformFee;
}

function resultForWallet(
  results: Record<string, ResultEntry>,
  wallet: string
): ResultEntry | undefined {
  const target = normalizeWinnerWallet(wallet);
  const key = Object.keys(results).find((k) => normalizeWinnerWallet(k) === target);
  return key ? results[key] : undefined;
}

async function applyClearWinnerStats(
  db: Firestore,
  data: Record<string, unknown>,
  winnerWallet: string,
  loserWallet: string
): Promise<void> {
  if (data.statsApplied === true) {
    return;
  }
  const prizePool = prizePoolFromChallenge(data);
  const game = (data.game as string) || "Unknown";
  const category = (data.category as string) || "Sports";
  if (data.challengeType === "team") {
    const { skillA: winnerSkill, skillB: loserSkill } = await fetchTeamMatchSkillScores(
      db,
      winnerWallet,
      loserWallet
    );
    await updateTeamStatsAdmin(db, winnerWallet, "win", prizePool, game, category, {
      opponentSkillScore: loserSkill,
    });
    await updateTeamStatsAdmin(db, loserWallet, "loss", 0, game, category, {
      opponentSkillScore: winnerSkill,
    });
  } else {
    const { skillA: winnerSkill, skillB: loserSkill } = await fetchSoloMatchSkillScores(
      db,
      winnerWallet,
      loserWallet
    );
    await updatePlayerStatsAdmin(db, winnerWallet, "win", prizePool, game, category, {
      resolutionType: "auto",
      opponentSkillScore: loserSkill,
    });
    await updatePlayerStatsAdmin(db, loserWallet, "loss", 0, game, category, {
      resolutionType: "auto",
      opponentSkillScore: winnerSkill,
    });
  }
}

async function processOneChallenge(ref: DocumentReference): Promise<void> {
  const db = getFirestore();

  const txResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { kind: "skip" } as const;
    }
    const data = snap.data() as Record<string, unknown>;
    if (data.status === "completed") {
      return { kind: "skip" } as const;
    }
    if (data.status !== "awaiting_auto_resolution") {
      return { kind: "skip" } as const;
    }
    const st = data.status as string | undefined;
    if (st === "disputed") {
      return { kind: "skip" } as const;
    }
    if (st !== "awaiting_auto_resolution") {
      return { kind: "skip" } as const;
    }

    const resolveAfter = data.resolveAfter as Timestamp | undefined;
    const nowMs = Date.now();
    if (!resolveAfter || resolveAfter.toMillis() > nowMs) {
      return { kind: "skip" } as const;
    }

    const players = (data.players as string[]) || [];
    if (players.length !== 2) {
      return { kind: "skip" } as const;
    }

    const prov = data.provisionalWinner as string | undefined;
    const lossBy = data.lossReportedBy as string | undefined;
    if (!prov || !lossBy) {
      return { kind: "skip" } as const;
    }

    const provNorm = normalizeWinnerWallet(String(prov));
    const lossNorm = normalizeWinnerWallet(String(lossBy));
    const playerNorms = players.map((p) => normalizeWinnerWallet(p));
    if (!playerNorms.includes(provNorm) || !playerNorms.includes(lossNorm) || provNorm === lossNorm) {
      return { kind: "skip" } as const;
    }

    const results = { ...((data.results as Record<string, ResultEntry>) || {}) } as Record<string, ResultEntry>;

    const lossEntry = resultForWallet(results, lossBy);
    if (!lossEntry || lossEntry.didWin !== false) {
      return { kind: "skip" } as const;
    }

    const provKey = players.find((p) => normalizeWinnerWallet(p) === provNorm) || prov;
    const existing = results?.[provKey];

    const needsProvisionalWrite =
      !existing ||
      existing.didWin !== true ||
      !existing.submittedAt ||
      existing.autoDetermined !== true;

    if (needsProvisionalWrite) {
      results[provKey] = {
        didWin: true,
        submittedAt: Timestamp.now(),
        autoDetermined: true,
      };
    }

    const [p1, p2] = [players[0], players[1]];
    const r1 = resultForWallet(results, p1)?.didWin;
    const r2 = resultForWallet(results, p2)?.didWin;
    if (r1 === undefined || r2 === undefined) {
      return { kind: "skip" } as const;
    }

    if (data.finalizedAt) {
      return { kind: "skip" } as const;
    }

    const clearFields = {
      provisionalWinner: FieldValue.delete(),
      lossReportedBy: FieldValue.delete(),
      resolveAfter: FieldValue.delete(),
    };

    const finalizeMeta = {
      finalizedAt: Timestamp.now(),
      resolutionMeta: {
        type: "cron_finalize",
        triggeredAt: Timestamp.now(),
      },
    };

    if (r1 && r2) {
      tx.update(ref, {
        ...clearFields,
        ...finalizeMeta,
        results,
        status: "disputed",
        winner: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { kind: "disputed" } as const;
    }

    const resultsPatch =
      hasAnyProofImageData(results as Record<string, any>)
        ? { results: stripProofImageDataFromResults(results as Record<string, any>)! }
        : needsProvisionalWrite
          ? { results }
          : {};

    if (!r1 && !r2) {
      tx.update(ref, {
        ...clearFields,
        ...finalizeMeta,
        ...resultsPatch,
        status: "completed",
        winner: "forfeit",
        resolutionType: "forfeit",
        needsStats: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { kind: "forfeit", p1, p2 } as const;
    }

    const winner = r1 ? p1 : p2;
    const loser = r1 ? p2 : p1;
    const winnerNorm = normalizeWinnerWallet(winner);
    const loserNorm = normalizeWinnerWallet(loser);
    tx.update(ref, {
      ...clearFields,
      ...finalizeMeta,
      ...resultsPatch,
      status: "completed",
      winner: winnerNorm,
      resolutionType: "auto",
      needsStats: true,
      needsPayout: true,
      payoutStatus: "pending",
      payoutTriggered: false,
      canClaim: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { kind: "clear", winner: winnerNorm, loser: loserNorm };
  });

  if (txResult.kind === "clear") {
    const after = await ref.get();
    const d = after.data() as Record<string, unknown> | undefined;
    if (d && d.status === "completed" && typeof d.winner === "string" && d.winner !== "forfeit") {
      if (d.statsApplied === true) {
        return;
      }
      try {
        await applyClearWinnerStats(db, d, txResult.winner, txResult.loser);
        await ref.update({ statsApplied: true, needsStats: false });
      } catch (e) {
        logger.error("stats after provisional finalize failed", { challengeId: ref.id, error: String(e) });
      }
    }
  } else if (txResult.kind === "forfeit") {
    const after = await ref.get();
    const d = after.data() as Record<string, unknown> | undefined;
    if (!d || d.statsApplied === true) {
      return;
    }
    const game = (d.game as string) || "Unknown";
    const category = (d.category as string) || "Sports";
    try {
      const w1 = String(txResult.p1 ?? "");
      const w2 = String(txResult.p2 ?? "");
      if (!w1 || !w2) {
        logger.error("forfeit stats skipped: missing player wallets", { challengeId: ref.id });
        return;
      }
      if (d.challengeType === "team") {
        await updateTeamStatsAdmin(db, normalizeWinnerWallet(w1), "forfeit", 0, game, category);
        await updateTeamStatsAdmin(db, normalizeWinnerWallet(w2), "forfeit", 0, game, category);
      } else {
        await updatePlayerStatsAdmin(db, normalizeWinnerWallet(w1), "forfeit", 0, game, category);
        await updatePlayerStatsAdmin(db, normalizeWinnerWallet(w2), "forfeit", 0, game, category);
      }
      await ref.update({ statsApplied: true, needsStats: false });
    } catch (e) {
      logger.error("stats after provisional forfeit failed", { challengeId: ref.id, error: String(e) });
    }
  }
}

export const finalizeProvisionalChallengeResolutions = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Etc/UTC",
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
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
      } catch (e) {
        logger.error("provisional resolution failed", { challengeId: docSnap.id, error: String(e) });
      }
    }
  }
);
