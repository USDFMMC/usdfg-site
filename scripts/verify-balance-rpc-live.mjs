#!/usr/bin/env node
/**
 * Live balance RPC verification — headless Chromium against local dev/preview.
 * Usage: node scripts/verify-balance-rpc-live.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://127.0.0.1:5173';
const ARENA_URL = `${BASE_URL.replace(/\/$/, '')}/app`;
// Valid Solana pubkey (system program — read-only balance probe)
const TEST_WALLET = '11111111111111111111111111111111';

const balanceAuditLogs = [];
const rpcAuditLogs = [];
const rpc429Events = [];
const pageErrors = [];

function classifyLine(text) {
  if (/429|Too many requests|rate limit/i.test(text)) {
    rpc429Events.push({ at: Date.now(), text: text.slice(0, 500) });
  }
  if (text.includes('[balance-audit]')) {
    balanceAuditLogs.push(text);
  }
  if (text.includes('[rpc-audit]')) {
    rpcAuditLogs.push(text);
  }
}

async function waitMs(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => classifyLine(msg.text()));
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await context.addInitScript((wallet) => {
    localStorage.setItem('phantom_public_key', wallet);
    localStorage.setItem('wallet_connected', 'true');
    sessionStorage.setItem('last_logged_wallet', wallet);
  }, TEST_WALLET);

  console.log('[verify] navigating', ARENA_URL);
  const response = await page.goto(ARENA_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  if (!response || !response.ok()) {
    throw new Error(`Arena load failed: ${response?.status()}`);
  }

  // Allow initial connect balance fetch to settle
  await waitMs(8_000);

  const mountCheck = await page.evaluate(() => {
    const connectButtons = document.querySelectorAll('button').length;
    const walletTexts = [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /USDFG|SOL|Connect Wallet/i.test(el.textContent || ''))
      .map((el) => (el.textContent || '').trim().slice(0, 80));
    const hasBalanceHelper = typeof window.__balanceAuditSummary === 'function';
    return { connectButtons, walletTexts: walletTexts.slice(0, 12), hasBalanceHelper };
  });
  console.log('[verify] mount snapshot', JSON.stringify(mountCheck, null, 2));

  const baselineBalanceCalls = balanceAuditLogs.filter(
    (l) => l.includes('getBalance') || l.includes('getTokenAccountBalance')
  ).length;
  console.log('[verify] balance-audit lines after initial load (8s):', baselineBalanceCalls);

  // --- 60s idle ---
  console.log('[verify] idle 60s…');
  const t60Start = Date.now();
  await waitMs(60_000);

  const summary60 = await page.evaluate(() =>
    typeof window.__balanceAuditSummary === 'function'
      ? window.__balanceAuditSummary()
      : { error: 'missing __balanceAuditSummary' }
  );
  const balanceCallsDuring60 = balanceAuditLogs.length;
  const rpc429During60 = rpc429Events.filter((e) => e.at >= t60Start).length;

  console.log('[verify] after 60s idle __balanceAuditSummary:', JSON.stringify(summary60));
  console.log('[verify] new balance-audit log lines during 60s idle:', balanceCallsDuring60 - baselineBalanceCalls);
  console.log('[verify] 429 events during 60s idle:', rpc429During60);

  const baselineAfter60 = balanceAuditLogs.length;

  // --- additional 4 min idle (5 min total from first idle checkpoint) ---
  console.log('[verify] idle additional 240s (5 min total idle segment)…');
  const t5mStart = t60Start;
  await waitMs(240_000);

  const summary5m = await page.evaluate(() =>
    typeof window.__balanceAuditSummary === 'function'
      ? window.__balanceAuditSummary()
      : { error: 'missing __balanceAuditSummary' }
  );
  const balanceCallsDuring5m = balanceAuditLogs.length - baselineAfter60;
  const rpc429During5m = rpc429Events.filter((e) => e.at >= t5mStart).length;

  // Caller breakdown from last summary interval if logged
  const walletConnectBalanceLogs = balanceAuditLogs.filter(
    (l) => l.includes('WalletConnectSimple') || l.includes('useEffect-balance-fetch')
  );
  const sharedHookLogs = balanceAuditLogs.filter((l) => l.includes('shared-useWalletBalances'));

  const report = {
    baseUrl: BASE_URL,
    testWallet: TEST_WALLET,
    summaryAfter60sIdle: summary60,
    summaryAfter5mIdle: summary5m,
    rpc429CountDuringIdle: rpc429During5m,
    rpc429Samples: rpc429Events.slice(0, 5),
    balanceAuditLogLinesDuring60sIdle: balanceCallsDuring60 - baselineBalanceCalls,
    balanceAuditLogLinesDuring5mIdleSegment: balanceCallsDuring5m,
    walletConnectSimpleBalanceAuditLines: walletConnectBalanceLogs.length,
    sharedUseWalletBalancesAuditLines: sharedHookLogs.length,
    totalBalanceAuditLinesSession: balanceAuditLogs.length,
    rpcAuditBalanceCallsSession: rpcAuditLogs.filter((l) =>
      /getBalance|getTokenAccountBalance/.test(l)
    ).length,
    pageErrors,
    fundingTests: {
      creatorFund: 'NOT_RUN — requires Phantom signing; idle script only',
      joinerFund: 'NOT_RUN — requires Phantom signing; idle script only',
      claim: 'NOT_RUN — requires Phantom signing; idle script only',
    },
    structuralChecks: {
      singleSharedBalanceHook: 'useWalletBalances.ts only audited balance reader in UI path',
      walletConnectSimpleIndependentRpc: walletConnectBalanceLogs.length === 0,
      dualMountExpected: '2 WalletConnectSimple in index.tsx (desktop md+ / mobile md:hidden)',
    },
  };

  console.log('\n========== LIVE VERIFICATION REPORT ==========');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();

  const pass =
    summary60.total <= 10 &&
    summary5m.total <= 10 &&
    walletConnectBalanceLogs.length === 0 &&
    rpc429During5m === 0;

  process.exitCode = pass ? 0 : 1;
  if (!pass) {
    console.error('[verify] FAILED thresholds (target: total<=10 idle, no WalletConnectSimple RPC, no 429)');
  } else {
    console.log('[verify] PASSED idle balance RPC thresholds');
  }
}

main().catch((err) => {
  console.error('[verify] fatal', err);
  process.exit(1);
});
