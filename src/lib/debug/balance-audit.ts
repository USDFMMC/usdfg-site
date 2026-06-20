/**
 * Balance RPC audit — identifies which component/caller drives getBalance storms.
 * Filter console: [balance-audit]
 */

import type { Commitment, Connection, PublicKey } from '@solana/web3.js';

const PREFIX = '[balance-audit]';
const WINDOW_MS = 60_000;

export type BalanceAuditMeta = {
  /** Logical function name, e.g. fetchSOLBalance */
  caller: string;
  /** React component or module */
  component: string;
  challengeId?: string | null;
  wallet?: string | null;
  /** Distinguish duplicate mounts (desktop vs mobile navbar) */
  instance?: string | null;
};

type CallerKey = string;

type CallerStats = {
  meta: BalanceAuditMeta;
  method: 'getBalance' | 'getTokenAccountBalance';
  sessionTotal: number;
  timestamps: number[];
};

const callerStats = new Map<CallerKey, CallerStats>();
const globalTimestamps: number[] = [];

let summaryTimer: ReturnType<typeof setInterval> | null = null;

function callerKey(meta: BalanceAuditMeta, method: string): CallerKey {
  return [
    meta.component,
    meta.caller,
    meta.instance ?? '',
    method,
  ].join('|');
}

function trimWindow(timestamps: number[], now: number): void {
  while (timestamps.length > 0 && now - timestamps[0]! > WINDOW_MS) {
    timestamps.shift();
  }
}

function walletPreview(wallet?: string | null): string | null {
  if (!wallet) return null;
  const w = wallet.trim();
  if (w.length <= 12) return w;
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export function recordBalanceAuditCall(
  method: 'getBalance' | 'getTokenAccountBalance',
  meta: BalanceAuditMeta
): void {
  const now = Date.now();
  globalTimestamps.push(now);
  trimWindow(globalTimestamps, now);

  const key = callerKey(meta, method);
  let row = callerStats.get(key);
  if (!row) {
    row = { meta: { ...meta }, method, sessionTotal: 0, timestamps: [] };
    callerStats.set(key, row);
  }
  row.sessionTotal += 1;
  row.timestamps.push(now);
  trimWindow(row.timestamps, now);

  console.info(PREFIX, method, {
    caller: meta.caller,
    component: meta.component,
    instance: meta.instance ?? null,
    challengeId: meta.challengeId ?? null,
    wallet: walletPreview(meta.wallet),
    callerLast60s: row.timestamps.length,
    callerSessionTotal: row.sessionTotal,
    allBalanceCallsLast60s: globalTimestamps.length,
  });
}

export function getBalanceAuditSummary(): {
  allBalanceCallsLast60s: number;
  byCaller: Array<{
    caller: string;
    component: string;
    instance: string | null;
    method: string;
    last60s: number;
    sessionTotal: number;
    challengeId: string | null;
  }>;
} {
  const now = Date.now();
  trimWindow(globalTimestamps, now);

  const byCaller = [...callerStats.entries()].map(([, row]) => {
    trimWindow(row.timestamps, now);
    return {
      caller: row.meta.caller,
      component: row.meta.component,
      instance: row.meta.instance ?? null,
      method: row.method,
      last60s: row.timestamps.length,
      sessionTotal: row.sessionTotal,
      challengeId: row.meta.challengeId ?? null,
    };
  });

  byCaller.sort((a, b) => b.last60s - a.last60s);

  return {
    allBalanceCallsLast60s: globalTimestamps.length,
    byCaller,
  };
}

export function getBalanceRpcRatesLast60s(): {
  getBalance: number;
  getTokenAccountBalance: number;
  total: number;
} {
  const summary = getBalanceAuditSummary();
  let getBalance = 0;
  let getTokenAccountBalance = 0;
  for (const row of summary.byCaller) {
    if (row.method === 'getBalance') getBalance += row.last60s;
    if (row.method === 'getTokenAccountBalance') getTokenAccountBalance += row.last60s;
  }
  return {
    getBalance,
    getTokenAccountBalance,
    total: summary.allBalanceCallsLast60s,
  };
}

export function logBalanceAuditSummary(reason = 'periodic'): void {
  const summary = getBalanceAuditSummary();
  console.info(PREFIX, 'summary', { reason, ...summary });
}

/** Log rolling summary every 60s while arena is open. */
export function installBalanceAuditSummary(): void {
  if (typeof window === 'undefined' || summaryTimer) return;
  summaryTimer = setInterval(() => logBalanceAuditSummary('interval-60s'), WINDOW_MS);
  (window as unknown as { __balanceAuditSummary?: typeof getBalanceRpcRatesLast60s }).__balanceAuditSummary =
    getBalanceRpcRatesLast60s;
  console.info(PREFIX, 'summary-interval-installed');
}

export async function auditedGetBalance(
  connection: Connection,
  publicKey: PublicKey,
  meta: BalanceAuditMeta,
  commitment?: Commitment
): Promise<number> {
  recordBalanceAuditCall('getBalance', meta);
  return connection.getBalance(publicKey, commitment);
}

export async function auditedGetTokenAccountBalance(
  connection: Connection,
  tokenAccount: PublicKey,
  meta: BalanceAuditMeta,
  commitment?: Commitment
): Promise<Awaited<ReturnType<Connection['getTokenAccountBalance']>>> {
  recordBalanceAuditCall('getTokenAccountBalance', meta);
  return connection.getTokenAccountBalance(tokenAccount, commitment);
}
