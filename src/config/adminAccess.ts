/**
 * Optional UI hints only — never used for authorization.
 * Admins are enforced by signature + Cloud Function + Firestore `admins/{normalizedWallet}`.
 */
export const allowedAdminWallets = ["REPLACE_WITH_YOUR_WALLET"] as const;

export function isAdminWalletHint(address?: string | null): boolean {
  if (!address) return false;
  return (allowedAdminWallets as readonly string[]).includes(
    address.trim().toLowerCase()
  );
}
