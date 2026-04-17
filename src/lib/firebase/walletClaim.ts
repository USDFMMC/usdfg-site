import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase/config";

export async function setWalletClaim(walletAddress: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Firebase auth not ready");
  }

  const callable = httpsCallable(functions, "setWalletClaim");
  await callable({ walletAddress });

  // Force token refresh so request.auth.token.wallet is present in Firestore rules.
  await user.getIdToken(true);
}

export async function hasWalletClaim(expectedWalletLower: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const tokenResult = await user.getIdTokenResult();
  const claim = (tokenResult.claims as any)?.wallet;
  return typeof claim === "string" && claim.toLowerCase() === expectedWalletLower.toLowerCase();
}

