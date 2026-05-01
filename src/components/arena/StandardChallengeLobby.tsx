import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { getPlayerStats, fetchChallengeById, resolveAdminChallenge, triggerChallengeDispute, approveMicRequest, denyMicRequest, approveMicRequestReplace, MAX_VOICE_SPEAKERS, writeChallengeFields, walletsEqual, canonicalPlayerKey } from "@/lib/firebase/firestore";
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, serverTimestamp, Timestamp, getDocs, getDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ADMIN_WALLET } from "@/lib/chain/config";
import type { AppConfirmDialogOptions } from "@/components/ui/AppConfirmModal";
import { 
  getChallengeStatus, 
  getChallengePendingJoiner,
  getChallengeCreator,
  isChallengeCreator,
  getChallengeEntryFee,
  getChallengeChallenger,
  isChallengeChallenger,
  getCreatorFundingDeadline,
  isCreatorFundingDeadlineExpired,
  isChallengeRewardClaimed
} from "@/lib/utils/challenge-helpers";
import { TrustBadge } from "@/lib/utils/trustDisplay";

interface StandardChallengeLobbyProps {
  challenge: any;
  currentWallet?: string | null;
  onSubmitResult: (didWin: boolean, proofFile?: File | null) => Promise<void>;
  onClaimPrize: (challenge: any) => Promise<void>;
  onJoinChallenge?: (challenge: any) => Promise<void>;
  onCreatorFund?: (challenge: any) => Promise<void>;
  onJoinerFund?: (challenge: any) => Promise<void>;
  onCancelChallenge?: (challenge: any) => Promise<void>;
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
  requestAppConfirm?: (opts: AppConfirmDialogOptions) => Promise<boolean>;
  onUpdateEntryFee?: (challenge: any, entryFee: number) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  isClaiming?: boolean;
  isCreatorFunding?: boolean;
  isJoinerFunding?: boolean;
  onPlayerClick?: (wallet: string) => void; // Callback when player wallet is clicked
}

const MAX_SPECTATORS = 69;

// Creator Mute Controls Components
const MuteAllSpectatorsButton: React.FC<{
  challengeId: string;
  spectators: string[];
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
}> = ({ challengeId, spectators, onAppToast }) => {
  const [isMuting, setIsMuting] = useState(false);
  
  const handleMuteAll = async () => {
    if (isMuting) return;
    setIsMuting(true);
    
    try {
      // Mute all spectators by creating mute documents
      const mutePromises = spectators.map((wallet) => {
        const muteRef = doc(db, 'challenge_lobbies', challengeId, 'voice_controls', wallet);
        return setDoc(muteRef, {
          muted: true,
          mutedBy: 'creator',
          mutedAt: serverTimestamp(),
        });
      });
      
      await Promise.all(mutePromises);
    } catch (error: any) {
      console.error('Failed to mute all spectators:', error);
      const errorMsg = error.message || error.toString() || 'Unknown error';
      const errorCode = error.code || 'unknown';
      
      // Provide more specific error messages
      if (errorCode === "permission-denied") {
        onAppToast?.(
          "You may not have permission to mute spectators. Please refresh and try again.",
          "error",
          "Permission denied"
        );
      } else if (errorCode === "unavailable") {
        onAppToast?.("Firestore is temporarily unavailable. Please check your connection and try again.", "warning", "Unavailable");
      } else {
        onAppToast?.(`Failed to mute all spectators: ${errorMsg}. Please try again.`, "error", "Mute failed");
      }
    } finally {
      setIsMuting(false);
    }
  };
  
  return (
    <button
      type="button"
      onClick={handleMuteAll}
      disabled={isMuting || spectators.length === 0}
      className="w-full px-2 py-1.5 rounded-md bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-[10px] font-semibold transition-all disabled:opacity-50"
    >
      {isMuting ? 'Muting...' : `🔇 Mute All Spectators (${spectators.length})`}
    </button>
  );
};

const MuteParticipantButton: React.FC<{
  challengeId: string;
  wallet: string;
  displayName: string;
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
}> = ({ challengeId, wallet, displayName, onAppToast }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Check current mute status
  useEffect(() => {
    if (!challengeId || !wallet) return;
    
    const muteRef = doc(db, 'challenge_lobbies', challengeId, 'voice_controls', wallet);
    
    const unsubscribe = onSnapshot(
      muteRef,
      (snapshot) => {
        setIsMuted(snapshot.exists() && snapshot.data()?.muted === true);
      },
      (error) => {
        if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
          console.error('Error checking mute status:', error);
        }
      }
    );
    
    return () => unsubscribe();
  }, [challengeId, wallet]);
  
  const handleToggleMute = async () => {
    if (isToggling) return;
    setIsToggling(true);
    
    try {
      const muteRef = doc(db, 'challenge_lobbies', challengeId, 'voice_controls', wallet);
      
      if (isMuted) {
        // Unmute by deleting the document
        await deleteDoc(muteRef);
      } else {
        // Mute by creating the document
        await setDoc(muteRef, {
          muted: true,
          mutedBy: 'creator',
          mutedAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      console.error('Failed to toggle mute:', error);
      const errorMsg = error.message || error.toString() || 'Unknown error';
      const errorCode = error.code || 'unknown';
      
      // Provide more specific error messages
      if (errorCode === "permission-denied") {
        onAppToast?.(
          "You may not have permission to mute this player. Please refresh and try again.",
          "error",
          "Permission denied"
        );
      } else if (errorCode === "unavailable") {
        onAppToast?.("Firestore is temporarily unavailable. Please check your connection and try again.", "warning", "Unavailable");
      } else {
        onAppToast?.(`Failed to toggle mute: ${errorMsg}. Please try again.`, "error", "Mute failed");
      }
    } finally {
      setIsToggling(false);
    }
  };
  
  return (
    <button
      type="button"
      onClick={handleToggleMute}
      disabled={isToggling}
      className={`w-full px-2 py-1.5 rounded-md border text-[10px] font-semibold transition-all flex items-center justify-between disabled:opacity-50 ${
        isMuted 
          ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-200' 
          : 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/35 text-purple-100'
      }`}
    >
      <span>{isMuted ? '🔊 Unmute' : '🔇 Mute'} {displayName}</span>
    </button>
  );
};

const StandardChallengeLobby: React.FC<StandardChallengeLobbyProps> = ({
  challenge,
  currentWallet,
  onSubmitResult,
  onClaimPrize,
  onJoinChallenge,
  onCreatorFund,
  onJoinerFund,
  onCancelChallenge,
  onAppToast,
  requestAppConfirm,
  onUpdateEntryFee,
  onClose,
  isSubmitting = false,
  isClaiming = false,
  isCreatorFunding = false,
  isJoinerFunding = false,
  onPlayerClick,
}) => {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedResult, setSelectedResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playerData, setPlayerData] = useState<
    Record<string, { displayName?: string; profileImage?: string; displayTrustScore?: number }>
  >({});
  const warnedRef = useRef<Set<string>>(new Set());
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  const [spectators, setSpectators] = useState<string[]>([]);
  const [pendingMicRequests, setPendingMicRequests] = useState<{ wallet: string }[]>([]);
  const [speakerWallets, setSpeakerWallets] = useState<string[]>([]);
  const [resolvingWinner, setResolvingWinner] = useState<string | null>(null);
  const [showIntegrityConfirm, setShowIntegrityConfirm] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

  const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  
  // Real-time challenge data - ensures button visibility updates immediately
  const [liveChallenge, setLiveChallenge] = useState<any>(challenge);
  
  // Initialize liveChallenge immediately when challenge prop changes (for faster button visibility)
  useEffect(() => {
    if (challenge) {
      setLiveChallenge(challenge);
    }
  }, [challenge]);
  
  // Listen to real-time challenge updates to ensure button visibility is always accurate
  useEffect(() => {
    if (!challenge?.id) return;
    
    const challengeRef = doc(db, 'challenges', challenge.id);
    
    // Use includeMetadataChanges to get updates faster
    const unsubscribe = onSnapshot(
      challengeRef,
      {
        includeMetadataChanges: true // Get updates even for metadata changes (faster)
      },
      async (snapshot) => {
        if (snapshot.exists()) {
          const updatedData = { id: snapshot.id, ...snapshot.data(), rawData: snapshot.data() };
          const status = getChallengeStatus(updatedData);
          const pendingJoiner = getChallengePendingJoiner(updatedData);
          
          // Only log significant status changes to reduce noise
          const prevStatus = liveChallenge ? getChallengeStatus(liveChallenge) : null;
          if (status !== prevStatus || pendingJoiner !== getChallengePendingJoiner(liveChallenge || challenge)) {
            console.log('🔄 Challenge real-time update received:', {
              challengeId: challenge.id,
              status,
              prevStatus,
              pendingJoiner,
              hasCreator: !!(updatedData as any).creator,
              timestamp: new Date().toISOString()
            });
          }
          
          // Auto-fix: If challenge is active but players array is empty, fix it
          if (status === 'active') {
            const players = (updatedData as any).players || (updatedData as any).rawData?.players || [];
            const creator = (updatedData as any).creator || (updatedData as any).rawData?.creator;
            const challenger = (updatedData as any).challenger || (updatedData as any).rawData?.challenger;
            
            if ((!players || players.length === 0) && creator && challenger) {
              try {
                await writeChallengeFields(
                  challenge.id,
                  { players: [creator, challenger] },
                  {
                    currentData: updatedData as Record<string, unknown>,
                    actingWallet: currentWallet ?? null,
                  }
                );
              } catch (error) {
                console.error('Failed to fix players array:', error);
              }
            }
          }
          
          // Update immediately - don't wait for async operations
          setLiveChallenge(updatedData);
        } else {
          setLiveChallenge(challenge);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
          console.error('Error listening to challenge updates:', error);
        }
      }
    );
    
    return () => unsubscribe();
  }, [challenge?.id]);
  
  // Use live challenge data if available, fallback to prop
  const activeChallenge = liveChallenge || challenge;

  // Helper to get value from challenge or rawData (simplifies redundant access patterns)
  const getChallengeValue = <T,>(key: string, defaultValue: T): T => {
    return (activeChallenge[key as keyof typeof activeChallenge] ?? activeChallenge.rawData?.[key as keyof typeof activeChallenge.rawData] ?? defaultValue) as T;
  };
  
  const status = getChallengeValue('status', 'pending_waiting_for_opponent') as string;
  const isActiveMatch = status === 'active' || status === 'in-progress';
  // CRITICAL: Ensure players is always an array (getChallengeValue might return non-array)
  const playersRaw = getChallengeValue('players', []) as any;
  const players: string[] = Array.isArray(playersRaw) ? playersRaw.filter((p: any): p is string => typeof p === 'string' && !!p) : [];
  const entryFee = getChallengeValue('entryFee', 0);
  const prizePool = getChallengeValue('prizePool', entryFee * 2);
  const game = getChallengeValue('game', 'USDFG Arena');
  const mode = getChallengeValue('mode', 'Head-to-Head');
  const platform = getChallengeValue('platform', 'All Platforms');
  const challengeId = activeChallenge.id;

  useEffect(() => {
    warnedRef.current.clear();
  }, [challengeId]);

  const [isEditingEntryFee, setIsEditingEntryFee] = useState(false);
  const [entryFeeDraft, setEntryFeeDraft] = useState<string>(String(entryFee || ''));
  const [entryFeeError, setEntryFeeError] = useState<string | null>(null);
  const [isUpdatingEntryFee, setIsUpdatingEntryFee] = useState(false);

  useEffect(() => {
    if (!isEditingEntryFee) {
      setEntryFeeDraft(String(entryFee || ''));
      setEntryFeeError(null);
    }
  }, [entryFee, isEditingEntryFee]);
  
  // VoiceChat props (no memoization needed - React handles this)
  const voiceChatChallengeId = challengeId;
  const voiceChatCurrentWallet = currentWallet || "";

  // Wallet-first role detection (UI must not depend on UID binding).
  const creatorWallet = getChallengeValue<string>('creatorWallet', '') || getChallengeValue<string>('creator', '') || '';
  const challengerWallet = getChallengeValue<string | null>('challenger', null);
  const opponentWalletField = getChallengeValue<string | null>('opponentWallet', null);
  const pendingJoinerWallet = getChallengeValue<string | null>('pendingJoiner', null);

  const userRole = useMemo(() => {
    if (!currentWallet) return 'spectator';
    const cw = currentWallet.toLowerCase();
    const creatorW = (creatorWallet || '').toLowerCase();
    const opponentW = (opponentWalletField || '').toLowerCase();
    const challengerW = (challengerWallet || '').toLowerCase();
    const pendingW = (pendingJoinerWallet || '').toLowerCase();
    const playerSet = new Set((players || []).map((p: string) => (p || '').toLowerCase()));

    if (creatorW && cw === creatorW) return 'creator';
    if ((opponentW && cw === opponentW) || (challengerW && cw === challengerW)) return 'challenger';
    if (pendingW && cw === pendingW) return 'pending_joiner';
    if (playerSet.has(cw)) return 'player';
    return 'spectator';
  }, [currentWallet, creatorWallet, opponentWalletField, challengerWallet, pendingJoinerWallet, players]);
  
  // CRITICAL: Do not render any CTAs if role is not yet resolved (shouldn't happen, but safety check)
  const isRoleResolved = userRole !== null && userRole !== undefined;

  // Check if user already submitted result (moved up for use in handleSubmit)
  // Use useMemo to prevent recalculation on every render unless results or wallet actually change
  const results = getChallengeValue('results', {}) as Record<string, any>;
  const hasAlreadySubmitted = useMemo(() => {
    if (!currentWallet || !results || typeof results !== 'object') return false;
    const key = canonicalPlayerKey(players, currentWallet);
    const userResult = results[key];
    return !!userResult;
  }, [currentWallet, results, players]);

  useEffect(() => {
    if (!onAppToast || !currentWallet || !creatorWallet) return;
    const cw = currentWallet.toLowerCase();
    const cr = creatorWallet.toLowerCase();
    let opponentWallet: string | null = null;
    if (cw === cr) {
      opponentWallet = (challengerWallet || pendingJoinerWallet || null) as string | null;
    } else {
      opponentWallet = creatorWallet;
    }
    if (!opponentWallet) return;
    const key = `${challengeId}-${opponentWallet.toLowerCase()}`;
    if (
      status !== "active" &&
      status !== "creator_funded" &&
      status !== "in-progress" &&
      status !== "creator_confirmation_required"
    ) {
      return;
    }

    void (async () => {
      try {
        const stats = await getPlayerStats(opponentWallet);
        const t = stats?.displayTrustScore ?? 5;
        if (t < 3 && !warnedRef.current.has(key)) {
          warnedRef.current.add(key);
          onAppToast("Low trust player", "warning", "Opponent");
        }
      } catch {
        // ignore
      }
    })();
  }, [
    challengeId,
    currentWallet,
    creatorWallet,
    challengerWallet,
    pendingJoinerWallet,
    status,
    onAppToast,
  ]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProofImage(null);
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveEntryFee = async () => {
    if (!onUpdateEntryFee || isUpdatingEntryFee) return;
    const parsed = Number(entryFeeDraft);
    if (!Number.isFinite(parsed)) {
      setEntryFeeError('Enter a valid amount.');
      return;
    }
    if (parsed <= 0) {
      setEntryFeeError('Amount must be greater than 0.');
      return;
    }
    if (parsed > 1000) {
      setEntryFeeError('Max amount is 1000 USDFG.');
      return;
    }
    setEntryFeeError(null);
    setIsUpdatingEntryFee(true);
    try {
      await onUpdateEntryFee(activeChallenge, parsed);
      setIsEditingEntryFee(false);
    } catch (error: any) {
      setEntryFeeError(error?.message || 'Failed to update amount.');
    } finally {
      setIsUpdatingEntryFee(false);
    }
  };

  const doSubmitResult = async () => {
    if (selectedResult === null || isLoading || hasAlreadySubmitted) return;
    setIsLoading(true);
    try {
      await onSubmitResult(selectedResult, proofFile);
      setShowSubmitForm(false);
      setSelectedResult(null);
      setProofImage(null);
      setProofFile(null);
      setShowIntegrityConfirm(false);
    } catch (error: any) {
      console.error("Error submitting result:", error);
      onAppToast?.(error.message || "Failed to submit result. Please try again.", "error", "Submit failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedResult === null || isLoading || hasAlreadySubmitted) return;

    // If user is about to claim "I won" and opponent already claimed "I won", show integrity warning
    if (selectedResult === true && results && typeof results === 'object' && creatorWallet && challengerWallet && currentWallet) {
      const opponentWallet = currentWallet.toLowerCase() === creatorWallet.toLowerCase() ? challengerWallet : creatorWallet;
      const opponentKey = opponentWallet ? canonicalPlayerKey(players, opponentWallet) : '';
      const opponentResult = opponentKey ? results[opponentKey] : null;
      if (opponentResult && opponentResult.didWin === true) {
        setShowIntegrityConfirm(true);
        return;
      }
    }

    await doSubmitResult();
  };

  const handleDisputeResult = async () => {
    if (!activeChallenge?.id || !currentWallet) return;
    const reasonInput =
      typeof window !== 'undefined'
        ? window.prompt("Why are you disputing this result? (optional)")
        : null;

    const reason = reasonInput || undefined;

    setIsDisputing(true);
    try {
      const result = await triggerChallengeDispute(
        activeChallenge.id,
        currentWallet,
        reason
      );
      if (result === 'created') {
        onAppToast?.('Dispute opened. An admin will review.', 'success', 'Dispute');
      } else if (result === 'already_disputed') {
        onAppToast?.('Already disputed.', 'info', 'Dispute');
      } else {
        onAppToast?.('Too late to dispute.', 'warning', 'Dispute');
      }
    } catch (err: any) {
      onAppToast?.(err?.message || "Failed to open dispute.", "error", "Dispute");
    } finally {
      setIsDisputing(false);
    }
  };

  const handleResolveDispute = async (winnerWallet: string) => {
    if (!isAdmin || !currentWallet) {
      onAppToast?.("Only the admin wallet can resolve disputes.", "warning", "Admin only");
      return;
    }
    if (resolvingWinner) return;
    setResolvingWinner(winnerWallet);
    try {
      // Admin only updates Firestore (designates winner). No on-chain tx = no SOL fee for admin.
      // The winner will claim their reward themselves (they pay gas when they click Claim).
      await resolveAdminChallenge(
        activeChallenge.id,
        winnerWallet,
        "lobby",
        "wallet:" + currentWallet,
        undefined
      );
    } catch (err: any) {
      console.error("Error resolving dispute:", err);
      onAppToast?.(err.message || "Failed to resolve dispute. Try Admin Console if needed.", "error", "Resolve failed");
    } finally {
      setResolvingWinner(null);
    }
  };

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
          bgClass: 'bg-[#0B0C12]/90', 
          borderClass: 'border-white/10', 
          textClass: 'text-white/85',
          headerClass: 'text-purple-300',
          icon: '⚠️' 
        };
      case 'creator_funded':
        return { 
          text: 'Waiting for challenger to fund', 
          bgClass: 'bg-green-500/10', 
          borderClass: 'border-green-400/30', 
          textClass: 'text-green-100',
          headerClass: 'text-green-300',
          icon: '💰' 
        };
      case 'active':
        return { 
          text: 'Match Active', 
          bgClass: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20', 
          borderClass: 'border-green-400/40', 
          textClass: 'text-green-100',
          headerClass: 'text-green-300',
          icon: '🎮' 
        };
      case 'completed':
        return { 
          text: 'Match completed', 
          bgClass: 'bg-gradient-to-r from-emerald-500/15 to-emerald-600/10', 
          borderClass: 'border-emerald-400/45', 
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
  
  // Wallet-based participant checks (independent from UID binding)
  const isCreator = !!(currentWallet && creatorWallet && creatorWallet.toLowerCase() === currentWallet.toLowerCase());
  const isChallengerByWallet = !!(currentWallet && (
    (opponentWalletField && opponentWalletField.toLowerCase() === currentWallet.toLowerCase()) ||
    (challengerWallet && challengerWallet.toLowerCase() === currentWallet.toLowerCase())
  ));
  const isPendingJoinerByWallet = !!(currentWallet && pendingJoinerWallet && pendingJoinerWallet.toLowerCase() === currentWallet.toLowerCase());
  
  // If status is creator_funded and user is the challenger (by wallet), treat them as challenger
  const isChallenger = isChallengerByWallet || (status === 'creator_funded' && isChallengerByWallet) || userRole === 'challenger';
  const isPendingJoiner = isPendingJoinerByWallet && !isChallenger;
  const isPlayer = userRole === 'player';
  const isParticipant = isCreator || isChallenger || isPendingJoiner || isPlayer;
  
  const maxPlayers = getChallengeValue('maxPlayers', 2);
  const format = getChallengeValue('format', activeChallenge.rawData?.tournament ? 'tournament' : 'standard') as string;
  const isTournament = format === 'tournament';

  const canEditEntryFee =
    Boolean(onUpdateEntryFee) &&
    isCreator &&
    status === 'pending_waiting_for_opponent' &&
    !pendingJoinerWallet &&
    !challengerWallet &&
    !isTournament &&
    players.length <= 1;
  
  // Calculate actual participant count (including creator, challenger, pendingJoiner, and players array)
  const allParticipantsSet = new Set<string>();
  if (creatorWallet) allParticipantsSet.add(creatorWallet.toLowerCase());
  if (challengerWallet) allParticipantsSet.add(challengerWallet.toLowerCase());
  if (pendingJoinerWallet) allParticipantsSet.add(pendingJoinerWallet.toLowerCase());
  players.forEach((p: string) => allParticipantsSet.add(p.toLowerCase()));
  const actualParticipantCount = allParticipantsSet.size;
  const isFull = actualParticipantCount >= maxPlayers;
  
  // Get deadline info
  const creatorFundingDeadline = getChallengeValue<Timestamp | null>('creatorFundingDeadline', null);
  const isDeadlineExpired = creatorFundingDeadline && 'toMillis' in creatorFundingDeadline ? creatorFundingDeadline.toMillis() < Date.now() : false;
  const joinerFundingDeadline = getChallengeValue<Timestamp | null>('joinerFundingDeadline', null);
  const isJoinerDeadlineExpired = joinerFundingDeadline && 'toMillis' in joinerFundingDeadline ? joinerFundingDeadline.toMillis() < Date.now() : false;
  
  // CRITICAL: Explicit (status + role) decision table for CTAs
  // Do not render CTAs until role is resolved
  const ctaState = useMemo(() => {
    if (!isRoleResolved) {
      return {
        showCreatorFund: false,
        showJoinerFund: false,
        showJoin: false,
        showCancel: false,
        showSubmit: false,
        showClaim: false,
      };
    }
    
    // Explicit decision table: (status, role) -> CTA
    const state: {
      showCreatorFund: boolean;
      showJoinerFund: boolean;
      showJoin: boolean;
      showCancel: boolean;
      showSubmit: boolean;
      showClaim: boolean;
    } = {
      showCreatorFund: false,
      showJoinerFund: false,
      showJoin: false,
      showCancel: false,
      showSubmit: false,
      showClaim: false,
    };
    
    // Creator funding: creator + creator_confirmation_required + deadline not expired
    if (userRole === 'creator' && status === 'creator_confirmation_required' && !isDeadlineExpired && onCreatorFund) {
      state.showCreatorFund = true;
      console.log('✅ Creator fund button should be visible:', {
        userRole,
        status,
        isDeadlineExpired,
        hasHandler: !!onCreatorFund,
        pendingJoiner: getChallengePendingJoiner(activeChallenge)
      });
    } else if (userRole === 'creator' && status === 'creator_confirmation_required') {
      console.log('⚠️ Creator fund button NOT showing:', {
        userRole,
        status,
        isDeadlineExpired,
        hasHandler: !!onCreatorFund,
        pendingJoiner: getChallengePendingJoiner(activeChallenge)
      });
    }
    
    // Joiner funding: challenger + creator_funded + deadline not expired
    // CRITICAL: Challenger must always see Fund Entry when status is creator_funded
    // Also check by wallet in case role resolution is delayed (pendingJoiner -> challenger transition)
    const isChallengerByWallet = currentWallet && challengerWallet && challengerWallet.toLowerCase() === currentWallet.toLowerCase();
    const isActuallyChallenger = userRole === 'challenger' || (status === 'creator_funded' && isChallengerByWallet);
    
    if (isActuallyChallenger && status === 'creator_funded' && !isJoinerDeadlineExpired && onJoinerFund) {
      state.showJoinerFund = true;
      console.log('✅ Joiner fund button should be visible:', {
        userRole,
        isActuallyChallenger,
        status,
        isJoinerDeadlineExpired,
        hasHandler: !!onJoinerFund,
        joinerFundingDeadline: joinerFundingDeadline?.toMillis(),
        challengerWallet
      });
    } else if (isActuallyChallenger && status === 'creator_funded') {
      console.log('⚠️ Joiner fund button NOT showing:', {
        userRole,
        isActuallyChallenger,
        status,
        isJoinerDeadlineExpired,
        hasHandler: !!onJoinerFund,
        joinerFundingDeadline: joinerFundingDeadline?.toMillis(),
        challengerWallet
      });
    }
    
    // Join button: spectator + joinable status + not full + handler available
    // CRITICAL: Creator must NEVER see Join Challenge
    if (userRole === 'spectator' && !isFull && onJoinChallenge) {
      if (status === 'pending_waiting_for_opponent') {
        state.showJoin = true;
      } else if (status === 'creator_confirmation_required' && isDeadlineExpired) {
        state.showJoin = true;
      } else if (status === 'creator_funded' && isJoinerDeadlineExpired) {
        state.showJoin = true;
      }
    }
    
    // Cancel button: creator + (pending OR deadline expired)
    if (userRole === 'creator' && onCancelChallenge) {
      if (status === 'pending_waiting_for_opponent') {
        state.showCancel = true;
      } else if (status === 'creator_confirmation_required' && isDeadlineExpired) {
        state.showCancel = true;
      }
    }
    
    // Submit result: participant + active + enough players + not submitted
    const hasEnoughPlayers = players.length >= 2 || (creatorWallet && challengerWallet);
    const lossReportedBy = getChallengeValue<string | null>('lossReportedBy', null);
    const canSubmitDuringAwaitingResolution =
      status === 'awaiting_auto_resolution' &&
      !!lossReportedBy &&
      !!currentWallet &&
      !walletsEqual(currentWallet, lossReportedBy) &&
      !hasAlreadySubmitted;
    if (
      isParticipant &&
      hasEnoughPlayers &&
      !hasAlreadySubmitted &&
      (status === 'active' || canSubmitDuringAwaitingResolution)
    ) {
      state.showSubmit = true;
    }
    
    // Claim reward: participant + completed + won + not claimed
    const winner = getChallengeValue<string | null>('winner', null) as string | null;
    const userWon = currentWallet && winner && typeof winner === 'string' && winner.toLowerCase() === currentWallet.toLowerCase();
    const prizeClaimed = isChallengeRewardClaimed(activeChallenge);
    if (isParticipant && status === 'completed' && userWon && !prizeClaimed) {
      state.showClaim = true;
    }
    
    return state;
  }, [isRoleResolved, userRole, status, isDeadlineExpired, isJoinerDeadlineExpired, isFull, onCreatorFund, onJoinerFund, onJoinChallenge, onCancelChallenge, players, creatorWallet, challengerWallet, hasAlreadySubmitted, currentWallet, activeChallenge, joinerFundingDeadline]);
  
  // Extract CTA flags
  const canCreatorFund = ctaState.showCreatorFund;
  const canJoinerFund = ctaState.showJoinerFund;
  const canJoin = ctaState.showJoin;
  const canCreatorCancel = ctaState.showCancel;
  const canSubmitResult = ctaState.showSubmit;
  const canClaimPrize = ctaState.showClaim;

  console.log("FUND UI CHECK", {
    status,
    isCreator,
    currentWallet,
    creatorWallet
  });

  const handleFundChallenge = async () => {
    console.log("FUND BUTTON CLICKED", {
      challengeId: activeChallenge?.id,
      wallet: currentWallet
    });

    if (!onCreatorFund) {
      console.error('onCreatorFund handler not provided');
      onAppToast?.("Funding handler not available. Please refresh the page.", "error", "Setup error");
      return;
    }

    try {
      const challengePDA = (activeChallenge as any)?.pda || (activeChallenge as any)?.rawData?.pda || null;
      console.log("CALLING ON-CHAIN FUND");
      console.log("PDA:", challengePDA);

      const result: any = await onCreatorFund(activeChallenge);
      const signature = result?.signature ?? result?.txid ?? result ?? 'ok';
      console.log("FUND TX SUCCESS", signature);

      if (challengePDA) {
        await writeChallengeFields(
          activeChallenge.id,
          {
            status: 'creator_funded',
            pda: challengePDA,
            updatedAt: Timestamp.now(),
          },
          { currentData: activeChallenge, actingWallet: currentWallet || undefined }
        );
      }
    } catch (error: any) {
      console.error('Failed to fund challenge:', error);
      onAppToast?.(error.message || "Failed to fund challenge. Please try again.", "error", "Funding failed");
    }
  };
  
  const prizeClaimed = isChallengeRewardClaimed(activeChallenge);
  
  // Winner check (for display)
  const winner = getChallengeValue<string | null>('winner', null) as string | null;
  const userWon = currentWallet && winner && typeof winner === 'string' && winner.toLowerCase() === currentWallet.toLowerCase();
  
  // Get opponent wallet for display
  const opponentWallet: string | null = players.length >= 2 && currentWallet 
    ? (players.find((p: string) => p?.toLowerCase() !== currentWallet?.toLowerCase()) as string | undefined) || null
    : null;


  // Build participants list - includes creator, challenger, pendingJoiner, and players array
  // This ensures both players show as participants even before joiner funds
  const participantsSet = new Set<string>();
  if (creatorWallet) participantsSet.add(creatorWallet);
  if (challengerWallet) participantsSet.add(challengerWallet);
  if (pendingJoinerWallet) participantsSet.add(pendingJoinerWallet);
  players.forEach((p: string) => {
    if (p) participantsSet.add(p);
  });
  const participants = Array.from(participantsSet);
  
  // Creator controls should be available in pre-match lobby and during active matches
  // Show when creator is viewing (even if no spectators yet, so they can see the controls are available)
  const canShowCreatorControls = isCreator && status !== 'completed' && status !== 'cancelled';
  
  // Ephemeral spectator tracking
  // Users can join as spectators (real-time only).
  // When they leave, we remove spectator presence, but we do NOT delete chat history.
  useEffect(() => {
    if (!challengeId || !currentWallet) {
      setSpectatorCount(0);
      return;
    }
    
    // Check if current user is a participant
    const isParticipant = participants.some((p: string) => p?.toLowerCase() === currentWallet.toLowerCase());
    
    // Only track as spectator if not a participant
    if (!isParticipant) {
      // Track individual spectator in a subcollection
      const spectatorRef = doc(db, 'challenge_lobbies', challengeId, 'spectators', currentWallet);
      const statsRef = doc(db, 'challenge_lobbies', challengeId, 'stats', 'count');
      let isMounted = true;
      let hasJoined = false;
      
      // Check current count before incrementing (prevent exceeding 69 limit)
      getDoc(statsRef).then((snap) => {
        const currentCount = snap.exists() ? (snap.data().spectatorCount || 0) : 0;
        
        // Only increment if under limit
        if (currentCount < MAX_SPECTATORS) {
          // Create spectator document and increment count atomically
          Promise.all([
            setDoc(spectatorRef, {
              wallet: currentWallet,
              joinedAt: serverTimestamp(),
            }).catch(async (err) => {
              if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
                console.error('Failed to create spectator doc:', err);
              }
            }),
            updateDoc(statsRef, {
              spectatorCount: increment(1)
            }).catch(async (err) => {
              // If document doesn't exist, create it first
              if (err.code === 'not-found') {
                try {
                  await setDoc(statsRef, {
                    spectatorCount: 1,
                    createdAt: serverTimestamp(),
                  });
                } catch (createErr: any) {
                  if (createErr.code !== 'permission-denied' && createErr.code !== 'unavailable') {
                    console.error('Failed to create spectator count:', createErr);
                  }
                }
              } else if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
                console.error('Failed to increment spectator count:', err);
              }
            })
          ]).then(() => {
            hasJoined = true;
          });
        } else {
          // Limit reached - user cannot join as spectator (UI shows warning in lobby)
        }
      }).catch(() => {
        // If getDoc fails, try to create spectator doc and increment anyway (optimistic - limit will be enforced by listener)
        Promise.all([
          setDoc(spectatorRef, {
            wallet: currentWallet,
            joinedAt: serverTimestamp(),
          }).catch(async (err) => {
            if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
              console.error('Failed to create spectator doc:', err);
            }
          }),
          updateDoc(statsRef, {
            spectatorCount: increment(1)
          }).catch(async (err) => {
            if (err.code === 'not-found') {
              try {
                await setDoc(statsRef, {
                  spectatorCount: 1,
                  createdAt: serverTimestamp(),
                });
              } catch (createErr: any) {
                if (createErr.code !== 'permission-denied' && createErr.code !== 'unavailable') {
                  console.error('Failed to create spectator count:', createErr);
                }
              }
            } else if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
              console.error('Failed to increment spectator count:', err);
            }
          })
        ]).then(() => {
          hasJoined = true;
        });
      });
      
      // Handle page unload (user closes tab/browser) - cleanup as best effort
      let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
      if (typeof window !== 'undefined') {
          beforeUnloadHandler = () => {
          // Remove spectator and decrement counter on page unload
          if (hasJoined) {
            Promise.all([
              deleteDoc(spectatorRef).catch(() => {}),
              updateDoc(statsRef, {
                spectatorCount: increment(-1)
              }).catch(() => {})
            ]);
          }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);
      }
      
      // Cleanup: Decrement counter and delete chat messages when user leaves
      return () => {
        isMounted = false;
        
        // Remove beforeunload handler
        if (beforeUnloadHandler && typeof window !== 'undefined') {
          window.removeEventListener('beforeunload', beforeUnloadHandler);
        }
        
        // Remove spectator document and decrement count on leave
        if (hasJoined) {
          Promise.all([
            deleteDoc(spectatorRef).catch(err => {
              if (err.code !== 'permission-denied' && err.code !== 'unavailable' && err.code !== 'not-found') {
                console.error('Failed to delete spectator doc:', err);
              }
            }),
            updateDoc(statsRef, {
              spectatorCount: increment(-1)
            }).catch(err => {
              if (err.code !== 'permission-denied' && err.code !== 'unavailable' && err.code !== 'not-found') {
                console.error('Failed to decrement spectator count:', err);
              }
            })
          ]);
        }
      };
    } else {
      setSpectatorCount(0);
    }
  }, [challengeId, currentWallet, participants]);
  
  // Listen to individual spectators in real-time
  useEffect(() => {
    if (!challengeId) {
      setSpectatorCount(0);
      setSpectators([]);
      return;
    }
    
    const spectatorsRef = collection(db, 'challenge_lobbies', challengeId, 'spectators');
    
    let unsubscribeFn: (() => void) | null = null;
    let isActive = true;
    let setupTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Delay listener setup slightly to prevent race conditions
    setupTimeout = setTimeout(() => {
      if (!isActive) return;
      
      try {
        unsubscribeFn = onSnapshot(
          spectatorsRef,
          (snapshot) => {
            if (!isActive) return;
            
            const spectatorWallets = snapshot.docs
              .map(doc => doc.data().wallet)
              .filter((wallet): wallet is string => !!wallet && typeof wallet === 'string');
            
            setSpectators(spectatorWallets);
            setSpectatorCount(spectatorWallets.length);
          }, 
          (error) => {
            if (!isActive) return;
            
            // Handle errors gracefully
            if (error.code === 'permission-denied' || error.code === 'unavailable') {
              setSpectatorCount(0);
              setSpectators([]);
              return;
            }
            
            console.error('Error listening to spectators:', error);
            setSpectatorCount(0);
            setSpectators([]);
          }
        );
      } catch (error: any) {
        if (!isActive) return;
        
        if (error.code === 'permission-denied' || error.code === 'unavailable') {
          setSpectatorCount(0);
          setSpectators([]);
          return;
        }
        
        console.error('Failed to set up spectator listener:', error);
        setSpectatorCount(0);
        setSpectators([]);
      }
    }, 100);
    
    // Cleanup
    return () => {
      isActive = false;
      if (setupTimeout) {
        clearTimeout(setupTimeout);
      }
      if (unsubscribeFn) {
        try {
          unsubscribeFn();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [challengeId]);
  
  // Fetch participant and spectator data (display names, profile images)
  useEffect(() => {
    const fetchPlayerData = async () => {
      const data: Record<string, { displayName?: string; profileImage?: string; displayTrustScore?: number }> =
        {};
      const allWallets = [...participants, ...spectators];
      
      for (const wallet of allWallets) {
        if (wallet) {
          try {
            const stats = await getPlayerStats(wallet);
            if (stats) {
              data[wallet.toLowerCase()] = {
                displayName: stats.displayName,
                profileImage: stats.profileImage,
                displayTrustScore: stats.displayTrustScore,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch stats for ${wallet}:`, error);
          }
        }
      }
      setPlayerData(data);
    };
    
    if (participants.length > 0 || spectators.length > 0) {
      fetchPlayerData();
    }
  }, [participants, spectators]);

  // Listen to pending mic requests (for creator)
  useEffect(() => {
    if (!challengeId) return;
    const micRef = collection(db, 'challenge_lobbies', challengeId, 'mic_requests');
    const q = query(micRef, where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ wallet: d.id }));
        setPendingMicRequests(list);
      },
      (err) => {
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          console.error('[Lobby] Pending mic requests listener error:', err);
        }
      }
    );
    return () => unsub();
  }, [challengeId]);

  // Listen to voice speaker list (max 2)
  useEffect(() => {
    if (!challengeId) return;
    const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
    const unsub = onSnapshot(stateRef, (snap) => {
      const list = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
      setSpeakerWallets(Array.isArray(list) ? list : []);
    }, () => {});
    return () => unsub();
  }, [challengeId]);

  return (
    <div className="space-y-2">
      {/* Players & Spectators List - X Spaces style */}
      <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 backdrop-blur-sm">
        <div className="mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300 mb-1.5">
            Participants ({participants.length})
          </h3>
          <div className="space-y-1.5">
            {participants.map((wallet: string) => {
              const data = playerData[wallet.toLowerCase()] || {};
              const displayName = data.displayName || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
              const isCurrentUser = currentWallet && wallet.toLowerCase() === currentWallet.toLowerCase();
              
              return (
                <div
                  key={wallet}
                  className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                    isCurrentUser ? 'bg-purple-500/10 border border-purple-400/30' : 'bg-white/5'
                  } ${onPlayerClick ? 'cursor-pointer hover:bg-white/10' : ''}`}
                  onClick={() => {
                    if (onPlayerClick) {
                      onPlayerClick(wallet);
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-600/20 border border-purple-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {data.profileImage ? (
                      <img src={data.profileImage} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-purple-300 font-semibold text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold truncate flex items-center gap-1.5 flex-wrap ${onPlayerClick ? 'text-white hover:text-purple-200' : 'text-white'}`}>
                      {displayName}
                      {isCurrentUser && <span className="ml-1.5 text-[10px] text-purple-300">(You)</span>}
                      <TrustBadge score={data.displayTrustScore ?? 5} className="shrink-0" />
                    </div>
                    <div className={`text-[10px] truncate ${onPlayerClick ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400'}`}>
                      {wallet.slice(0, 6)}...{wallet.slice(-4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Spectators Section - Show individual spectators */}
        {spectators.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Spectators ({spectators.length}/{MAX_SPECTATORS})
            </h3>
            <div className="space-y-1.5">
              {spectators.map((wallet: string) => {
                const data = playerData[wallet.toLowerCase()] || {};
                const displayName = data.displayName || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
                const isCurrentUser = currentWallet && wallet.toLowerCase() === currentWallet.toLowerCase();
                
                return (
                  <div
                    key={wallet}
                    className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                      isCurrentUser ? 'bg-purple-500/10 border border-purple-400/30' : 'bg-white/5'
                    } ${onPlayerClick ? 'cursor-pointer hover:bg-white/10' : ''}`}
                    onClick={() => {
                      if (onPlayerClick) {
                        onPlayerClick(wallet);
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-600/20 border border-purple-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {data.profileImage ? (
                        <img src={data.profileImage} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-300 font-semibold text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate flex items-center gap-1.5 flex-wrap ${onPlayerClick ? 'text-white hover:text-purple-200' : 'text-white'}`}>
                        {displayName}
                        {isCurrentUser && <span className="ml-1.5 text-[10px] text-purple-300">(You)</span>}
                        <TrustBadge score={data.displayTrustScore ?? 5} className="shrink-0" />
                      </div>
                      <div className={`text-[10px] truncate ${onPlayerClick ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400'}`}>
                        {wallet.slice(0, 6)}...{wallet.slice(-4)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {spectatorCount >= MAX_SPECTATORS && (
              <div className="text-[10px] text-orange-300/90 mt-1.5">⚠️ Spectator limit reached</div>
            )}
          </div>
        )}
      </div>

      {/* Creator Fund Button - Show if creator needs to fund */}
      {status === 'creator_confirmation_required' && isCreator === true && canCreatorFund && (
        <div className="rounded-lg border border-white/10 bg-[#07080C]/95 p-2.5 ring-1 ring-purple-500/10" style={{ display: 'block' }}>
          <div className="text-center">
            <div className="text-xs font-semibold text-white mb-1.5">
              A challenger has joined your challenge
            </div>
            <div className="text-[10px] text-white/60 mb-2">
              Review the challenger, then fund the challenge to lock in the match.
            </div>
            {creatorFundingDeadline && (
              <div className="text-[10px] text-orange-300/85 mb-2">
                Deadline: {(() => {
                  const now = Date.now();
                  const deadlineMs = creatorFundingDeadline.toMillis();
                  const diffMs = deadlineMs - now;
                  const diffMinutes = Math.floor(diffMs / 1000 / 60);
                  const diffHours = Math.floor(diffMinutes / 60);
                  
                  if (diffMs <= 0) {
                    return 'Expired';
                  } else if (diffHours > 0) {
                    return `${diffHours}h ${diffMinutes % 60}m remaining`;
                  } else {
                    return `${diffMinutes}m remaining`;
                  }
                })()}
              </div>
            )}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handleFundChallenge();
              }}
              disabled={isCreatorFunding}
              className={`w-full rounded-md bg-gradient-to-r from-purple-500 to-orange-500 hover:brightness-110 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(124,58,237,0.22)] border border-white/10 mb-1 ${
                isCreatorFunding ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCreatorFunding ? 'Funding… Confirm in wallet' : 'Fund Challenge'}
            </button>
            <div className="text-[10px] text-white/70 font-medium mb-1">
              This will open your wallet
            </div>
            <div className="text-[10px] text-white/55 mb-2">
              {entryFee} USDFG + standard network fee
            </div>
            <div className="text-[10px] text-white/45 italic">
              Funding locks your USDFG into escrow until the match is resolved.
            </div>
          </div>
        </div>
      )}

      {/* Waiting message for joiner - Firestore-only, no on-chain steps */}
      {userRole === 'pending_joiner' && status === 'creator_confirmation_required' && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-blue-200 mb-1.5">
              Waiting for creator to fund
            </div>
            <div className="text-[10px] text-blue-100/90 font-medium mb-1">
              No transaction required
            </div>
            {creatorFundingDeadline && (
              <div className="text-[10px] text-blue-300/70 mb-2">
                Creator deadline: {(() => {
                  const now = Date.now();
                  const deadlineMs = creatorFundingDeadline.toMillis();
                  const diffMs = deadlineMs - now;
                  const diffMinutes = Math.floor(diffMs / 1000 / 60);
                  const diffHours = Math.floor(diffMinutes / 60);
                  
                  if (diffMs <= 0) {
                    return 'Expired';
                  } else if (diffHours > 0) {
                    return `${diffHours}h ${diffMinutes % 60}m remaining`;
                  } else {
                    return `${diffMinutes}m remaining`;
                  }
                })()}
                {isDeadlineExpired && (
                  <span className="ml-2 text-red-300">(Expired - challenge will revert soon)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug info for creator when status is creator_confirmation_required but button not showing */}
      {isCreator && status === 'creator_confirmation_required' && !canCreatorFund && !isDeadlineExpired && (
        <div className="rounded-lg border border-orange-500/35 bg-orange-950/25 p-2.5 ring-1 ring-orange-500/10">
          <div className="text-center">
            <div className="text-xs font-semibold text-orange-200 mb-1.5">
              ⚠️ Funding Button Not Available
            </div>
            <div className="text-[10px] text-orange-100/80 mb-1.5">
              Status: {status} | Deadline expired: {isDeadlineExpired ? 'Yes' : 'No'} | Handler: {onCreatorFund ? 'Available' : 'Missing'}
            </div>
            {!onCreatorFund && (
              <div className="text-[10px] text-red-300 mt-1.5">
                Error: Funding handler not available. Please refresh the page.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deadline Expired Message for Creator */}
      {isCreator && status === 'creator_confirmation_required' && isDeadlineExpired && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 space-y-2">
          <div className="text-center">
          <div className="text-xs font-semibold text-red-200 mb-1.5">
            Challenge expired — no funds were charged
          </div>
          <div className="text-[10px] text-red-100/90 font-medium mb-1">
            No wallet required
          </div>
          <div className="text-[10px] text-red-100/80 mb-2">
              The challenge has been reverted to waiting for opponent. You can now join as challenger or cancel the challenge.
          </div>
          </div>
          
          {/* Action Buttons for Creator */}
          <div className="flex flex-col gap-1.5">
            {/* Cancel/Delete Challenge Button */}
            {canCreatorCancel && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCancelChallenge && requestAppConfirm) {
                    const ok = await requestAppConfirm({
                      title: "Cancel challenge?",
                      message: "Are you sure you want to cancel/delete this challenge? This action cannot be undone.",
                      confirmLabel: "Delete",
                      cancelLabel: "Keep",
                      destructive: true,
                    });
                    if (!ok) return;
                    try {
                      await onCancelChallenge(activeChallenge);
                    } catch (error: any) {
                      console.error('Failed to cancel challenge:', error);
                      onAppToast?.(error.message || "Failed to cancel challenge. Please try again.", "error", "Cancel failed");
                    }
                  }
                }}
                className="w-full rounded-md bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(239,68,68,0.4)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-red-400/30"
              >
                Cancel/Delete Challenge
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Show join button for others after expiry (challenge reverted to pending OR deadline expired but status not updated yet) */}

      {/* Creator waiting for challenger to fund */}
      {isCreator && status === 'creator_funded' && !isJoinerDeadlineExpired && (
        <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-green-200 mb-1.5">
              Waiting for challenger to fund
            </div>
            <div className="text-[10px] text-green-100/90 font-medium mb-1">
              No wallet required
            </div>
            {joinerFundingDeadline && (
              <div className="text-[10px] text-green-300/70 mb-2">
                Challenger deadline: {new Date(joinerFundingDeadline.toMillis()).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Joiner Fund Button - Show if creator funded and joiner needs to fund */}
      {canJoinerFund && (
        <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-green-200 mb-1.5">
              Waiting for challenger to fund
            </div>
            {joinerFundingDeadline && (
              <div className="text-[10px] text-green-300/70 mb-2">
                Deadline: {new Date(joinerFundingDeadline.toMillis()).toLocaleTimeString()}
              </div>
            )}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onJoinerFund) {
                  try {
                    await onJoinerFund(activeChallenge);
                  } catch (error: any) {
                    console.error('Failed to fund challenge:', error);
                    onAppToast?.(error.message || "Failed to fund challenge. Please try again.", "error", "Funding failed");
                  }
                }
              }}
              disabled={isJoinerFunding}
              className={`w-full rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400/30 mb-1 ${
                isJoinerFunding ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isJoinerFunding ? 'Funding… Confirm in wallet' : 'Fund Entry'}
            </button>
            <div className="text-[10px] text-green-100/90 font-medium mb-1">
              This will open your wallet
            </div>
            <div className="text-[10px] text-green-100/70 mb-2">
              {entryFee} USDFG + standard network fee
            </div>
            <div className="text-[10px] text-green-100/60 italic">
              Your funds are held securely in escrow until the match is completed.
            </div>
          </div>
        </div>
      )}

      {/* Creator Delete Button - Show when challenge is pending and creator is viewing */}
      {isCreator && status === 'pending_waiting_for_opponent' && canCreatorCancel && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-red-200 mb-1.5">
              Your Challenge is Waiting for an Opponent
            </div>
            <div className="text-[10px] text-red-100/80 mb-2">
              No one has joined yet. You can delete this challenge if you no longer want to wait.
            </div>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onCancelChallenge && requestAppConfirm) {
                  const ok = await requestAppConfirm({
                    title: "Delete challenge?",
                    message: "Are you sure you want to delete this challenge? This action cannot be undone.",
                    confirmLabel: "Delete",
                    cancelLabel: "Keep",
                    destructive: true,
                  });
                  if (!ok) return;
                  try {
                    await onCancelChallenge(activeChallenge);
                  } catch (error: any) {
                    console.error('Failed to delete challenge:', error);
                    onAppToast?.(error.message || "Failed to delete challenge. Please try again.", "error", "Delete failed");
                  }
                }
              }}
              className="w-full rounded-md bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(239,68,68,0.4)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-red-400/30"
            >
              🗑️ Delete Challenge
            </button>
          </div>
        </div>
      )}

      {/* Join Challenge Button - Show if user can join */}
      {canJoin && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-2.5">
          <div className="text-center">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onJoinChallenge) {
                  try {
                    // Force immediate local UI transition while Firestore listener catches up.
                    if (currentWallet) {
                      setLiveChallenge((prev: any) => ({
                        ...(prev || activeChallenge),
                        status: 'creator_confirmation_required',
                        pendingJoiner: currentWallet,
                        rawData: {
                          ...((prev?.rawData || activeChallenge?.rawData || {})),
                          status: 'creator_confirmation_required',
                          pendingJoiner: currentWallet,
                        },
                      }));
                    }
                    await onJoinChallenge(activeChallenge);
                    // Force refresh from source of truth after join success.
                    if (activeChallenge?.id) {
                      const refreshed = await fetchChallengeById(activeChallenge.id);
                      if (refreshed) {
                        setLiveChallenge({
                          ...refreshed,
                          rawData: refreshed.rawData || refreshed,
                        });
                      }
                    }
                  } catch (error: any) {
                    console.error('Failed to join challenge:', error);
                    onAppToast?.(error.message || "Failed to join challenge. Please try again.", "error", "Join failed");
                  }
                }
              }}
              className="w-full rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-blue-400/30 mb-1"
            >
              Join Challenge
            </button>
            <div className="text-[10px] text-blue-100/90 font-medium mb-1">
              No wallet required
            </div>
            <div className="text-[10px] text-blue-100/70">
              This step only signals your intent to compete. You won't be charged and your wallet will not open.
            </div>
          </div>
        </div>
      )}

      {/* Status Banner - Prominent display */}
      {status === 'active' && isParticipant && opponentWallet && (
        <div className="rounded-lg border border-white/10 bg-[#07080C]/95 p-2.5 text-xs text-white/90 ring-1 ring-purple-500/10">
          <div className="text-[10px] uppercase tracking-widest text-purple-300 mb-1.5">
            Match Active
          </div>
          <div className="text-sm font-semibold text-white mb-1">
            Head-to-Head: {opponentWallet && typeof opponentWallet === 'string' ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Waiting for opponent'}
          </div>
          <p className="text-[10px] text-white/55 mt-0.5">
            Both players have funded. Play your match and submit results.
          </p>
        </div>
      )}

      {/* Challenge Header Card */}
      <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white mb-0.5 truncate">
              {challenge.title || `${game} ${mode}`}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
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
        <div className={`rounded-md border p-2 mb-2 ${statusDisplay.bgClass} ${statusDisplay.borderClass}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{statusDisplay.icon}</span>
            <div className="flex-1">
              <div className={`text-[10px] uppercase tracking-widest ${statusDisplay.headerClass} mb-0.5`}>
                Status
              </div>
              <div className={`text-xs font-semibold ${statusDisplay.textClass}`}>
                {statusDisplay.text}
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Challenge Amount</div>
              {canEditEntryFee && !isEditingEntryFee && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditingEntryFee(true);
                  }}
                  className="text-[10px] text-purple-200/90 hover:text-purple-100 underline-offset-2 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {!isEditingEntryFee && (
              <div className="text-white font-semibold text-xs">{entryFee} USDFG</div>
            )}
            {canEditEntryFee && isEditingEntryFee && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryFeeDraft}
                    onChange={(e) => setEntryFeeDraft(e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-1 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    placeholder="USDFG amount"
                  />
                </div>
                {entryFeeError && (
                  <div className="text-[10px] text-red-300">{entryFeeError}</div>
                )}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveEntryFee();
                    }}
                    disabled={isUpdatingEntryFee}
                    className="flex-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingEntryFee ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditingEntryFee(false);
                      setEntryFeeError(null);
                      setEntryFeeDraft(String(entryFee || ''));
                    }}
                    className="flex-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 border border-white/10 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Challenge Reward</div>
            <div className="text-white font-semibold text-xs">{prizePool} USDFG</div>
          </div>
          <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Players</div>
            <div className="text-white font-semibold">{players.length}/2</div>
          </div>
          <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Format</div>
            <div className="text-white font-semibold text-xs">Standard</div>
          </div>
        </div>

      </div>

      {/* Submit Result Section */}
      {canSubmitResult && !showSubmitForm && (
        <div className="rounded-lg border border-white/10 bg-[#07080C]/95 p-2.5 ring-1 ring-purple-500/10">
          <div className="text-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSubmitForm(true);
              }}
              className="relative w-full rounded-md bg-gradient-to-r from-purple-500 to-orange-500 hover:brightness-110 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(124,58,237,0.22)] border border-white/10 mb-1"
            >
              Submit Result
            </button>
            <div className="text-[10px] text-white/70 font-medium mb-1">
              No wallet required
            </div>
            <div className="text-[10px] text-white/55">
              Results are recorded off-chain and verified before payout.
            </div>
          </div>
        </div>
      )}

      {/* Show message if already submitted */}
      {hasAlreadySubmitted && (status === 'active' || status === 'awaiting_auto_resolution') && isParticipant && (
        <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-2.5 text-center text-xs text-green-100">
          <div className="text-sm font-semibold text-white mb-0.5">
            ✅ Result Submitted
          </div>
          <p className="text-[10px] text-green-100/80 mt-0.5">
            You have already submitted your result. Waiting for opponent...
          </p>
        </div>
      )}

      {status === 'awaiting_auto_resolution' && isParticipant && currentWallet && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/25 p-2.5 text-center ring-1 ring-amber-500/10">
          <p className="text-[10px] text-amber-100/85 mb-2">
            If the automatic outcome is wrong or you need admin review, you can open a dispute.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleDisputeResult();
            }}
            disabled={isDisputing}
            className="w-full rounded-md border border-amber-500/40 bg-amber-600/20 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDisputing ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Opening…
              </span>
            ) : (
              'Dispute Result'
            )}
          </button>
        </div>
      )}

      {/* Submit Result Form - Inline in lobby */}
      {canSubmitResult && showSubmitForm && !hasAlreadySubmitted && (
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-[#07080C]/98 via-purple-950/20 to-[#07080C]/98 p-2.5 space-y-2 ring-1 ring-purple-500/10">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              🏆 Submit Result
            </h3>
            <button
              onClick={() => {
                setShowSubmitForm(false);
                setSelectedResult(null);
                setProofImage(null);
                setProofFile(null);
              }}
              className="text-gray-400 hover:text-white transition-colors p-0.5"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Result Selection */}
          <div>
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border-white/10 rounded-md p-1.5 mb-2">
              <p className="text-xs font-semibold text-white text-center">
                Did you win this match?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSelectedResult(true)}
                disabled={isLoading || isSubmitting}
                className={`
                  relative overflow-hidden p-2 rounded-md border transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedResult === true
                      ? "border-green-500/60 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow shadow-green-500/10"
                      : "border-zinc-700/50 bg-zinc-800/60 hover:border-green-500/30 hover:bg-green-500/5"
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-xl mb-0.5">🏆</div>
                  <p className="text-xs font-bold text-white">YES</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">I won</p>
                </div>
                {selectedResult === true && (
                  <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                onClick={() => setSelectedResult(false)}
                disabled={isLoading || isSubmitting}
                className={`
                  relative overflow-hidden p-2 rounded-md border transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedResult === false
                      ? "border-red-500/60 bg-gradient-to-br from-red-500/10 to-rose-500/10 shadow shadow-red-500/10"
                      : "border-zinc-700/50 bg-zinc-800/60 hover:border-red-500/30 hover:bg-red-500/5"
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-xl mb-0.5">😔</div>
                  <p className="text-xs font-bold text-white">NO</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">I lost</p>
                </div>
                {selectedResult === false && (
                  <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Proof Upload Section */}
          {selectedResult === true && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-200">
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
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-600/90 to-purple-700/90 hover:brightness-110 text-white rounded-md transition-all text-[10px] font-medium border border-white/10"
                    >
                      <Camera className="w-3 h-3" />
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
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-md transition-all text-[10px] font-medium border border-white/10"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    Screenshot of victory screen or match result
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={proofImage}
                    alt="Proof"
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 rounded-full text-white transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-green-600/90 rounded text-[10px] text-white flex items-center gap-0.5">
                    <ImageIcon className="w-2 h-2" />
                    Proof uploaded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-1.5">
            <p className="text-[10px] text-blue-300 text-center">
              ⏰ Your opponent has 2 hours to submit their result
            </p>
          </div>

          {/* Double-claim integrity warning – give player a chance to correct before creating a dispute */}
          {showIntegrityConfirm && (
            <div className="rounded-lg border border-orange-500/40 bg-orange-950/20 p-3 space-y-3 ring-1 ring-orange-500/10">
              <p className="text-xs font-semibold text-orange-200 text-center">
                ⚠️ Please double-check your result
              </p>
              <p className="text-[11px] text-orange-100/90 text-center">
                The system detected that both players may have claimed the same outcome. Please make sure you are submitting the correct result to keep the integrity of the platform. Incorrect submissions can lead to disputes and delays.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIntegrityConfirm(false)}
                  className="flex-1 py-2 rounded-md border border-white/20 bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowIntegrityConfirm(false);
                    doSubmitResult();
                  }}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-md border border-orange-500/45 bg-orange-600/25 text-orange-50 text-xs font-semibold hover:bg-orange-600/35 disabled:opacity-50"
                >
                  {isLoading ? 'Submitting…' : 'I confirm, submit'}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={selectedResult === null || isLoading || isSubmitting || hasAlreadySubmitted || showIntegrityConfirm}
            className={`
              w-full py-1.5 rounded-md font-semibold text-xs transition-all duration-200 border
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                selectedResult !== null
                  ? "bg-gradient-to-r from-purple-500 to-orange-500 hover:brightness-110 text-white shadow-[0_0_10px_rgba(124,58,237,0.22)] border border-white/10"
                  : "bg-zinc-700/60 text-gray-400 cursor-not-allowed border-zinc-700/50"
              }
            `}
          >
            {isLoading || isSubmitting ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Result"
            )}
          </button>

          {/* Warning */}
          <p className="text-[10px] text-gray-500 text-center">
            ⚠️ Results are final and cannot be changed after submission
          </p>
        </div>
      )}

      {/* Reward Claiming Section - Show when challenge is completed and user won */}
      {canClaimPrize && !prizeClaimed && (
        <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-2.5 space-y-2">
          <div className="text-center">
            <div className="text-2xl mb-1.5">🏆</div>
            <h3 className="text-sm font-bold text-emerald-200 mb-1">You Won!</h3>
            <button
              type="button"
              onClick={async () => {
                try {
                  await onClaimPrize(activeChallenge);
                } catch (error) {
                  console.error('Error claiming reward:', error);
                }
              }}
              disabled={isClaiming || prizeClaimed}
              className="w-full rounded-md bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(34,197,94,0.25)] border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed mb-1"
            >
              {isClaiming ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Claiming… Confirm in wallet
                </span>
              ) : prizeClaimed ? (
                "Claimed"
              ) : (
                "Claim Reward"
              )}
            </button>
            <div className="text-[10px] text-emerald-100/90 font-medium mb-1">
              This will open your wallet
            </div>
            <div className="text-xs text-emerald-100/80 mb-1">
              Reward payout minus platform fee
            </div>
            <div className="text-[10px] text-emerald-100/60 italic">
              This action releases escrowed USDFG to the winner.
            </div>
          </div>
        </div>
      )}

      {/* Reward Claimed Message (canClaimPrize is false once claimed, so key off win + completed) */}
      {isParticipant && status === "completed" && userWon && prizeClaimed && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-center">
          <div className="text-xl mb-1.5">✅</div>
          <p className="text-xs font-semibold text-emerald-200">
            Reward claimed! Check your wallet for {prizePool} USDFG
          </p>
        </div>
      )}

      {/* Dispute Status Message */}
      {status === 'disputed' && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 text-center">
          <div className="text-xl mb-1.5">🔴</div>
          <h3 className="text-sm font-bold text-red-200 mb-1">Dispute Detected</h3>
          <p className="text-xs text-red-100/80 mb-2">
            Both players claimed victory. Waiting for admin resolution.
          </p>
          <p className="text-[10px] text-red-100/60">
            Lobby will remain open until admin resolves. You can continue chatting.
          </p>
        </div>
      )}

      {/* Admin: Resolve dispute – show both submissions’ proof images, then pick winner */}
      {status === 'disputed' && isAdmin && creatorWallet && (
        <div className="rounded-lg border border-white/10 bg-[#07080C]/95 p-3 ring-1 ring-purple-500/10">
          <h3 className="text-sm font-bold text-white mb-2">Admin: Resolve dispute</h3>
          <p className="text-[11px] text-white/60 mb-3">
            Review what each player submitted, then choose who won. You only correct the outcome here (no SOL fee). The winner will claim their reward themselves and pay the network fee.
          </p>
          {(() => {
            const getResultForWallet = (wallet: string) => {
              if (!results || typeof results !== 'object') return null;
              const key = canonicalPlayerKey(players, wallet);
              return results[key] ?? null;
            };
            const creatorResult = getResultForWallet(creatorWallet);
            const challengerResult = challengerWallet ? getResultForWallet(challengerWallet) : null;
            return (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg border border-white/20 bg-black/30 p-2">
                    <div className="text-[10px] font-semibold text-emerald-300 mb-1">Creator’s submission</div>
                    {creatorResult?.proofImageData ? (
                      <img src={creatorResult.proofImageData} alt="Creator proof" className="w-full aspect-video object-contain rounded bg-black/50" />
                    ) : (
                      <div className="w-full aspect-video rounded bg-black/50 flex items-center justify-center text-[10px] text-white/50">No image</div>
                    )}
                    <div className="text-[10px] text-white/70 mt-1">{creatorResult?.didWin ? 'Claimed: I won' : 'Claimed: I lost'}</div>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-black/30 p-2">
                    <div className="text-[10px] font-semibold text-rose-300 mb-1">Challenger’s submission</div>
                    {challengerResult?.proofImageData ? (
                      <img src={challengerResult.proofImageData} alt="Challenger proof" className="w-full aspect-video object-contain rounded bg-black/50" />
                    ) : (
                      <div className="w-full aspect-video rounded bg-black/50 flex items-center justify-center text-[10px] text-white/50">No image</div>
                    )}
                    <div className="text-[10px] text-white/70 mt-1">{challengerResult ? (challengerResult.didWin ? 'Claimed: I won' : 'Claimed: I lost') : '—'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {creatorWallet && (
                    <button
                      type="button"
                      disabled={!!resolvingWinner}
                      onClick={() => handleResolveDispute(creatorWallet)}
                      className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolvingWinner === creatorWallet ? (
                        <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Resolving…</span>
                      ) : (
                        <>Creator wins</>
                      )}
                    </button>
                  )}
                  {challengerWallet && (
                    <button
                      type="button"
                      disabled={!!resolvingWinner}
                      onClick={() => handleResolveDispute(challengerWallet)}
                      className="px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolvingWinner === challengerWallet ? (
                        <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Resolving…</span>
                      ) : (
                        <>Challenger wins</>
                      )}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Status message when can't submit or claim */}
      {!canSubmitResult && !canClaimPrize && status !== 'disputed' && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
          <div className="text-[10px] text-gray-400">
            {status !== 'active' && status !== 'completed' && `Status: ${statusDisplay.text}`}
            {status === 'active' && players.length < 2 && 'Waiting for players to join...'}
            {status === 'active' && players.length >= 2 && !currentWallet && 'Connect wallet to submit results'}
            {status === 'active' && players.length >= 2 && currentWallet && !isParticipant && (
              <span>
                👁️ <span className="text-purple-300">Viewing as Spectator</span> - You can watch and chat, but only participants can submit results
              </span>
            )}
            {status === 'active' && players.length >= 2 && !currentWallet && (
              <span>
                👁️ <span className="text-purple-300">Viewing as Spectator</span> - Connect wallet to participate
              </span>
            )}
            {status === 'completed' && !userWon && 'Match completed'}
          </div>
        </div>
      )}

      {/* Match Chat and Voice Room - Always stacked vertically, Match Chat first */}
      <div className="space-y-2">
        {/* Match Chat - First */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
          <ChatBox 
            challengeId={activeChallenge.id} 
            currentWallet={currentWallet || ""} 
            status={status}
            platform={platform}
            playersCount={players.length}
            onAppToast={onAppToast}
          />
        </div>
        
        {/* Voice Room - Second (below Match Chat) */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-300/80">
              Voice Room
            </div>
            {canShowCreatorControls && (
              <div className="text-[9px] text-white/45">
                Creator Controls {isActiveMatch ? 'Active' : 'Available'}
              </div>
            )}
          </div>
          
          {/* Warning for spectators during active matches */}
          {isActiveMatch && userRole === 'spectator' && (
            <div className="mb-2 p-2 rounded-lg border border-purple-500/30 bg-purple-900/20">
              <div className="text-[10px] font-semibold text-purple-300 mb-0.5">
                🔇 Listen Only Mode
              </div>
              <div className="text-[9px] text-purple-200/70">
                Voice chat is disabled for spectators during active challenges. Spectators cannot influence match outcomes.
              </div>
            </div>
          )}
          
          <VoiceChat 
            challengeId={voiceChatChallengeId} 
            currentWallet={voiceChatCurrentWallet}
            challengeStatus={status}
            isSpectator={userRole === 'spectator'}
            isCreator={userRole === 'creator'}
            participants={participants}
            spectators={spectators}
          />
          
          {/* Creator Mute Controls - Show in pre-match lobby and during active matches */}
          {canShowCreatorControls && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/90 mb-1.5">
                Creator Controls {isActiveMatch ? '(Active Match)' : '(Pre-Match Lobby)'}
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-400">
                  Speaker slots: {speakerWallets.length}/{MAX_VOICE_SPEAKERS}
                  {speakerWallets.length >= MAX_VOICE_SPEAKERS && (
                    <span className="ml-1 text-orange-300/90">(full)</span>
                  )}
                </div>
                {speakerWallets.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-semibold text-white/80">Active speakers</div>
                    {speakerWallets.map((w) => {
                      const data = playerData[w.toLowerCase()] || {};
                      const displayName = data.displayName || `${w.slice(0, 4)}...${w.slice(-4)}`;
                      return (
                        <div key={w} className="flex items-center gap-2 py-0.5 px-2 rounded bg-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="text-xs text-white/90 truncate">{displayName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-white/80">Mic requests</div>
                  {pendingMicRequests.length === 0 ? (
                    <div className="text-[10px] text-gray-500 py-0.5">No pending requests</div>
                  ) : (
                    pendingMicRequests.map(({ wallet: requesterWallet }) => {
                      const data = playerData[requesterWallet.toLowerCase()] || {};
                      const displayName = data.displayName || `${requesterWallet.slice(0, 4)}...${requesterWallet.slice(-4)}`;
                      const slotsFull = speakerWallets.length >= MAX_VOICE_SPEAKERS;
                      return (
                        <div key={requesterWallet} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-white/5 flex-wrap">
                          <span className="text-xs text-white/90 truncate">{displayName}</span>
                          <div className="flex gap-1 flex-shrink-0 flex-wrap">
                            {slotsFull ? (
                              <>
                                {speakerWallets.map((replaceWallet) => {
                                  const replaceData = playerData[replaceWallet.toLowerCase()] || {};
                                  const replaceName = replaceData.displayName || `${replaceWallet.slice(0, 4)}...${replaceWallet.slice(-4)}`;
                                  return (
                                    <button
                                      key={replaceWallet}
                                      type="button"
                                      onClick={async () => {
                                        await approveMicRequestReplace(challengeId, requesterWallet, replaceWallet, currentWallet || '');
                                      }}
                                      className="px-2 py-0.5 rounded bg-green-600/30 hover:bg-green-600/50 text-green-200 text-[10px] font-medium"
                                    >
                                      Replace {replaceName}
                                    </button>
                                  );
                                })}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await approveMicRequest(challengeId, requesterWallet, currentWallet || '');
                                  if (!ok) onAppToast?.("Speaker slots full. Request not approved.", "warning", "Voice");
                                }}
                                className="px-2 py-0.5 rounded bg-green-600/30 hover:bg-green-600/50 text-green-200 text-[10px] font-medium"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => denyMicRequest(challengeId, requesterWallet, currentWallet || '')}
                              className="px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600/50 text-red-200 text-[10px] font-medium"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Mute All Spectators Button */}
                {spectators.length > 0 && (
                  <MuteAllSpectatorsButton 
                    challengeId={challengeId}
                    spectators={spectators}
                    onAppToast={onAppToast}
                  />
                )}
                
                {/* Mute Individual Participants */}
                {participants.filter((p: string) => p?.toLowerCase() !== creatorWallet?.toLowerCase()).map((wallet: string) => {
                  const data = playerData[wallet.toLowerCase()] || {};
                  const displayName = data.displayName || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
                  
                  return (
                    <MuteParticipantButton
                      key={wallet}
                      challengeId={challengeId}
                      wallet={wallet}
                      displayName={displayName}
                      onAppToast={onAppToast}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardChallengeLobby;

