/**
 * Shared wallet bind-block state (used by bind hook + recovery flow).
 */
const walletBindBlocked = new Set<string>();

export function markWalletBindBlocked(walletKey: string): void {
  walletBindBlocked.add(walletKey);
}

export function clearWalletBindBlocked(walletKey: string): void {
  walletBindBlocked.delete(walletKey);
}

export function isWalletBindBlocked(walletKey: string): boolean {
  return walletBindBlocked.has(walletKey);
}
