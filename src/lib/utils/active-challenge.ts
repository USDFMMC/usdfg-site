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

      return isCreatorInviteActiveStatus(status) && !isCompleted;
    }) ?? null
  );
}
