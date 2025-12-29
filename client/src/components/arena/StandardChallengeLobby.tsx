import React from "react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";

interface StandardChallengeLobbyProps {
  challenge: any;
  currentWallet?: string | null;
  onOpenSubmitResult: () => void;
  onClose: () => void;
}

const StandardChallengeLobby: React.FC<StandardChallengeLobbyProps> = ({
  challenge,
  currentWallet,
  onOpenSubmitResult,
  onClose,
}) => {
  const status = challenge.status || challenge.rawData?.status || 'pending_waiting_for_opponent';
  const players = challenge.rawData?.players || challenge.players || [];
  const entryFee = challenge.entryFee || challenge.rawData?.entryFee || 0;
  const prizePool = challenge.prizePool || challenge.rawData?.prizePool || (entryFee * 2);
  const game = challenge.game || challenge.rawData?.game || 'USDFG Arena';
  const mode = challenge.mode || challenge.rawData?.mode || 'Head-to-Head';
  const platform = challenge.platform || challenge.rawData?.platform || 'All Platforms';
  
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending_waiting_for_opponent':
        return { 
          text: 'Waiting for opponent', 
          bgClass: 'bg-blue-500/10', 
          borderClass: 'border-blue-400/30', 
          textClass: 'text-blue-100',
          headerClass: 'text-blue-300',
          icon: '⏳' 
        };
      case 'creator_confirmation_required':
        return { 
          text: 'Creator confirmation required', 
          bgClass: 'bg-amber-500/10', 
          borderClass: 'border-amber-400/30', 
          textClass: 'text-amber-100',
          headerClass: 'text-amber-300',
          icon: '⚠️' 
        };
      case 'creator_funded':
        return { 
          text: 'Creator funded - waiting for joiner', 
          bgClass: 'bg-green-500/10', 
          borderClass: 'border-green-400/30', 
          textClass: 'text-green-100',
          headerClass: 'text-green-300',
          icon: '💰' 
        };
      case 'active':
        return { 
          text: 'Match in progress', 
          bgClass: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20', 
          borderClass: 'border-green-400/40', 
          textClass: 'text-green-100',
          headerClass: 'text-green-300',
          icon: '🎮' 
        };
      case 'completed':
        return { 
          text: 'Match completed', 
          bgClass: 'bg-gradient-to-r from-emerald-500/20 to-amber-500/20', 
          borderClass: 'border-emerald-400/50', 
          textClass: 'text-emerald-100',
          headerClass: 'text-emerald-300',
          icon: '🏆' 
        };
      case 'cancelled':
        return { 
          text: 'Challenge cancelled', 
          bgClass: 'bg-red-500/10', 
          borderClass: 'border-red-400/30', 
          textClass: 'text-red-100',
          headerClass: 'text-red-300',
          icon: '❌' 
        };
      default:
        return { 
          text: status, 
          bgClass: 'bg-gray-500/10', 
          borderClass: 'border-gray-400/30', 
          textClass: 'text-gray-100',
          headerClass: 'text-gray-300',
          icon: '📋' 
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const isParticipant = currentWallet && players.some((p: string) => p?.toLowerCase() === currentWallet?.toLowerCase());
  const canSubmitResult = status === 'active' && players.length >= 2 && isParticipant;
  
  // Get opponent wallet for display
  const opponentWallet = players.length >= 2 && currentWallet 
    ? players.find((p: string) => p?.toLowerCase() !== currentWallet?.toLowerCase())
    : null;

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 StandardChallengeLobby Submit Button Debug:', {
      status,
      playersCount: players.length,
      players: players,
      currentWallet,
      isParticipant,
      canSubmitResult,
      onOpenSubmitResult: typeof onOpenSubmitResult === 'function' ? '✅ Function exists' : '❌ Missing'
    });
  }, [status, players, currentWallet, isParticipant, canSubmitResult, onOpenSubmitResult]);

  return (
    <div className="space-y-4">
      {/* Status Banner - Prominent display */}
      {status === 'active' && isParticipant && opponentWallet && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="text-xs uppercase tracking-widest text-amber-300 mb-2">
            🎮 You're locked in
          </div>
          <div className="text-base font-semibold text-white mb-1">
            Head-to-Head: {opponentWallet ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Waiting for opponent'}
          </div>
          <p className="text-xs text-amber-100/80 mt-1">
            Chat with your opponent and start the match. Submit results once you finish—winner takes the prize pool.
          </p>
        </div>
      )}

      {/* Challenge Header Card */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white mb-1 truncate">
              {challenge.title || `${game} ${mode}`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
              <span>{game}</span>
              <span>•</span>
              <span>{mode}</span>
              <span>•</span>
              <span>{platform}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded"
            title="Close lobby"
          >
            ✕
          </button>
        </div>

        {/* Status Card - Enhanced styling */}
        <div className={`rounded-lg border p-3 mb-4 ${statusDisplay.bgClass} ${statusDisplay.borderClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{statusDisplay.icon}</span>
            <div className="flex-1">
              <div className={`text-xs uppercase tracking-widest ${statusDisplay.headerClass} mb-0.5`}>
                Status
              </div>
              <div className={`text-sm font-semibold ${statusDisplay.textClass}`}>
                {statusDisplay.text}
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Entry Fee</div>
            <div className="text-white font-semibold">{entryFee} USDFG</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Prize Pool</div>
            <div className="text-white font-semibold">{prizePool} USDFG</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Players</div>
            <div className="text-white font-semibold">{players.length}/2</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Format</div>
            <div className="text-white font-semibold">Standard</div>
          </div>
        </div>
      </div>

      {/* Submit Result Button - Enhanced styling */}
      {canSubmitResult ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏆 Submit Result button clicked', {
              canSubmitResult,
              onOpenSubmitResult: typeof onOpenSubmitResult === 'function' ? '✅ Function exists' : '❌ Missing',
              challengeId: challenge.id,
              status,
              players
            });
            if (typeof onOpenSubmitResult === 'function') {
              try {
                onOpenSubmitResult();
                console.log('✅ onOpenSubmitResult called successfully');
              } catch (error) {
                console.error('❌ Error calling onOpenSubmitResult:', error);
              }
            } else {
              console.error('❌ onOpenSubmitResult is not a function!', onOpenSubmitResult);
            }
          }}
          className="relative w-full rounded-lg bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_12px_rgba(255,215,130,0.3)] border border-amber-400/40 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: 'auto', zIndex: 50 }}
          disabled={!canSubmitResult}
        >
          🏆 Submit Result
        </button>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-gray-400">
            {status !== 'active' && `Status: ${statusDisplay.text}`}
            {status === 'active' && players.length < 2 && 'Waiting for players to join...'}
            {status === 'active' && players.length >= 2 && !currentWallet && 'Connect wallet to submit results'}
            {status === 'active' && players.length >= 2 && currentWallet && !isParticipant && 'Only participants can submit results'}
          </div>
        </div>
      )}

      {/* Chat and Voice - Side by side layout */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex-1 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Voice Room
          </div>
          <VoiceChat challengeId={challenge.id} currentWallet={currentWallet || ""} />
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Match Chat
          </div>
          <ChatBox challengeId={challenge.id} currentWallet={currentWallet || ""} />
        </div>
      </div>
    </div>
  );
};

export default StandardChallengeLobby;

