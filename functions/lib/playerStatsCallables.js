"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTrustScore = exports.updatePlayerMeta = exports.updatePlayerProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const statsAdmin_1 = require("./statsAdmin");
const REGION = { region: "us-central1" };
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
function sanitizeDisplayNameAdmin(name) {
    if (!name)
        return undefined;
    const lowerName = name.toLowerCase();
    for (const word of BLOCKED_WORDS) {
        if (lowerName.includes(word)) {
            return undefined;
        }
    }
    const sanitized = name.trim().slice(0, 20);
    return sanitized || undefined;
}
function getCallerWalletNorm(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Not signed in");
    }
    const w = request.auth.token.wallet;
    if (!w || typeof w !== "string") {
        throw new https_1.HttpsError("failed-precondition", "Wallet not linked to account");
    }
    return (0, statsAdmin_1.normalizeWinnerWallet)(w);
}
function isAdminToken(request) {
    return (request.auth?.token).admin === true;
}
function assertOwnsWallet(request, walletRaw) {
    const target = (0, statsAdmin_1.normalizeWinnerWallet)(walletRaw);
    if (isAdminToken(request)) {
        return target;
    }
    const caller = getCallerWalletNorm(request);
    if (caller !== target) {
        throw new https_1.HttpsError("permission-denied", "Can only update your own player_stats");
    }
    return target;
}
async function assertCanRecalcTrustScore(db, request, targetWalletNorm) {
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
        throw new https_1.HttpsError("permission-denied", "Trust score can only be refreshed for yourself or after you reviewed this player");
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
};
async function computeTrustFromReviews(db, walletNorm) {
    const snap = await db.collection("trust_reviews").where("opponent", "==", walletNorm).get();
    if (snap.empty) {
        return { trustScore: 0, trustReviews: 0 };
    }
    let totalScore = 0;
    let reviewCount = 0;
    snap.forEach((d) => {
        const data = d.data();
        const score = data.review?.trustScore10 || 0;
        totalScore += score;
        reviewCount += 1;
    });
    const averageScore = totalScore / reviewCount;
    const trustScore = Math.round(averageScore * 10) / 10;
    return { trustScore, trustReviews: reviewCount };
}
/** displayName, country, profileImage — caller must own wallet (or admin). */
exports.updatePlayerProfile = (0, https_1.onCall)(REGION, async (request) => {
    const walletRaw = request.data?.wallet;
    if (!walletRaw) {
        throw new https_1.HttpsError("invalid-argument", "wallet is required");
    }
    const walletNorm = assertOwnsWallet(request, walletRaw);
    const displayNameIn = request.data?.displayName;
    const countryIn = request.data?.country;
    const profileImageIn = request.data?.profileImage;
    const hasDisplay = displayNameIn !== undefined;
    const hasCountry = countryIn !== undefined;
    const hasImage = profileImageIn !== undefined;
    if (!hasDisplay && !hasCountry && !hasImage) {
        throw new https_1.HttpsError("invalid-argument", "At least one of displayName, country, profileImage is required");
    }
    if (hasImage && profileImageIn !== null) {
        const s = String(profileImageIn);
        if (s.length > 600000) {
            throw new https_1.HttpsError("invalid-argument", "profileImage too large");
        }
    }
    if (hasCountry && countryIn !== null && countryIn !== undefined) {
        const c = String(countryIn).trim();
        if (c.length > 8) {
            throw new https_1.HttpsError("invalid-argument", "country code too long");
        }
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("player_stats").doc(walletNorm);
    const snap = await ref.get();
    const sanitizedName = hasDisplay ? sanitizeDisplayNameAdmin(displayNameIn) : undefined;
    if (hasDisplay && !sanitizedName) {
        throw new https_1.HttpsError("invalid-argument", "displayName invalid or failed sanitization");
    }
    const patch = {
        lastActive: firestore_1.FieldValue.serverTimestamp(),
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
            lastActive: firestore_1.Timestamp.now(),
        });
    }
    else {
        await ref.set(patch, { merge: true });
    }
    return { ok: true };
});
/** lastActive touch, founder totalEarned bump, OG First 2.1k seed — caller must own wallet (or admin). */
exports.updatePlayerMeta = (0, https_1.onCall)(REGION, async (request) => {
    const walletRaw = request.data?.wallet;
    if (!walletRaw) {
        throw new https_1.HttpsError("invalid-argument", "wallet is required");
    }
    const walletNorm = assertOwnsWallet(request, walletRaw);
    const touchLastActive = request.data?.touchLastActive === true;
    const founderEarnedDelta = request.data?.founderEarnedDelta;
    const awardOgFirst1kIfEligible = request.data?.awardOgFirst1kIfEligible === true;
    if (!touchLastActive && founderEarnedDelta === undefined && !awardOgFirst1kIfEligible) {
        throw new https_1.HttpsError("invalid-argument", "One of touchLastActive, founderEarnedDelta, awardOgFirst1kIfEligible is required");
    }
    if (founderEarnedDelta !== undefined) {
        if (!Number.isFinite(founderEarnedDelta) || founderEarnedDelta < 0 || founderEarnedDelta > 1e12) {
            throw new https_1.HttpsError("invalid-argument", "founderEarnedDelta invalid");
        }
    }
    const db = (0, firestore_1.getFirestore)();
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
                    lastActive: firestore_1.FieldValue.serverTimestamp(),
                    trustScore: 0,
                    trustReviews: 0,
                    gameStats: {},
                    categoryStats: {},
                });
                return;
            }
            const cur = s.data();
            const patch = {
                lastActive: firestore_1.FieldValue.serverTimestamp(),
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
            const d = existing.data();
            if (d.ogFirst1k === true) {
                return { ok: true, skipped: true };
            }
            await ref.set({ ogFirst1k: true, lastActive: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
            return { ok: true };
        }
        await ref.set({
            wallet: walletNorm,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalEarned: 0,
            gamesPlayed: 0,
            lastActive: firestore_1.Timestamp.now(),
            ogFirst1k: true,
            gameStats: {},
            categoryStats: {},
        });
    }
    return { ok: true };
});
/** Recompute trustScore / trustReviews from trust_reviews (same formula as former client). */
exports.updateTrustScore = (0, https_1.onCall)(REGION, async (request) => {
    const walletRaw = request.data?.wallet;
    if (!walletRaw) {
        throw new https_1.HttpsError("invalid-argument", "wallet is required");
    }
    const walletNorm = (0, statsAdmin_1.normalizeWinnerWallet)(walletRaw);
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Not signed in");
    }
    const db = (0, firestore_1.getFirestore)();
    await assertCanRecalcTrustScore(db, request, walletNorm);
    const { trustScore, trustReviews } = await computeTrustFromReviews(db, walletNorm);
    const ref = db.collection("player_stats").doc(walletNorm);
    const snap = await ref.get();
    if (snap.exists) {
        const currentData = snap.data();
        const curTs = currentData.trustScore || 0;
        const curTr = currentData.trustReviews || 0;
        if (curTs !== trustScore || curTr !== trustReviews) {
            await ref.set({
                trustScore,
                trustReviews,
                lastActive: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    }
    else {
        await ref.set({
            wallet: walletNorm,
            ...DEFAULT_STUB,
            trustScore,
            trustReviews,
            lastActive: firestore_1.Timestamp.now(),
        });
    }
    return { ok: true, trustScore, trustReviews };
});
//# sourceMappingURL=playerStatsCallables.js.map