#!/usr/bin/env node
/**
 * Audit challenge UID fields vs usersByWallet canonical bindings.
 * Usage: node scripts/audit-challenge-uid-drift.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  try {
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
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID?.trim() || 'usdfg-app';

if (!API_KEY) {
  console.error('Missing VITE_FIREBASE_API_KEY');
  process.exit(1);
}

async function anonToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'http://localhost:5173/',
      },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.idToken;
}

function fieldVal(fields, key) {
  const f = fields[key];
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) {
    return (f.arrayValue.values || []).map((v) => v.stringValue ?? null);
  }
  return f;
}

async function runQuery(token, structuredQuery) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
    }
  );
  return res.json();
}

function isQueryRowArray(rows) {
  return Array.isArray(rows);
}

async function getWalletUid(token, walletKey) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/usersByWallet/${walletKey}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.error) return null;
  return fieldVal(data.fields, 'uid');
}

function walletKey(w) {
  return w ? String(w).toLowerCase() : null;
}

const token = await anonToken();

const rows = await runQuery(token, { from: [{ collectionId: 'challenges' }], limit: 500 });

if (!isQueryRowArray(rows)) {
  console.error('Query failed:', rows);
  process.exit(1);
}

const challenges = rows.filter((r) => r.document).map((r) => {
  const f = r.document.fields;
  const id = r.document.name.split('/').pop();
  return {
    id,
    status: fieldVal(f, 'status'),
    createdByUid: fieldVal(f, 'createdByUid'),
    opponentUid: fieldVal(f, 'opponentUid'),
    playersUid: fieldVal(f, 'playersUid'),
    creator: fieldVal(f, 'creator') || fieldVal(f, 'creatorWallet'),
    joiner:
      fieldVal(f, 'challenger') ||
      fieldVal(f, 'pendingJoiner') ||
      fieldVal(f, 'opponentWallet'),
    players: fieldVal(f, 'players'),
  };
});

const walletCache = new Map();
async function canonicalUid(wallet) {
  const k = walletKey(wallet);
  if (!k) return null;
  if (walletCache.has(k)) return walletCache.get(k);
  const uid = await getWalletUid(token, k);
  walletCache.set(k, uid);
  return uid;
}

const report = [];

for (const c of challenges) {
  const creatorCanon = await canonicalUid(c.creator);
  const joinerCanon = await canonicalUid(c.joiner);

  const creatorDrift =
    c.creator && c.createdByUid && creatorCanon && c.createdByUid !== creatorCanon;
  const opponentDrift =
    c.joiner && c.opponentUid && joinerCanon && c.opponentUid !== joinerCanon;

  const playersUidDrift = [];
  const players = Array.isArray(c.players) ? c.players : [];
  const puids = Array.isArray(c.playersUid) ? c.playersUid : [];
  for (let i = 0; i < players.length; i++) {
    const w = players[i];
    const stored = puids[i] ?? null;
    const canon = await canonicalUid(w);
    if (w && stored && canon && stored !== canon) {
      playersUidDrift.push({ wallet: w.slice(0, 8) + '…', stored, canonical: canon });
    }
    if (w && !stored && canon) {
      playersUidDrift.push({ wallet: w.slice(0, 8) + '…', stored: null, canonical: canon, missing: true });
    }
  }

  const joinerMissingFromPlayersUid =
    c.joiner &&
    c.opponentUid &&
    Array.isArray(c.playersUid) &&
    !c.playersUid.includes(c.opponentUid);

  if (creatorDrift || opponentDrift || playersUidDrift.length || joinerMissingFromPlayersUid) {
    report.push({
      id: c.id,
      status: c.status,
      creatorDrift: creatorDrift
        ? { stored: c.createdByUid, canonical: creatorCanon }
        : null,
      opponentDrift: opponentDrift
        ? { stored: c.opponentUid, canonical: joinerCanon }
        : null,
      joinerMissingFromPlayersUid,
      playersUidDrift,
      creatorWallet: c.creator,
      joinerWallet: c.joiner,
    });
  }
}

console.log(JSON.stringify({ totalChallenges: challenges.length, driftCount: report.length, report }, null, 2));
