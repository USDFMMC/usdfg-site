import React, { useState, useRef, useCallback } from "react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface StandardChallengeLobbyProps {
  challenge: any;
  currentWallet?: string | null;
  onSubmitResult: (didWin: boolean, proofFile?: File | null) => Promise<void>;
  onClaimPrize: (challenge: any) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  isClaiming?: boolean;
}

const StandardChallengeLobby: React.FC<StandardChallengeLobbyProps> = ({
  challenge,
  currentWallet,
  onSubmitResult,
  onClaimPrize,
  onClose,
  isSubmitting = false,
  isClaiming = false,
}) => {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedResult, setSelectedResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = challenge.status || challenge.rawData?.status || 'pending_waiting_for_opponent';
  const players = challenge.rawData?.players || challenge.players || [];
  const entryFee = challenge.entryFee || challenge.rawData?.entryFee || 0;
  const prizePool = challenge.prizePool || challenge.rawData?.prizePool || (entryFee * 2);
  const game = challenge.game || challenge.rawData?.game || 'USDFG Arena';
  const mode = challenge.mode || challenge.rawData?.mode || 'Head-to-Head';
  const platform = challenge.platform || challenge.rawData?.platform || 'All Platforms';
  const challengeId = challenge.id;

  const handleImageCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setProofImage(null);
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedResult === null) return;
    
    setIsLoading(true);
    try {
      await onSubmitResult(selectedResult, proofFile);
      // Reset form after successful submission
      setShowSubmitForm(false);
      setSelectedResult(null);
      setProofImage(null);
      setProofFile(null);
    } catch (error: any) {
      console.error("❌ Error submitting result:", error);
      alert(error.message || "Failed to submit result. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedResult, proofFile, onSubmitResult]);

  
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
  
  // Check if user won and can claim prize
  const results = challenge.rawData?.results || challenge.results || {};
  const userResult = currentWallet ? results[currentWallet.toLowerCase()] : null;
  const winner = challenge.rawData?.winner || challenge.winner;
  const userWon = currentWallet && winner && winner.toLowerCase() === currentWallet.toLowerCase();
  const canClaimPrize = status === 'completed' && userWon && isParticipant;
  const prizeClaimed = challenge.rawData?.prizeClaimed || challenge.prizeClaimed;
  
  // Get opponent wallet for display
  const opponentWallet = players.length >= 2 && currentWallet 
    ? players.find((p: string) => p?.toLowerCase() !== currentWallet?.toLowerCase())
    : null;


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

      {/* Submit Result Section */}
      {canSubmitResult && !showSubmitForm && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSubmitForm(true);
          }}
          className="relative w-full rounded-lg bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_12px_rgba(255,215,130,0.3)] border border-amber-400/40 cursor-pointer active:scale-[0.98]"
        >
          🏆 Submit Result
        </button>
      )}

      {/* Submit Result Form - Inline in lobby */}
      {canSubmitResult && showSubmitForm && (
        <div className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-gray-900/95 via-amber-900/10 to-gray-900/95 p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              🏆 Submit Result
            </h3>
            <button
              onClick={() => {
                setShowSubmitForm(false);
                setSelectedResult(null);
                setProofImage(null);
                setProofFile(null);
              }}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Result Selection */}
          <div>
            <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-500/20 rounded-lg p-2 mb-3">
              <p className="text-sm font-semibold text-white text-center">
                Did you win this match?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedResult(true)}
                disabled={isLoading || isSubmitting}
                className={`
                  relative overflow-hidden p-3 rounded-lg border transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedResult === true
                      ? "border-green-500/60 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow shadow-green-500/10"
                      : "border-zinc-700/50 bg-zinc-800/60 hover:border-green-500/30 hover:bg-green-500/5"
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <p className="text-sm font-bold text-white">YES</p>
                  <p className="text-xs text-gray-400 mt-0.5">I won</p>
                </div>
                {selectedResult === true && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                onClick={() => setSelectedResult(false)}
                disabled={isLoading || isSubmitting}
                className={`
                  relative overflow-hidden p-3 rounded-lg border transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedResult === false
                      ? "border-red-500/60 bg-gradient-to-br from-red-500/10 to-rose-500/10 shadow shadow-red-500/10"
                      : "border-zinc-700/50 bg-zinc-800/60 hover:border-red-500/30 hover:bg-red-500/5"
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">😔</div>
                  <p className="text-sm font-bold text-white">NO</p>
                  <p className="text-xs text-gray-400 mt-0.5">I lost</p>
                </div>
                {selectedResult === false && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Proof Upload Section */}
          {selectedResult === true && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-300">
                  📸 Upload Proof (Optional)
                </p>
              </div>

              {!proofImage ? (
                <div className="space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all text-xs font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.click();
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-amber-700/90 hover:bg-amber-800 text-white rounded-lg transition-all text-xs font-medium"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-1.5">
                    Screenshot of victory screen or match result
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={proofImage}
                    alt="Proof"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-red-600/90 hover:bg-red-700 rounded-full text-white transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-green-600/90 rounded text-xs text-white flex items-center gap-1">
                    <ImageIcon className="w-2.5 h-2.5" />
                    Proof uploaded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
            <p className="text-xs text-blue-300 text-center">
              ⏰ Your opponent has 2 hours to submit their result
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={selectedResult === null || isLoading || isSubmitting}
            className={`
              w-full py-2 rounded-lg font-semibold text-sm transition-all duration-200 border
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                selectedResult !== null
                  ? "bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white shadow shadow-amber-500/10 border-amber-400/30"
                  : "bg-zinc-700/60 text-gray-400 cursor-not-allowed border-zinc-700/50"
              }
            `}
          >
            {isLoading || isSubmitting ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Result"
            )}
          </button>

          {/* Warning */}
          <p className="text-xs text-gray-500 text-center">
            ⚠️ Results are final and cannot be changed after submission
          </p>
        </div>
      )}

      {/* Prize Claiming Section - Show when challenge is completed and user won */}
      {canClaimPrize && !prizeClaimed && (
        <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-4 space-y-3">
          <div className="text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-lg font-bold text-emerald-200 mb-1">You Won!</h3>
            <p className="text-sm text-emerald-100/80 mb-3">
              Claim your prize of <span className="font-semibold text-white">{prizePool} USDFG</span>
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await onClaimPrize(challenge);
                } catch (error) {
                  console.error('Error claiming prize:', error);
                }
              }}
              disabled={isClaiming}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-4 py-3 font-semibold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Claiming Prize...
                </span>
              ) : (
                '💰 Claim Prize'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Prize Claimed Message */}
      {canClaimPrize && prizeClaimed && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm font-semibold text-emerald-200">
            Prize claimed! Check your wallet for {prizePool} USDFG
          </p>
        </div>
      )}

      {/* Status message when can't submit or claim */}
      {!canSubmitResult && !canClaimPrize && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-gray-400">
            {status !== 'active' && status !== 'completed' && `Status: ${statusDisplay.text}`}
            {status === 'active' && players.length < 2 && 'Waiting for players to join...'}
            {status === 'active' && players.length >= 2 && !currentWallet && 'Connect wallet to submit results'}
            {status === 'active' && players.length >= 2 && currentWallet && !isParticipant && 'Only participants can submit results'}
            {status === 'completed' && !userWon && 'Match completed'}
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
          <ChatBox 
            challengeId={challenge.id} 
            currentWallet={currentWallet || ""} 
            status={status}
            platform={platform}
            playersCount={players.length}
          />
        </div>
      </div>
    </div>
  );
};

export default StandardChallengeLobby;

