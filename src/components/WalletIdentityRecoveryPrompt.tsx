import { useWalletIdentityRecovery } from "@/hooks/useWalletIdentityRecovery";

/**
 * Prompt when wallet is linked to a stale Firebase session.
 * Recovery requires wallet signature; does not bypass resolveChallengeParticipantUid checks.
 */
export default function WalletIdentityRecoveryPrompt() {
  const { mismatch, canRecover, isRecovering, error, recover } =
    useWalletIdentityRecovery();

  if (!mismatch) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-xl border border-amber-500/50 bg-[#0B0C12]/95 p-4 shadow-lg backdrop-blur-sm md:left-auto md:right-6"
    >
      <p className="text-sm font-semibold text-amber-200">Wallet session mismatch</p>
      <p className="mt-1 text-xs text-gray-300 leading-relaxed">
        This wallet is linked to a previous browser session. Sign a one-time message to
        restore access without changing wallet ownership.
      </p>
      {error ? (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={!canRecover || isRecovering}
        onClick={() => {
          void recover();
        }}
        className="mt-3 w-full rounded-lg border border-amber-500/60 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
      >
        {isRecovering ? "Recovering…" : "Recover wallet access"}
      </button>
    </div>
  );
}
