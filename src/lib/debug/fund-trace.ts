/**
 * Temporary end-to-end funding trace (remove after root cause confirmed).
 * Filter console: [fund-trace]
 */

const PREFIX = '[fund-trace]';

export type FundTraceFlow = 'creator' | 'joiner';

export type FundFailurePhase =
  | 'pre-wallet'
  | 'status-validation'
  | 'deadline-validation'
  | 'rpc'
  | 'wallet-signing'
  | 'transaction-submit'
  | 'transaction-confirm'
  | 'firestore-write'
  | 'unknown';

function deadlineMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const ms = (value as { toMillis: () => number }).toMillis();
    return typeof ms === 'number' ? ms : null;
  }
  if (typeof value === 'number') return value;
  return null;
}

export function fundTraceChallengeSnapshot(
  challenge: {
    id?: string;
    status?: string;
    creatorFundingDeadline?: unknown;
    joinerFundingDeadline?: unknown;
    rawData?: {
      status?: string;
      creatorFundingDeadline?: unknown;
      joinerFundingDeadline?: unknown;
    };
  } | null | undefined,
  wallet: string | null | undefined
) {
  const raw = challenge?.rawData;
  return {
    challengeId: challenge?.id ?? null,
    status: challenge?.status ?? raw?.status ?? null,
    creatorFundingDeadlineMs:
      deadlineMs(challenge?.creatorFundingDeadline) ??
      deadlineMs(raw?.creatorFundingDeadline),
    joinerFundingDeadlineMs:
      deadlineMs(challenge?.joinerFundingDeadline) ??
      deadlineMs(raw?.joinerFundingDeadline),
    wallet: wallet ?? null,
    nowMs: Date.now(),
  };
}

export function logFundTrace(
  flow: FundTraceFlow,
  stage: string,
  payload?: Record<string, unknown>
): void {
  console.log(PREFIX, flow, stage, payload ?? {});
}

export function logFundTraceError(
  flow: FundTraceFlow,
  stage: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? 'Unknown error');
  const name = error instanceof Error ? error.name : undefined;
  const code = (error as { code?: string | number })?.code;

  console.error(PREFIX, flow, stage, 'ERROR', {
    message,
    name,
    code,
    phase: classifyFundFailurePhase(stage, message),
    ...extra,
  });
}

export function classifyFundFailurePhase(
  stage: string,
  message: string
): FundFailurePhase {
  const haystack = `${stage} ${message}`.toLowerCase();

  if (
    stage.includes('entry') ||
    stage.includes('fresh-fetch') ||
    stage.includes('early-exit') ||
    haystack.includes('connect your wallet') ||
    haystack.includes('only the challenge creator') ||
    haystack.includes('only the challenger')
  ) {
    return 'pre-wallet';
  }
  if (
    stage.includes('deadline') ||
    haystack.includes('deadline expired') ||
    haystack.includes('deadline has expired')
  ) {
    return 'deadline-validation';
  }
  if (
    haystack.includes('not waiting for') ||
    haystack.includes('status changed') ||
    haystack.includes('wrong status') ||
    haystack.includes('already funded') ||
    haystack.includes('not eligible')
  ) {
    return 'status-validation';
  }
  if (stage.includes('firestore')) {
    return 'firestore-write';
  }
  if (
    haystack.includes('rejected') ||
    haystack.includes('user rejected') ||
    haystack.includes('wallet rejected')
  ) {
    return 'wallet-signing';
  }
  if (
    haystack.includes('confirm') ||
    haystack.includes('not confirmed') ||
    haystack.includes('confirmation timeout')
  ) {
    return 'transaction-confirm';
  }
  if (
    haystack.includes('429') ||
    haystack.includes('rate limit') ||
    haystack.includes('blockhash') ||
    haystack.includes('failed to fetch') ||
    haystack.includes('network') ||
    haystack.includes('rpc') ||
    haystack.includes('simulation failed') ||
    stage.includes('onchain')
  ) {
    return 'rpc';
  }
  if (haystack.includes('sendrawtransaction') || haystack.includes('already been processed')) {
    return 'transaction-submit';
  }
  return 'unknown';
}
