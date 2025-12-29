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
        return { text: 'Waiting for opponent', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20', textClass: 'text-blue-300', icon: '⏳' };
      case 'creator_confirmation_required':
        return { text: 'Creator confirmation required', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20', textClass: 'text-amber-300', icon: '⚠️' };
      case 'creator_funded':
        return { text: 'Creator funded - waiting for joiner', bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-300', icon: '💰' };
      case 'active':
        return { text: 'Match in progress', bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-300', icon: '🎮' };
      case 'completed':
        return { text: 'Match completed', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20', textClass: 'text-emerald-300', icon: '🏆' };
      case 'cancelled':
        return { text: 'Challenge cancelled', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/20', textClass: 'text-red-300', icon: '❌' };
      default:
        return { text: status, bgClass: 'bg-gray-500/10', borderClass: 'border-gray-500/20', textClass: 'text-gray-300', icon: '📋' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const canSubmitResult = status === 'active' && players.length >= 2 && currentWallet && players.some((p: string) => p?.toLowerCase() === currentWallet?.toLowerCase());

  return (
    <div className="space-y-4">
      {/* Challenge Header */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{challenge.title || `${game} ${mode}`}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{game}</span>
              <span>•</span>
              <span>{mode}</span>
              <span>•</span>
              <span>{platform}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Close lobby"
          >
            ✕
          </button>
        </div>

        {/* Status Card */}
        <div className={`rounded-lg border p-3 mb-3 ${statusDisplay.bgClass} ${statusDisplay.borderClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusDisplay.icon}</span>
            <span className={`text-sm font-semibold ${statusDisplay.textClass}`}>
              {statusDisplay.text}
            </span>
          </div>
        </div>

        {/* Challenge Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Entry Fee:</span>
            <span className="text-white font-semibold ml-2">{entryFee} USDFG</span>
          </div>
          <div>
            <span className="text-gray-400">Prize Pool:</span>
            <span className="text-white font-semibold ml-2">{prizePool} USDFG</span>
          </div>
          <div>
            <span className="text-gray-400">Players:</span>
            <span className="text-white font-semibold ml-2">{players.length}/2</span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className="text-white font-semibold ml-2">{status}</span>
          </div>
        </div>
      </div>

      {/* Submit Result Button - Only show when match is active and user is a participant */}
      {canSubmitResult && (
        <button
          onClick={onOpenSubmitResult}
          className="w-full rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-3 font-semibold transition-all shadow-[0_0_20px_rgba(255,215,130,0.3)] border border-amber-400/30"
        >
          🏆 Submit Result
        </button>
      )}

      {/* Chat and Voice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Voice Room
          </div>
          <VoiceChat challengeId={challenge.id} currentWallet={currentWallet || ""} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
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

