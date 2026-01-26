import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import {
  ADMIN_WALLET,
  CHALLENGE_CONFIG,
  PROGRAM_ID,
  SOLANA_CLUSTER,
  USDFG_MINT
} from "@/lib/chain/config";
import {
  ChallengeData,
  getTotalUSDFGRewarded,
  listenToChallenges,
  recordFounderChallengeReward,
  resolveDisputedChallenge
} from "@/lib/firebase/firestore";
import { useUSDFGWallet } from "@/lib/wallet/useUSDFGWallet";

const PLATFORM_FEE_RATE = 0.05;
type AdminChallenge = ChallengeData & {
  updatedAt?: any;
};

const formatWallet = (wallet?: string | null) => {
  if (!wallet) return "N/A";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

const formatTimestamp = (timestamp?: any) => {
  if (!timestamp) return "N/A";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return "N/A";
  }
};

const Admin: React.FC = () => {
  const { connect, disconnect, connected, publicKey, connecting } = useUSDFGWallet();
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [totalRewarded, setTotalRewarded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const adminWallet = ADMIN_WALLET.toString().toLowerCase();
  const connectedWallet = publicKey?.toString() || "";
  const isAdmin = connectedWallet.toLowerCase() === adminWallet;

  useEffect(() => {
    const unsubscribe = listenToChallenges((data) => {
      setChallenges(data as AdminChallenge[]);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    getTotalUSDFGRewarded().then((total) => {
      setTotalRewarded(total);
    });
  }, [isAdmin]);

  const isFounderChallenge = useCallback((challenge: AdminChallenge) => {
    const creatorWallet = (challenge.creator || "").toLowerCase();
    const entryFee = Number(challenge.entryFee || 0);
    const isAdminCreator = creatorWallet === adminWallet;
    const isFree = entryFee === 0 || entryFee < 0.000000001;
    return isAdminCreator && isFree;
  }, [adminWallet]);

  const isFounderTournament = useCallback((challenge: AdminChallenge) => {
    if (!isFounderChallenge(challenge)) return false;
    const participantReward = Number(
      (challenge as any).founderParticipantReward || challenge.founderParticipantReward || 0
    );
    const winnerBonus = Number(
      (challenge as any).founderWinnerBonus || challenge.founderWinnerBonus || 0
    );
    const isTournament = challenge.format === "tournament" || Boolean(challenge.tournament);
    return isTournament && (participantReward > 0 || winnerBonus > 0);
  }, [isFounderChallenge]);

  const disputedChallenges = useMemo(
    () => challenges.filter((challenge) => challenge.status === "disputed"),
    [challenges]
  );

  const pendingFounderPayouts = useMemo(
    () =>
      challenges.filter((challenge) => {
        if (!isFounderChallenge(challenge)) return false;
        if (challenge.status !== "completed") return false;
        if (!challenge.winner || challenge.winner === "forfeit" || challenge.winner === "tie") return false;
        return !challenge.payoutTriggered;
      }),
    [challenges, isFounderChallenge]
  );

  const founderTournamentPayouts = useMemo(
    () =>
      challenges.filter((challenge) => {
        if (!isFounderTournament(challenge)) return false;
        const stage = challenge.tournament?.stage;
        return stage === "completed" || challenge.status === "completed";
      }),
    [challenges, isFounderTournament]
  );

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (error: any) {
      alert(error?.message || "Failed to connect wallet.");
    }
  }, [connect]);

  const handleResolveDispute = useCallback(
    async (challenge: AdminChallenge, winnerWallet?: string) => {
      if (!isAdmin || !challenge.id) {
        alert("Admin wallet required.");
        return;
      }
      if (!winnerWallet) {
        alert("Winner wallet is required.");
        return;
      }
      const confirmed = window.confirm(
        `Resolve dispute in favor of ${formatWallet(winnerWallet)}?`
      );
      if (!confirmed) return;

      setActionId(challenge.id);
      try {
        await resolveDisputedChallenge(challenge.id, {
          outcome: "award",
          winnerWallet
        });
        alert("✅ Dispute resolved.");
      } catch (error: any) {
        alert(error?.message || "Failed to resolve dispute.");
      } finally {
        setActionId(null);
      }
    },
    [isAdmin]
  );

  const handleCancelDispute = useCallback(
    async (challenge: AdminChallenge) => {
      if (!isAdmin || !challenge.id) {
        alert("Admin wallet required.");
        return;
      }
      const confirmed = window.confirm(
        "Cancel this dispute? This will close the challenge without payout."
      );
      if (!confirmed) return;

      setActionId(challenge.id);
      try {
        await resolveDisputedChallenge(challenge.id, {
          outcome: "cancel"
        });
        alert("✅ Challenge cancelled.");
      } catch (error: any) {
        alert(error?.message || "Failed to cancel dispute.");
      } finally {
        setActionId(null);
      }
    },
    [isAdmin]
  );

  const handleRecordPayout = useCallback(
    async (challenge: AdminChallenge) => {
      if (!isAdmin || !challenge.id) {
        alert("Admin wallet required.");
        return;
      }
      if (!challenge.winner) {
        alert("Winner not available.");
        return;
      }
      const defaultAmount = challenge.prizePool ? String(challenge.prizePool) : "";
      const amountStr = prompt("Enter USDFG amount transferred:", defaultAmount);
      if (!amountStr) return;
      const amount = parseFloat(amountStr);
      if (Number.isNaN(amount) || amount <= 0) {
        alert("Enter a valid positive amount.");
        return;
      }
      const txSignature =
        prompt("Enter Solana transaction signature (optional):") || undefined;

      setActionId(challenge.id);
      try {
        await recordFounderChallengeReward(
          challenge.winner,
          challenge.id,
          amount,
          txSignature
        );
        const total = await getTotalUSDFGRewarded();
        setTotalRewarded(total);
        alert("✅ Founder reward recorded.");
      } catch (error: any) {
        alert(error?.message || "Failed to record founder reward.");
      } finally {
        setActionId(null);
      }
    },
    [isAdmin]
  );

  const renderParticipantRow = (label: string, wallet?: string | null) => (
    <div className="flex items-center justify-between text-sm text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{formatWallet(wallet || undefined)}</span>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>USDFG Admin Console</title>
        <meta
          name="description"
          content="Admin control center for USDFG Arena."
        />
        <link rel="canonical" href="https://usdfg.pro/admin" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="container mx-auto px-4 py-10">
          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.2em] text-cyan-300/70">
              Admin Console
            </div>
            <h1 className="text-3xl font-semibold text-white">
              USDFG Platform Control
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Connect the founder wallet to manage disputes and payouts.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Admin Login</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                  onClick={connected ? disconnect : handleConnect}
                  disabled={connecting}
                >
                  {connecting
                    ? "Connecting..."
                    : connected
                    ? "Disconnect Wallet"
                    : "Connect Founder Wallet"}
                </button>
                <div className="text-sm text-slate-300">
                  {connected
                    ? `Connected: ${formatWallet(connectedWallet)}`
                    : "Not connected"}
                </div>
              </div>
              {connected && !isAdmin && (
                <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  ⚠️ This wallet is not the founder wallet. Admin actions are disabled.
                </div>
              )}
              {connected && isAdmin && (
                <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  ✅ Founder wallet verified. Admin tools are unlocked.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Platform Status</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Program ID</span>
                  <span className="font-medium">{formatWallet(PROGRAM_ID.toString())}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cluster</span>
                  <span className="font-medium uppercase">{SOLANA_CLUSTER}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Admin Wallet</span>
                  <span className="font-medium">{formatWallet(ADMIN_WALLET.toString())}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">USDFG Mint</span>
                  <span className="font-medium">{formatWallet(USDFG_MINT.toString())}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Entry Fee Range</span>
                  <span className="font-medium">
                    {CHALLENGE_CONFIG.MIN_ENTRY_FEE} - {CHALLENGE_CONFIG.MAX_ENTRY_FEE} USDFG
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Platform Fee</span>
                  <span className="font-medium">{PLATFORM_FEE_RATE * 100}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total USDFG Rewarded</span>
                  <span className="font-medium">
                    {totalRewarded === null ? "Loading..." : `${totalRewarded} USDFG`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6">
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Disputed Challenges</h2>
                  <p className="text-sm text-slate-400">
                    Resolve disputes by awarding a winner or cancelling.
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {disputedChallenges.length} open
                </span>
              </div>

              {loading ? (
                <div className="mt-4 text-sm text-slate-400">Loading disputes...</div>
              ) : disputedChallenges.length === 0 ? (
                <div className="mt-4 text-sm text-slate-400">No disputed challenges.</div>
              ) : (
                <div className="mt-4 space-y-4">
                  {disputedChallenges.map((challenge) => {
                    const players = (challenge.players && challenge.players.length > 0)
                      ? challenge.players
                      : [challenge.creator, challenge.challenger].filter(Boolean);
                    const [playerA, playerB] = players;
                    return (
                      <div
                        key={challenge.id}
                        className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-400">Challenge</div>
                            <div className="text-lg font-semibold text-white">
                              {challenge.game || challenge.title || "Untitled Challenge"}
                            </div>
                          </div>
                          {challenge.id && (
                            <a
                              href={`/app?challenge=${challenge.id}`}
                              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                            >
                              Open in Arena
                            </a>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {renderParticipantRow("Player A", playerA)}
                          {renderParticipantRow("Player B", playerB)}
                          <div className="flex items-center justify-between text-sm text-slate-200">
                            <span className="text-slate-400">Entry Fee</span>
                            <span className="font-medium">{challenge.entryFee || 0} USDFG</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-200">
                            <span className="text-slate-400">Created</span>
                            <span className="font-medium">{formatTimestamp(challenge.createdAt)}</span>
                          </div>
                        </div>

                        {challenge.results && (
                          <div className="mt-3 text-xs text-slate-400">
                            Results:
                            <div className="mt-1 space-y-1">
                              {Object.entries(challenge.results).map(([wallet, result]) => (
                                <div key={wallet} className="flex items-center justify-between">
                                  <span>{formatWallet(wallet)}</span>
                                  <span className="text-slate-200">
                                    {result.didWin ? "Claimed Win" : "Claimed Loss"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <button
                            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                            onClick={() => handleResolveDispute(challenge, playerA || undefined)}
                            disabled={!isAdmin || actionId === challenge.id || !playerA}
                          >
                            {actionId === challenge.id ? "Resolving..." : "Award Player A"}
                          </button>
                          <button
                            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                            onClick={() => handleResolveDispute(challenge, playerB || undefined)}
                            disabled={!isAdmin || actionId === challenge.id || !playerB}
                          >
                            {actionId === challenge.id ? "Resolving..." : "Award Player B"}
                          </button>
                          <button
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                            onClick={() => handleCancelDispute(challenge)}
                            disabled={!isAdmin || actionId === challenge.id}
                          >
                            {actionId === challenge.id ? "Cancelling..." : "Cancel Challenge"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Founder Challenge Payouts</h2>
                  <p className="text-sm text-slate-400">
                    Record manual USDFG transfers for completed founder challenges.
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {pendingFounderPayouts.length} pending
                </span>
              </div>

              {loading ? (
                <div className="mt-4 text-sm text-slate-400">Loading payouts...</div>
              ) : pendingFounderPayouts.length === 0 ? (
                <div className="mt-4 text-sm text-slate-400">No founder payouts waiting.</div>
              ) : (
                <div className="mt-4 space-y-4">
                  {pendingFounderPayouts.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-400">Winner</div>
                          <div className="text-lg font-semibold text-white">
                            {formatWallet(challenge.winner)}
                          </div>
                        </div>
                        {challenge.id && (
                          <a
                            href={`/app?challenge=${challenge.id}`}
                            className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/20"
                          >
                            Open in Arena
                          </a>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span className="text-slate-400">Challenge</span>
                          <span className="font-medium">{challenge.game || "Founder Challenge"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span className="text-slate-400">Completed</span>
                          <span className="font-medium">{formatTimestamp(challenge.updatedAt)}</span>
                        </div>
                      </div>
                      <button
                        className="mt-4 w-full rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                        onClick={() => handleRecordPayout(challenge)}
                        disabled={!isAdmin || actionId === challenge.id}
                      >
                        {actionId === challenge.id ? "Recording..." : "Record Payout"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Founder Tournament Payouts</h2>
                  <p className="text-sm text-slate-400">
                    Open completed founder tournaments in the Arena to send airdrops.
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {founderTournamentPayouts.length} completed
                </span>
              </div>

              {loading ? (
                <div className="mt-4 text-sm text-slate-400">Loading tournaments...</div>
              ) : founderTournamentPayouts.length === 0 ? (
                <div className="mt-4 text-sm text-slate-400">No completed founder tournaments.</div>
              ) : (
                <div className="mt-4 space-y-4">
                  {founderTournamentPayouts.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-400">Tournament</div>
                          <div className="text-lg font-semibold text-white">
                            {challenge.game || challenge.title || "Founder Tournament"}
                          </div>
                        </div>
                        {challenge.id && (
                          <a
                            href={`/app?challenge=${challenge.id}`}
                            className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/20"
                          >
                            Open in Arena
                          </a>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span className="text-slate-400">Participants</span>
                          <span className="font-medium">{challenge.players?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span className="text-slate-400">Status</span>
                          <span className="font-medium">Completed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Admin;
