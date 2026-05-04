import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { normalizeWinnerWallet } from "./statsAdmin";

const REGION = { region: "us-central1" as const };

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

function getCallerWalletNorm(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in");
  }
  const w = (request.auth.token as { wallet?: string }).wallet;
  if (!w || typeof w !== "string") {
    throw new HttpsError("failed-precondition", "Wallet not linked to account");
  }
  return normalizeWinnerWallet(w);
}

function isAdminToken(request: CallableRequest): boolean {
  return (request.auth?.token as { admin?: boolean }).admin === true;
}

function assertOwnsWallet(request: CallableRequest, walletRaw: string): string {
  const target = normalizeWinnerWallet(walletRaw);
  if (isAdminToken(request)) {
    return target;
  }
  const caller = getCallerWalletNorm(request);
  if (caller !== target) {
    throw new HttpsError("permission-denied", "Can only update your own player_stats");
  }
  return target;
}

async function assertCanRecalcTrustScore(
  db: Firestore,
  request: CallableRequest,
  targetWalletNorm: string
): Promise<void> {
  if (isAdminToken(request)) {
    return;
  }
  const caller = getCallerWalletNorm(request);
  if (caller === targetWalletNorm) {
    return;
  }
  const snap = await db
    .collection("trust_reviews")
    .where("reviewer", "==", caller)
    .where("opponent", "==", targetWalletNorm)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new HttpsError(
      "permission-denied",
      "Trust score can only be refreshed for yourself or after you reviewed this player"
    );
  }
}

const DEFAULT_STUB = {
  wins: 0,
  losses: 0,
  winRate: 0,
  totalEarned: 0,
  gamesPlayed: 0,
  trustScore: 0,
  trustReviews: 0,
  gameStats: {},
  categoryStats: {},
} as const;

async function computeTrustFromReviews(
  db: Firestore,
  walletNorm: string
): Promise<{ trustScore: number; trustReviews: number }> {
  const snap = await db.collection("trust_reviews").where("opponent", "==", walletNorm).get();
  if (snap.empty) {
    return { trustScore: 0, trustReviews: 0 };
  }
  let totalScore = 0;
  let reviewCount = 0;
  snap.forEach((d) => {
    const data = d.data() as { review?: { trustScore10?: number } };
    const score = data.review?.trustScore10 || 0;
    totalScore += score;
    reviewCount += 1;
  });
  const averageScore = totalScore / reviewCount;
  const trustScore = Math.round(averageScore * 10) / 10;
  return { trustScore, trustReviews: reviewCount };
}

/** displayName, country, profileImage — caller must own wallet (or admin). */
export const updatePlayerProfile = onCall(REGION, async (request) => {
  const walletRaw = request.data?.wallet as string | undefined;
  if (!walletRaw) {
    throw new HttpsError("invalid-argument", "wallet is required");
  }
  const walletNorm = assertOwnsWallet(request, walletRaw);
  const displayNameIn = request.data?.displayName as string | undefined;
  const countryIn = request.data?.country as string | null | undefined;
  const profileImageIn = request.data?.profileImage as string | null | undefined;

  const hasDisplay = displayNameIn !== undefined;
  const hasCountry = countryIn !== undefined;
  const hasImage = profileImageIn !== undefined;
  if (!hasDisplay && !hasCountry && !hasImage) {
    throw new HttpsError("invalid-argument", "At least one of displayName, country, profileImage is required");
  }

  if (hasImage && profileImageIn !== null) {
    const s = String(profileImageIn);
    if (s.length > 600_000) {
      throw new HttpsError("invalid-argument", "profileImage too large");
    }
  }
  if (hasCountry && countryIn !== null && countryIn !== undefined) {
    const c = String(countryIn).trim();
    if (c.length > 8) {
      throw new HttpsError("invalid-argument", "country code too long");
    }
  }

  const db = getFirestore();
  const ref = db.collection("player_stats").doc(walletNorm);
  const snap = await ref.get();
  const sanitizedName = hasDisplay ? sanitizeDisplayNameAdmin(displayNameIn) : undefined;
  if (hasDisplay && !sanitizedName) {
    throw new HttpsError("invalid-argument", "displayName invalid or failed sanitization");
  }

  const patch: Record<string, unknown> = {
    lastActive: FieldValue.serverTimestamp(),
  };
  if (hasDisplay) {
    patch.displayName = sanitizedName;
  }
  if (hasCountry) {
    patch.country = countryIn === null || countryIn === "" ? null : String(countryIn).trim();
  }
  if (hasImage) {
    patch.profileImage = profileImageIn;
  }

  if (!snap.exists) {
    await ref.set({
      wallet: walletNorm,
      ...DEFAULT_STUB,
      ...patch,
      lastActive: Timestamp.now(),
    });
  } else {
    await ref.set(patch, { merge: true });
  }

  return { ok: true };
});

/** lastActive touch, founder totalEarned bump, OG First 2.1k seed — caller must own wallet (or admin). */
export const updatePlayerMeta = onCall(REGION, async (request) => {
  const walletRaw = request.data?.wallet as string | undefined;
  if (!walletRaw) {
    throw new HttpsError("invalid-argument", "wallet is required");
  }
  const walletNorm = assertOwnsWallet(request, walletRaw);

  const touchLastActive = request.data?.touchLastActive === true;
  const founderEarnedDelta = request.data?.founderEarnedDelta as number | undefined;
  const awardOgFirst1kIfEligible = request.data?.awardOgFirst1kIfEligible === true;

  if (!touchLastActive && founderEarnedDelta === undefined && !awardOgFirst1kIfEligible) {
    throw new HttpsError(
      "invalid-argument",
      "One of touchLastActive, founderEarnedDelta, awardOgFirst1kIfEligible is required"
    );
  }

  if (founderEarnedDelta !== undefined) {
    if (!Number.isFinite(founderEarnedDelta) || founderEarnedDelta < 0 || founderEarnedDelta > 1e12) {
      throw new HttpsError("invalid-argument", "founderEarnedDelta invalid");
    }
  }

  const db = getFirestore();
  const ref = db.collection("player_stats").doc(walletNorm);

  if (touchLastActive || founderEarnedDelta !== undefined) {
    await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) {
        tx.set(ref, {
          wallet: walletNorm,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: founderEarnedDelta ?? 0,
          gamesPlayed: 0,
          lastActive: FieldValue.serverTimestamp(),
          trustScore: 0,
          trustReviews: 0,
          gameStats: {},
          categoryStats: {},
        });
        return;
      }
      const cur = s.data() as { totalEarned?: number };
      const patch: Record<string, unknown> = {
        lastActive: FieldValue.serverTimestamp(),
      };
      if (founderEarnedDelta !== undefined) {
        patch.totalEarned = (cur.totalEarned || 0) + founderEarnedDelta;
      }
      tx.set(ref, patch, { merge: true });
    });
  }

  if (awardOgFirst1kIfEligible) {
    const countSnap = await db.collection("player_stats").count().get();
    const totalCount = countSnap.data().count;
    if (totalCount >= 2100) {
      return { ok: true, skipped: true };
    }
    const existing = await ref.get();
    if (existing.exists) {
      const d = existing.data() as { ogFirst1k?: boolean };
      if (d.ogFirst1k === true) {
        return { ok: true, skipped: true };
      }
      await ref.set(
        { ogFirst1k: true, lastActive: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { ok: true };
    }
    await ref.set({
      wallet: walletNorm,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalEarned: 0,
      gamesPlayed: 0,
      lastActive: Timestamp.now(),
      ogFirst1k: true,
      gameStats: {},
      categoryStats: {},
    });
  }

  return { ok: true };
});

/** Recompute trustScore / trustReviews from trust_reviews (same formula as former client). */
export const updateTrustScore = onCall(REGION, async (request) => {
  const walletRaw = request.data?.wallet as string | undefined;
  if (!walletRaw) {
    throw new HttpsError("invalid-argument", "wallet is required");
  }
  const walletNorm = normalizeWinnerWallet(walletRaw);
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in");
  }

  const db = getFirestore();
  await assertCanRecalcTrustScore(db, request, walletNorm);

  const { trustScore, trustReviews } = await computeTrustFromReviews(db, walletNorm);
  const ref = db.collection("player_stats").doc(walletNorm);
  const snap = await ref.get();

  if (snap.exists) {
    const currentData = snap.data() as { trustScore?: number; trustReviews?: number };
    const curTs = currentData.trustScore || 0;
    const curTr = currentData.trustReviews || 0;
    if (curTs !== trustScore || curTr !== trustReviews) {
      await ref.set(
        {
          trustScore,
          trustReviews,
          lastActive: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  } else {
    await ref.set({
      wallet: walletNorm,
      ...DEFAULT_STUB,
      trustScore,
      trustReviews,
      lastActive: Timestamp.now(),
    });
  }

  return { ok: true, trustScore, trustReviews };
});
