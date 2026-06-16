/**
 * Temporary RPC sync audit (remove after sync storm root cause confirmed).
 * Filter console: [sync-audit]
 */

const PREFIX = '[sync-audit]';

const rpcCallTimes: number[] = [];
const WINDOW_MS = 60_000;

export function logSyncAudit(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info(PREFIX, event, payload);
}

/** Record a getAccountInfo-bound syncChallengeStatus RPC attempt. */
export function recordSyncRpcCall(challengeId: string, firestoreStatus: string | null): void {
  const now = Date.now();
  rpcCallTimes.push(now);
  while (rpcCallTimes.length > 0 && now - rpcCallTimes[0]! > WINDOW_MS) {
    rpcCallTimes.shift();
  }
  logSyncAudit('getAccountInfo', {
    challengeId,
    firestoreStatus,
    callsLast60s: rpcCallTimes.length,
  });
}

export function logSyncEligibilitySummary(payload: {
  authUid: string | null;
  snapshotCount: number;
  totalInSnapshot: number;
  participantWithPda: number;
  skippedThrottle: number;
  skippedInFlight: number;
  startedSync: number;
  pdaChallengeIds: string[];
}): void {
  logSyncAudit('snapshot-eligibility', payload);
}
