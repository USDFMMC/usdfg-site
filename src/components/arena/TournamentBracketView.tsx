import React, { useState, useEffect, useRef } from "react";
import type { TournamentState } from "@/lib/firebase/firestore";
import { devFillTournamentWithTestPlayers, advanceBracketWinner } from "@/lib/firebase/firestore";
import { Keypair } from "@solana/web3.js";
import { cn } from "@/lib/utils";
import { VoiceChat } from "./VoiceChat";
import { ChatBox } from "./ChatBox";
import { ADMIN_WALLET } from "@/lib/chain/config";
import type { AppConfirmDialogOptions } from "@/components/ui/AppConfirmModal";
import { isChallengeRewardClaimed } from "@/lib/utils/challenge-helpers";

const isDevTestEnv =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true) ||
    new URLSearchParams(window.location.search).get("dev") === "1");

/** Inner component for payout buttons to avoid TDZ / closure order issues in minified build */
function FounderPayoutButtons({
  uniqueParticipants,
  founderParticipantReward,
  founderWinnerBonus,
  champion,
  challenge,
  onAirdropPayouts,
  isAirdropping,
  onAppToast,
}: {
  uniqueParticipants: string[];
  founderParticipantReward: number;
  founderWinnerBonus: number;
  champion: string | undefined;
  challenge: any;
  onAirdropPayouts?: (recipients: { wallet: string; amount: number }[], challenge: any) => Promise<void>;
  isAirdropping?: boolean;
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
}) {
  const [copyFallback, setCopyFallback] = useState<{ label: string; csv: string } | null>(null);

  function buildParticipantCsv() {
    if (founderParticipantReward <= 0 || uniqueParticipants.length === 0) return "";
    const rows = [["wallet", "amount"]];
    uniqueParticipants.forEach((wallet) => {
      rows.push([wallet, founderParticipantReward.toString()]);
    });
    return rows.map((row) => row.join(",")).join("\n");
  }
  function buildWinnerCsv() {
    if (!champion || founderWinnerBonus <= 0) return "";
    return `wallet,amount\n${champion},${founderWinnerBonus}`;
  }
  function buildCombinedCsv() {
    if (uniqueParticipants.length === 0) return "";
    const rows = [["wallet", "amount"]];
    uniqueParticipants.forEach((wallet) => {
      let amount = founderParticipantReward > 0 ? founderParticipantReward : 0;
      if (champion && wallet.toLowerCase() === champion.toLowerCase()) {
        amount += founderWinnerBonus > 0 ? founderWinnerBonus : 0;
      }
      if (amount > 0) rows.push([wallet, amount.toString()]);
    });
    return rows.map((row) => row.join(",")).join("\n");
  }
  function buildCombinedRecipients() {
    if (uniqueParticipants.length === 0) return [];
    return uniqueParticipants
      .map((wallet) => {
        let amount = founderParticipantReward > 0 ? founderParticipantReward : 0;
        if (champion && wallet.toLowerCase() === champion.toLowerCase()) {
          amount += founderWinnerBonus > 0 ? founderWinnerBonus : 0;
        }
        return { wallet, amount };
      })
      .filter((entry) => entry.amount > 0);
  }
  async function copyCsv(csv: string, label: string) {
    if (!csv) {
      onAppToast?.("No payout data available yet.", "warning", "Payout");
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      setCopyFallback(null);
      onAppToast?.(`${label} copied to clipboard.`, "success", "Copied");
    } catch {
      setCopyFallback({ label, csv });
      onAppToast?.("Clipboard access was blocked. Copy from the box below.", "warning", "Copy");
    }
  }
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button
        onClick={() => copyCsv(buildCombinedCsv(), "Combined payout CSV")}
        className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30"
      >
        Copy Combined CSV
      </button>
      {founderParticipantReward > 0 && (
        <button
          onClick={() => copyCsv(buildParticipantCsv(), "Participant CSV")}
          className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30"
        >
          Copy Participant CSV
        </button>
      )}
      {founderWinnerBonus > 0 && champion && (
        <button
          onClick={() => copyCsv(buildWinnerCsv(), "Winner bonus CSV")}
          className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30"
        >
          Copy Winner Bonus CSV
        </button>
      )}
      {onAirdropPayouts && (
        <button
          onClick={() => onAirdropPayouts(buildCombinedRecipients(), challenge)}
          disabled={isAirdropping}
          className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAirdropping ? "Sending Airdrop..." : "Send Airdrop Now"}
        </button>
      )}

      {copyFallback && (
        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-white/70">
              Copy {copyFallback.label}
            </div>
            <button
              type="button"
              className="text-xs text-white/60 hover:text-white"
              onClick={() => setCopyFallback(null)}
            >
              Close
            </button>
          </div>
          <textarea
            className="mt-2 h-28 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 outline-none focus:border-purple-400/40"
            value={copyFallback.csv}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}

interface TournamentBracketViewProps {
  tournament?: TournamentState;
  players?: string[];
  currentWallet?: string | null;
  challengeId: string;
  onOpenSubmitResult?: (matchId: string, opponentWallet: string) => void;
  onJoinTournament?: (challengeId: string) => Promise<void>;
  onClaimPrize?: (challenge: any) => Promise<void>;
  onCancelChallenge?: (challenge: any) => Promise<void>;
  challenge?: any; // Full challenge object for claim prize logic
  isClaiming?: boolean; // Whether claim is in progress
  onAirdropPayouts?: (recipients: { wallet: string; amount: number }[], challenge: any) => Promise<void>;
  isAirdropping?: boolean;
  onPlayerClick?: (wallet: string) => void;
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
  requestAppConfirm?: (opts: AppConfirmDialogOptions) => Promise<boolean>;
}

const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  tournament,
  players = [],
  currentWallet,
  challengeId,
  onOpenSubmitResult,
  onJoinTournament,
  onClaimPrize,
  onCancelChallenge,
  challenge,
  isClaiming = false,
  onAirdropPayouts,
  isAirdropping = false,
  onPlayerClick,
  onAppToast,
  requestAppConfirm,
}: TournamentBracketViewProps) => {
  // Ensure players is always an array (parent may pass number or malformed data)
  const playersList = Array.isArray(players) ? players : [];

  if (!tournament || !tournament.bracket?.length) {
    return (
      <div className="min-h-screen bg-[#07080C] text-white">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_35%,rgba(36,64,92,0.55),rgba(7,10,15,1)_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-4">
            <div className="text-center text-sm tracking-wide text-white/70">USDFG Tournament · Tournament Tree</div>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center text-sm text-gray-400">
              Bracket will populate once players join.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { bracket, currentRound, stage } = tournament;

  function findMatchForPlayer(wallet?: string | null) {
    if (!wallet) return null;
    const lower = wallet.toLowerCase();

    // First, try to find match in the current round (active match)
    const currentRoundData = bracket.find(r => r.roundNumber === currentRound);
    if (currentRoundData) {
      for (const match of currentRoundData.matches) {
        const isPlayer1 = match.player1?.toLowerCase() === lower;
        const isPlayer2 = match.player2?.toLowerCase() === lower;
        if ((isPlayer1 || isPlayer2) && match.status !== 'completed') {
          return { round: currentRoundData, match };
        }
      }
    }

    // If no active match in current round, find any non-completed match
    for (const round of bracket) {
      for (const match of round.matches) {
        const isPlayer1 = match.player1?.toLowerCase() === lower;
        const isPlayer2 = match.player2?.toLowerCase() === lower;
        const effectiveStatus = (round.roundNumber === bracket.length &&
                                 match.player1 && match.player2 &&
                                 match.status === 'ready') ? 'in-progress' : match.status;

        if ((isPlayer1 || isPlayer2) && effectiveStatus !== 'completed') {
          return { round, match: { ...match, status: effectiveStatus as any } };
        }
      }
    }

    return null;
  }

  const playerMatch = findMatchForPlayer(currentWallet);
  const opponentWallet =
    playerMatch &&
    (playerMatch.match.player1?.toLowerCase() ===
    currentWallet?.toLowerCase()
      ? playerMatch.match.player2
      : playerMatch.match.player1);
  const currentPlayerIsP1 =
    playerMatch?.match.player1?.toLowerCase() === currentWallet?.toLowerCase();
  const currentPlayerIsP2 =
    playerMatch?.match.player2?.toLowerCase() === currentWallet?.toLowerCase();
  const currentPlayerResult = currentPlayerIsP1
    ? playerMatch?.match.player1Result
    : currentPlayerIsP2
    ? playerMatch?.match.player2Result
    : undefined;
  const opponentResult = currentPlayerIsP1
    ? playerMatch?.match.player2Result
    : currentPlayerIsP2
    ? playerMatch?.match.player1Result
    : undefined;
  const opponentSubmitted = opponentResult !== undefined;
  const canEditResult = currentPlayerResult !== undefined && !opponentSubmitted;

  const maxPlayers =
    Number(
      tournament.maxPlayers ||
        (challenge?.maxPlayers ?? challenge?.capacity ?? challenge?.rawData?.maxPlayers ?? challenge?.rawData?.capacity)
    ) || playersList.length;
  const currentPlayers = playersList.length;
  const isWaitingForPlayers = stage === 'waiting_for_players';
  const isCompleted = stage === 'completed';
  const champion = tournament.champion;

  const isChampion = currentWallet && champion && currentWallet.toLowerCase() === champion.toLowerCase();

  // Check if reward can be claimed (base; founder logic applied after isFounderTournament)
  const canClaim = challenge?.canClaim || challenge?.rawData?.canClaim;
  const prizeClaimedBase = challenge ? isChallengeRewardClaimed(challenge) : false;
  const founderPayoutSentAt = challenge?.founderPayoutSentAt ?? challenge?.rawData?.founderPayoutSentAt;
  const founderPayoutAcknowledgedBy = challenge?.founderPayoutAcknowledgedBy ?? challenge?.rawData?.founderPayoutAcknowledgedBy ?? [];
  const userAcknowledgedFounder = Array.isArray(founderPayoutAcknowledgedBy) && currentWallet && founderPayoutAcknowledgedBy.some((w: string) => w.toLowerCase() === currentWallet.toLowerCase());

  const creatorWallet = challenge?.creator || challenge?.rawData?.creator || '';
  const entryFee = Number(challenge?.entryFee ?? challenge?.rawData?.entryFee ?? 0);
  const founderParticipantReward = Number(
    challenge?.founderParticipantReward ?? challenge?.rawData?.founderParticipantReward ?? 0
  );
  const founderWinnerBonus = Number(
    challenge?.founderWinnerBonus ?? challenge?.rawData?.founderWinnerBonus ?? 0
  );
  const isAdminCreator =
    creatorWallet &&
    creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  const isFounderTournament =
    isAdminCreator &&
    (entryFee === 0 || entryFee < 0.000000001) &&
    (founderParticipantReward > 0 || founderWinnerBonus > 0);
  // For Founder Tournaments: hide Claim if user acknowledged or founder sent airdrop
  const prizeClaimed = prizeClaimedBase || !!founderPayoutSentAt || (isFounderTournament && userAcknowledgedFounder);
  const canClaimPrize = isChampion && isCompleted && canClaim && !prizeClaimed;
  const founderPayoutAlreadySent = !!founderPayoutSentAt;
  const isAdminViewer =
    currentWallet &&
    currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  const isCreator =
    currentWallet &&
    creatorWallet &&
    currentWallet.toLowerCase() === creatorWallet.toLowerCase();
  const nonCreatorPlayers = playersList.filter((wallet) => {
    if (!wallet || !creatorWallet) return Boolean(wallet);
    return wallet.toLowerCase() !== creatorWallet.toLowerCase();
  });
  const canCancelTournament =
    Boolean(isCreator) && isWaitingForPlayers && nonCreatorPlayers.length === 0;

  const uniqueParticipants = (() => {
    const map = new Map<string, string>();
    playersList.forEach((wallet) => {
      if (!wallet) return;
      const key = wallet.toLowerCase();
      if (!map.has(key)) {
        map.set(key, wallet);
      }
    });
    return Array.from(map.values());
  })();

  const [opsTab, setOpsTab] = useState<"chat" | "info" | "proof">("chat");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [devFillLoading, setDevFillLoading] = useState(false);
  const [devSetWinnerLoading, setDevSetWinnerLoading] = useState<string | null>(null);
  const autoFilledChallengeRef = useRef<string | null>(null);

  // Auto-fill when only creator is in 4/8/16 tournament (creator opens lobby; once per challenge)
  useEffect(() => {
    // DEV/TEST ONLY: never auto-fill tournaments on production.
    if (!isDevTestEnv) return;
    if (
      !isCreator ||
      ![4, 8, 16].includes(maxPlayers) ||
      currentPlayers > 1 ||
      !creatorWallet ||
      !isWaitingForPlayers ||
      autoFilledChallengeRef.current === challengeId ||
      devFillLoading
    ) {
      return;
    }
    autoFilledChallengeRef.current = challengeId;
    setDevFillLoading(true);
    const count = maxPlayers - 1;
    const keypairs = Array.from({ length: count }, () => Keypair.generate());
    const testAddresses = keypairs.map((kp) => kp.publicKey.toBase58());
    devFillTournamentWithTestPlayers(challengeId, creatorWallet, testAddresses)
      .then(() => {
        setDevFillLoading(false);
      })
      .catch((err: unknown) => {
        console.error("Auto-fill failed:", err);
        autoFilledChallengeRef.current = null;
        setDevFillLoading(false);
      });
  }, [
    challengeId,
    creatorWallet,
    isCreator,
    maxPlayers,
    currentPlayers,
    isWaitingForPlayers,
    devFillLoading,
  ]);

  const challengeTitle = challenge?.title || challenge?.rawData?.title || "USDFG Tournament";
  const challengeGame = challenge?.game || challenge?.rawData?.game || "—";
  const challengePlatform = challenge?.platform || challenge?.rawData?.platform || "Any";

  // Find selected match for strip
  const selectedMatch = (() => {
    if (!selectedMatchId) return null;
    for (const round of bracket) {
      const m = round.matches.find((mm) => mm.id === selectedMatchId);
      if (m) return { round, match: m };
    }
    return null;
  })();

  function slotLabel(wallet?: string) {
    if (!wallet) return "Open";
    if (wallet.length <= 12) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }
  function slotInitials(wallet: string) {
    return (wallet || "??").slice(0, 2).toUpperCase();
  }
  return (
    <div className="min-h-screen bg-[#07080C] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_35%,rgba(36,64,92,0.55),rgba(7,10,15,1)_60%)]" />
          <div className="absolute -top-24 left-0 h-64 w-1/2 rotate-[-10deg] bg-[linear-gradient(90deg,transparent,rgba(0,224,255,0.10),transparent)] blur-2xl" />
          <div className="absolute -top-10 right-0 h-64 w-1/2 rotate-[12deg] bg-[linear-gradient(90deg,transparent,rgba(120,80,255,0.10),transparent)] blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(55%_35%_at_50%_85%,rgba(0,0,0,0),rgba(0,0,0,0.65))]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm tracking-wide text-white/70">USDFG Tournament · Tournament Tree</div>
              <div className="mt-1 h-[1px] w-40 bg-white/10 mx-auto" />
            </div>
          </div>

      {isCompleted && champion && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#07080C]/98 via-purple-950/20 to-[#07080C]/98 p-4 lg:p-5 text-center ring-1 ring-purple-500/10">
          <div className="text-3xl lg:text-4xl mb-1.5">🏆</div>
          <div className="text-base lg:text-lg font-bold text-white mb-1">
            Tournament Complete!
          </div>
          <div className="text-xs lg:text-sm text-white/70 mb-2 lg:mb-3">
            Champion:{" "}
            <span 
              className={cn(
                "font-semibold text-white",
                onPlayerClick && "cursor-pointer hover:text-purple-200 underline transition-colors"
              )}
              onClick={() => {
                if (onPlayerClick) {
                  onPlayerClick(champion);
                }
              }}
            >
              {champion.slice(0, 8)}...{champion.slice(-8)}
            </span>
          </div>
          {isChampion && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-400/40">
              <div className="text-sm font-semibold text-emerald-200 mb-1">
                🎉 You Won!
              </div>
              {canClaimPrize && onClaimPrize ? (
                <div className="space-y-2">
                  <div className="text-xs text-emerald-100/80 mb-2">
                    Claim your reward to receive the tournament reward!
                  </div>
                  <button
                    onClick={async () => {
                      if (challenge && onClaimPrize) {
                        try {
                          await onClaimPrize(challenge);
                        } catch (error: any) {
                          console.error('Error claiming reward:', error);
                          onAppToast?.(error.message || 'Failed to claim reward', 'error', 'Claim failed');
                        }
                      }
                    }}
                    disabled={isClaiming}
                    className="w-full rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/30 border border-emerald-400/40 ring-1 ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaiming ? 'Claiming...' : '🏆 Claim Reward'}
                  </button>
                </div>
              ) : founderPayoutAlreadySent ? (
                <div className="text-xs text-emerald-100/80">
                  ✅ Reward distributed! Check your wallet for USDFG.
                </div>
              ) : isFounderTournament && userAcknowledgedFounder ? (
                <div className="text-xs text-emerald-100/80">
                  🏆 Founder Tournament. Rewards will be sent by the platform. No action required.
                </div>
              ) : prizeClaimed ? (
                <div className="text-xs text-emerald-100/80">
                  ✅ Reward claimed! Check your wallet for the USDFG reward.
                </div>
              ) : (
                <div className="text-xs text-emerald-100/80">
                  Reward claiming will be available soon...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isCompleted && isFounderTournament && isAdminViewer && (
        <div className="rounded-xl border border-purple-400/40 bg-purple-500/10 p-3 lg:p-4 text-xs lg:text-sm text-purple-100">
          <div className="text-[10px] lg:text-xs uppercase tracking-widest text-purple-300">
            Founder Tournament Payouts
          </div>
          <div className="mt-1.5 lg:mt-2 text-[10px] lg:text-xs text-purple-100/80">
            Participants: {uniqueParticipants.length} · Participant Reward: {founderParticipantReward} USDFG · Winner Bonus: {founderWinnerBonus} USDFG
          </div>
          <FounderPayoutButtons
            uniqueParticipants={uniqueParticipants}
            founderParticipantReward={founderParticipantReward}
            founderWinnerBonus={founderWinnerBonus}
            champion={champion}
            challenge={challenge}
            onAirdropPayouts={onAirdropPayouts}
            isAirdropping={isAirdropping}
            onAppToast={onAppToast}
          />
        </div>
      )}

      {isWaitingForPlayers && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80 ring-1 ring-purple-500/10">
          <div className="text-xs uppercase tracking-widest text-purple-300/90">
            Waiting for players
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {currentPlayers} / {maxPlayers} players joined
          </div>
          <p className="mt-1 text-xs text-white/55">
            The tournament will start automatically when all {maxPlayers} players join. Share the challenge link to invite others!
          </p>
          {onJoinTournament && currentWallet && currentPlayers < maxPlayers && !playersList.some(p => p && p.toLowerCase() === currentWallet.toLowerCase()) && (
            <button
              onClick={async () => {
                try {
                  await onJoinTournament(challengeId);
                } catch (error: any) {
                  onAppToast?.(error.message || 'Failed to join tournament', 'error', 'Join failed');
                }
              }}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
            >
              Join Tournament
            </button>
          )}
          {canCancelTournament && onCancelChallenge && challenge && (
            <button
              onClick={async () => {
                if (!requestAppConfirm) return;
                const ok = await requestAppConfirm({
                  title: 'Please confirm',
                  message: 'Are you sure you want to delete this tournament? This action cannot be undone.',
                  confirmLabel: 'OK',
                  cancelLabel: 'Cancel',
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await onCancelChallenge(challenge);
                } catch (error: any) {
                  onAppToast?.(error.message || 'Failed to delete tournament', 'error', 'Delete failed');
                }
              }}
              className="mt-3 w-full rounded-lg bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-200 transition-all hover:bg-red-600/30 border border-red-500/40 ring-1 ring-red-500/20"
            >
              🗑️ Delete Tournament
            </button>
          )}
          {isDevTestEnv &&
            isCreator &&
            [4, 8, 16].includes(maxPlayers) &&
            currentPlayers <= 1 &&
            creatorWallet &&
            isWaitingForPlayers && (
            <button
              onClick={async () => {
                setDevFillLoading(true);
                try {
                  const count = maxPlayers - 1;
                  const keypairs = Array.from({ length: count }, () => Keypair.generate());
                  const testAddresses = keypairs.map((kp) => kp.publicKey.toBase58());
                  await devFillTournamentWithTestPlayers(challengeId, creatorWallet, testAddresses);
                  onAppToast?.(
                    `Filled with ${maxPlayers} test players (you + ${count}). Refresh or wait for real-time update.`,
                    'success',
                    'Dev fill'
                  );
                } catch (error: any) {
                  console.error("Dev fill failed:", error);
                  onAppToast?.(error.message || "Failed to fill test players", 'error', 'Dev fill');
                } finally {
                  setDevFillLoading(false);
                }
              }}
              disabled={devFillLoading}
              className="mt-3 w-full rounded-lg border border-orange-500/40 bg-orange-950/30 px-4 py-2 text-sm font-semibold text-orange-100 transition-all hover:bg-orange-950/45 disabled:opacity-50 ring-1 ring-orange-500/15"
            >
              {devFillLoading ? "Filling…" : `🧪 Fill with test players (${maxPlayers})`}
            </button>
          )}
        </div>
      )}

      {playerMatch && 
       playerMatch.match.status !== 'completed' &&
       (playerMatch.match.status === 'in-progress' || playerMatch.match.status === 'ready') &&
       opponentWallet && (
        <div className="rounded-xl border border-white/10 bg-[#07080C]/95 p-4 text-sm text-white/85 ring-1 ring-purple-500/10">
          <div className="text-xs uppercase tracking-widest text-purple-300/90">
            {playerMatch.round.roundNumber === bracket.length ? '🏆 FINAL MATCH' : "You're locked in"}
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {playerMatch.round.roundNumber === bracket.length ? 'Final' : `Round ${playerMatch.round.roundNumber}`}:{" "}
            {opponentWallet ? (
              <span
                className={cn(
                  onPlayerClick && "cursor-pointer hover:text-purple-200 underline transition-colors"
                )}
                onClick={() => {
                  if (onPlayerClick) {
                    onPlayerClick(opponentWallet);
                  }
                }}
              >
                {`${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}`}
              </span>
            ) : (
              "Waiting for opponent"
            )}
          </div>
          <p className="mt-1 text-xs text-white/55">
            {playerMatch.round.roundNumber === bracket.length 
              ? "🏆 This is the FINAL! The winner receives the entire challenge reward. Submit your result when ready."
              : "Chat with your opponent and start the match. Submit results once you finish—winner advances automatically."}
          </p>
          {onOpenSubmitResult ? (
            (() => {
              // Check if player already submitted
              const alreadySubmitted = currentPlayerResult !== undefined;
              
              if (alreadySubmitted) {
                return (
                  <div className="mt-3 space-y-2">
                    <div className="w-full rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 border border-emerald-500/35 text-center ring-1 ring-emerald-500/15">
                      ✅ Result submitted. {opponentSubmitted ? 'Waiting for bracket update...' : 'Waiting for opponent...'}
                    </div>
                    {canEditResult && onOpenSubmitResult && (
                      <button
                        onClick={() => onOpenSubmitResult(playerMatch.match.id, opponentWallet)}
                        className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
                      >
                        Update Result
                      </button>
                    )}
                    {canEditResult && (
                      <div className="text-[10px] text-orange-200/80 text-center">
                        You can update until your opponent submits.
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <button
                  onClick={() => {
                    onOpenSubmitResult(playerMatch.match.id, opponentWallet);
                  }}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
                >
                  {playerMatch.round.roundNumber === bracket.length ? '🏆 Submit Final Result' : 'Submit Result'}
                </button>
              );
            })()
          ) : (
            <div className="mt-3 text-xs text-red-400">⚠️ Submit handler not available</div>
          )}
        </div>
      )}

      {/* Bracket: same logic as old lobby — one column per round, Round 1 / Final labels. Design only: arena panel + thin slots. */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="p-4 sm:p-6">
          <div
            className="grid w-full gap-3 lg:gap-4"
            style={{ gridTemplateColumns: `repeat(${bracket.length}, minmax(0, 1fr))` }}
          >
            {bracket.map((round) => (
              <div key={round.roundNumber} className="space-y-2 lg:space-y-3 min-w-0">
                <div
                  className={cn(
                    "text-center text-[10px] lg:text-[11px] font-semibold uppercase tracking-widest",
                    round.roundNumber === currentRound ? "text-purple-300" : "text-white/55"
                  )}
                >
                  {round.roundNumber === bracket.length ? "Final" : `Round ${round.roundNumber}`}
                </div>
                <div className="space-y-2">
                  {round.matches.map((match) => {
                    const youAreInMatch = currentWallet && (
                      (match.player1?.toLowerCase() === currentWallet.toLowerCase() ||
                        match.player2?.toLowerCase() === currentWallet.toLowerCase())
                    );
                    const matchStatus =
                      match.status === "completed"
                        ? "Completed"
                        : match.status === "disputed"
                        ? "Disputed"
                        : match.status === "in-progress"
                        ? "In progress"
                        : match.status === "ready"
                        ? "Ready"
                        : "Waiting";
                    const active = selectedMatchId === match.id;
                    const isChampionMatch = round.roundNumber === bracket.length && match.status === "completed" && match.winner;
                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => setSelectedMatchId(match.id)}
                        className={cn(
                          "w-full rounded-xl border text-left transition-all duration-200",
                          active ? "border-purple-400/45 bg-white/12 ring-1 ring-purple-400/25" : youAreInMatch ? "border-purple-400/35 bg-purple-500/10" : "border-white/10 bg-white/6 hover:bg-white/10"
                        )}
                      >
                        <div className="mb-1.5 flex items-center justify-between px-2 text-[9px] uppercase tracking-wide text-white/45">
                          <span>Match {match.id.replace("r", "").replace("-", "")}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-semibold",
                              match.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                                : match.status === "disputed"
                                ? "bg-red-500/15 text-red-300 border border-red-400/30"
                                : match.status === "in-progress"
                                ? "bg-purple-500/15 text-purple-200 border border-purple-400/30"
                                : "bg-white/5 text-white/60 border border-white/10"
                            )}
                          >
                            {matchStatus}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold", active ? "border-purple-400/50 text-purple-200" : "border-white/10 bg-white/6 text-white/70")}>
                              {match.player1 ? slotInitials(match.player1) : "—"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-white/80 truncate">{slotLabel(match.player1)}</div>
                              <div className="text-[10px] text-white/40">{match.player1 ? "Participant" : "Waiting…"}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2.5 py-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold", active ? "border-purple-400/50 text-purple-200" : "border-white/10 bg-white/6 text-white/70")}>
                              {match.player2 ? slotInitials(match.player2) : "—"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-white/80 truncate">{slotLabel(match.player2)}</div>
                              <div className="text-[10px] text-white/40">{match.player2 ? "Participant" : "Open"}</div>
                            </div>
                          </div>
                        </div>
                        {match.winner && (
                          <div
                            className={cn("mx-2 mb-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300", onPlayerClick && "cursor-pointer hover:bg-emerald-500/20")}
                            onClick={(e) => { e.stopPropagation(); if (onPlayerClick) onPlayerClick(match.winner!); }}
                          >
                            Winner: {slotLabel(match.winner)}
                          </div>
                        )}
                        {match.status === "disputed" && (
                          <div className="mx-2 mb-2 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200">
                            Disputed match — awaiting admin resolution
                          </div>
                        )}
                        {isChampionMatch && (
                          <div className="mx-2 mb-2 rounded-md border border-white/10 bg-gradient-to-r from-purple-500/20 to-orange-500/15 px-2 py-0.5 text-center text-[10px] font-semibold text-white/90 ring-1 ring-purple-500/15">
                            🏆 Champion
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Selected match strip (design only) */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-purple-400 ring-2 ring-purple-500/35" />
              </div>
              <div>
                <div className="text-sm text-white/80">Selected Match</div>
                <div className="text-base font-semibold">
                  {selectedMatch
                    ? `${selectedMatch.round.roundNumber === bracket.length ? "Final" : `Round ${selectedMatch.round.roundNumber}`}-${(selectedMatch.round.matches.findIndex(m => m.id === selectedMatch.match.id) + 1) || selectedMatch.match.id.replace("r", "").replace("-", "")}`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-white/10 bg-white/6 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-white/45">Status</div>
                <div className="text-xs font-semibold text-white/80">{selectedMatch ? (selectedMatch.match.status === "completed" ? "Completed" : selectedMatch.match.status === "in-progress" ? "In progress" : "Open") : "—"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-white/45">Platform</div>
                <div className="text-xs font-semibold text-white/80">{challengePlatform}</div>
              </div>
            </div>
            {((
              // DEV/TEST: allow creator/admin to control bracket without real players.
              (isDevTestEnv && (isCreator || isAdminViewer)) ||
              // PROD: allow admin override for Founder tournaments so mock wallets don't block testing/ops.
              (isAdminViewer && isFounderTournament)
            ) &&
              selectedMatch &&
              selectedMatch.match.status !== "completed" &&
              selectedMatch.match.player1 &&
              selectedMatch.match.player2) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase text-white/50">
                  {isDevTestEnv ? "Test:" : "Admin override:"}
                </span>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { match } = selectedMatch;
                    if (!match.player1) return;
                    if (!isDevTestEnv && isAdminViewer) {
                      if (!requestAppConfirm) return;
                      const ok = await requestAppConfirm({
                        title: 'Please confirm',
                        message: `Advance winner for this match as admin?\n\nWinner: ${slotLabel(match.player1)}\n\nThis is an override for testing/ops and should only be used when mock wallets cannot submit results.`,
                        confirmLabel: 'OK',
                        cancelLabel: 'Cancel',
                        destructive: false,
                      });
                      if (!ok) return;
                    }
                    setDevSetWinnerLoading(match.id);
                    try {
                      await advanceBracketWinner(challengeId, match.id, match.player1);
                    } catch (err: any) {
                      onAppToast?.(err.message || "Failed to set winner", 'error', 'Bracket');
                    } finally {
                      setDevSetWinnerLoading(null);
                    }
                  }}
                  disabled={devSetWinnerLoading === selectedMatch.match.id}
                  className="rounded-lg border border-white/10 bg-purple-600/25 px-3 py-1.5 text-xs font-semibold text-purple-100 hover:bg-purple-600/35 disabled:opacity-50 ring-1 ring-purple-500/15"
                >
                  Set winner: {slotLabel(selectedMatch.match.player1)}
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { match } = selectedMatch;
                    if (!match.player2) return;
                    if (!isDevTestEnv && isAdminViewer) {
                      if (!requestAppConfirm) return;
                      const ok = await requestAppConfirm({
                        title: 'Please confirm',
                        message: `Advance winner for this match as admin?\n\nWinner: ${slotLabel(match.player2)}\n\nThis is an override for testing/ops and should only be used when mock wallets cannot submit results.`,
                        confirmLabel: 'OK',
                        cancelLabel: 'Cancel',
                        destructive: false,
                      });
                      if (!ok) return;
                    }
                    setDevSetWinnerLoading(match.id);
                    try {
                      await advanceBracketWinner(challengeId, match.id, match.player2);
                    } catch (err: any) {
                      onAppToast?.(err.message || "Failed to set winner", 'error', 'Bracket');
                    } finally {
                      setDevSetWinnerLoading(null);
                    }
                  }}
                  disabled={devSetWinnerLoading === selectedMatch.match.id}
                  className="rounded-lg border border-white/10 bg-purple-600/25 px-3 py-1.5 text-xs font-semibold text-purple-100 hover:bg-purple-600/35 disabled:opacity-50 ring-1 ring-purple-500/15"
                >
                  Set winner: {slotLabel(selectedMatch.match.player2)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ops panel: Lobby Chat | Match Info | Proof & Results */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-[#07080C]/80 backdrop-blur-md shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-purple-500/10">
        <div className="flex flex-wrap gap-2 p-2">
          <button
            type="button"
            onClick={() => setOpsTab("chat")}
            className={cn(
              "flex-1 min-w-[100px] rounded-2xl px-4 py-3 text-sm transition-all",
              opsTab === "chat"
                ? "bg-white/10 border border-white/15 text-purple-200 ring-1 ring-purple-400/25"
                : "bg-white/5 border border-white/10 text-white/65 hover:bg-white/8"
            )}
          >
            Lobby Chat
          </button>
          <button
            type="button"
            onClick={() => setOpsTab("info")}
            className={cn(
              "flex-1 min-w-[100px] rounded-2xl px-4 py-3 text-sm transition-all",
              opsTab === "info"
                ? "bg-white/10 border border-white/15 text-purple-200 ring-1 ring-purple-400/25"
                : "bg-white/5 border border-white/10 text-white/65 hover:bg-white/8"
            )}
          >
            Match Info
          </button>
          <button
            type="button"
            onClick={() => setOpsTab("proof")}
            className={cn(
              "flex-1 min-w-[100px] rounded-2xl px-4 py-3 text-sm transition-all",
              opsTab === "proof"
                ? "bg-white/10 border border-white/15 text-purple-200 ring-1 ring-purple-400/25"
                : "bg-white/5 border border-white/10 text-white/65 hover:bg-white/8"
            )}
          >
            Proof & Results
          </button>
        </div>
        <div className="px-4 pb-4">
          {opsTab === "chat" && (
            <div className="mt-2 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Voice Room</div>
                <VoiceChat
                  challengeId={challengeId}
                  currentWallet={currentWallet || ""}
                  challengeStatus={stage === "waiting_for_players" ? "pending_waiting_for_opponent" : stage === "round_in_progress" ? "active" : "completed"}
                  isSpectator={Boolean(currentWallet && !playersList.some((p) => p && p.toLowerCase() === currentWallet.toLowerCase()))}
                  isCreator={Boolean(isCreator)}
                  participants={playersList.filter(Boolean)}
                  spectators={[]}
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Tournament Chat</div>
                <ChatBox
                  challengeId={challengeId}
                  currentWallet={currentWallet || ""}
                  status={stage === "round_in_progress" ? "active" : undefined}
                  playersCount={playersList.length}
                  onAppToast={onAppToast}
                />
              </div>
            </div>
          )}
          {opsTab === "info" && (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/85">Match Info</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Size</div>
                  <div className="text-sm font-semibold text-white/80">{maxPlayers} players</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Game</div>
                  <div className="text-sm font-semibold text-white/80">{challengeGame}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Format</div>
                  <div className="text-sm font-semibold text-white/80">Single elimination</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Platform</div>
                  <div className="text-sm font-semibold text-white/80">{challengePlatform}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Stage</div>
                  <div className="text-sm font-semibold text-white/80">{stage.replace(/_/g, " ")}</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-white/50">
                USDFG is a skill-based competition system. Rewards are released after match results are verified.
              </div>
            </div>
          )}
          {opsTab === "proof" && (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/85">Proof & Results</div>
              {playerMatch && playerMatch.match.status !== "completed" && (playerMatch.match.status === "in-progress" || playerMatch.match.status === "ready") && opponentWallet && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-white/55">Submit your result for this match. Winner advances automatically.</p>
                  {onOpenSubmitResult && (
                    <button
                      type="button"
                      onClick={() => onOpenSubmitResult(playerMatch.match.id, opponentWallet)}
                      className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white border border-white/10 hover:brightness-110 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
                    >
                      {playerMatch.round.roundNumber === bracket.length ? "🏆 Submit Final Result" : "Submit Result"}
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-xs font-semibold text-white/80">Pending</div>
                  <div className="mt-1 text-xs text-white/50">Waiting for completion</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-xs font-semibold text-white/80">Under review</div>
                  <div className="mt-1 text-xs text-white/50">Proof being checked</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-xs font-semibold text-white/80">Released</div>
                  <div className="mt-1 text-xs text-white/50">Reward sent</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pb-4 text-center text-xs text-white/40">
        Stage:{" "}
        <span className="font-semibold text-white">
          {stage === "round_in_progress"
            ? (currentRound === bracket.length ? "Final running" : `Round ${currentRound} running`)
            : stage.replace(/_/g, " ")}
        </span>
        {" · "}USDFG Arena
      </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentBracketView;

