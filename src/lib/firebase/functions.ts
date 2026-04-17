import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./config";

export const functions = getFunctions(app);

export const setWalletClaimCallable = httpsCallable<{ walletAddress: string }, { ok: boolean; wallet: string }>(
  functions,
  "setWalletClaim"
);

