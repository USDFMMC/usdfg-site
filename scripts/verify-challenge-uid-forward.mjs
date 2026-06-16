#!/usr/bin/env node
/**
 * Verify a challenge doc has canonical UIDs aligned with usersByWallet.
 * Usage: node scripts/verify-challenge-uid-forward.mjs [challengeId]
 * If challengeId omitted, checks the most recently created challenge.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
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
const challengeIdArg = process.argv[2];

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

async function getDoc(token, collection, id) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
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

async function walletCanon(token, wallet) {
  if (!wallet) return null;
  const key = String(wallet).toLowerCase();
  const data = await getDoc(token, 'usersByWallet', key);
  if (data.error) return null;
  return fieldVal(data.fields, 'uid');
}

const token = await anonToken();

let challengeId = challengeIdArg;
if (!challengeId) {
  const rows = await runQuery(token, {
    from: [{ collectionId: 'challenges' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 1,
  });
  const doc = rows.find((r) => r.document)?.document;
  if (!doc) {
    console.error('No challenges found');
    process.exit(1);
  }
  challengeId = doc.name.split('/').pop();
}

const snap = await getDoc(token, 'challenges', challengeId);
if (snap.error) {
  console.error(snap.error.message);
  process.exit(1);
}

const f = snap.fields;
const creator = fieldVal(f, 'creator') || fieldVal(f, 'creatorWallet');
const joiner =
  fieldVal(f, 'challenger') ||
  fieldVal(f, 'pendingJoiner') ||
  fieldVal(f, 'opponentWallet');
const createdByUid = fieldVal(f, 'createdByUid');
const opponentUid = fieldVal(f, 'opponentUid');
const playersUid = fieldVal(f, 'playersUid');
const creatorCanon = await walletCanon(token, creator);
const joinerCanon = joiner ? await walletCanon(token, joiner) : null;

const checks = [
  {
    name: 'createdByUid vs usersByWallet[creator]',
    pass: !creatorCanon || createdByUid === creatorCanon,
    expected: creatorCanon,
    actual: createdByUid,
  },
  {
    name: 'opponentUid vs usersByWallet[joiner]',
    pass: !joiner || !joinerCanon || opponentUid === joinerCanon,
    expected: joinerCanon,
    actual: opponentUid,
  },
  {
    name: 'playersUid includes creator canonical',
    pass:
      !creatorCanon ||
      !Array.isArray(playersUid) ||
      playersUid.includes(creatorCanon),
    expected: creatorCanon,
    actual: playersUid,
  },
  {
    name: 'playersUid includes joiner canonical',
    pass:
      !joinerCanon ||
      !Array.isArray(playersUid) ||
      playersUid.includes(joinerCanon),
    expected: joinerCanon,
    actual: playersUid,
  },
];

const allPass = checks.every((c) => c.pass);

console.log(
  JSON.stringify(
    {
      challengeId,
      status: fieldVal(f, 'status'),
      creatorWallet: creator,
      joinerWallet: joiner,
      createdByUid,
      opponentUid,
      playersUid,
      usersByWallet: { creator: creatorCanon, joiner: joinerCanon },
      checks,
      result: allPass ? 'PASS' : 'FAIL',
    },
    null,
    2
  )
);

process.exit(allPass ? 0 : 1);
