/**
 * Temporary RPC audit (remove after 429 root cause confirmed).
 * Filter console: [rpc-audit]
 *
 * Patches Connection.prototype for selected methods so all wallet-adapter
 * and direct Connection() callers are covered.
 */

import { Connection } from '@solana/web3.js';

const PREFIX = '[rpc-audit]';

const AUDITED_METHODS = [
  'getLatestBlockhash',
  'getBalance',
  'getTokenAccountBalance',
  'getSignatureStatuses',
  'confirmTransaction',
] as const;

type AuditedMethod = (typeof AUDITED_METHODS)[number];

const callTimes: number[] = [];
const methodCounts = new Map<string, number>();
const WINDOW_MS = 60_000;

let installed = false;

function trimWindow(now: number): void {
  while (callTimes.length > 0 && now - callTimes[0]! > WINDOW_MS) {
    callTimes.shift();
  }
}

function summarizeArgs(method: AuditedMethod, args: unknown[]): Record<string, unknown> {
  if (method === 'getBalance' || method === 'getTokenAccountBalance') {
    const pk = args[0];
    const pkStr =
      pk && typeof pk === 'object' && 'toBase58' in (pk as object)
        ? (pk as { toBase58: () => string }).toBase58().slice(0, 8) + '…'
        : String(pk).slice(0, 12);
    return { account: pkStr };
  }
  if (method === 'getLatestBlockhash') {
    return { commitment: args[0] ?? 'default' };
  }
  if (method === 'getSignatureStatuses') {
    const sigs = args[0];
    return {
      signatureCount: Array.isArray(sigs) ? sigs.length : 1,
    };
  }
  if (method === 'confirmTransaction') {
    const sig = args[0];
    const sigStr =
      typeof sig === 'string'
        ? sig.slice(0, 12) + '…'
        : sig && typeof sig === 'object'
          ? JSON.stringify(sig).slice(0, 40)
          : String(sig).slice(0, 20);
    return { signature: sigStr, commitment: args[1] ?? 'default' };
  }
  return {};
}

export function recordRpcAuditCall(method: AuditedMethod, args: unknown[]): void {
  const now = Date.now();
  callTimes.push(now);
  trimWindow(now);
  methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);

  const perMethodLast60s = Object.fromEntries(
    AUDITED_METHODS.map((m) => [m, 0])
  );
  // Re-count from window would be expensive; track totals + rolling window total
  console.info(PREFIX, method, {
    ...summarizeArgs(method, args),
    callsLast60s: callTimes.length,
    sessionTotal: methodCounts.get(method),
  });
}

/** Install once at app bootstrap. Safe to call multiple times. */
export function installRpcAuditInstrumentation(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const proto = Connection.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;

  for (const method of AUDITED_METHODS) {
    const original = proto[method];
    if (typeof original !== 'function') continue;

    proto[method] = function patchedRpcMethod(this: Connection, ...args: unknown[]) {
      recordRpcAuditCall(method, args);
      return original.apply(this, args);
    };
  }

  console.info(PREFIX, 'instrumentation-installed', { methods: [...AUDITED_METHODS] });
}
