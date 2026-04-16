const isBrowser = typeof window !== "undefined";

const LEGACY_OWNER_SUFFIX = "_legacy_owner";

export const PROFILE_STORAGE_KEYS = {
  gamerTag: "user_gamer_tag",
  country: "user_country",
  profileImage: "user_profile_image"
} as const;

type StorageLike = Storage | null;

function getLocalStorage(): StorageLike {
  if (!isBrowser) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getWalletSpecificKey(baseKey: string, walletKey: string) {
  return `${baseKey}_${walletKey}`;
}

function getLegacyOwnerKey(baseKey: string) {
  return `${baseKey}${LEGACY_OWNER_SUFFIX}`;
}

/**
 * Retrieve a wallet-scoped value from localStorage.
 * Falls back to legacy global keys only when they are explicitly associated with the wallet.
 * Legacy entries without an owner will be claimed by the first wallet that accesses them.
 */
export function getWalletScopedValue(
  baseKey: string,
  walletKey?: string | null
): string | null {
  const storage = getLocalStorage();
  if (!storage || !walletKey) {
    return null;
  }

  const walletSpecificKey = getWalletSpecificKey(baseKey, walletKey);
  const walletValue = storage.getItem(walletSpecificKey);
  if (walletValue !== null) {
    return walletValue;
  }

  const legacyOwnerKey = getLegacyOwnerKey(baseKey);
  const legacyOwner = storage.getItem(legacyOwnerKey);
  const legacyValue = storage.getItem(baseKey);

  if (legacyValue === null) {
    return null;
  }

  if (!legacyOwner) {
    storage.setItem(legacyOwnerKey, walletKey);
    storage.setItem(walletSpecificKey, legacyValue);
    return legacyValue;
  }

  if (legacyOwner === walletKey) {
    storage.setItem(walletSpecificKey, legacyValue);
    return legacyValue;
  }

  return null;
}

/**
 * Store a wallet-scoped value in localStorage and associate the legacy key with the wallet.
 */
export function setWalletScopedValue(
  baseKey: string,
  walletKey: string | null | undefined,
  value?: string | null
) {
  const storage = getLocalStorage();
  if (!storage || !walletKey) {
    return;
  }

  const walletSpecificKey = getWalletSpecificKey(baseKey, walletKey);
  const legacyOwnerKey = getLegacyOwnerKey(baseKey);

  if (value !== undefined && value !== null) {
    storage.setItem(walletSpecificKey, value);
    storage.setItem(baseKey, value);
    storage.setItem(legacyOwnerKey, walletKey);
    return;
  }

  storage.removeItem(walletSpecificKey);

  const legacyOwner = storage.getItem(legacyOwnerKey);
  if (legacyOwner === walletKey) {
    storage.removeItem(baseKey);
    storage.removeItem(legacyOwnerKey);
  }
}

/**
 * Clear the wallet-scoped value and dissociate legacy ownership when applicable.
 */
export function clearWalletScopedValue(
  baseKey: string,
  walletKey: string | null | undefined
) {
  setWalletScopedValue(baseKey, walletKey, null);
}
