#!/usr/bin/env node
/**
 * Capture [voice-audit] console logs from a lobby page load.
 * Usage: node scripts/verify-voice-audit-live.mjs [baseUrl] [challengeId] [wallet]
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://127.0.0.1:5173').replace(/\/$/, '');
const CHALLENGE_ID = process.argv[3] || '';
const WALLET = process.argv[4] || '8MJWvyJ9rn8pkKopYvD61FVmHX2K6sgJceossVCDk5Tx';

const voiceLogs = [];
const errors = [];

function pushLog(text) {
  if (text.includes('[voice-audit]')) voiceLogs.push(text);
  if (/error|failed|denied|blocked/i.test(text) && /voice|Voice|webrtc|getUserMedia/i.test(text)) {
    errors.push(text);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  page.on('console', (msg) => pushLog(msg.text()));
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.addInitScript((wallet) => {
    localStorage.setItem('phantom_public_key', wallet);
    localStorage.setItem('wallet_connected', 'true');
  }, WALLET);

  const url = CHALLENGE_ID ? `${BASE}/app?challenge=${CHALLENGE_ID}` : `${BASE}/app`;
  console.log('[voice-verify] navigating', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await new Promise((r) => setTimeout(r, 12_000));

  const summary = await page.evaluate(() =>
    typeof window.__voiceAuditSummary === 'function'
      ? window.__voiceAuditSummary()
      : { error: 'missing __voiceAuditSummary' }
  );

  const report = {
    url,
    wallet: WALLET,
    challengeId: CHALLENGE_ID || '(arena home — open lobby manually for full flow)',
    voiceAuditLogCount: voiceLogs.length,
    voiceAuditLogs: voiceLogs.slice(0, 80),
    counters: summary,
    capturedErrors: errors.slice(0, 20),
    notes: [
      'Two-browser WebRTC requires both participants in the same lobby.',
      'getUserMedia may fail in headless without fake media flags.',
    ],
  };

  console.log('\n========== VOICE AUDIT CAPTURE ==========');
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error('[voice-verify] fatal', e);
  process.exit(1);
});
