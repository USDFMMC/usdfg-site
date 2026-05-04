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
exports.cleanupPlatformData = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const CHAT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — chats are not retained
/** Settled challenges removed after 1h; long-term state lives in `player_stats` / `teams` only. */
const CHALLENGE_SETTLED_MIN_AGE_MS = 60 * 60 * 1000;
/**
 * Stateless platform housekeeping (runs on schedule when project supports v2 deploy):
 * - Chat messages older than 1h (`challenge_chats.timestamp`)
 * - Completed + paid + non-disputed challenges with `updatedAt` older than 1h
 * Does not touch gameplay, submit, payout, or stats writes — deletes only expired rows.
 */
exports.cleanupPlatformData = (0, scheduler_1.onSchedule)({
    schedule: "every 30 minutes",
    timeZone: "Etc/UTC",
    memory: "256MiB",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    const nowMs = now.toMillis();
    const chatCutoff = firestore_1.Timestamp.fromMillis(nowMs - CHAT_MAX_AGE_MS);
    const chatSnapshot = await db
        .collectionGroup("challenge_chats")
        .where("timestamp", "<=", chatCutoff)
        .limit(100)
        .get();
    const challengeSnapshot = await db
        .collection("challenges")
        .where("status", "==", "completed")
        .where("payoutStatus", "==", "paid")
        .limit(50)
        .get();
    const batch = db.batch();
    let ops = 0;
    chatSnapshot.docs.forEach((d) => {
        batch.delete(d.ref);
        ops++;
    });
    challengeSnapshot.docs.forEach((d) => {
        const data = d.data();
        const updatedAt = data.updatedAt;
        if (updatedAt &&
            nowMs - updatedAt.toMillis() > CHALLENGE_SETTLED_MIN_AGE_MS &&
            !data.disputedBy) {
            batch.delete(d.ref);
            ops++;
        }
    });
    if (ops === 0) {
        return;
    }
    try {
        await batch.commit();
    }
    catch (e) {
        logger.error("cleanupPlatformData batch failed", { error: String(e), ops });
    }
});
//# sourceMappingURL=cleanupPlatformData.js.map