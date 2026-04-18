import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { ensureFreshIdToken } from "@/lib/firebase/ensureFreshIdToken";

function getStaleAdminTokenCode(e: unknown): string | undefined {
  if (!e || typeof e !== "object") return undefined;
  const o = e as { details?: { code?: string }; customData?: { code?: string } };
  return o.details?.code ?? o.customData?.code;
}

/**
 * Refreshes ID token, calls callable, retries once if backend reports stale admin token.
 */
export async function invokeAdminCallableWithRefresh<TReq, TRes>(
  name: string,
  payload: TReq
): Promise<{ data: TRes | undefined }> {
  await ensureFreshIdToken();
  const callable = httpsCallable<TReq, TRes>(functions, name);
  try {
    return await callable(payload);
  } catch (e: unknown) {
    const code = getStaleAdminTokenCode(e);

    if (code === "STALE_ADMIN_TOKEN") {
      await ensureFreshIdToken();
      return await callable(payload);
    }

    throw e;
  }
}

export async function finalizeAdminChallengeOnServer(params: {
  challengeId: string;
  winnerWallet: string;
  onChainTx?: string | null;
}): Promise<void> {
  await invokeAdminCallableWithRefresh<
    { challengeId: string; winnerWallet: string; onChainTx?: string | null },
    { ok: boolean }
  >("finalizeAdminChallengeDispute", {
    challengeId: params.challengeId,
    winnerWallet: params.winnerWallet,
    onChainTx: params.onChainTx ?? null,
  });
}

export async function finalizeAdminTournamentOnServer(params: {
  challengeId: string;
  matchId: string;
  winnerWallet: string;
}): Promise<void> {
  await invokeAdminCallableWithRefresh<
    { challengeId: string; matchId: string; winnerWallet: string },
    { ok: boolean }
  >("finalizeAdminTournamentDispute", params);
}
