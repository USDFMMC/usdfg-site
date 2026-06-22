#!/usr/bin/env node
/**
 * Verify Helius RPC + creator funding preflight for a wallet.
 * Does NOT sign transactions (no private key). Reports Firestore + on-chain state.
 *
 * Usage: node scripts/verify-helius-funding-rpc.mjs [wallet]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv();

const WALLET = process.argv[2] || '8MJWvyJ9rn8pkKopYvD61FVmHX2K6sgJceossVCDk5Tx';
const RPC = process.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID?.trim() || 'usdfg-app';

const PROGRAM_ID = new PublicKey('FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP');
const USDFG_MINT = new PublicKey('7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX');
const SEEDS = { CHALLENGE: Buffer.from('challenge'), ESCROW_WALLET: Buffer.from('escrow_wallet') };

function redactRpc(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}?api-key=…`;
  } catch {
    return '(invalid url)';
  }
}

async function anonToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'http://localhost:5173/' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.idToken;
}

function decodeValue(f) {
  if (!f || typeof f !== 'object') return f;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('nullValue' in f) return null;
  if ('timestampValue' in f) return f.timestampValue;
  if ('mapValue' in f) {
    const out = {};
    for (const [k, v] of Object.entries(f.mapValue.fields || {})) out[k] = decodeValue(v);
    return out;
  }
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(decodeValue);
  return f;
}

function decodeFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

async function runQuery(token, structuredQuery) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
    }
  );
  return res.json();
}

async function fetchChallengesForCreator(token, creatorWallet) {
  const walletLower = creatorWallet.toLowerCase();
  const queries = [
    {
      label: 'creatorWallet lowercase',
      query: {
        from: [{ collectionId: 'challenges' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'creatorWallet' },
            op: 'EQUAL',
            value: { stringValue: walletLower },
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 15,
      },
    },
    {
      label: 'creatorWallet exact',
      query: {
        from: [{ collectionId: 'challenges' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'creatorWallet' },
            op: 'EQUAL',
            value: { stringValue: creatorWallet },
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 15,
      },
    },
  ];

  const byId = new Map();
  for (const { query } of queries) {
    const rows = await runQuery(token, query);
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row.document) continue;
      const id = row.document.name.split('/').pop();
      byId.set(id, { id, fields: decodeFields(row.document.fields) });
    }
  }
  return [...byId.values()];
}

async function checkEscrow(connection, challengePdaStr) {
  if (!challengePdaStr) return { skipped: true };
  const challengePDA = new PublicKey(challengePdaStr);
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengePDA.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );
  try {
    const escrow = await getAccount(connection, escrowPDA);
    return {
      escrowPda: escrowPDA.toString(),
      balanceUsdfg: Number(escrow.amount) / 1e9,
      exists: true,
    };
  } catch (e) {
    return { escrowPda: escrowPDA.toString(), exists: false, error: String(e.message || e) };
  }
}

async function main() {
  const report = {
    wallet: WALLET,
    rpcEndpoint: RPC ? redactRpc(RPC) : null,
    rpcConfigured: Boolean(RPC),
    rpcErrors: [],
    rpcPreflight: {},
    startupLogExpectation: {
      expect: '✅ Using custom RPC endpoint',
      reject: '⚠️ Using public Solana devnet RPC',
    },
    fundingTest: {
      mode: 'RPC preflight + on-chain state (no wallet signing)',
      transactionSignature: null,
      pdaCreated: null,
      escrowFunded: null,
      error: null,
    },
    challengesNeedingFund: [],
    getRpcEndpointPaths: [
      'src/lib/wallet/mwa-provider.tsx → ConnectionProvider',
      'useConnection() → creator funding, balances, admin',
      'src/lib/firebase/firestore.ts → syncChallengeStatus',
      'src/pages/app/index.tsx → ad-hoc Connection',
    ],
  };

  if (!RPC) {
    report.fundingTest.error = 'VITE_SOLANA_RPC_ENDPOINT not set in .env';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const connection = new Connection(RPC, 'confirmed');
  const creator = new PublicKey(WALLET);

  // Mirror createAndFundChallenge RPC sequence (pre-sign)
  const rpcSteps = [];
  try {
    const t0 = Date.now();
    const sol = await connection.getBalance(creator);
    rpcSteps.push({ method: 'getBalance', ms: Date.now() - t0, ok: true });

    const creatorAta = await getAssociatedTokenAddress(USDFG_MINT, creator);
    const t1 = Date.now();
    let usdfgBalance = null;
    try {
      const acct = await getAccount(connection, creatorAta);
      usdfgBalance = Number(acct.amount) / 1e9;
      rpcSteps.push({ method: 'getAccount (creator USDFG ATA)', ms: Date.now() - t1, ok: true });
    } catch (e) {
      rpcSteps.push({ method: 'getAccount (creator USDFG ATA)', ms: Date.now() - t1, ok: false, error: String(e.message || e) });
    }

    const seed = Keypair.generate().publicKey;
    const [challengePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.CHALLENGE, creator.toBuffer(), seed.toBuffer()],
      PROGRAM_ID
    );
    const t2 = Date.now();
    const pdaInfo = await connection.getAccountInfo(challengePDA);
    rpcSteps.push({
      method: 'getAccountInfo (sample challenge PDA)',
      ms: Date.now() - t2,
      ok: true,
      exists: pdaInfo !== null,
    });

    const t3 = Date.now();
    const bh = await connection.getLatestBlockhash();
    rpcSteps.push({ method: 'getLatestBlockhash', ms: Date.now() - t3, ok: true, blockhash: bh.blockhash.slice(0, 12) + '…' });

    report.rpcPreflight = {
      solBalance: sol / 1e9,
      usdfgBalance,
      creatorAta: creatorAta.toString(),
      samplePdaExists: pdaInfo !== null,
      rpcSteps,
      allOk: rpcSteps.every((s) => s.ok !== false),
    };
  } catch (e) {
    report.rpcErrors.push(String(e.message || e));
    report.fundingTest.error = String(e.message || e);
  }

  // Firestore: challenges awaiting creator fund
  try {
    const token = await anonToken();
    const challenges = await fetchChallengesForCreator(token, WALLET);
    const awaiting = challenges.filter(
      (c) => c.fields.status === 'creator_confirmation_required' || c.fields.status === 'pending_creator_fund'
    );

    for (const c of awaiting.length ? awaiting : challenges.slice(0, 5)) {
      const pda = c.fields.pda || c.fields.challengePda || null;
      let pdaOnChain = null;
      let escrow = null;
      if (pda) {
        try {
          pdaOnChain = await connection.getAccountInfo(new PublicKey(pda));
        } catch (e) {
          pdaOnChain = { error: String(e.message || e) };
        }
        escrow = await checkEscrow(connection, pda);
      }
      report.challengesNeedingFund.push({
        id: c.id,
        status: c.fields.status,
        entryFee: c.fields.entryFee,
        pda,
        pdaOnChainExists: pdaOnChain && typeof pdaOnChain === 'object' && 'lamports' in (pdaOnChain || {})
          ? true
          : pdaOnChain !== null && typeof pdaOnChain !== 'object',
        escrow,
        fundedOnChain: c.fields.fundedOnChain ?? null,
        lastFundingSignature: c.fields.lastFundingSignature ?? c.fields.fundingSignature ?? null,
      });
    }

    const target =
      awaiting[0] ||
      challenges.find((c) => c.fields.status === 'creator_confirmation_required') ||
      challenges[0];

    if (target) {
      const pda = target.fields.pda || target.fields.challengePda;
      report.fundingTest.targetChallengeId = target.id;
      report.fundingTest.targetStatus = target.fields.status;
      if (pda) {
        const info = await connection.getAccountInfo(new PublicKey(pda));
        report.fundingTest.pdaCreated = info !== null;
        const esc = await checkEscrow(connection, pda);
        report.fundingTest.escrowFunded = esc.exists && (esc.balanceUsdfg ?? 0) >= (target.fields.entryFee || 0);
        report.fundingTest.escrowBalanceUsdfg = esc.balanceUsdfg ?? null;
      } else {
        report.fundingTest.pdaCreated = false;
        report.fundingTest.escrowFunded = false;
        report.fundingTest.note = 'No PDA on Firestore doc — createAndFundChallenge not yet completed';
      }
      report.fundingTest.transactionSignature =
        target.fields.lastFundingSignature || target.fields.fundingSignature || null;
    } else {
      report.fundingTest.note = 'No challenges found for wallet in Firestore';
    }
  } catch (e) {
    report.rpcErrors.push(`Firestore: ${e.message || e}`);
  }

  report.fundingTest.signingRequired =
    'Full creator fund requires Phantom signTransaction in browser — not executed in this script';

  console.log(JSON.stringify(report, null, 2));

  const pass = report.rpcPreflight.allOk && report.rpcErrors.length === 0;
  process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
  console.error('[verify-helius-funding-rpc] fatal', err);
  process.exit(1);
});
