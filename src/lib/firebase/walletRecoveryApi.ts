import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ensureFreshIdToken } from "@/lib/firebase/ensureFreshIdToken";

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

async function invokeCallable<TReq, TRes>(name: string, payload: TReq): Promise<TRes> {
  await ensureFreshIdToken();
  const callable = httpsCallable<TReq, TRes>(functions, name);
  const res = await callable(payload);
  if (!res.data) {
    throw new Error(`Callable ${name} returned no data`);
  }
  return res.data;
}

export async function createWalletRecoveryNonce(
  address: string
): Promise<{ nonce: string }> {
  return invokeCallable<{ address: string }, { nonce: string }>(
    "createWalletRecoveryNonce",
    { address }
  );
}

export async function rebindWalletIdentity(params: {
  address: string;
  signature: string;
  nonce: string;
  migrateChallenges?: boolean;
}): Promise<WalletRecoveryRebindResult> {
  return invokeCallable<
    {
      address: string;
      signature: string;
      nonce: string;
      migrateChallenges?: boolean;
    },
    WalletRecoveryRebindResult
  >("rebindWalletIdentity", params);
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
  const { nonce } = await createWalletRecoveryNonce(params.address);
  const message = new TextEncoder().encode(nonce);
  const sigBytes = await params.signMessage(message);
  const signature = uint8ToBase64(sigBytes);
  return rebindWalletIdentity({
    address: params.address,
    signature,
    nonce,
    migrateChallenges: params.migrateChallenges,
  });
}
