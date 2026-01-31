import React, { useState } from "react";
import type { TournamentState } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { VoiceChat } from "./VoiceChat";
import { ChatBox } from "./ChatBox";
import { ADMIN_WALLET } from "@/lib/chain/config";

/** Inner component for payout buttons to avoid TDZ / closure order issues in minified build */
function FounderPayoutButtons({
  uniqueParticipants,
  founderParticipantReward,
  founderWinnerBonus,
  champion,
  challenge,
  onAirdropPayouts,
  isAirdropping,
}: {
  uniqueParticipants: string[];
  founderParticipantReward: number;
  founderWinnerBonus: number;
  champion: string | undefined;
  challenge: any;
  onAirdropPayouts?: (recipients: { wallet: string; amount: number }[], challenge: any) => Promise<void>;
  isAirdropping?: boolean;
}) {
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
      alert("No payout data available yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      alert(`${label} copied to clipboard.`);
    } catch {
      window.prompt(`Copy ${label} below:`, csv);
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
}: TournamentBracketViewProps) => {

  if (!tournament || !tournament.bracket?.length) {
    return (
      <div className="min-h-screen bg-[#070a0f] text-white">
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
    
    // Debug: Log bracket structure with full details
    console.log('🔍 Searching for match:', {
      wallet: wallet.slice(0, 8),
      walletFull: wallet,
      walletLower: lower,
      currentRound,
      bracketRounds: bracket.map(r => ({
        roundNumber: r.roundNumber,
        matches: r.matches.map(m => ({
          id: m.id,
          player1: m.player1,
          player2: m.player2,
          player1Lower: m.player1?.toLowerCase(),
          player2Lower: m.player2?.toLowerCase(),
          status: m.status,
          player1Result: m.player1Result,
          player2Result: m.player2Result,
          winner: m.winner
        }))
      }))
    });
    
    // First, try to find match in the current round (active match)
    const currentRoundData = bracket.find(r => r.roundNumber === currentRound);
    if (currentRoundData) {
      console.log(`🔍 Checking currentRound ${currentRound}:`, currentRoundData.matches.length, 'matches');
      for (const match of currentRoundData.matches) {
        const isPlayer1 = match.player1?.toLowerCase() === lower;
        const isPlayer2 = match.player2?.toLowerCase() === lower;
        if ((isPlayer1 || isPlayer2) && match.status !== 'completed') {
          console.log('✅ Found match in currentRound:', match.id);
          return { round: currentRoundData, match };
        }
      }
    }
    
    // If no active match in current round, find any non-completed match
    console.log('🔍 Searching all rounds for match...');
    for (const round of bracket) {
      for (const match of round.matches) {
        const isPlayer1 = match.player1?.toLowerCase() === lower;
        const isPlayer2 = match.player2?.toLowerCase() === lower;
        console.log(`  Checking round ${round.roundNumber} match ${match.id}:`, {
          player1: match.player1?.slice(0, 8),
          player2: match.player2?.slice(0, 8),
          isPlayer1,
          isPlayer2,
          status: match.status,
          matches: isPlayer1 || isPlayer2
        });
        // CRITICAL: Treat "ready" status as "in-progress" for final round matches with both players
        // This allows submit button to show even if backend hasn't updated status yet
        const effectiveStatus = (round.roundNumber === bracket.length && 
                                 match.player1 && match.player2 && 
                                 match.status === 'ready') ? 'in-progress' : match.status;
        
        if ((isPlayer1 || isPlayer2) && effectiveStatus !== 'completed') {
          console.log(`✅ Found match in round ${round.roundNumber}:`, match.id, `(effective status: ${effectiveStatus})`);
          // Return match with effective status for UI purposes
          return { round, match: { ...match, status: effectiveStatus as any } };
        }
        if (isPlayer1 || isPlayer2) {
          console.log(`⚠️ Match found but status is 'completed':`, match.id, match.status);
        }
      }
    }
    
    console.log('❌ No match found for player');
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

  const maxPlayers = tournament.maxPlayers || players.length;
  const currentPlayers = players.length;
  const isWaitingForPlayers = stage === 'waiting_for_players';
  const isCompleted = stage === 'completed';
  const champion = tournament.champion;

  // Debug logging (after all variables are declared)
  if (playerMatch) {
    console.log('🔍 Tournament Match Debug:', {
      roundNumber: playerMatch.round.roundNumber,
      matchId: playerMatch.match.id,
      status: playerMatch.match.status,
      player1: playerMatch.match.player1,
      player2: playerMatch.match.player2,
      player1Result: playerMatch.match.player1Result,
      player2Result: playerMatch.match.player2Result,
      winner: playerMatch.match.winner,
      currentWallet,
      opponentWallet,
      isFinal: playerMatch.round.roundNumber === bracket.length,
      bracketLength: bracket.length,
      currentRound,
      currentPlayerResult,
      opponentResult,
      opponentSubmitted,
      stage,
      isCompleted,
      champion,
      canShowSubmitButton: playerMatch.match.status !== 'completed' && 
                           (playerMatch.match.status === 'in-progress' || playerMatch.match.status === 'ready') &&
                           opponentWallet
    });
  } else {
    console.log('🔍 No active match found for player:', {
      currentWallet,
      currentRound,
      bracketLength: bracket.length,
      stage,
      isCompleted,
      champion
    });
  }
  const isChampion = currentWallet && champion && currentWallet.toLowerCase() === champion.toLowerCase();
  
  // Debug: Log tournament completion state
  if (isCompleted || champion) {
    console.log('🏆 Tournament completion state:', {
      isCompleted,
      champion: champion?.slice(0, 8),
      currentWallet: currentWallet?.slice(0, 8),
      isChampion,
      stage,
      canClaim: challenge?.canClaim || challenge?.rawData?.canClaim
    });
  }
  
  // Check if reward can be claimed (base; founder logic applied after isFounderTournament)
  const canClaim = challenge?.canClaim || challenge?.rawData?.canClaim;
  const prizeClaimedBase = challenge?.prizeClaimed || challenge?.rawData?.prizeClaimed || challenge?.rawData?.prizeClaimedAt || challenge?.payoutTriggered;
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
  const nonCreatorPlayers = players.filter((wallet) => {
    if (!wallet || !creatorWallet) return Boolean(wallet);
    return wallet.toLowerCase() !== creatorWallet.toLowerCase();
  });
  const canCancelTournament =
    Boolean(isCreator) && isWaitingForPlayers && nonCreatorPlayers.length === 0;

  const uniqueParticipants = (() => {
    const map = new Map<string, string>();
    players.forEach((wallet) => {
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

  // Debug: Log Founder Tournament payout UI visibility (moved after all variable declarations)
  if (isCompleted && isFounderTournament) {
    console.log('🔍 Founder Tournament Payout UI Check:', {
      isCompleted,
      isFounderTournament,
      isAdminViewer,
      stage,
      champion: champion?.slice(0, 8),
      founderParticipantReward,
      founderWinnerBonus,
      uniqueParticipantsCount: uniqueParticipants.length,
      onAirdropPayouts: !!onAirdropPayouts,
      currentWallet: currentWallet?.slice(0, 8),
      adminWallet: ADMIN_WALLET.toString().slice(0, 8),
      willShowPayoutUI: isCompleted && isFounderTournament && isAdminViewer
    });
  }

  function slotLabel(wallet?: string) {
    if (!wallet) return "Open";
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }
  function slotInitials(wallet: string) {
    return (wallet || "??").slice(0, 2).toUpperCase();
  }

  return (
    <div className="min-h-screen bg-[#070a0f] text-white">
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
        <div className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 lg:p-5 text-center">
          <div className="text-3xl lg:text-4xl mb-1.5">🏆</div>
          <div className="text-base lg:text-lg font-bold text-amber-200 mb-1">
            Tournament Complete!
          </div>
          <div className="text-xs lg:text-sm text-amber-100/90 mb-2 lg:mb-3">
            Champion:{" "}
            <span 
              className={cn(
                "font-semibold text-white",
                onPlayerClick && "cursor-pointer hover:text-amber-200 underline transition-colors"
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
                          alert(error.message || 'Failed to claim reward');
                        }
                      }
                    }}
                    disabled={isClaiming}
                    className="w-full rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/30 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
          />
        </div>
      )}

      {isWaitingForPlayers && (
        <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
          <div className="text-xs uppercase tracking-widest text-blue-300">
            Waiting for players
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {currentPlayers} / {maxPlayers} players joined
          </div>
          <p className="mt-1 text-xs text-blue-100/80">
            The tournament will start automatically when all {maxPlayers} players join. Share the challenge link to invite others!
          </p>
          {onJoinTournament && currentWallet && currentPlayers < maxPlayers && !players.some(p => p && p.toLowerCase() === currentWallet.toLowerCase()) && (
            <button
              onClick={async () => {
                try {
                  await onJoinTournament(challengeId);
                } catch (error: any) {
                  alert(error.message || 'Failed to join tournament');
                }
              }}
              className="mt-3 w-full rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 transition-all hover:bg-blue-500/30 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/40"
            >
              Join Tournament
            </button>
          )}
          {canCancelTournament && onCancelChallenge && challenge && (
            <button
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
                  return;
                }
                try {
                  await onCancelChallenge(challenge);
                } catch (error: any) {
                  alert(error.message || 'Failed to delete tournament');
                }
              }}
              className="mt-3 w-full rounded-lg bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-200 transition-all hover:bg-red-600/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)] border border-red-500/40"
            >
              🗑️ Delete Tournament
            </button>
          )}
        </div>
      )}

      {playerMatch && 
       playerMatch.match.status !== 'completed' &&
       (playerMatch.match.status === 'in-progress' || playerMatch.match.status === 'ready') &&
       opponentWallet && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="text-xs uppercase tracking-widest text-amber-300">
            {playerMatch.round.roundNumber === bracket.length ? '🏆 FINAL MATCH' : "You're locked in"}
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {playerMatch.round.roundNumber === bracket.length ? 'Final' : `Round ${playerMatch.round.roundNumber}`}:{" "}
            {opponentWallet ? (
              <span
                className={cn(
                  onPlayerClick && "cursor-pointer hover:text-amber-200 underline transition-colors"
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
          <p className="mt-1 text-xs text-amber-100/80">
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
                    <div className="w-full rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 border border-blue-400/40 text-center">
                      ✅ Result submitted. {opponentSubmitted ? 'Waiting for bracket update...' : 'Waiting for opponent...'}
                    </div>
                    {canEditResult && onOpenSubmitResult && (
                      <button
                        onClick={() => onOpenSubmitResult(playerMatch.match.id, opponentWallet)}
                        className="w-full rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_12px_rgba(255,215,130,0.3)] border border-amber-400/40"
                      >
                        Update Result
                      </button>
                    )}
                    {canEditResult && (
                      <div className="text-[10px] text-amber-100/70 text-center">
                        You can update until your opponent submits.
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <button
                  onClick={() => {
                    console.log('🎯 Submit button clicked:', {
                      matchId: playerMatch.match.id,
                      opponentWallet,
                      roundNumber: playerMatch.round.roundNumber
                    });
                    onOpenSubmitResult(playerMatch.match.id, opponentWallet);
                  }}
                  className="mt-3 w-full rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_12px_rgba(255,215,130,0.3)] border border-amber-400/40"
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

      {/* Live bracket stage: round columns + USDFG FINAL pennant */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="p-4 sm:p-6">
          <div className="relative grid w-full gap-3 lg:gap-4" style={{ gridTemplateColumns: `repeat(${bracket.length}, minmax(0, 1fr)) 200px` }}>
            {bracket.map((round) => {
              const isFinal = round.roundNumber === bracket.length;
              const tone = round.roundNumber === 1 ? "opacity-70" : round.roundNumber === bracket.length - 1 ? "opacity-90" : "opacity-85";
              return (
                <div key={round.roundNumber} className={cn("relative", tone)}>
                  <div className={cn(
                    "mb-2 text-center text-[11px] tracking-widest",
                    round.roundNumber === currentRound ? "text-amber-300" : "text-white/55"
                  )}>
                    {isFinal ? "FINAL" : `R${round.roundNumber}`}
                  </div>
                  <div className="space-y-2">
                    {round.matches.map((match) => {
                      const youAreInMatch = currentWallet && (
                        match.player1?.toLowerCase() === currentWallet.toLowerCase() ||
                        match.player2?.toLowerCase() === currentWallet.toLowerCase()
                      );
                      const matchStatus = match.status === "completed" ? "Completed" : match.status === "in-progress" ? "In progress" : match.status === "ready" ? "Ready" : "Open";
                      const active = selectedMatchId === match.id;
                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => setSelectedMatchId(match.id)}
                          className={cn(
                            "group w-full rounded-xl border text-left transition-all duration-200",
                            active
                              ? "border-cyan-300/50 bg-white/12 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                              : youAreInMatch ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/6 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between px-2.5 py-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={cn(
                                "h-7 w-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold",
                                active ? "border-cyan-300/50 bg-white/10 text-cyan-200" : "border-white/10 bg-white/6 text-white/70"
                              )}>
                                {match.player1 ? slotInitials(match.player1) : "—"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-white/80 truncate">{slotLabel(match.player1)}</div>
                                <div className="text-[10px] text-white/40">{match.player1 ? "v" : "Tap to claim"}</div>
                              </div>
                            </div>
                            <span className="text-[10px] text-white/35 shrink-0">{matchStatus}</span>
                          </div>
                          <div className="flex items-center justify-between px-2.5 pb-2 pt-0 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={cn(
                                "h-7 w-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold",
                                active ? "border-cyan-300/50 bg-white/10 text-cyan-200" : "border-white/10 bg-white/6 text-white/70"
                              )}>
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
                              className={cn(
                                "mx-2 mb-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300",
                                onPlayerClick && "cursor-pointer hover:bg-emerald-500/20"
                              )}
                              onClick={(e) => { e.stopPropagation(); if (onPlayerClick) onPlayerClick(match.winner!); }}
                            >
                              Winner: {slotLabel(match.winner)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* USDFG FINAL pennant */}
            <div className="relative">
              <div className="mb-2 text-center text-[11px] tracking-widest text-white/55">USDFG</div>
              <div className="absolute left-1/2 top-10 -translate-x-1/2 h-[320px] w-[200px] rounded-[36px] bg-[radial-gradient(60%_55%_at_50%_20%,rgba(34,211,238,0.20),rgba(255,255,255,0.06),transparent)] blur-[2px]" />
              <div className="relative mx-auto w-[200px] rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
                <div className="px-4 pt-5 pb-4 text-center">
                  <div className="text-lg font-semibold text-white/90">{challengeTitle}</div>
                  <div className="mt-1 text-xs text-white/55">USDFG Arena · Cup window</div>
                  <div className="mt-1 text-base font-semibold text-cyan-200">
                    {stage === "round_in_progress" ? "Live" : stage.replace(/_/g, " ")}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-8 rounded-lg border border-white/10 bg-white/6 flex items-center justify-center text-[10px] text-white/60">{maxPlayers} players</div>
                    <div className="h-8 rounded-lg border border-white/10 bg-white/6 flex items-center justify-center text-[10px] text-white/60">Single elim</div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/6 flex items-center justify-center text-2xl">🏆</div>
                  </div>
                </div>
                <div className="h-6" />
              </div>
            </div>
          </div>

          {/* Selected matchup strip */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.75)]" />
              </div>
              <div>
                <div className="text-sm text-white/80">Selected Match</div>
                <div className="text-base font-semibold">
                  {selectedMatch
                    ? `${selectedMatch.round.roundNumber === bracket.length ? "FINAL" : `R${selectedMatch.round.roundNumber}`}-${selectedMatch.match.id.replace("r", "").replace("-", "")}`
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
              <div className="rounded-xl border border-white/10 bg-white/6 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-white/45">Stage</div>
                <div className="text-xs font-semibold text-white/80">
                  {stage === "round_in_progress" ? (currentRound === bracket.length ? "Final" : `Round ${currentRound}`) : stage.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ops panel: Lobby Chat | Match Info | Proof & Results */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-[#0b1220]/70 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap gap-2 p-2">
          <button
            type="button"
            onClick={() => setOpsTab("chat")}
            className={cn(
              "flex-1 min-w-[100px] rounded-2xl px-4 py-3 text-sm transition-all",
              opsTab === "chat"
                ? "bg-white/10 border border-white/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
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
                ? "bg-white/10 border border-white/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
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
                ? "bg-white/10 border border-white/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
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
                <VoiceChat challengeId={challengeId} currentWallet={currentWallet || ""} />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Tournament Chat</div>
                <ChatBox challengeId={challengeId} currentWallet={currentWallet || ""} status={stage === "round_in_progress" ? "active" : undefined} playersCount={players.length} />
              </div>
            </div>
          )}
          {opsTab === "info" && (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/85">Match Info</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#070a0f]/35 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Game</div>
                  <div className="text-sm font-semibold text-white/80">{challengeGame}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#070a0f]/35 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Format</div>
                  <div className="text-sm font-semibold text-white/80">Single elimination</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#070a0f]/35 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Platform</div>
                  <div className="text-sm font-semibold text-white/80">{challengePlatform}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#070a0f]/35 px-3 py-2">
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
                      className="w-full rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 border border-amber-400/40 hover:bg-amber-400/30"
                    >
                      {playerMatch.round.roundNumber === bracket.length ? "🏆 Submit Final Result" : "Submit Result"}
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#070a0f]/35 p-3">
                  <div className="text-xs font-semibold text-white/80">Pending</div>
                  <div className="mt-1 text-xs text-white/50">Waiting for completion</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070a0f]/35 p-3">
                  <div className="text-xs font-semibold text-white/80">Under review</div>
                  <div className="mt-1 text-xs text-white/50">Proof being checked</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070a0f]/35 p-3">
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

