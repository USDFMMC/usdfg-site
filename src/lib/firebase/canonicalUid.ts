import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

/** Lowercase wallet key for usersByWallet index (matches useBindWalletToFirebaseUser). */
export function walletIndexKey(wallet: string): string {
  return wallet.trim().toLowerCase();
}

/**
 * Canonical Firebase UID bound to a wallet in usersByWallet/{wallet}.
 * Returns null when the wallet has never been linked.
 */
export async function resolveCanonicalUidForWallet(
  wallet: string | null | undefined
): Promise<string | null> {
  if (!wallet || !String(wallet).trim()) return null;
  const key = walletIndexKey(wallet);
  const snap = await getDoc(doc(db, 'usersByWallet', key));
  if (!snap.exists()) return null;
  const uid = snap.data()?.uid;
  return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
}

/** Batch lookup for hybrid merge (deduped by wallet index key). */
export async function resolveCanonicalUidMap(
  wallets: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const keys = new Set<string>();
  for (const w of wallets) {
    if (!w || !String(w).trim()) continue;
    keys.add(walletIndexKey(w));
  }
  await Promise.all(
    [...keys].map(async (key) => {
      const snap = await getDoc(doc(db, 'usersByWallet', key));
      if (!snap.exists()) return;
      const uid = snap.data()?.uid;
      if (typeof uid === 'string' && uid.trim()) {
        map.set(key, uid.trim());
      }
    })
  );
  return map;
}

/**
 * UID to store on challenge participant fields that must satisfy Firestore rules
 * (createdByUid == auth.uid on create; opponentUid == auth.uid on join).
 *
 * Prefers usersByWallet canonical when it matches the active session.
 * Throws when the wallet is bound to a different Firebase session.
 */
export async function resolveChallengeParticipantUid(
  wallet: string,
  sessionUid: string
): Promise<string> {
  const canonical = await resolveCanonicalUidForWallet(wallet);
  if (!canonical) return sessionUid;
  if (canonical !== sessionUid) {
    throw new Error(
      'This wallet is linked to a previous session. Use "Recover wallet access" to verify wallet ownership and continue.'
    );
  }
  return canonical;
}

/**
 * Pick the UID to persist for a wallet during hybrid merge.
 * Prefers canonical when it matches the active Firebase session (rules-safe).
 */
export function pickCanonicalAwareUid(
  wallet: string,
  opts: {
    canonicalByWallet: Map<string, string>;
    storedUid?: string | null;
    explicitUid?: string | null;
    actingWallet?: string | null;
    actingUid?: string | null;
  }
): string | null {
  const key = walletIndexKey(wallet);
  const authUid = auth.currentUser?.uid ?? null;
  const canonical = opts.canonicalByWallet.get(key) ?? null;

  if (canonical && authUid && canonical === authUid) {
    return canonical;
  }

  const explicit = opts.explicitUid?.trim() || null;
  if (explicit) return explicit;

  const stored = opts.storedUid?.trim() || null;
  if (stored) return stored;

  if (
    authUid &&
    opts.actingUid &&
    opts.actingUid === authUid &&
    opts.actingWallet &&
    walletIndexKey(opts.actingWallet) === key
  ) {
    return opts.actingUid;
  }

  return null;
}

/** Best canonical UID for playersUid slots (may differ from auth.uid — not rules-gated). */
export function pickPlayersUidSlot(
  wallet: string,
  opts: {
    canonicalByWallet: Map<string, string>;
    storedUid?: string | null;
    fallbackUid?: string | null;
  }
): string | null {
  const key = walletIndexKey(wallet);
  return (
    opts.canonicalByWallet.get(key) ??
    opts.storedUid?.trim() ??
    opts.fallbackUid?.trim() ??
    null
  );
}
