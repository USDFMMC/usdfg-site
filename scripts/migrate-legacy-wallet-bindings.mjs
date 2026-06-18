#!/usr/bin/env node
/**
 * One-time Admin SDK repair for legacy usersByWallet bindings (development / ops).
 *
 * Prefer production recovery via wallet signature (rebindWalletIdentity callable).
 *
 * Usage:
 *   ALLOW_LEGACY_WALLET_MIGRATION=1 GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     node scripts/migrate-legacy-wallet-bindings.mjs --wallet <addr> --new-uid <firebaseUid> [--dry-run]
 *
 *   node scripts/migrate-legacy-wallet-bindings.mjs --audit-duplicates
 */
const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function opt(name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
}

const dryRun = flag('--dry-run');
const runAudit = flag('--audit-duplicates');
const walletArg = opt('--wallet');
const newUidArg = opt('--new-uid');

function walletKey(w) {
  return String(w).trim().toLowerCase();
}

async function loadAdmin() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    console.error(
      'Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path, or use rebindWalletIdentity callables.'
    );
    process.exit(1);
  }
  const admin = await import('firebase-admin');
  if (!admin.default.apps.length) {
    admin.default.initializeApp();
  }
  return admin.default;
}

async function migrateChallengeUids(db, FieldValue, previousUid, newUid, key) {
  const challengeIds = new Set();
  for (const field of ['createdByUid', 'opponentUid']) {
    const snap = await db.collection('challenges').where(field, '==', previousUid).select().get();
    for (const doc of snap.docs) challengeIds.add(doc.id);
  }
  const byPlayers = await db
    .collection('challenges')
    .where('playersUid', 'array-contains', previousUid)
    .select()
    .get();
  for (const doc of byPlayers.docs) challengeIds.add(doc.id);

  let updated = 0;
  for (const challengeId of challengeIds) {
    const ref = db.collection('challenges').doc(challengeId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() ?? {};
    const creator = String(data.creator ?? '').toLowerCase();
    const creatorWallet = String(data.creatorWallet ?? '').toLowerCase();
    const opponentWallet = String(data.opponentWallet ?? '').toLowerCase();
    const challenger = String(data.challenger ?? '').toLowerCase();
    const pendingJoiner = String(data.pendingJoiner ?? '').toLowerCase();
    const players = Array.isArray(data.players)
      ? data.players.map((w) => String(w).toLowerCase())
      : [];
    const walletInvolved =
      creator === key ||
      creatorWallet === key ||
      opponentWallet === key ||
      challenger === key ||
      pendingJoiner === key ||
      players.includes(key);
    if (!walletInvolved) continue;

    const patch = { updatedAt: FieldValue.serverTimestamp() };
    let touched = false;
    if (data.createdByUid === previousUid) {
      patch.createdByUid = newUid;
      touched = true;
    }
    if (data.opponentUid === previousUid) {
      patch.opponentUid = newUid;
      touched = true;
    }
    if (Array.isArray(data.playersUid) && data.playersUid.includes(previousUid)) {
      patch.playersUid = data.playersUid.map((uid) => (uid === previousUid ? newUid : uid));
      touched = true;
    }
    if (!touched) continue;
    if (!dryRun) await ref.update(patch);
    updated += 1;
  }
  return { scanned: challengeIds.size, updated, challengeIds: [...challengeIds] };
}

async function migrateOne(admin, db, FieldValue, wallet, newUid) {
  const key = walletKey(wallet);
  const walletRef = db.collection('usersByWallet').doc(key);
  const snap = await walletRef.get();
  if (!snap.exists) {
    console.log('[skip] no usersByWallet for', key);
    return { ok: false, reason: 'missing_binding' };
  }
  const data = snap.data() ?? {};
  const previousUid = String(data.uid ?? '').trim();
  if (!previousUid) {
    console.log('[skip] invalid usersByWallet uid for', key);
    return { ok: false, reason: 'invalid_binding' };
  }
  if (previousUid === newUid) {
    console.log('[ok] already bound to', newUid);
    return { ok: true, alreadyBound: true, previousUid };
  }

  console.log('[plan]', { wallet: key, previousUid, newUid, dryRun });

  if (dryRun) {
    const challengeMigration = await migrateChallengeUids(db, FieldValue, previousUid, newUid, key);
    return { ok: true, dryRun: true, previousUid, newUid, challengeMigration };
  }

  const originalCreatedAt = data.createdAt;
  const displayAddress = data.walletAddress ?? wallet;

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(walletRef);
    if (!fresh.exists) throw new Error('binding disappeared');
    if (String(fresh.data()?.uid ?? '').trim() !== previousUid) {
      throw new Error('binding changed concurrently');
    }
    tx.delete(walletRef);
    tx.set(walletRef, {
      uid: newUid,
      walletAddress: displayAddress,
      createdAt: originalCreatedAt ?? FieldValue.serverTimestamp(),
      recoveredAt: FieldValue.serverTimestamp(),
      previousUid,
      recoveredBy: 'admin_migration',
    });
    tx.set(
      db.collection('users').doc(newUid),
      {
        walletAddress: displayAddress,
        recoveredFromUid: previousUid,
        recoveredAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  const challengeMigration = await migrateChallengeUids(db, FieldValue, previousUid, newUid, key);

  await db.collection('wallet_identity_recovery').add({
    wallet: key,
    walletAddress: displayAddress,
    previousUid,
    newUid,
    migrateChallenges: true,
    challengeMigration,
    recoveredAt: FieldValue.serverTimestamp(),
    method: 'admin_migration',
  });

  console.log('[done]', { wallet: key, previousUid, newUid, challengeMigration });
  return { ok: true, previousUid, newUid, challengeMigration };
}

async function auditDuplicateWallets(db) {
  const usersSnap = await db.collection('users').select('walletAddress').get();
  const byWallet = new Map();
  for (const doc of usersSnap.docs) {
    const w = doc.data()?.walletAddress;
    if (!w || typeof w !== 'string') continue;
    const key = walletKey(w);
    if (!byWallet.has(key)) byWallet.set(key, []);
    byWallet.get(key).push(doc.id);
  }

  const duplicates = [...byWallet.entries()].filter(([, ids]) => ids.length > 1);
  console.log('duplicate walletAddress in users/:', duplicates.length);

  for (const [key, userIds] of duplicates) {
    const binding = await db.collection('usersByWallet').doc(key).get();
    const canonical = binding.exists ? binding.data()?.uid : null;
    console.log(JSON.stringify({ wallet: key, userIds, usersByWalletUid: canonical }, null, 2));
  }
}

async function main() {
  if (!runAudit && (!walletArg || !newUidArg)) {
    console.error(`Usage:
  audit:    node scripts/migrate-legacy-wallet-bindings.mjs --audit-duplicates
  migrate:  ALLOW_LEGACY_WALLET_MIGRATION=1 node scripts/migrate-legacy-wallet-bindings.mjs --wallet <addr> --new-uid <uid> [--dry-run]`);
    process.exit(1);
  }

  if (!runAudit && process.env.ALLOW_LEGACY_WALLET_MIGRATION !== '1') {
    console.error('Refusing admin migration without ALLOW_LEGACY_WALLET_MIGRATION=1');
    console.error('Use wallet-signature recovery (rebindWalletIdentity) in production.');
    process.exit(1);
  }

  const admin = await loadAdmin();
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;

  if (runAudit) {
    await auditDuplicateWallets(db);
    return;
  }

  await migrateOne(admin, db, FieldValue, walletArg, newUidArg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
