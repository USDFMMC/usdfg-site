import React from "react";
import type { TournamentState } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { VoiceChat } from "./VoiceChat";
import { ChatBox } from "./ChatBox";
import { ADMIN_WALLET } from "@/lib/chain/config";

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
}) => {

  if (!tournament || !tournament.bracket?.length) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Bracket will populate once players join.
      </div>
    );
  }

  const { bracket, currentRound, stage } = tournament;

  const findMatchForPlayer = (wallet?: string | null) => {
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
  };

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
  
  // Debug: Log Founder Tournament payout UI visibility
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
  
  // Check if reward can be claimed
  const canClaim = challenge?.canClaim || challenge?.rawData?.canClaim;
  const prizeClaimed = challenge?.prizeClaimed || challenge?.rawData?.prizeClaimed || challenge?.rawData?.prizeClaimedAt || challenge?.payoutTriggered;
  const canClaimPrize = isChampion && isCompleted && canClaim && !prizeClaimed;

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

  const buildParticipantCsv = () => {
    if (founderParticipantReward <= 0 || uniqueParticipants.length === 0) {
      return '';
    }
    const rows = [['wallet', 'amount']];
    uniqueParticipants.forEach((wallet) => {
      rows.push([wallet, founderParticipantReward.toString()]);
    });
    return rows.map((row) => row.join(',')).join('\n');
  };

  const buildWinnerCsv = () => {
    if (!champion || founderWinnerBonus <= 0) {
      return '';
    }
    return `wallet,amount\n${champion},${founderWinnerBonus}`;
  };

  const buildCombinedCsv = () => {
    if (uniqueParticipants.length === 0) {
      return '';
    }
    const rows = [['wallet', 'amount']];
    uniqueParticipants.forEach((wallet) => {
      let amount = founderParticipantReward > 0 ? founderParticipantReward : 0;
      if (champion && wallet.toLowerCase() === champion.toLowerCase()) {
        amount += founderWinnerBonus > 0 ? founderWinnerBonus : 0;
      }
      if (amount > 0) {
        rows.push([wallet, amount.toString()]);
      }
    });
    return rows.map((row) => row.join(',')).join('\n');
  };

  const buildCombinedRecipients = () => {
    if (uniqueParticipants.length === 0) {
      return [];
    }
    return uniqueParticipants
      .map((wallet) => {
        let amount = founderParticipantReward > 0 ? founderParticipantReward : 0;
        if (champion && wallet.toLowerCase() === champion.toLowerCase()) {
          amount += founderWinnerBonus > 0 ? founderWinnerBonus : 0;
        }
        return { wallet, amount };
      })
      .filter((entry) => entry.amount > 0);
  };

  const copyCsv = async (csv: string, label: string) => {
    if (!csv) {
      alert('No payout data available yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      alert(`${label} copied to clipboard.`);
    } catch {
      window.prompt(`Copy ${label} below:`, csv);
    }
  };

  return (
    <div className="space-y-4">
      {isCompleted && champion && (
        <div className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-6 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-lg font-bold text-amber-200 mb-1">
            Tournament Complete!
          </div>
          <div className="text-sm text-amber-100/90 mb-3">
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
        <div className="rounded-xl border border-purple-400/40 bg-purple-500/10 p-4 text-sm text-purple-100">
          <div className="text-xs uppercase tracking-widest text-purple-300">
            Founder Tournament Payouts
          </div>
          <div className="mt-2 text-xs text-purple-100/80">
            Participants: {uniqueParticipants.length} · Participant Reward: {founderParticipantReward} USDFG · Winner Bonus: {founderWinnerBonus} USDFG
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => copyCsv(buildCombinedCsv(), 'Combined payout CSV')}
              className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30"
            >
              Copy Combined CSV
            </button>
            {founderParticipantReward > 0 && (
              <button
                onClick={() => copyCsv(buildParticipantCsv(), 'Participant CSV')}
                className="rounded-lg border border-purple-300/40 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/30"
              >
                Copy Participant CSV
              </button>
            )}
            {founderWinnerBonus > 0 && champion && (
              <button
                onClick={() => copyCsv(buildWinnerCsv(), 'Winner bonus CSV')}
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
                {isAirdropping ? 'Sending Airdrop...' : 'Send Airdrop Now'}
              </button>
            )}
          </div>
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

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 overflow-x-auto min-w-0">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${bracket.length}, minmax(250px, 1fr))`,
              minWidth: `${bracket.length * 250}px`,
            }}
          >
        {bracket.map((round) => (
          <div key={round.roundNumber} className="space-y-4">
            <div
              className={cn(
                "text-center text-xs font-semibold uppercase tracking-widest",
                round.roundNumber === currentRound
                  ? "text-amber-300"
                  : "text-gray-400"
              )}
            >
              {round.roundNumber === bracket.length
                ? "Final"
                : `Round ${round.roundNumber}`}
            </div>

            <div className="space-y-3">
              {round.matches.map((match) => {
                const youAreInMatch =
                  (currentWallet &&
                    (match.player1?.toLowerCase() ===
                      currentWallet.toLowerCase() ||
                      match.player2?.toLowerCase() ===
                        currentWallet.toLowerCase())) ||
                  false;

                const matchStatus =
                  match.status === "completed"
                    ? "Completed"
                    : match.status === "in-progress"
                    ? "In progress"
                    : match.status === "ready"
                    ? "Ready"
                    : "Waiting";

                const renderSlot = (slot?: string) => {
                  if (!slot) {
                    return (
                      <div className="flex h-8 items-center justify-between rounded-lg border border-dashed border-white/10 px-3 text-xs text-gray-400">
                        <span>Waiting...</span>
                      </div>
                    );
                  }

                  const isCurrent = currentWallet
                    ? slot.toLowerCase() === currentWallet.toLowerCase()
                    : false;
                  return (
                    <div
                      className={cn(
                        "flex h-8 items-center justify-between rounded-lg border px-3 text-xs font-semibold",
                        isCurrent
                          ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                          : "border-white/10 bg-white/5 text-white",
                        onPlayerClick && "cursor-pointer hover:bg-white/10 transition-colors"
                      )}
                      onClick={() => {
                        if (onPlayerClick) {
                          onPlayerClick(slot);
                        }
                      }}
                    >
                      <span className="truncate">{`${slot.slice(
                        0,
                        4
                      )}...${slot.slice(-4)}`}</span>
                    </div>
                  );
                };

                const isChampionMatch =
                  round.roundNumber === bracket.length &&
                  match.status === "completed" &&
                  match.winner;

                return (
                  <div
                    key={match.id}
                    className={cn(
                      "rounded-xl border bg-black/40 p-3 backdrop-blur-sm",
                      youAreInMatch ? "border-amber-400/40" : "border-white/5"
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400">
                      <span>
                        Match {match.id.replace("r", "").replace("-", "")}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          match.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                            : match.status === "in-progress"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-400/30"
                            : "bg-white/5 text-gray-300 border border-white/10"
                        )}
                      >
                        {matchStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {renderSlot(match.player1)}
                      {renderSlot(match.player2)}
                    </div>

                    {match.winner && (
                      <div 
                        className={cn(
                          "mt-3 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300",
                          onPlayerClick && "cursor-pointer hover:bg-emerald-500/20 transition-colors"
                        )}
                        onClick={() => {
                          if (onPlayerClick) {
                            onPlayerClick(match.winner!);
                          }
                        }}
                      >
                        Winner:{" "}
                        <span className="font-semibold">
                          {`${match.winner.slice(0, 4)}...${match.winner.slice(
                            -4
                          )}`}
                        </span>
                      </div>
                    )}

                    {isChampionMatch && (
                      <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-center text-[11px] font-semibold text-amber-200">
                        🏆 Champion
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
        </div>

        <div className="w-full lg:max-w-xs space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
              Voice Room
            </div>
            <VoiceChat challengeId={challengeId} currentWallet={currentWallet || ""} />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
              Match Chat
            </div>
            <ChatBox 
              challengeId={challengeId} 
              currentWallet={currentWallet || ""} 
              status={stage === 'round_in_progress' ? 'active' : undefined}
              playersCount={players.length}
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Stage:{" "}
        <span className="font-semibold text-white">
          {stage === "round_in_progress"
            ? (() => {
                // Check if we're in the final round by comparing currentRound to bracket length
                // For 4 players: Round 1 (roundNumber=1), Final (roundNumber=2), bracket.length=2
                const isFinalRound = currentRound === bracket.length;
                // Also check if any match in the last round is active
                const finalRound = bracket[bracket.length - 1];
                const hasActiveFinalMatch = finalRound?.matches.some(m => 
                  m.status === 'in-progress' || m.status === 'ready'
                );
                return isFinalRound || hasActiveFinalMatch
                  ? "Final running"
                  : `Round ${currentRound} running`;
              })()
            : stage.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
};

export default TournamentBracketView;

