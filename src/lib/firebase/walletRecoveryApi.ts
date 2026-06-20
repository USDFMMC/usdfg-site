import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase/config";
import { ensureFreshIdToken } from "@/lib/firebase/ensureFreshIdToken";
import {
  formatCallableErrorMessage,
  legacyCallableUrl,
  logRecoveryAuthBeforeNonce,
  logRecoveryFailure,
  logRecoveryStep,
  recoveryEnvironment,
} from "@/lib/firebase/walletRecoveryDebug";

export type WalletRecoveryRebindResult = {
  ok: boolean;
  alreadyBound?: boolean;
  wallet: string;
  uid: string;
  previousUid?: string;
  challengeMigration?: {
    scanned: number;
    updated: number;
    challengeIds: string[];
  };
};

async function invokeRecoveryCallable<TReq, TRes>(
  callableName: string,
  payload: TReq
): Promise<TRes> {
  await ensureFreshIdToken();
  const callable = httpsCallable<TReq, TRes>(functions, callableName);
  const res = await callable(payload);
  if (!res.data) {
    throw new Error(`Callable ${callableName} returned no data`);
  }
  return res.data;
}

function uint8ToBase64(u8: Uint8Array): string {
  let s = "";
  u8.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

/** Request nonce, sign with connected wallet, rebind usersByWallet to auth.uid. */
export async function recoverWalletIdentityWithSignature(params: {
  address: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  migrateChallenges?: boolean;
}): Promise<WalletRecoveryRebindResult> {
  logRecoveryStep("start", {
    ...recoveryEnvironment(),
    walletAddress: params.address,
  });

  let nonce: string;
  try {
    logRecoveryStep("nonce:request", {
      ...recoveryEnvironment(),
      callableName: "createWalletRecoveryNonce",
      legacyCallableUrl: legacyCallableUrl("createWalletRecoveryNonce"),
      walletAddress: params.address,
    });

    logRecoveryAuthBeforeNonce();

    const nonceRes = await invokeRecoveryCallable<
      { address: string },
      { nonce: string }
    >("createWalletRecoveryNonce", { address: params.address });

    nonce = nonceRes.nonce;
    logRecoveryStep("nonce:success", {
      ...recoveryEnvironment(),
      callableName: "createWalletRecoveryNonce",
      nonceLength: nonce.length,
    });
  } catch (err) {
    logRecoveryFailure("nonce:failed", err, {
      ...recoveryEnvironment(),
      callableName: "createWalletRecoveryNonce",
      legacyCallableUrl: legacyCallableUrl("createWalletRecoveryNonce"),
      walletAddress: params.address,
    });
    throw new Error(formatCallableErrorMessage(err, "createWalletRecoveryNonce"));
  }

  let signature: string;
  try {
    logRecoveryStep("sign:start", {
      ...recoveryEnvironment(),
      walletAddress: params.address,
    });
    const message = new TextEncoder().encode(nonce);
    const sigBytes = await params.signMessage(message);
    signature = uint8ToBase64(sigBytes);
    logRecoveryStep("sign:success", {
      ...recoveryEnvironment(),
      walletAddress: params.address,
      signatureLength: signature.length,
    });
  } catch (err) {
    throw err;
  }

  try {
    logRecoveryStep("rebind:start", {
      ...recoveryEnvironment(),
      callableName: "rebindWalletIdentity",
      legacyCallableUrl: legacyCallableUrl("rebindWalletIdentity"),
      walletAddress: params.address,
      authUid: auth.currentUser?.uid ?? null,
    });

    const result = await invokeRecoveryCallable<
      {
        address: string;
        signature: string;
        nonce: string;
        migrateChallenges?: boolean;
      },
      WalletRecoveryRebindResult
    >("rebindWalletIdentity", {
      address: params.address,
      signature,
      nonce,
      migrateChallenges: params.migrateChallenges,
    });

    logRecoveryStep("rebind:success", {
      ...recoveryEnvironment(),
      callableName: "rebindWalletIdentity",
      ok: result.ok,
      uid: result.uid,
      previousUid: result.previousUid ?? null,
      challengeMigration: result.challengeMigration ?? null,
    });
    return result;
  } catch (err) {
    logRecoveryFailure("rebind:failed", err, {
      ...recoveryEnvironment(),
      callableName: "rebindWalletIdentity",
      legacyCallableUrl: legacyCallableUrl("rebindWalletIdentity"),
      walletAddress: params.address,
      authUid: auth.currentUser?.uid ?? null,
    });
    throw new Error(formatCallableErrorMessage(err, "rebindWalletIdentity"));
  }
}
