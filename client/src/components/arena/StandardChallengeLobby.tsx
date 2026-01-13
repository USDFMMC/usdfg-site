import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { getPlayerStats, fetchChallengeById } from "@/lib/firebase/firestore";
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, serverTimestamp, Timestamp, getDocs, getDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface StandardChallengeLobbyProps {
  challenge: any;
  currentWallet?: string | null;
  onSubmitResult: (didWin: boolean, proofFile?: File | null) => Promise<void>;
  onClaimPrize: (challenge: any) => Promise<void>;
  onJoinChallenge?: (challenge: any) => Promise<void>;
  onCreatorFund?: (challenge: any) => Promise<void>;
  onJoinerFund?: (challenge: any) => Promise<void>;
  onCancelChallenge?: (challenge: any) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  isClaiming?: boolean;
}

const StandardChallengeLobby: React.FC<StandardChallengeLobbyProps> = ({
  challenge,
  currentWallet,
  onSubmitResult,
  onClaimPrize,
  onJoinChallenge,
  onCreatorFund,
  onJoinerFund,
  onCancelChallenge,
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
  const [playerData, setPlayerData] = useState<Record<string, { displayName?: string; profileImage?: string }>>({});
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  
  // Real-time challenge data - ensures button visibility updates immediately
  const [liveChallenge, setLiveChallenge] = useState<any>(challenge);
  
  // Initialize liveChallenge immediately when challenge prop changes (for faster button visibility)
  useEffect(() => {
    if (challenge) {
      setLiveChallenge(challenge);
      // Debug: Log when challenge prop changes
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Challenge prop updated:', {
          challengeId: challenge.id,
          status: challenge.status || challenge.rawData?.status,
          pendingJoiner: challenge.pendingJoiner || challenge.rawData?.pendingJoiner,
          creator: challenge.creator || challenge.rawData?.creator
        });
      }
    }
  }, [challenge]);
  
  // Listen to real-time challenge updates to ensure button visibility is always accurate
  // Set up listener immediately (no delay) for instant updates when someone expresses intent
  // This is the PRIMARY source of truth - updates immediately when Firestore changes
  useEffect(() => {
    if (!challenge?.id) {
      return;
    }
    
    const challengeRef = doc(db, 'challenges', challenge.id);
    
    // Set up listener immediately - no delays for instant button visibility
    // onSnapshot fires immediately when document changes, ensuring instant updates
    // This listener is the PRIMARY source - it updates liveChallenge immediately
    // regardless of when the parent component's selectedChallenge prop updates
    const unsubscribe = onSnapshot(
      challengeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const updatedData = { id: snapshot.id, ...snapshot.data(), rawData: snapshot.data() };
          // Update immediately - no debouncing or delays
          // This ensures "Fund Challenge" button appears instantly when someone expresses intent
          // Priority: This listener > prop updates (for instant button visibility)
          // CRITICAL: Always update liveChallenge immediately - don't check for changes first
          // This prevents any delay in button visibility
          setLiveChallenge(updatedData);
        } else {
          // If document doesn't exist, fallback to prop
          setLiveChallenge(challenge);
        }
      },
      (error) => {
        // Non-critical error - don't update on error, keep current state
        if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
          console.error('Error listening to challenge updates:', error);
        }
      }
    );
    
    return () => unsubscribe();
  }, [challenge?.id]);
  
  // Use live challenge data if available, fallback to prop
  const activeChallenge = liveChallenge || challenge;

  const status = activeChallenge.status || activeChallenge.rawData?.status || 'pending_waiting_for_opponent';
  
  // ALWAYS log status and creator info (helps diagnose button visibility)
  console.log('🔍 StandardChallengeLobby Status Check:', {
    status,
    challengeId: activeChallenge.id,
    creator: activeChallenge.creator || activeChallenge.rawData?.creator,
    currentWallet: currentWallet?.toLowerCase(),
    pendingJoiner: activeChallenge.pendingJoiner || activeChallenge.rawData?.pendingJoiner,
    hasLiveChallenge: !!liveChallenge,
    liveChallengeStatus: liveChallenge?.status || liveChallenge?.rawData?.status
  });
  const players = activeChallenge.rawData?.players || activeChallenge.players || [];
  const entryFee = activeChallenge.entryFee || activeChallenge.rawData?.entryFee || 0;
  const prizePool = activeChallenge.prizePool || activeChallenge.rawData?.prizePool || (entryFee * 2);
  const game = activeChallenge.game || activeChallenge.rawData?.game || 'USDFG Arena';
  const mode = activeChallenge.mode || activeChallenge.rawData?.mode || 'Head-to-Head';
  const platform = activeChallenge.platform || activeChallenge.rawData?.platform || 'All Platforms';
  const challengeId = activeChallenge.id;
  
  // Memoize props to prevent VoiceChat from remounting unnecessarily
  const voiceChatChallengeId = useMemo(() => challengeId, [challengeId]);
  const voiceChatCurrentWallet = useMemo(() => currentWallet || "", [currentWallet]);

  // Check if user already submitted result (moved up for use in handleSubmit)
  const results = activeChallenge.rawData?.results || activeChallenge.results || {};
  const userResult = currentWallet ? results[currentWallet.toLowerCase()] : null;
  const hasAlreadySubmitted = !!userResult;

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
    
    // Prevent double submission - check if already submitted or currently loading
    if (isLoading || hasAlreadySubmitted) {
      console.log("⚠️ Submission prevented - already submitted or in progress");
      return;
    }
    
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
  }, [selectedResult, proofFile, onSubmitResult, isLoading, hasAlreadySubmitted]);

  
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
  
  // Check if user is a participant - must check players array AND creator/challenger/pendingJoiner fields
  // because players array is only populated when joiner funds, but they're participants before that
  const creatorWallet = activeChallenge.creator || activeChallenge.rawData?.creator || '';
  const challengerWallet = activeChallenge.rawData?.challenger || activeChallenge.challenger;
  const pendingJoinerWallet = activeChallenge.rawData?.pendingJoiner || activeChallenge.pendingJoiner;
  
  const isCreator = currentWallet && creatorWallet.toLowerCase() === currentWallet.toLowerCase();
  const isChallenger = currentWallet && challengerWallet && challengerWallet.toLowerCase() === currentWallet.toLowerCase();
  const isPendingJoiner = currentWallet && pendingJoinerWallet && pendingJoinerWallet.toLowerCase() === currentWallet.toLowerCase();
  const isInPlayersArray = currentWallet && players.some((p: string) => p?.toLowerCase() === currentWallet?.toLowerCase());
  
  // User is a participant if they're in players array, OR they're the creator, challenger, or pending joiner
  const isParticipant = isInPlayersArray || isCreator || isChallenger || isPendingJoiner;
  const maxPlayers = activeChallenge.maxPlayers || activeChallenge.rawData?.maxPlayers || 2;
  
  // Calculate actual participant count (including creator, challenger, pendingJoiner, and players array)
  const allParticipantsSet = new Set<string>();
  if (creatorWallet) allParticipantsSet.add(creatorWallet.toLowerCase());
  if (challengerWallet) allParticipantsSet.add(challengerWallet.toLowerCase());
  if (pendingJoinerWallet) allParticipantsSet.add(pendingJoinerWallet.toLowerCase());
  players.forEach((p: string) => allParticipantsSet.add(p.toLowerCase()));
  const actualParticipantCount = allParticipantsSet.size;
  const isFull = actualParticipantCount >= maxPlayers;
  
  // Check if creator can fund (status is creator_confirmation_required and deadline hasn't expired)
  const creatorFundingDeadline = activeChallenge.rawData?.creatorFundingDeadline || activeChallenge.creatorFundingDeadline;
  const isDeadlineExpired = creatorFundingDeadline ? creatorFundingDeadline.toMillis() < Date.now() : false;
  
  // Get pending joiner info (needed for multiple checks below)
  // Note: pendingJoinerWallet already defined above
  const isAlreadyPendingJoiner = isPendingJoiner;
  
  const canCreatorFund = isCreator && status === 'creator_confirmation_required' && !isDeadlineExpired && onCreatorFund;
  
  // ALWAYS log creator fund button conditions (helps diagnose why button isn't showing)
  console.log('💰 Creator Fund Button Check:', {
    isCreator,
    status,
    isDeadlineExpired,
    hasOnCreatorFund: !!onCreatorFund,
    pendingJoiner: pendingJoinerWallet,
    canCreatorFund,
    creatorWallet: creatorWallet?.toLowerCase(),
    currentWallet: currentWallet?.toLowerCase(),
    match: creatorWallet?.toLowerCase() === currentWallet?.toLowerCase()
  });
  
  // Debug logging disabled to reduce console spam
  // Uncomment only when debugging specific issues
  // if (status === 'creator_confirmation_required' && process.env.NODE_ENV === 'development') {
  //   console.log('🔍 Creator Confirmation Required Debug:', { ... });
  // }
  
  // Check if joiner can fund (status is creator_funded, user is the challenger, and deadline hasn't expired)
  const joinerFundingDeadline = challenge.rawData?.joinerFundingDeadline || challenge.joinerFundingDeadline;
  const isJoinerDeadlineExpired = joinerFundingDeadline && joinerFundingDeadline.toMillis() < Date.now();
  const canJoinerFund = isChallenger && status === 'creator_funded' && !isJoinerDeadlineExpired && onJoinerFund;
  
  // If deadline expired, creator should be able to join their own challenge (it reverted)
  const canCreatorJoinAfterExpiry = isCreator && status === 'creator_confirmation_required' && isDeadlineExpired && currentWallet && onJoinChallenge;
  const canCreatorJoinPending = isCreator && status === 'pending_waiting_for_opponent' && !isParticipant && currentWallet && onJoinChallenge;
  
  // Intent to join should always be available (first-come-first-served)
  // Allow joining if:
  // - User is not already a participant
  // - Challenge is not full
  // - Challenge is in a joinable state (pending, or creator_confirmation_required with expired deadline)
  // - User is not the creator (unless deadline expired and challenge reverted)
  // Note: Even if someone already expressed intent, others can try (first transaction wins)
  const canJoin = !isParticipant && !isFull && currentWallet && onJoinChallenge &&
    (
      status === 'pending_waiting_for_opponent' || 
      (status === 'creator_confirmation_required' && (isDeadlineExpired || !isCreator)) ||
      (status === 'creator_funded' && isJoinerDeadlineExpired) // If joiner deadline expired, challenge reverts and others can join
    );
  
  // Creator can cancel/delete if deadline expired or status is pending (no one joined yet)
  const canCreatorCancel = isCreator && (isDeadlineExpired || status === 'pending_waiting_for_opponent') && onCancelChallenge;
  
  const canSubmitResult = status === 'active' && players.length >= 2 && isParticipant && !hasAlreadySubmitted;
  
  // Check if user won and can claim prize
  const winner = activeChallenge.rawData?.winner || activeChallenge.winner;
  const userWon = currentWallet && winner && winner.toLowerCase() === currentWallet.toLowerCase();
  const canClaimPrize = status === 'completed' && userWon && isParticipant;
  const prizeClaimed = activeChallenge.rawData?.prizeClaimed || activeChallenge.prizeClaimed;
  
  // Get opponent wallet for display
  const opponentWallet = players.length >= 2 && currentWallet 
    ? players.find((p: string) => p?.toLowerCase() !== currentWallet?.toLowerCase())
    : null;

  // Fetch player display names and profile images
  useEffect(() => {
    const fetchPlayerData = async () => {
      const data: Record<string, { displayName?: string; profileImage?: string }> = {};
      for (const wallet of players) {
        if (wallet) {
          try {
            const stats = await getPlayerStats(wallet);
            if (stats) {
              data[wallet.toLowerCase()] = {
                displayName: stats.displayName,
                profileImage: stats.profileImage,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch stats for ${wallet}:`, error);
          }
        }
      }
      setPlayerData(data);
    };
    
    if (players.length > 0) {
      fetchPlayerData();
    }
  }, [players]);

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
  
  // Ephemeral spectator tracking - NO PERSISTENT DATA
  // Users can join as spectators (real-time only)
  // When they leave, ALL their data is deleted (spectator doc + chat messages)
  useEffect(() => {
    if (!challengeId || !currentWallet) {
      setSpectatorCount(0);
      return;
    }
    
    // Check if current user is a participant
    const isParticipant = participants.some((p: string) => p?.toLowerCase() === currentWallet.toLowerCase());
    
    // Only track as spectator if not a participant
    if (!isParticipant) {
      // Single stats document for this challenge lobby (cost-effective!)
      const statsRef = doc(db, 'challenge_lobbies', challengeId, 'stats', 'count');
      let isMounted = true;
      let hasJoined = false;
      
      // Helper function to delete all user chat messages
      const cleanupChatMessages = () => {
        if (!isMounted) return;
        
        // Delete ALL chat messages from this user in this challenge
        (async () => {
          try {
            const messagesRef = collection(db, 'challenge_chats');
            const messagesQuery = query(
              messagesRef,
              where('challengeId', '==', challengeId),
              where('sender', '==', currentWallet)
            );
            
            const messagesSnapshot = await getDocs(messagesQuery);
            const deletePromises = messagesSnapshot.docs.map((messageDoc) => 
              deleteDoc(doc(db, 'challenge_chats', messageDoc.id)).catch(err => {
                if (err.code !== 'permission-denied' && err.code !== 'unavailable' && err.code !== 'not-found') {
                  console.error('Failed to delete chat message:', err);
                }
              })
            );
            
            await Promise.all(deletePromises);
          } catch (err: any) {
            if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
              console.error('Failed to delete chat messages:', err);
            }
          }
        })();
      };
      
      // Check current count before incrementing (prevent exceeding 69 limit)
      getDoc(statsRef).then((snap) => {
        const currentCount = snap.exists() ? (snap.data().spectatorCount || 0) : 0;
        
        // Only increment if under limit
        if (currentCount < MAX_SPECTATORS) {
          // Increment spectator count when joining (using Firestore increment)
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
                hasJoined = true;
              } catch (createErr: any) {
                if (createErr.code !== 'permission-denied' && createErr.code !== 'unavailable') {
                  console.error('Failed to create spectator count:', createErr);
                }
              }
            } else if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
              console.error('Failed to increment spectator count:', err);
            } else {
              hasJoined = true; // Assume it worked if permission denied
            }
          }).then(() => {
            hasJoined = true;
          });
        } else {
          // Limit reached - user cannot join as spectator
          console.log(`⚠️ Spectator limit reached (${MAX_SPECTATORS}). Cannot join as spectator.`);
        }
      }).catch(() => {
        // If getDoc fails, try to increment anyway (optimistic - limit will be enforced by listener)
        updateDoc(statsRef, {
          spectatorCount: increment(1)
        }).catch(async (err) => {
          if (err.code === 'not-found') {
            try {
              await setDoc(statsRef, {
                spectatorCount: 1,
                createdAt: serverTimestamp(),
              });
              hasJoined = true;
            } catch (createErr: any) {
              if (createErr.code !== 'permission-denied' && createErr.code !== 'unavailable') {
                console.error('Failed to create spectator count:', createErr);
              }
            }
          } else if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
            console.error('Failed to increment spectator count:', err);
          } else {
            hasJoined = true;
          }
        }).then(() => {
          hasJoined = true;
        });
      });
      
      // Handle page unload (user closes tab/browser) - cleanup as best effort
      let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
      if (typeof window !== 'undefined') {
        beforeUnloadHandler = () => {
          // Decrement counter and cleanup on page unload
          if (hasJoined) {
            updateDoc(statsRef, {
              spectatorCount: increment(-1)
            }).catch(() => {}); // Ignore errors on page unload
            cleanupChatMessages();
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
        
        // Decrement spectator count on leave
        if (hasJoined) {
          updateDoc(statsRef, {
            spectatorCount: increment(-1)
          }).catch(err => {
            if (err.code !== 'permission-denied' && err.code !== 'unavailable' && err.code !== 'not-found') {
              console.error('Failed to decrement spectator count:', err);
            }
          });
        }
        
        // Clean up all chat messages
        cleanupChatMessages();
      };
    } else {
      setSpectatorCount(0);
    }
  }, [challengeId, currentWallet, participants]);
  
  // Listen to spectator count in real-time - SINGLE DOCUMENT (1 read total, NOT per spectator!)
  // ULTRA-COST-EFFECTIVE: Only 1 read per lobby, not per spectator
  useEffect(() => {
    if (!challengeId) {
      setSpectatorCount(0);
      return;
    }
    
    // SINGLE DOCUMENT - cost-effective! 1 read total, not per spectator
    const statsRef = doc(db, 'challenge_lobbies', challengeId, 'stats', 'count');
    
    let unsubscribeFn: (() => void) | null = null;
    let isActive = true;
    let setupTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Delay listener setup slightly to prevent race conditions
    setupTimeout = setTimeout(() => {
      if (!isActive) return;
      
      try {
        unsubscribeFn = onSnapshot(
          statsRef,
          (snapshot) => {
            if (!isActive) return;
            
            if (snapshot.exists()) {
              const data = snapshot.data();
              const count = data.spectatorCount || 0;
              // Cap at MAX_SPECTATORS (shouldn't happen, but safety check)
              setSpectatorCount(Math.max(0, Math.min(count, MAX_SPECTATORS)));
            } else {
              setSpectatorCount(0);
            }
          }, 
          (error) => {
            if (!isActive) return;
            
            // Handle errors gracefully without causing Firebase assertion failures
            if (error.code === 'permission-denied' || error.code === 'unavailable') {
              // Expected errors - just clear spectators
              setSpectatorCount(0);
              return;
            }
            
            // For unexpected errors, log but don't throw
            console.error('Error listening to spectators:', error);
            setSpectatorCount(0);
          }
        );
      } catch (error: any) {
        // Catch synchronous errors during setup
        if (!isActive) return;
        
        if (error.code === 'permission-denied' || error.code === 'unavailable') {
          setSpectatorCount(0);
          return;
        }
        
        console.error('Failed to set up spectator listener:', error);
        setSpectatorCount(0);
      }
    }, 100); // 100ms delay to prevent race conditions
    
    // Cleanup
    return () => {
      isActive = false;
      if (setupTimeout) {
        clearTimeout(setupTimeout);
      }
      if (unsubscribeFn) {
        try {
          // Unsubscribe immediately - Firebase handles cleanup internally
          unsubscribeFn();
        } catch (error) {
          // Ignore cleanup errors - listener may already be closed
        }
      }
    };
  }, [challengeId]);
  
  // Fetch participant data (display names, profile images) - only for participants, not spectators
  useEffect(() => {
    const fetchPlayerData = async () => {
      const data: Record<string, { displayName?: string; profileImage?: string }> = {};
      for (const wallet of participants) {
        if (wallet) {
          try {
            const stats = await getPlayerStats(wallet);
            if (stats) {
              data[wallet.toLowerCase()] = {
                displayName: stats.displayName,
                profileImage: stats.profileImage,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch stats for participant ${wallet}:`, error);
          }
        }
      }
      setPlayerData(data);
    };
    
    if (participants.length > 0) {
      fetchPlayerData();
    }
  }, [participants]);

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
                  className={`flex items-center gap-2 p-1.5 rounded-md ${
                    isCurrentUser ? 'bg-amber-500/10 border border-amber-400/30' : 'bg-white/5'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {data.profileImage ? (
                      <img src={data.profileImage} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-amber-300 font-semibold text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {displayName}
                      {isCurrentUser && <span className="ml-1.5 text-[10px] text-amber-300">(You)</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {wallet.slice(0, 6)}...{wallet.slice(-4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Spectators Section - Just show count (cost-effective, no individual tracking) */}
        {spectatorCount > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Spectators ({spectatorCount}/{MAX_SPECTATORS})
            </h3>
            <div className="text-[10px] text-gray-500 italic py-1">
              {spectatorCount} {spectatorCount === 1 ? 'person is' : 'people are'} watching
              {spectatorCount >= MAX_SPECTATORS && (
                <span className="block text-amber-400 mt-0.5">⚠️ Spectator limit reached</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Creator Fund Button - Show if creator needs to fund */}
      {canCreatorFund && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5" style={{ display: 'block' }}>
          {/* Debug: Force button to show */}
          {console.log('🎯 RENDERING CREATOR FUND BUTTON - canCreatorFund is TRUE')}
          <div className="text-center">
            <div className="text-xs font-semibold text-amber-200 mb-1.5">
              ✨ Confirm and Fund Challenge ✨
            </div>
            <div className="text-[10px] text-amber-100/80 mb-2">
              A challenger has expressed intent to join. Fund the escrow to lock them in.
            </div>
            {creatorFundingDeadline && (
              <div className="text-[10px] text-amber-300/70 mb-2">
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
                if (onCreatorFund) {
                  try {
                    await onCreatorFund(activeChallenge);
                  } catch (error: any) {
                    console.error('Failed to fund challenge:', error);
                    alert(error.message || 'Failed to fund challenge. Please try again.');
                  }
                } else {
                  console.error('onCreatorFund handler not provided');
                  alert('Error: Funding handler not available. Please refresh the page.');
                }
              }}
              className="w-full rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(245,158,11,0.4)] hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-400/30"
            >
              Fund Challenge ({entryFee} USDFG + Network Fee)
            </button>
          </div>
        </div>
      )}

      {/* Waiting message for joiner when creator needs to fund */}
      {!isCreator && status === 'creator_confirmation_required' && isAlreadyPendingJoiner && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-blue-200 mb-1.5">
              ⏳ Waiting for Creator to Fund
            </div>
            <div className="text-[10px] text-blue-100/80 mb-2">
              You've expressed intent to join. The creator needs to fund the challenge to proceed.
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
            <div className="text-[10px] text-blue-100/60">
              Once the creator funds, you'll be able to fund your entry and start the match.
            </div>
          </div>
        </div>
      )}

      {/* Debug info for creator when status is creator_confirmation_required but button not showing */}
      {isCreator && status === 'creator_confirmation_required' && !canCreatorFund && !isDeadlineExpired && (
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-yellow-200 mb-1.5">
              ⚠️ Funding Button Not Available
            </div>
            <div className="text-[10px] text-yellow-100/80 mb-1.5">
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
            ⚠️ Confirmation Deadline Expired
          </div>
          <div className="text-[10px] text-red-100/80 mb-2">
              The challenge has been reverted to waiting for opponent. You can now join as challenger or cancel the challenge.
          </div>
          </div>
          
          {/* Action Buttons for Creator */}
          <div className="flex flex-col gap-1.5">
            {/* Join as Challenger Button */}
            {(canCreatorJoinAfterExpiry || canCreatorJoinPending) && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // First, try to revert the challenge if it hasn't been reverted yet
                  try {
                    if (status === 'creator_confirmation_required' && isDeadlineExpired) {
                      const { revertCreatorTimeout } = await import('@/lib/firebase/firestore');
                      await revertCreatorTimeout(challenge.id);
                    }
                    // Then try to join
                    if (onJoinChallenge) {
                      await onJoinChallenge(activeChallenge);
                    }
                  } catch (error: any) {
                    console.error('Failed to join challenge:', error);
                    alert(error.message || 'Failed to join challenge. Please try again.');
                  }
                }}
                className="w-full rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-blue-400/30"
              >
                Join as Challenger ({entryFee} USDFG + Network Fee)
              </button>
            )}
            
            {/* Cancel/Delete Challenge Button */}
            {canCreatorCancel && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCancelChallenge) {
                    if (confirm('Are you sure you want to cancel/delete this challenge? This action cannot be undone.')) {
                      try {
                        await onCancelChallenge(activeChallenge);
                      } catch (error: any) {
                        console.error('Failed to cancel challenge:', error);
                        alert(error.message || 'Failed to cancel challenge. Please try again.');
                      }
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

      {/* Joiner Fund Button - Show if creator funded and joiner needs to fund */}
      {canJoinerFund && (
        <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-2.5">
          <div className="text-center">
            <div className="text-xs font-semibold text-green-200 mb-1.5">
              ✨ Creator Funded - Time to Fund Your Entry ✨
            </div>
            <div className="text-[10px] text-green-100/80 mb-2">
              The creator has funded their entry. Fund your entry to start the match.
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
                    alert(error.message || 'Failed to fund challenge. Please try again.');
                  }
                }
              }}
              className="w-full rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400/30"
            >
              Fund Challenge ({entryFee} USDFG + Network Fee)
            </button>
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
                if (onCancelChallenge) {
                  if (confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
                    try {
                      await onCancelChallenge(activeChallenge);
                    } catch (error: any) {
                      console.error('Failed to delete challenge:', error);
                      alert(error.message || 'Failed to delete challenge. Please try again.');
                    }
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
            <div className="text-xs font-semibold text-blue-200 mb-1.5">
              Join this challenge to compete for {prizePool} USDFG
            </div>
            {(status === 'creator_confirmation_required' && isDeadlineExpired) ? (
              <div className="text-[10px] text-blue-100/70 mb-2">
                ⚡ The previous challenger's deadline expired. First to join wins!
              </div>
            ) : (status === 'creator_confirmation_required' && !isDeadlineExpired) ? (
              <div className="text-[10px] text-blue-100/70 mb-2">
                ⚡ Someone expressed intent, but you can still try! First transaction wins (first-come-first-served).
              </div>
            ) : (
              <div className="text-[10px] text-blue-100/70 mb-2">
                This challenge is open and waiting for an opponent. First to join wins!
              </div>
            )}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onJoinChallenge) {
                  try {
                    await onJoinChallenge(activeChallenge);
                  } catch (error: any) {
                    console.error('Failed to join challenge:', error);
                    alert(error.message || 'Failed to join challenge. Please try again.');
                  }
                }
              }}
              className="w-full rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-blue-400/30"
            >
              Join Challenge ({entryFee} USDFG + Network Fee)
            </button>
          </div>
        </div>
      )}

      {/* Status Banner - Prominent display */}
      {status === 'active' && isParticipant && opponentWallet && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-100">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1.5">
            🎮 You're locked in
          </div>
          <div className="text-sm font-semibold text-white mb-1">
            Head-to-Head: {opponentWallet ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Waiting for opponent'}
          </div>
          <p className="text-[10px] text-amber-100/80 mt-0.5">
            Chat with your opponent and start the match. Submit results once you finish—the winner receives the challenge reward.
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
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Challenge Amount</div>
            <div className="text-white font-semibold text-xs">{entryFee} USDFG</div>
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
      {canSubmitResult && !showSubmitForm && !hasAlreadySubmitted && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSubmitForm(true);
          }}
          className="relative w-full rounded-md bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_8px_rgba(255,215,130,0.25)] border border-amber-400/40 cursor-pointer active:scale-[0.98]"
        >
          🏆 Submit Result
        </button>
      )}

      {/* Show message if already submitted */}
      {hasAlreadySubmitted && status === 'active' && isParticipant && (
        <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-2.5 text-center text-xs text-green-100">
          <div className="text-sm font-semibold text-white mb-0.5">
            ✅ Result Submitted
          </div>
          <p className="text-[10px] text-green-100/80 mt-0.5">
            You have already submitted your result. Waiting for opponent...
          </p>
        </div>
      )}

      {/* Submit Result Form - Inline in lobby */}
      {canSubmitResult && showSubmitForm && !hasAlreadySubmitted && (
        <div className="rounded-lg border border-amber-400/30 bg-gradient-to-br from-gray-900/95 via-amber-900/10 to-gray-900/95 p-2.5 space-y-2">
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
            <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-500/20 rounded-md p-1.5 mb-2">
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
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white rounded-md transition-all text-[10px] font-medium"
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
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-700/90 hover:bg-amber-800 text-white rounded-md transition-all text-[10px] font-medium"
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

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={selectedResult === null || isLoading || isSubmitting || hasAlreadySubmitted}
            className={`
              w-full py-1.5 rounded-md font-semibold text-xs transition-all duration-200 border
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

      {/* Prize Claiming Section - Show when challenge is completed and user won */}
      {canClaimPrize && !prizeClaimed && (
        <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-2.5 space-y-2">
          <div className="text-center">
            <div className="text-2xl mb-1.5">🏆</div>
            <h3 className="text-sm font-bold text-emerald-200 mb-1">You Won!</h3>
            <p className="text-xs text-emerald-100/80 mb-2">
              Claim your prize of <span className="font-semibold text-white">{prizePool} USDFG</span>
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await onClaimPrize(activeChallenge);
                } catch (error) {
                  console.error('Error claiming prize:', error);
                }
              }}
              disabled={isClaiming}
              className="w-full rounded-md bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-3 py-2 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(34,197,94,0.25)] border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
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
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-center">
          <div className="text-xl mb-1.5">✅</div>
          <p className="text-xs font-semibold text-emerald-200">
            Prize claimed! Check your wallet for {prizePool} USDFG
          </p>
        </div>
      )}

      {/* Status message when can't submit or claim */}
      {!canSubmitResult && !canClaimPrize && (
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
          />
        </div>
        
        {/* Voice Room - Second (below Match Chat) */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-300/80">
            Voice Room
          </div>
          <VoiceChat challengeId={voiceChatChallengeId} currentWallet={voiceChatCurrentWallet} />
        </div>
      </div>
    </div>
  );
};

export default StandardChallengeLobby;

