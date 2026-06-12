/** Completed-challenge Recent Activity visibility window (feed/marketing only). */
export const COMPLETED_ACTIVITY_VISIBILITY_MS = 2 * 60 * 60 * 1000;

type ChallengeLike = {
  status?: string;
  rawData?: {
    status?: string;
    expirationTimer?: unknown;
    expiresAt?: unknown;
    creatorFundingDeadline?: unknown;
    payoutTimestamp?: unknown;
    prizeClaimedAt?: unknown;
    finalizedAt?: unknown;
    updatedAt?: unknown;
    createdAt?: unknown;
  };
  expirationTimer?: unknown;
  expiresAt?: unknown;
  creatorFundingDeadline?: unknown;
  payoutTimestamp?: unknown;
  prizeClaimedAt?: unknown;
  finalizedAt?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
};

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const v = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  return null;
}

export function getChallengeStatus(challenge: ChallengeLike): string {
  return challenge.status || challenge.rawData?.status || 'unknown';
}

export function getExpirationTimerMs(challenge: ChallengeLike): number | null {
  return (
    toMillis(challenge.rawData?.expirationTimer) ??
    toMillis(challenge.expirationTimer)
  );
}

export function getExpiresAtMs(challenge: ChallengeLike): number | null {
  return toMillis(challenge.expiresAt) ?? toMillis(challenge.rawData?.expiresAt);
}

/** Best estimate of when the challenge entered completed state. */
export function getCompletionTimestampMs(challenge: ChallengeLike): number | null {
  const raw = challenge.rawData;
  return (
    toMillis(challenge.payoutTimestamp) ??
    toMillis(raw?.payoutTimestamp) ??
    toMillis(challenge.prizeClaimedAt) ??
    toMillis(raw?.prizeClaimedAt) ??
    toMillis(challenge.finalizedAt) ??
    toMillis(raw?.finalizedAt) ??
    toMillis(challenge.updatedAt) ??
    toMillis(raw?.updatedAt) ??
    null
  );
}

/**
 * Effective end of the 2-hour public activity window.
 * Legacy docs may still carry create-time expiresAt; prefer completion + 2h when stored predates completion.
 */
export function getCompletedActivityExpiresAtMs(challenge: ChallengeLike): number | null {
  if (getChallengeStatus(challenge) !== 'completed') return null;

  const completionMs = getCompletionTimestampMs(challenge);
  const storedMs = getExpiresAtMs(challenge);

  if (completionMs != null) {
    const fromCompletion = completionMs + COMPLETED_ACTIVITY_VISIBILITY_MS;
    if (storedMs == null || storedMs < completionMs) {
      return fromCompletion;
    }
    return Math.max(storedMs, fromCompletion);
  }

  return storedMs;
}

/** Pre-patch completed docs: expiresAt was set at create time and is earlier than completion. */
export function isLegacyCreateTimeExpiresAt(challenge: ChallengeLike): boolean {
  if (getChallengeStatus(challenge) !== 'completed') return false;
  const completionMs = getCompletionTimestampMs(challenge);
  const storedMs = getExpiresAtMs(challenge);
  if (completionMs == null || storedMs == null) return false;
  return storedMs < completionMs;
}

/** Map arena list/detail row (rawData + top-level fields) to visibility input. */
export function arenaChallengeToVisibilityInput(challenge: Record<string, unknown>): ChallengeLike {
  const raw = (challenge.rawData ?? {}) as NonNullable<ChallengeLike['rawData']>;
  return {
    status: (challenge.status ?? raw?.status) as string | undefined,
    rawData: raw,
    expiresAt: challenge.expiresAt ?? raw?.expiresAt,
    expirationTimer: challenge.expirationTimer ?? raw?.expirationTimer,
    creatorFundingDeadline: challenge.creatorFundingDeadline ?? raw?.creatorFundingDeadline,
    payoutTimestamp: challenge.payoutTimestamp ?? raw?.payoutTimestamp,
    prizeClaimedAt: challenge.prizeClaimedAt ?? raw?.prizeClaimedAt,
    finalizedAt: challenge.finalizedAt ?? raw?.finalizedAt,
    updatedAt: challenge.updatedAt ?? raw?.updatedAt,
    createdAt: challenge.createdAt ?? raw?.createdAt,
  };
}

/** 60-minute open matchmaking window — pending_waiting_for_opponent only. */
export function isPendingMatchmakingExpired(
  challenge: ChallengeLike,
  now: number = Date.now()
): boolean {
  if (getChallengeStatus(challenge) !== 'pending_waiting_for_opponent') return false;
  const timerMs = getExpirationTimerMs(challenge);
  return timerMs != null && timerMs < now;
}

/** 2-hour Recent Activity window — completed status only (never affects claim/history/lobby). */
export function isCompletedActivityFeedHidden(
  challenge: ChallengeLike,
  now: number = Date.now()
): boolean {
  const endMs = getCompletedActivityExpiresAtMs(challenge);
  return endMs != null && endMs < now;
}

export function isCreatorFundingDeadlineExpired(
  challenge: ChallengeLike,
  now: number = Date.now()
): boolean {
  if (getChallengeStatus(challenge) !== 'creator_confirmation_required') return false;
  const deadlineMs =
    toMillis(challenge.creatorFundingDeadline) ??
    toMillis(challenge.rawData?.creatorFundingDeadline);
  return deadlineMs != null && deadlineMs < now;
}

/** Blocks public join/discovery (not participant lobby access). */
export function isPublicJoinDiscoveryBlocked(
  challenge: ChallengeLike,
  now: number = Date.now()
): boolean {
  const status = getChallengeStatus(challenge);
  if (status === 'cancelled' || status === 'expired') return true;
  if (isPendingMatchmakingExpired(challenge, now)) return true;
  if (isCreatorFundingDeadlineExpired(challenge, now)) return true;
  return false;
}
