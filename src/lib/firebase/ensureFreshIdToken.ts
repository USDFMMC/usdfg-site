import { auth } from "@/lib/firebase/config";

export type EnsureFreshIdTokenOptions = {
  /**
   * When true (default), calls Secure Token `grant` via `getIdToken(true)` — required for some
   * admin callables that reject stale `iat`. When false, uses a cached token if still valid and
   * avoids an unnecessary round-trip (reduces exposure if Secure Token API is restricted).
   */
  force?: boolean;
};

/**
 * Returns the current user's ID token for callable requests.
 * @param options.force - default `true` (refresh); set `false` for best-effort meta updates.
 */
export async function ensureFreshIdToken(
  options?: EnsureFreshIdTokenOptions
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const force = options?.force ?? true;
  const token = await user.getIdToken(force);
  return token;
}
