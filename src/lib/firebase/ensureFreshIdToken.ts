import { auth } from "@/lib/firebase/config";

/**
 * Forces an ID token refresh so Cloud Functions see a current `iat` (admin freshness checks).
 */
export async function ensureFreshIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken(true);
  return token;
}
