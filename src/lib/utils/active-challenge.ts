import { isParticipantWallet, walletsEqual } from "@/lib/firebase/firestore";

/** Statuses where a creator-owned challenge can accept leaderboard invites */
export const CREATOR_INVITE_ACTIVE_STATUSES = [
  "active",
  "in-progress",
  "pending_waiting_for_opponent",
  "creator_confirmation_required",
  "creator_funded",
] as const;

export type CreatorInviteActiveStatus = (typeof CREATOR_INVITE_ACTIVE_STATUSES)[number];

export interface FirestoreChallengeRow {
  id?: string;
  creator?: string;
  status?: string;
  rawData?: {
    status?: string;
    targetPlayer?: string;
    title?: string;
    entryFee?: number;
    prizePool?: number;
    game?: string;
  };
  targetPlayer?: string;
  title?: string;
  entryFee?: number;
  prizePool?: number;
  game?: string;
  players?: string[];
}

export function getFirestoreChallengeStatus(
  challenge: Pick<FirestoreChallengeRow, "status" | "rawData">
): string {
  return challenge.status || challenge.rawData?.status || "unknown";
}

/** Pre-funding statuses that should expire (no money committed yet). */
const PRE_FUNDING_STATUSES = new Set([
  "pending_waiting_for_opponent",
  "creator_confirmation_required",
]);

/** Read a Firestore Timestamp / number / date-like into epoch ms, or null. */
function toMillis(value: unknown): number | null {
  if (value == null) return null;
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof value === "number") return value;
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * A pre-funding challenge is "stale" once its TTL (expirationTimer, else expiresAt) has passed.
 * Client/server cleanup may be disabled, so old pending docs can linger with a live-looking status;
 * those must NOT block new challenge creation. Funded/active challenges never expire this way.
 */
export function isStalePendingChallenge(challenge: FirestoreChallengeRow): boolean {
  const status = getFirestoreChallengeStatus(challenge);
  if (!PRE_FUNDING_STATUSES.has(status)) return false;
  const raw = challenge as unknown as Record<string, unknown>;
  const rawData = (raw.rawData as Record<string, unknown> | undefined) ?? {};
  const expiry =
    toMillis(raw.expirationTimer) ??
    toMillis(raw.expiresAt) ??
    toMillis(rawData.expirationTimer) ??
    toMillis(rawData.expiresAt);
  return expiry !== null && expiry < Date.now();
}

export function isCreatorInviteActiveStatus(status: string): boolean {
  return (CREATOR_INVITE_ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Creator-owned challenge in an invite-eligible status (Firestore source of truth). */
export function findCreatorActiveChallenge(
  firestoreChallenges: FirestoreChallengeRow[],
  creatorWallet: string
): FirestoreChallengeRow | null {
  if (!creatorWallet) return null;

  return (
    firestoreChallenges.find((fc) => {
      if (!fc.creator || !walletsEqual(fc.creator, creatorWallet)) return false;
      const status = getFirestoreChallengeStatus(fc);
      return isCreatorInviteActiveStatus(status);
    }) ?? null
  );
}

export function hasCreatorActiveChallengeForInvite(
  firestoreChallenges: FirestoreChallengeRow[],
  creatorWallet: string
): boolean {
  return findCreatorActiveChallenge(firestoreChallenges, creatorWallet) !== null;
}

export function getChallengeTargetPlayer(
  challenge: FirestoreChallengeRow
): string | null {
  const target = challenge.targetPlayer ?? challenge.rawData?.targetPlayer;
  return target ? target.toLowerCase() : null;
}

export function isPendingInviteToPlayer(
  challenge: FirestoreChallengeRow,
  playerWallet: string
): boolean {
  if (!playerWallet) return false;
  const target = getChallengeTargetPlayer(challenge);
  return target !== null && target === playerWallet.toLowerCase();
}

/**
 * Blocks creating a new challenge when user is creator or participant in an active challenge.
 * Used by create-challenge flow (includes participant, not invite-only).
 */
export function findUserBlockingActiveChallenge(
  firestoreChallenges: FirestoreChallengeRow[],
  wallet: string
): FirestoreChallengeRow | null {
  if (!wallet) return null;

  return (
    firestoreChallenges.find((fc) => {
      const isCreator = walletsEqual(fc.creator, wallet);
      const isParticipant = isParticipantWallet(fc.players, wallet);
      if (!isCreator && !isParticipant) return false;

      const status = getFirestoreChallengeStatus(fc);
      const isCompleted =
        status === "completed" ||
        status === "cancelled" ||
        status === "disputed" ||
        status === "expired";

      // Old pending/confirmation docs past their TTL must not block new creation.
      if (isStalePendingChallenge(fc)) return false;

      return isCreatorInviteActiveStatus(status) && !isCompleted;
    }) ?? null
  );
}
