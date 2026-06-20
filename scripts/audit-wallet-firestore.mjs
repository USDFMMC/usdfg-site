#!/usr/bin/env node
/**
 * One-off Firestore audit for a wallet + session UID.
 * Usage: node scripts/audit-wallet-firestore.mjs <wallet> [sessionUid]
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

const WALLET = process.argv[2];
const SESSION_UID = process.argv[3] || null;

if (!WALLET) {
  console.error('Usage: node scripts/audit-wallet-firestore.mjs <wallet> [sessionUid]');
  process.exit(1);
}

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID?.trim() || 'usdfg-app';
const walletKey = WALLET.trim().toLowerCase();

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
    for (const [k, v] of Object.entries(f.mapValue.fields || {})) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  if ('arrayValue' in f) {
    return (f.arrayValue.values || []).map(decodeValue);
  }
  return f;
}

function decodeFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeValue(v);
  }
  return out;
}

async function getDoc(token, collection, id) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.error) {
    return { exists: false, error: data.error, id };
  }
  const docId = data.name.split('/').pop();
  return { exists: true, id: docId, path: data.name, fields: decodeFields(data.fields) };
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

const token = await anonToken();

console.log('=== WALLET AUDIT ===');
console.log({ wallet: WALLET, walletKey, sessionUid: SESSION_UID, project: PROJECT });

// 1. usersByWallet
const byWallet = await getDoc(token, 'usersByWallet', walletKey);
console.log('\n--- usersByWallet/' + walletKey + ' ---');
console.log(JSON.stringify(byWallet, null, 2));

// 2. users referencing wallet (exact + lowercase field query)
const queries = [
  {
    label: 'walletAddress == exact',
    query: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'walletAddress' },
          op: 'EQUAL',
          value: { stringValue: WALLET },
        },
      },
      limit: 20,
    },
  },
  {
    label: 'walletAddress == lowercase',
    query: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'walletAddress' },
          op: 'EQUAL',
          value: { stringValue: walletKey },
        },
      },
      limit: 20,
    },
  },
];

const usersFound = new Map();

for (const { label, query } of queries) {
  const rows = await runQuery(token, query);
  console.log('\n--- users query: ' + label + ' ---');
  if (!Array.isArray(rows)) {
    console.log(JSON.stringify(rows, null, 2));
    continue;
  }
  for (const row of rows) {
    if (!row.document) continue;
    const id = row.document.name.split('/').pop();
    const fields = decodeFields(row.document.fields);
    usersFound.set(id, { id, path: row.document.name, fields });
    console.log(JSON.stringify({ id, fields }, null, 2));
  }
  if (rows.every((r) => !r.document)) console.log('(no documents)');
}

// 3. session uid user doc
if (SESSION_UID) {
  const sessionUser = await getDoc(token, 'users', SESSION_UID);
  console.log('\n--- users/' + SESSION_UID + ' (current auth.uid) ---');
  console.log(JSON.stringify(sessionUser, null, 2));
}

// 4. canonical uid user doc from usersByWallet
if (byWallet.exists && byWallet.fields?.uid) {
  const canonicalUid = byWallet.fields.uid;
  const canonicalUser = await getDoc(token, 'users', canonicalUid);
  console.log('\n--- users/' + canonicalUid + ' (usersByWallet canonical uid) ---');
  console.log(JSON.stringify(canonicalUser, null, 2));
}

// 5. resolveChallengeParticipantUid simulation
console.log('\n--- resolveChallengeParticipantUid simulation ---');
const canonical = byWallet.exists ? byWallet.fields?.uid ?? null : null;
if (!canonical) {
  console.log('Result: would return sessionUid (no usersByWallet binding)');
} else if (SESSION_UID && canonical !== SESSION_UID) {
  console.log('Result: THROWS — canonical !== sessionUid');
  console.log({ canonical, sessionUid: SESSION_UID });
} else if (SESSION_UID) {
  console.log('Result: would return canonical (matches session)');
  console.log({ canonical });
} else {
  console.log('No sessionUid provided; canonical only:', canonical);
}

console.log('\n--- summary ---');
console.log(
  JSON.stringify(
    {
      usersByWallet: byWallet.exists
        ? {
            uid: byWallet.fields?.uid ?? null,
            createdAt: byWallet.fields?.createdAt ?? null,
            updatedAt: byWallet.fields?.updatedAt ?? null,
            walletAddress: byWallet.fields?.walletAddress ?? null,
          }
        : null,
      usersReferencingWallet: [...usersFound.values()].map((u) => ({
        id: u.id,
        walletAddress: u.fields.walletAddress ?? null,
        createdAt: u.fields.createdAt ?? null,
        updatedAt: u.fields.updatedAt ?? null,
      })),
      sessionUserExists: SESSION_UID ? (await getDoc(token, 'users', SESSION_UID)).exists : null,
      canonicalUserExists: byWallet.fields?.uid
        ? (await getDoc(token, 'users', byWallet.fields.uid)).exists
        : null,
    },
    null,
    2
  )
);
