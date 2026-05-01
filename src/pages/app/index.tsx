import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy, useRef } from "react";
import { Helmet } from "react-helmet";
import ElegantNotification from "@/components/ui/ElegantNotification";
import { AppConfirmModal } from "@/components/ui/AppConfirmModal";
import { Link, useLocation } from "react-router-dom";
import WalletConnectSimple from "@/components/arena/WalletConnectSimple";
import { useWallet } from '@solana/wallet-adapter-react';
// Removed legacy wallet import - using MWA hooks instead
import { creatorFund as creatorFundOnChain, joinerFund as joinerFundOnChain } from "@/lib/chain/contract";
import { handlePhantomReturn, isPhantomReturn, SESSION_STORAGE_NONCE } from '@/lib/wallet/phantom-deeplink';
import TournamentBracketView from "@/components/arena/TournamentBracketView";
import StandardChallengeLobby from "@/components/arena/StandardChallengeLobby";
import RightSidePanel from "@/components/ui/RightSidePanel";
import { useChallenges } from "@/hooks/useChallenges";
import { useChallengeExpiry } from "@/hooks/useChallengeExpiry";
import { useResultDeadlines } from "@/hooks/useResultDeadlines";
import ParticleBackground from "@/components/ParticleBackground";
import type {
  ChallengeData,
  LockNotification,
  ChallengeNotification,
  PlayerStats,
  TeamStats,
} from "@/lib/firebase/firestore";
import {
  expressJoinIntent,
  creatorFund,
  joinerFund,
  revertCreatorTimeout,
  revertJoinerTimeout,
  expirePendingChallenge,
  cleanupExpiredChallenge,
  submitChallengeResult,
  getLeaderboardPlayers,
  getLeaderboardTeams,
  getTotalUSDFGRewarded,
  updatePlayerDisplayName,
  getPlayerStats,
  storeTrustReview,
  hasUserReviewedChallenge,
  createTeam,
  joinTeam,
  leaveTeam,
  getTeamByMember,
  getTeamStats,
  ensureUserLockDocument,
  setUserCurrentLock,
  getLockNotificationsForWallet,
  clearMutualLock,
  recordFriendlyMatchResult,
  upsertLockNotification,
  uploadProfileImage,
  updatePlayerProfileImage,
  uploadTeamImage,
  updateTeamImage,
  upsertChallengeNotification,
  fetchChallengeById,
  postChallengeSystemMessage,
  submitTournamentMatchResult,
  deleteChallenge,
  joinTournament,
  verifyPaidTournamentEscrowAndActivate,
  testFirestoreConnection,
  isParticipantWallet,
  walletsEqual,
  computeDisplayTrustScore,
} from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useConnection } from '@solana/wallet-adapter-react';
// Oracle removed - no longer needed
import { ADMIN_WALLET, USDFG_MINT, PROGRAM_ID, SEEDS, CHALLENGE_CONFIG } from '@/lib/chain/config';
import { getExplorerTxUrl } from '@/lib/chain/explorer';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { getWalletScopedValue, setWalletScopedValue, clearWalletScopedValue, PROFILE_STORAGE_KEYS } from "@/lib/storage/profile";
import {
  getPhantomConnectionState,
  setPhantomConnectionState as persistPhantomConnectionState,
  clearPhantomConnectionState,
} from "@/lib/utils/wallet-state";
import { TrustBadge } from "@/lib/utils/trustDisplay";
import { extractGameFromTitle, getGameCategory, getGameImage, isChallengeCustomGame, resolveGameName } from "@/lib/gameAssets";
import { runCreateChallengeFlow } from "@/lib/challenges/createChallengeFlow";
import { 
  getChallengeStatus, 
  getChallengeCreator, 
  isChallengeCreator, 
  getChallengeEntryFee, 
  getChallengePrizePool,
  getChallengePDA,
  getChallengeChallenger,
  isChallengeChallenger,
  getChallengePendingJoiner,
  isPendingJoiner,
  getCreatorFundingDeadline,
  isCreatorFundingDeadlineExpired,
  isChallengeActive,
  isChallengeWaitingForPlayers,
  isChallengeInProgress,
  canCancelChallenge,
  isChallengeRewardClaimed,
} from "@/lib/utils/challenge-helpers";
import ElegantButton from "@/components/ui/ElegantButton";
import ElegantModal from "@/components/ui/ElegantModal";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";
import ElegantNavbar from "@/components/layout/ElegantNavbar";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import LiveChallengesGrid from "@/components/arena/LiveChallengesGrid";
// Lazy load heavy modals for better performance on all devices
const SubmitResultRoom = lazy(() => import("@/components/arena/SubmitResultRoom").then(module => ({ default: module.SubmitResultRoom })));
const PlayerProfileModal = lazy(() => import("@/components/arena/PlayerProfileModal"));
import TrustReviewModal from "@/components/arena/TrustReviewModal";
const TeamManagementModal = lazy(() => import("@/components/arena/TeamManagementModal"));
import VictoryModal from "@/components/arena/VictoryModal";
import { Crown, Search, Trophy, User, Users } from "lucide-react";

// Ad Rotation Component for Win Rate Box
const AdRotationBox: React.FC = () => {
  // Array of ad image paths - you can add more images here
  // IMPORTANT: For perfect professional fit, images MUST match box aspect ratio:
  // Box Content Area (where image displays):
  // - Width: ~292px (or rounded to 300px for easier sizing)
  // - Height: ~90-95px (based on min-h-[80px] + padding)
  // - Aspect Ratio: ~3.16:1 (or 3.07:1 for exact fit)
  // 
  // Recommended Image Sizes (EXACT ASPECT RATIO IS CRITICAL):
  // Standard: 300×95px (aspect ratio: 3.16:1)
  // Retina 2x: 600×190px (aspect ratio: 3.16:1)
  // Format: WebP, PNG, or JPG
  // 
  // The image uses object-contain to show the FULL image without cropping.
  // If your image has the EXACT aspect ratio (3.16:1), it will fill the box perfectly.
  // If your image has a different aspect ratio, there will be empty space.
  // To verify exact dimensions: Open browser DevTools → Inspect element → Check computed width/height
  const adImages = [
    '/assets/ads/ad-1.webp',
    '/assets/ads/ad-2.webp',
    '/assets/ads/ad-3.webp',
    '/assets/ads/aa.webp',
  ];
  
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const rotationInterval = 5000; // Rotate every 5 seconds (adjust as needed)
  
  useEffect(() => {
    if (adImages.length <= 1) return; // No rotation needed if only one image
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % adImages.length);
    }, rotationInterval);
    
    return () => clearInterval(interval);
  }, [adImages.length]);
  
  // If no ad images, show fallback win rate display
  if (adImages.length === 0 || !adImages[0]) {
    return (
      <div className="relative min-h-[100px] md:min-h-[112px] rounded-lg bg-[#07080C]/95 border border-white/10 p-3 md:p-4 text-center hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-1">
          <div className="text-lg sm:text-xl font-semibold text-white leading-none tabular-nums">+12.5%</div>
          <div className="text-[10px] sm:text-xs text-white/35 leading-none" aria-hidden>📈</div>
          <div className="text-[11px] sm:text-sm text-purple-300/90 mt-0.5 font-medium leading-snug">Win Rate</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-[100px] md:min-h-[112px] rounded-lg bg-[#07080C]/95 border border-white/10 p-3 md:p-4 text-center hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.06),transparent_72%)] pointer-events-none" />
      
      {/* Rotating Ad Images */}
      <div className="relative w-full h-full min-h-[88px] flex items-center justify-center">
        {adImages.map((imagePath, index) => (
          <img
            key={index}
            src={imagePath}
            alt={`Advertisement ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-contain rounded-lg transition-opacity duration-500 ${
              index === currentAdIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ objectFit: 'contain', objectPosition: 'center' }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              console.error(`❌ Failed to load ad image: ${imagePath}`);
              // If first image fails, show fallback
              if (index === 0) {
                target.style.display = 'none';
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Countdown Timer Component for Funding Deadlines
const CountdownTimer: React.FC<{
  deadline: Timestamp;
  expiredMessage?: string;
  className?: string;
}> = ({ deadline, expiredMessage = "Expired", className = "" }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const deadlineMs = deadline.toMillis();
      const diff = deadlineMs - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft(expiredMessage);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, expiredMessage]);

  if (expired) {
    return <span className={`text-red-400 ${className}`}>{expiredMessage}</span>;
  }

  return <span className={`${className}`}>⏰ {timeLeft} left</span>;
};

function minimalPlayerStatsForWallet(wallet: string): PlayerStats {
  return {
    wallet,
    displayName: '',
    wins: 0,
    losses: 0,
    winRate: 0,
    totalEarned: 0,
    gamesPlayed: 0,
    lastActive: Timestamp.now(),
    trustScore: 0,
    trustReviews: 0,
    displayTrustScore: 5,
    gameStats: {},
    categoryStats: {},
  };
}

const ArenaHome: React.FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { connected, signTransaction, publicKey, connect, signAllTransactions, select, wallets } = wallet;
  
  // State to track stored Phantom connection (forces re-render when changed)
  const [phantomConnectionState, setPhantomConnectionState] = useState(() => {
    if (typeof window === 'undefined') return { connected: false, publicKey: null };
    return getPhantomConnectionState();
  });
  
  // Check for stored Phantom connection (mobile deep link)
  // On mobile Safari, adapter.connect() doesn't work, so we use stored public key
  const hasStoredPhantomConnection = phantomConnectionState.connected || getPhantomConnectionState().connected;
  const storedPhantomPublicKey = phantomConnectionState.publicKey || localStorage.getItem('phantom_public_key');
  
  // Use adapter connection OR stored Phantom connection
  // This allows mobile deep links to work even if adapter.connect() fails
  const isConnected = connected || (hasStoredPhantomConnection && !!storedPhantomPublicKey);
  const location = useLocation();
  
  // Use stored public key if adapter doesn't have one
  const effectivePublicKey = publicKey || (storedPhantomPublicKey ? new PublicKey(storedPhantomPublicKey) : null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // CRITICAL: Handle Phantom deep link return on same page (Smithii-style)
  // Phantom returns to /app with query params, we decrypt and restore session here
  useEffect(() => {
    const stripWalletReturnParams = () => {
      const path = window.location.pathname || "/";
      window.history.replaceState({}, "", path);
    };

    // Check if this is a redirect from a new tab that was closed
    const params = new URLSearchParams(window.location.search);
    if (params.get('phantom_connected') === 'true') {
      console.log("📨 Detected redirect from closed new tab - checking for connection state");
      const hasConnection = getPhantomConnectionState().connected;
      if (hasConnection) {
        const publicKey = localStorage.getItem('phantom_public_key');
        if (publicKey) {
          console.log("✅ Found connection state - updating UI");
          // Clear connecting flag since connection is complete
          sessionStorage.removeItem('phantom_connecting');
          setPhantomConnectionState({
            connected: true,
            publicKey: publicKey
          });
          stripWalletReturnParams();
        }
      }
      return;
    }
    
    const params2 = new URLSearchParams(window.location.search);
    
    // Handle user cancellation - Phantom may redirect without params
    // If we're on / or /app with no params and we have a pending deep link, user likely cancelled
    const pathForCancel = window.location.pathname || "/";
    if (!params2.has("phantom_encryption_public_key") && (pathForCancel === "/" || pathForCancel === "/app")) {
      const hasPendingNonce = sessionStorage.getItem(SESSION_STORAGE_NONCE);
      if (hasPendingNonce) {
        console.log("⚠️ Phantom deep link cancelled by user - staying on current path");
        // Clear the pending nonce and connecting flag
        sessionStorage.removeItem(SESSION_STORAGE_NONCE);
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_original_tab');
        stripWalletReturnParams();
        return;
      }
    }
    
    // Check for Phantom return (success or error)
    if (params2.has("phantom_encryption_public_key") || params2.has("error") || params2.has("errorCode") || params2.has("errorMessage")) {
      console.log("🔥🔥🔥 Safari deep link return activated");
      console.log("🔎 Full URL:", window.location.href);
      console.log("🔎 Search params:", window.location.search);
      console.log("🔎 All URL params:", Object.fromEntries(params2.entries()));
      console.log("🔎 Is original tab:", sessionStorage.getItem('phantom_original_tab') === 'true');
      
      // Check for Phantom errors first
      const error = params2.get("error") || params2.get("errorCode") || params2.get("errorMessage");
      if (error) {
        console.error("❌ Phantom returned with error:", error);
        console.error("❌ Error code:", params2.get("errorCode"));
        console.error("❌ Error message:", params2.get("errorMessage"));
        console.error("❌ This usually means:");
        console.error("   1. Phantom doesn't recognize the app_url");
        console.error("   2. The app is not registered in Phantom's connected apps");
        console.error("   3. The universal link association is broken");
        console.error("   4. Phantom cache needs to be cleared");
        
        // Clean up URL
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
        return;
      }
      
      // Check if this is a valid Phantom return
      if (isPhantomReturn()) {
        try {
          console.log("🔍 Processing Phantom return on root / page...");
          const result = handlePhantomReturn();
          
          if (result && result.publicKey) {
            console.log("🔑 Decrypted Phantom session:", result);
            
            // Save the session to sessionStorage
            const sessionData = {
              public_key: result.publicKey,
              session: result.session,
              connected_at: new Date().toISOString(),
            };
            
            sessionStorage.setItem('phantomSession', JSON.stringify(sessionData));
            console.log("✅ Saved Phantom session to sessionStorage");
            
            // Mark wallet as connected in localStorage (for UI state)
            persistPhantomConnectionState(true, result.publicKey);
            setPhantomConnectionState({ connected: true, publicKey: result.publicKey });
            
            // Check if we're in a new tab (Phantom opened new tab)
            // The original tab would have 'phantom_original_tab' marker
            // If this tab doesn't have it, we're likely in a new tab
            const isOriginalTab = sessionStorage.getItem('phantom_original_tab') === 'true';
            
            if (!isOriginalTab) {
              console.log("⚠️ Phantom returned in NEW TAB - syncing with original tab");
              
              // Save connection state (will be picked up by original tab)
              localStorage.setItem('phantom_connected', 'true');
              localStorage.setItem('phantom_public_key', result.publicKey);
              localStorage.setItem('phantom_connection_sync', JSON.stringify({
                publicKey: result.publicKey,
                timestamp: Date.now()
              }));
              
              // Use BroadcastChannel to notify original tab
              try {
                const channel = new BroadcastChannel('phantom_connection');
                channel.postMessage({
                  type: 'phantom_connected',
                  publicKey: result.publicKey,
                  session: result.session
                });
                console.log("✅ Sent connection message to original tab via BroadcastChannel");
                channel.close();
              } catch (error) {
                console.error("❌ Error with BroadcastChannel:", error);
              }
              
              // Clean URL (stay on /app if that's where this tab was opened)
              stripWalletReturnParams();
              
              // Show message and try to close this tab
              showAppToast("Wallet connected. Closing this tab — please use the original tab.", "success", "Connected");
              
              // Try multiple methods to close/redirect
              setTimeout(() => {
                try {
                  window.close();
                } catch (e) {
                  // If we can't close, redirect to a simple page that tells user to go back
                  window.location.href = '/?phantom_connected=true';
                }
              }, 500);
            } else {
              // We're in the original tab - update state normally
              console.log("✅ Phantom returned in ORIGINAL TAB");
              
              // CRITICAL: Clear all connecting flags so UI can update
              sessionStorage.removeItem('phantom_connecting');
              sessionStorage.removeItem('phantom_connect_timestamp');
              sessionStorage.removeItem('phantom_connect_attempt');
              sessionStorage.removeItem('phantom_dapp_nonce');
              
              // Update connection state immediately
              setPhantomConnectionState({
                connected: true,
                publicKey: result.publicKey
              });
              
              // Ensure arena-access is preserved
              localStorage.setItem('arena-access', 'true');
              
              // Clean query params from URL immediately (keep /app)
              stripWalletReturnParams();
              
              // Trigger events to notify components
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('phantom_connected'));
              window.dispatchEvent(new Event('phantomConnected'));
              
              console.log("✅ Connection state updated and events dispatched - user can now continue");
              
              // Update state immediately to trigger re-render
              setPhantomConnectionState({
                connected: true,
                publicKey: result.publicKey
              });
              
              // Ensure arena-access is preserved
              localStorage.setItem('arena-access', 'true');
              
              // Clean query params again if needed
              stripWalletReturnParams();
              
              // Trigger a state update to reflect the connection
              window.dispatchEvent(new Event('phantomConnected'));
            }
          } else {
            console.error("❌ Failed to decrypt Phantom payload - user may have cancelled");
            // Clean URL even on error
            stripWalletReturnParams();
            // Clear any pending nonce and connecting flag
            sessionStorage.removeItem(SESSION_STORAGE_NONCE);
            sessionStorage.removeItem('phantom_connecting');
            sessionStorage.removeItem('phantom_original_tab');
          }
        } catch (error: any) {
          console.error("❌ Error processing Phantom return:", error);
          console.error("❌ Error message:", error?.message);
          console.error("❌ Error stack:", error?.stack);
          // Clean URL even on error
          stripWalletReturnParams();
          // Clear any pending nonce and connecting flag
          sessionStorage.removeItem(SESSION_STORAGE_NONCE);
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_original_tab');
        }
      } else {
        // Invalid return - clean up
        console.warn("⚠️ Invalid Phantom return - missing required params");
        stripWalletReturnParams();
        sessionStorage.removeItem(SESSION_STORAGE_NONCE);
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_original_tab');
      }
    }
  }, []); // Run once on mount

  // Check for stored Phantom connection (mobile deep link)
  // Also listen for BroadcastChannel messages from new tabs opened by Phantom
  // Listen for wallet adapter connection changes
  useEffect(() => {
    if (connected && publicKey) {
      // Wallet adapter connected - update state
      setPhantomConnectionState({
        connected: true,
        publicKey: publicKey.toString()
      });
      persistPhantomConnectionState(true, publicKey.toString());
    } else if (!connected && !publicKey) {
      // Wallet adapter disconnected - check localStorage
      const storedState = getPhantomConnectionState();
      
      if (!storedState.connected || !storedState.publicKey) {
        // No stored connection - clear state
        setPhantomConnectionState({
          connected: false,
          publicKey: null
        });
      }
    }
  }, [connected, publicKey]);

  useEffect(() => {
    const checkPhantomConnection = () => {
      const isPhantomConnected = localStorage.getItem('phantom_connected') === 'true';
      const storedPublicKey = localStorage.getItem('phantom_public_key');
      
      if (isPhantomConnected && storedPublicKey) {
        // Clear connecting flag since we're now connected
        sessionStorage.removeItem('phantom_connecting');
        // Update state to trigger re-render
        setPhantomConnectionState({
          connected: true,
          publicKey: storedPublicKey
        });
      } else {
        // Clear state if connection is gone
        setPhantomConnectionState({
          connected: false,
          publicKey: null
        });
      }
    };

    checkPhantomConnection();
    
    // Listen for BroadcastChannel messages (from new tabs opened by Phantom)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('phantom_connection');
      channel.onmessage = (event) => {
        if (event.data.type === 'phantom_connected') {
          console.log('📨 Received connection message from new tab:', event.data);
          // Update connection state
          localStorage.setItem('phantom_connected', 'true');
          localStorage.setItem('phantom_public_key', event.data.publicKey);
          // Clear connecting flag since connection is complete
          sessionStorage.removeItem('phantom_connecting');
          checkPhantomConnection();
        }
      };
    } catch (error) {
      console.warn('⚠️ BroadcastChannel not supported:', error);
    }
    
    // Listen for connection events
    window.addEventListener('phantomConnected', checkPhantomConnection);
    
    // Also listen for storage changes (in case connection is cleared elsewhere)
    window.addEventListener('storage', checkPhantomConnection);
    
    // Listen for localStorage sync events (fallback for cross-tab communication)
    const handleStorageSync = () => {
      const syncData = localStorage.getItem('phantom_connection_sync');
      if (syncData) {
        try {
          const data = JSON.parse(syncData);
          console.log('📨 Received connection sync from storage:', data);
          localStorage.setItem('phantom_connected', 'true');
          localStorage.setItem('phantom_public_key', data.publicKey);
          localStorage.removeItem('phantom_connection_sync'); // Clear after reading
          // Clear connecting flag since connection is complete
          sessionStorage.removeItem('phantom_connecting');
          checkPhantomConnection();
        } catch (error) {
          console.error('❌ Error parsing sync data:', error);
        }
      }
    };
    
    // Check for sync data on mount
    handleStorageSync();
    
    // Poll for sync data (since storage event doesn't fire in same tab)
    // OPTIMIZED: Check every 5 seconds instead of 2 (reduces CPU usage)
    const syncInterval = setInterval(() => {
      handleStorageSync();
      checkPhantomConnection(); // Also check connection state
    }, 5000);
    
    return () => {
      window.removeEventListener('phantomConnected', checkPhantomConnection);
      window.removeEventListener('storage', checkPhantomConnection);
      if (channel) {
        channel.close();
      }
      clearInterval(syncInterval);
    };
  }, []);

  const normalizedCurrentWallet = useMemo(() => {
    return effectivePublicKey?.toString()?.toLowerCase() || null;
  }, [effectivePublicKey]);

  const currentWallet = useMemo(() => {
    return effectivePublicKey?.toString() || null;
  }, [effectivePublicKey]);

  // Smart function to extract game name from challenge title (saves storage costs)
  // Helper to extract mode from title (e.g., "NBA 2K25 - Head-to-Head by Player" -> "Head-to-Head")
  const extractModeFromTitle = (title: string): string => {
    if (!title) return 'Head-to-Head';
    const match = title.match(/\s-\s(.+?)(?:\sby\s|$)/i);
    return match ? match[1].trim() : 'Head-to-Head';
  };

  const mergeChallengeDataForModal = useCallback((cardChallenge: any, firestoreChallenge?: ChallengeData | null) => {
    if (!firestoreChallenge) return cardChallenge;
    
    return {
      ...cardChallenge,
      ...firestoreChallenge,
      id: firestoreChallenge.id || cardChallenge.id,
      title: firestoreChallenge.title || cardChallenge.title,
      entryFee: firestoreChallenge.entryFee ?? cardChallenge.entryFee,
      prizePool: firestoreChallenge.prizePool ?? cardChallenge.prizePool,
      status: firestoreChallenge.status || cardChallenge.status,
      rawData: firestoreChallenge,
      players: firestoreChallenge.players?.length || cardChallenge.players,
      capacity: firestoreChallenge.maxPlayers || cardChallenge.capacity,
    };
  }, []);

  // Use Firestore real-time challenges (must be before any useEffect that uses firestoreChallenges)
  const {
    challenges: firestoreChallenges,
    loading: challengesLoading,
    error: challengesError,
    refetchChallenges,
  } = useChallenges();

  const [creatorClientStatsMap, setCreatorClientStatsMap] = useState<
    Record<string, { displayTrustScore: number; disputesWon: number; disputesLost: number }>
  >({});
  const creatorDisplayTrustStickyRef = useRef<Record<string, number>>({});
  const [currentUserDisplayTrust, setCurrentUserDisplayTrust] = useState(5);

  useEffect(() => {
    let cancelled = false;
    const creators = [
      ...new Set(
        firestoreChallenges
          .map((c) => ((c as { creator?: string }).creator || "").toLowerCase())
          .filter(Boolean)
      ),
    ];
    if (creators.length === 0) {
      setCreatorClientStatsMap({});
      return;
    }
    void (async () => {
      const entries = await Promise.all(
        creators.map(async (w) => {
          try {
            const s = await getPlayerStats(w);
            return [
              w,
              {
                displayTrustScore: s?.displayTrustScore ?? 5,
                disputesWon: s?.disputesWon ?? 0,
                disputesLost: s?.disputesLost ?? 0,
              },
            ] as const;
          } catch {
            return [
              w,
              { displayTrustScore: 5, disputesWon: 0, disputesLost: 0 },
            ] as const;
          }
        })
      );
      if (!cancelled) {
        setCreatorClientStatsMap((prev) => {
          if (creators.length === 0) return {};
          const next = { ...prev };
          for (const [w, val] of entries) {
            next[w] = val;
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firestoreChallenges]);

  useEffect(() => {
    const w = effectivePublicKey?.toString();
    if (!w) {
      setCurrentUserDisplayTrust(5);
      return;
    }
    let c = false;
    void getPlayerStats(w).then((s) => {
      if (c) return;
      setCurrentUserDisplayTrust(s?.displayTrustScore ?? 5);
    });
    return () => {
      c = true;
    };
  }, [effectivePublicKey]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const challengeId = params.get('challenge');
    if (!challengeId) return;

    const openChallengeFromQuery = async () => {
      try {
        let challengeData: any = firestoreChallenges.find((c: any) => c.id === challengeId);
        if (!challengeData) {
          challengeData = await fetchChallengeById(challengeId);
        }
        if (!challengeData) {
          return;
        }

        const merged = mergeChallengeDataForModal(challengeData, challengeData);
        setSelectedChallenge(merged);
        setShowDetailSheet(false);

        const format = merged.rawData?.format || (merged.rawData?.tournament ? 'tournament' : 'standard');
        if (format === 'tournament') {
          setShowStandardLobby(false);
          setShowTournamentLobby(true);
        } else {
          setShowTournamentLobby(false);
          setShowStandardLobby(true);
        }
      } catch (error) {
        console.error('Failed to open challenge from query:', error);
      } finally {
        const nextParams = new URLSearchParams(location.search);
        nextParams.delete('challenge');
        const nextSearch = nextParams.toString();
        const nextUrl = nextSearch ? `${location.pathname}?${nextSearch}` : location.pathname;
        window.history.replaceState({}, "", nextUrl);
      }
    };

    openChallengeFromQuery();
  }, [location.search, location.pathname, firestoreChallenges, mergeChallengeDataForModal]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitResultModal, setShowSubmitResultModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterGame, setFilterGame] = useState<string>('All');
  const [showMyChallenges, setShowMyChallenges] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [claimingPrize, setClaimingPrize] = useState<string | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [markingPrizeTransferred, setMarkingPrizeTransferred] = useState<string | null>(null);
  const [founderTransferModal, setFounderTransferModal] = useState<{
    challenge: any;
  } | null>(null);
  const [founderTransferAmount, setFounderTransferAmount] = useState<string>("");
  const [founderTransferTxSignature, setFounderTransferTxSignature] = useState<string>("");
  const [usdfgPrice, setUsdfgPrice] = useState<number>(0.15); // Mock price: $0.15 per USDFG
  const [userUsdfgBalance, setUserUsdfgBalance] = useState<number | null>(null);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState<boolean>(false);
  // CRITICAL: Button disabling states - set immediately on click to prevent double-submission
  const [isCreatorFunding, setIsCreatorFunding] = useState<string | null>(null);
  const [isJoinerFunding, setIsJoinerFunding] = useState<string | null>(null);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userGamerTag, setUserGamerTag] = useState<string>('');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [loadingTopPlayers, setLoadingTopPlayers] = useState<boolean>(true);
  const [leaderboardSearchTerm, setLeaderboardSearchTerm] = useState<string>('');
  const [totalUSDFGRewarded, setTotalUSDFGRewarded] = useState<number>(0);
  const [activeChallengesCount, setActiveChallengesCount] = useState<number>(0);
  const [arenaPlayersCount, setArenaPlayersCount] = useState<number>(0);
  // Players online count removed — use derived count from active challenges (no presence polling)
  
  // Trust Review Modal state
  const [showTrustReview, setShowTrustReview] = useState(false);
  const [trustReviewOpponent, setTrustReviewOpponent] = useState<string>('');
  // Trophy Modal state
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<any>(null);
  const [pendingMatchResult, setPendingMatchResult] = useState<{
    didWin: boolean;
    proofFile?: File | null;
    challengeId?: string;
    opponentWallet?: string; // Store opponent wallet for trust review
    autoWon?: boolean; // Flag to indicate this win was auto-determined (opponent submitted loss)
    needsClaim?: boolean; // Flag to indicate user needs to claim reward after review
  } | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
  const [leaderboardLimit, setLeaderboardLimit] = useState<number>(30); // Start with 30 players, load more on demand
  const [leaderboardView, setLeaderboardView] = useState<'individual' | 'teams'>('individual'); // Toggle between Individual and Teams
  const [topTeams, setTopTeams] = useState<TeamStats[]>([]);
  const [loadingTopTeams, setLoadingTopTeams] = useState<boolean>(false);
const [showTournamentLobby, setShowTournamentLobby] = useState(false);
  const [showStandardLobby, setShowStandardLobby] = useState(false);
const [tournamentMatchData, setTournamentMatchData] = useState<{ matchId: string; opponentWallet: string } | null>(null);
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [teamModalJoinPrefill, setTeamModalJoinPrefill] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<TeamStats | null>(null);
  // Victory Modal state
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victoryModalData, setVictoryModalData] = useState<{
    autoWon?: boolean;
    opponentName?: string;
    needsClaim?: boolean;
  } | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  } | null>(null);

  const showAppToast = useCallback(
    (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', title?: string) => {
      setNotification({ isOpen: true, message, title, type });
    },
    []
  );

  const requestAppConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
    }) =>
      new Promise<boolean>((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmDialog(opts);
      }),
    []
  );

  const resolveAppConfirm = useCallback((ok: boolean) => {
    setConfirmDialog(null);
    const r = confirmResolveRef.current;
    confirmResolveRef.current = null;
    r?.(ok);
  }, []);

  // userLocks derived from lockNotificationsList (no listenToAllUserLocks)
  const [lockInProgress, setLockInProgress] = useState<string | null>(null);
  const [friendlyMatch, setFriendlyMatch] = useState<{
    opponentId: string;
    opponentName: string;
    matchId: string;
  } | null>(null);
  const [showFriendlySubmitResult, setShowFriendlySubmitResult] = useState(false);
  const [submittingFriendlyResult, setSubmittingFriendlyResult] = useState(false);
  const [lockNotificationsList, setLockNotificationsList] = useState<LockNotification[]>([]);
  const lockNotificationStatusRef = useRef<Record<string, LockNotification['status']>>({});
  const [challengeNotificationsList, setChallengeNotificationsList] = useState<ChallengeNotification[]>([]);
  const challengeNotificationStatusRef = useRef<Record<string, ChallengeNotification['status']>>({});
  const lastFriendlyMatchIdRef = useRef<string | null>(null);
  
  const profileInitial = useMemo(() => {
    if (userProfileImage) return null;
    const source =
      (userGamerTag && userGamerTag.trim().length > 0
        ? userGamerTag.trim()
        : publicKey?.toString()) || "";
    if (!source) return "👤";
    return source.charAt(0).toUpperCase();
  }, [userProfileImage, userGamerTag, publicKey]);

  const incomingLockRequests = useMemo(() => {
    if (!normalizedCurrentWallet) return [];

    return lockNotificationsList.filter(
      (notification) =>
        notification.status === 'pending' &&
        notification.target?.toLowerCase() === normalizedCurrentWallet
    );
  }, [lockNotificationsList, normalizedCurrentWallet]);

  const pendingLockInitiators = useMemo(() => {
    const set = new Set<string>();
    incomingLockRequests.forEach((notification) => {
      if (notification.initiator) {
        set.add(notification.initiator.toLowerCase());
      }
    });
    return set;
  }, [incomingLockRequests]);

  const lockNotificationsByMatchId = useMemo(() => {
    const map: Record<string, LockNotification> = {};
    lockNotificationsList.forEach((notification) => {
      map[notification.matchId] = notification;
    });
    return map;
  }, [lockNotificationsList]);

  const renderNavAvatar = useCallback(
    (size: "sm" | "md" = "md") => {
      const dimension = size === "sm" ? "w-8 h-8" : "w-10 h-10";
      if (userProfileImage) {
        return (
          <img
            src={userProfileImage}
            alt="Profile"
            className={`${dimension} rounded-full object-cover border border-purple-500/35 ring-1 ring-purple-500/20 shadow-none`}
          />
        );
      }
      return (
        <div
          className={`${dimension} rounded-full bg-gradient-to-br from-purple-600/25 via-[#0B0C12] to-orange-500/15 border border-purple-500/40 ring-1 ring-purple-500/15 flex items-center justify-center text-sm font-semibold text-white/90`}
        >
          {profileInitial || "👤"}
        </div>
      );
    },
    [userProfileImage, profileInitial]
  );

  const handleOpenProfile = useCallback(async () => {
    if (!publicKey) return;

    const walletKey = publicKey.toString();
    const currentWalletCountry = getWalletScopedValue(PROFILE_STORAGE_KEYS.country, walletKey);
    if (currentWalletCountry !== userCountry) {
      setUserCountry(currentWalletCountry);
    }

    try {
      const firestoreStats = await getPlayerStats(walletKey);
      const displayName =
        firestoreStats?.displayName ||
        (userGamerTag && userGamerTag.trim().length > 0 ? userGamerTag.trim() : undefined);
      const currentUserPlayer: PlayerStats =
        firestoreStats ||
        ({
          wallet: walletKey,
          displayName,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          lastActive: Timestamp.now(),
          gameStats: {},
          categoryStats: {},
        } as PlayerStats);

      setSelectedPlayer(currentUserPlayer);
    } catch (error) {
      console.error("Failed to fetch player stats:", error);
      const fallbackDisplayName =
        (userGamerTag && userGamerTag.trim().length > 0 ? userGamerTag.trim() : '') || walletKey;
      const fallbackPlayer: PlayerStats = {
        wallet: walletKey,
        displayName: fallbackDisplayName,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        gameStats: {},
        categoryStats: {},
      };
      setSelectedPlayer(fallbackPlayer);
    }

    setShowPlayerProfile(true);
  }, [publicKey, userCountry, userGamerTag]);
  
  const formatWalletAddress = useCallback((wallet: string) => {
    if (!wallet) return '';
    if (wallet.length <= 10) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }, []);

  const createFriendlyMatchId = useCallback((walletA: string, walletB: string) => {
    return `friendly-${[walletA, walletB].filter(Boolean).sort().join('-')}`;
  }, []);

  // Derive lock state from lock_notifications (no full users collection listener)
  const userLocks = useMemo(() => {
    const locks: Record<string, string | null> = {};
    lockNotificationsList.forEach((n) => {
      if (n.status === 'accepted' && n.initiator && n.target) {
        const a = n.initiator.toLowerCase();
        const b = n.target.toLowerCase();
        locks[a] = b;
        locks[b] = a;
      }
    });
    return locks;
  }, [lockNotificationsList]);

  const currentLockTarget = useMemo(() => {
    if (!normalizedCurrentWallet) return null;
    return userLocks[normalizedCurrentWallet] ?? null;
  }, [normalizedCurrentWallet, userLocks]);

  const mutualLockOpponentId = useMemo(() => {
    if (!normalizedCurrentWallet || !currentLockTarget) return null;
    const lockValue = userLocks[currentLockTarget] ?? null;
    return lockValue === normalizedCurrentWallet ? currentLockTarget : null;
  }, [normalizedCurrentWallet, currentLockTarget, userLocks]);

  const refreshTopTeams = useCallback(async (limitOverride?: number, includeAllOverride?: boolean) => {
    const shouldToggleLoading = leaderboardView === 'teams';
    try {
      if (shouldToggleLoading) {
        setLoadingTopTeams(true);
      }
      const includeAll = includeAllOverride ?? showAllPlayers;
      const limit = includeAll ? limitOverride : (limitOverride ?? (showAllPlayers ? leaderboardLimit : 5));
      const teams = await getLeaderboardTeams(limit, 'totalEarned', includeAll);
      setTopTeams(teams);
    } catch (error) {
      console.error('Failed to refresh team leaderboard:', error);
    } finally {
      if (shouldToggleLoading) {
        setLoadingTopTeams(false);
      }
    }
  }, [leaderboardView, showAllPlayers, leaderboardLimit]);

  const loadTopPlayers = useCallback(async (limitOverride?: number, includeAllOverride?: boolean) => {
    try {
      const includeAll = includeAllOverride ?? showAllPlayers;
      const limit = includeAll ? limitOverride : (limitOverride ?? (showAllPlayers ? leaderboardLimit : 5));
      const players = await getLeaderboardPlayers(limit, 'totalEarned', includeAll);
      setTopPlayers(players);
    } catch (error) {
      console.error('Failed to load top players:', error);
      setTopPlayers([]);
    }
  }, [showAllPlayers, leaderboardLimit]);

  const handleLeaderboardViewChange = useCallback((view: 'individual' | 'teams') => {
    if (leaderboardView === view) {
      return;
    }

    setLeaderboardView(view);
    setShowAllPlayers(false);
    setLeaderboardLimit(30);
    setLeaderboardSearchTerm('');

    if (view === 'individual') {
      setLoadingTopPlayers(true);
    } else {
      setLoadingTopTeams(true);
    }
  }, [leaderboardView]);

  
  // Mock price API - simulates real-time price updates
  const fetchUsdfgPrice = useCallback(async () => {
    try {
      // In production, this would be a real API call to CoinGecko, CoinMarketCap, etc.
      // For now, simulate price fluctuations
      const basePrice = 0.15;
      const fluctuation = (Math.random() - 0.5) * 0.02; // ±1 cent fluctuation
      const newPrice = Math.max(0.01, basePrice + fluctuation);
      setUsdfgPrice(Number(newPrice.toFixed(4)));
    } catch (error) {
      console.error('Failed to fetch USDFG price:', error);
      setUsdfgPrice(0.15); // Fallback price
    }
  }, []);

  // Wallet info available via useWallet hook

    // Load user profile data from localStorage and Firestore (only for current wallet)
    useEffect(() => {
      if (!publicKey) {
        // Clear profile data when wallet disconnects
        setUserGamerTag('');
        setUserCountry(null);
        setUserProfileImage(null);
        return;
      }
      
      const loadUserProfile = async () => {
        const walletKey = publicKey.toString();
        const savedGamerTag = getWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey);
        const savedCountry = getWalletScopedValue(PROFILE_STORAGE_KEYS.country, walletKey);
        const savedProfileImage = getWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, walletKey);
        
        setUserGamerTag(savedGamerTag ?? '');
        setUserCountry(savedCountry || null);
        setUserProfileImage(savedProfileImage || null);
        
        // Also try to fetch from Firestore (may have more up-to-date data)
        try {
          const { getPlayerStats } = await import("@/lib/firebase/firestore");
          const playerStats = await getPlayerStats(walletKey);
          if (playerStats?.displayName) {
            setUserGamerTag(playerStats.displayName);
            setWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey, playerStats.displayName);
          }
          if (playerStats?.country) {
            setUserCountry(playerStats.country);
            setWalletScopedValue(PROFILE_STORAGE_KEYS.country, walletKey, playerStats.country);
          }
          // Load profile image from Firestore (visible to everyone)
          if (playerStats?.profileImage) {
            setUserProfileImage(playerStats.profileImage);
            // Also sync to localStorage as backup
            setWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, walletKey, playerStats.profileImage);
          } else if (savedProfileImage) {
            // Keep localStorage image if Firestore doesn't have one
            setUserProfileImage(savedProfileImage);
          }
        } catch (error) {
          // Firestore fetch failed, but we already have localStorage data
          console.error('Failed to fetch player stats from Firestore:', error);
        }
      };
      
      loadUserProfile();
    }, [publicKey]);

  // Clear wallet-specific state when wallet changes
  useEffect(() => {
    if (!publicKey) {
      // Wallet disconnected - clear all wallet-specific state
      setShowPlayerProfile(false);
      setSelectedPlayer(null);
        setShowCreateModal(false);
        setShowSubmitResultModal(false);
        setSelectedChallenge(null);
        setShowTrustReview(false);
        setTrustReviewOpponent('');
        setPendingMatchResult(null);
        setClaimingPrize(null);
        setMarkingPrizeTransferred(null);
        setShowMyChallenges(false);
        setFriendlyMatch(null);
        setShowFriendlySubmitResult(false);
        setLockInProgress(null);
      return;
    }
    
    // Wallet changed - clear state that's specific to the previous wallet
    if (selectedPlayer && selectedPlayer.wallet !== publicKey.toString()) {
      // Close profile modal if it's showing a different wallet's profile
      setShowPlayerProfile(false);
      setSelectedPlayer(null);
    }
    
    // Clear challenge-specific modals and state
    if (selectedChallenge) {
      // Check if the selected challenge is for the current wallet
      const isMyChallenge =
        walletsEqual(selectedChallenge.creator, publicKey.toString()) ||
        isParticipantWallet(selectedChallenge.players, publicKey.toString());
      if (!isMyChallenge) {
        // Challenge belongs to a different wallet - clear it
        setSelectedChallenge(null);
        setShowSubmitResultModal(false);
      }
    }
    
    // Clear pending match result (it's wallet-specific)
    setPendingMatchResult(null);
    
      // Clear trust review modal (it's wallet-specific)
      setShowTrustReview(false);
      setTrustReviewOpponent('');
      
      // Clear reward claiming states
      setClaimingPrize(null);
      setMarkingPrizeTransferred(null);
  }, [publicKey]);

  // Update price every 30 seconds
  useEffect(() => {
    fetchUsdfgPrice();
  }, [fetchUsdfgPrice]);

  // Function to refresh USDFG balance (reusable)
  const refreshUSDFGBalance = useCallback(async (): Promise<void> => {
    if (!isConnected || !publicKey || !connection) {
      return;
    }
    
    try {
      const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, publicKey);
      const tokenBalance = await Promise.race([
        connection.getTokenAccountBalance(tokenAccount, 'confirmed'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000) // 5s timeout
        )
      ]);
      const usdfg = tokenBalance.value.uiAmount || 0;
      setUserUsdfgBalance(usdfg);
    } catch (err: any) {
      // If token account doesn't exist, that's fine - just set to 0
      if (err.message?.includes('Invalid param: could not find account') || 
          err.message?.includes('could not find account')) {
        setUserUsdfgBalance(0);
        return;
      }
      
      // Silently fail - don't show errors or retry
      // Just set to 0 and let UI show "0" or nothing
      setUserUsdfgBalance(0);
    }
  }, [isConnected, publicKey, connection]);

  /** After claim, align list + wallet + trust readout without a full reload (realtime listener may lag). */
  const resyncAfterClaimData = useCallback(async (): Promise<ChallengeData[] | null> => {
    const challenges = await refetchChallenges();
    await refreshUSDFGBalance().catch(() => {});
    const w = effectivePublicKey?.toString();
    if (w) {
      try {
        const stats = await getPlayerStats(w);
        setCurrentUserDisplayTrust(
          stats ? stats.displayTrustScore ?? computeDisplayTrustScore(stats) : 5
        );
      } catch {
        /* ignore */
      }
    }
    return challenges;
  }, [refetchChallenges, refreshUSDFGBalance, effectivePublicKey]);

  // Fetch USDFG balance when wallet is connected (non-blocking, fail gracefully)
  useEffect(() => {
    if (isConnected && publicKey) {
      // Fetch balance in background (don't block UI)
      refreshUSDFGBalance().catch(() => {
        // Silently handle any uncaught errors
        setUserUsdfgBalance(0);
      });
    } else {
      setUserUsdfgBalance(null);
    }
  }, [isConnected, publicKey, refreshUSDFGBalance]);

  // Track completed challenge IDs to detect new completions
  const [completedChallengeIds, setCompletedChallengeIds] = useState<Set<string>>(new Set());

  // Fetch top players or teams for sidebar (with real-time refresh when challenges complete)
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        if (leaderboardView === 'individual') {
          const limit = showAllPlayers ? leaderboardLimit : 5;
          setLoadingTopPlayers(true);
          await loadTopPlayers(limit);
        } else {
          await refreshTopTeams();
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard data:', error);
      } finally {
        if (leaderboardView === 'individual') {
          setLoadingTopPlayers(false);
        }
      }
    };

    fetchLeaderboardData();
  }, [showAllPlayers, leaderboardLimit, leaderboardView, loadTopPlayers, refreshTopTeams]);

  // Test Firestore connection on component mount
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (!connected) {
        console.error("❌ Firebase connection failed - check your config");
      }
    });
    
    // Fetch total USDFG rewarded
    const fetchTotalRewarded = async () => {
      try {
        const total = await getTotalUSDFGRewarded();
        setTotalUSDFGRewarded(total);
      } catch (error) {
        console.error('❌ Error fetching total USDFG rewarded:', error);
      }
    };
    fetchTotalRewarded();
  }, []);

  // Helper function to convert USDFG to USD
  const usdfgToUsd = useCallback((usdfgAmount: number) => {
    return usdfgAmount * usdfgPrice;
  }, [usdfgPrice]);
  
  // Separate state for completed challenges with unclaimed rewards (persists even after refresh)
  const [unclaimedPrizeChallenges, setUnclaimedPrizeChallenges] = useState<any[]>([]);
  
  // Listen for completed challenges where current user won but hasn't claimed reward
  useEffect(() => {
    if (!publicKey || !isConnected) {
      setUnclaimedPrizeChallenges([]);
      return;
    }
    
    const currentWallet = publicKey.toString();
    
    // Check firestoreChallenges for completed challenges with unclaimed rewards
    const unclaimed = firestoreChallenges.filter((challenge: any) => {
      const status = challenge.status || challenge.rawData?.status;
      const winner = challenge.rawData?.winner || challenge.winner;
      const founderPayoutSentAt = challenge.founderPayoutSentAt ?? challenge.rawData?.founderPayoutSentAt;
      const founderPayoutAcknowledgedBy = challenge.founderPayoutAcknowledgedBy ?? challenge.rawData?.founderPayoutAcknowledgedBy ?? [];
      const userWon =
        !!winner &&
        winner !== 'forfeit' &&
        winner !== 'tie' &&
        walletsEqual(winner, currentWallet);
      
      let isClaimed = isChallengeRewardClaimed(challenge);
      // Founder Tournament: also treat as "claimed" for this user if they acknowledged or founder sent airdrop
      const format = challenge.format || challenge.rawData?.format;
      const isTournament = format === 'tournament';
      if (isTournament && userWon) {
        if (founderPayoutSentAt) isClaimed = true;
        else if (
          Array.isArray(founderPayoutAcknowledgedBy) &&
          founderPayoutAcknowledgedBy.some((w: string) => walletsEqual(w, currentWallet))
        )
          isClaimed = true;
      }
      
      return status === 'completed' && userWon && !isClaimed;
    });
    
    setUnclaimedPrizeChallenges(unclaimed);
  }, [firestoreChallenges, publicKey, isConnected]);
  
  // Calculate active challenges count from real-time data
  useEffect(() => {
    if (!firestoreChallenges) return;

    const activeChallenges = firestoreChallenges.filter(
      (c: any) => {
        const status = c.status ?? c.rawData?.status;
        return (
          status === 'active' ||
          status === 'pending_waiting_for_opponent' ||
          status === 'creator_confirmation_required' ||
          status === 'creator_funded'
        );
      }
    );

    setActiveChallengesCount(activeChallenges.length);

    // Derive an "in the arena" player count from wallets involved in active/pending challenges.
    const uniqueWallets = new Set<string>();
    for (const c of activeChallenges) {
      const creator = getChallengeCreator(c);
      const challenger = getChallengeChallenger(c);
      const pendingJoiner = getChallengePendingJoiner(c);

      if (creator) uniqueWallets.add(String(creator).toLowerCase());
      if (challenger) uniqueWallets.add(String(challenger).toLowerCase());
      if (pendingJoiner) uniqueWallets.add(String(pendingJoiner).toLowerCase());

      const players: any[] | undefined = c.players ?? c.rawData?.players;
      if (Array.isArray(players)) {
        for (const p of players) {
          if (!p) continue;
          if (typeof p === 'string') uniqueWallets.add(p.toLowerCase());
          else if (p.wallet) uniqueWallets.add(String(p.wallet).toLowerCase());
          else if (p.address) uniqueWallets.add(String(p.address).toLowerCase());
        }
      }
    }

    setArenaPlayersCount(uniqueWallets.size);
  }, [firestoreChallenges]);

  // Timeout monitoring: Check and revert expired challenges
  useEffect(() => {
    if (!firestoreChallenges || firestoreChallenges.length === 0) return;

    const checkTimeouts = async () => {
      for (const challenge of firestoreChallenges) {
        const status = challenge.status || challenge.rawData?.status;
        const challengeId = challenge.id;

        if (!challengeId) continue;

        try {
          // Check creator timeout (creator_confirmation_required state)
          if (status === 'creator_confirmation_required') {
            const deadline = challenge.rawData?.creatorFundingDeadline;
            if (deadline && deadline.toMillis() < Date.now()) {
              await revertCreatorTimeout(challengeId);
            }
          }

          // Check joiner timeout (creator_funded state)
          if (status === 'creator_funded') {
            const deadline = challenge.rawData?.joinerFundingDeadline;
            if (deadline && deadline.toMillis() < Date.now()) {
              await revertJoinerTimeout(challengeId);
            }
          }

          // Check pending expiration (pending_waiting_for_opponent state)
          if (status === 'pending_waiting_for_opponent') {
            const expirationTimer = challenge.rawData?.expirationTimer;
            if (expirationTimer && expirationTimer.toMillis() < Date.now()) {
              await expirePendingChallenge(challengeId);
            }
          }
        } catch (error) {
          console.error(`Error checking timeout for challenge ${challengeId}:`, error);
        }
      }
    };

    // Check immediately
    checkTimeouts();

    // Then check every 30 seconds
    const interval = setInterval(checkTimeouts, 30000);

    return () => clearInterval(interval);
  }, [firestoreChallenges]);
  
  useEffect(() => {
    if (!publicKey) {
      return;
    }
    ensureUserLockDocument(publicKey.toString()).catch((error) => {
      console.error('❌ Failed to ensure user lock document:', error);
    });
  }, [publicKey]);

  // One-time fetch of lock notifications when wallet connects (no realtime listener)
  useEffect(() => {
    if (!publicKey) {
      setLockNotificationsList([]);
      lockNotificationStatusRef.current = {};
      return;
    }
    getLockNotificationsForWallet(publicKey.toString()).then(setLockNotificationsList);
  }, [publicKey]);

  useEffect(() => {
    const previousStatuses = lockNotificationStatusRef.current;

    lockNotificationsList.forEach((notification) => {
      const prevStatus = previousStatuses[notification.matchId];
      const initiatorWallet = notification.initiator?.toLowerCase();
      const targetWallet = notification.target?.toLowerCase();
      const displayName =
        notification.initiatorDisplayName ||
        (notification.initiator ? formatWalletAddress(notification.initiator) : 'Opponent');
      const targetDisplayName =
        notification.targetDisplayName ||
        (notification.target ? formatWalletAddress(notification.target) : 'Player');

      if (
        notification.status === 'pending' &&
        targetWallet === normalizedCurrentWallet &&
        prevStatus !== 'pending'
      ) {
        setNotification({
          isOpen: true,
          title: 'Friendly Challenge Request',
          message: `${displayName} challenged you to a friendly match. Tap “Accept Challenge” on their card to start.`,
          type: 'info',
        });
      }

      if (
        notification.status === 'accepted' &&
        initiatorWallet === normalizedCurrentWallet &&
        prevStatus !== 'accepted'
      ) {
        setNotification({
          isOpen: true,
          title: 'Challenge Accepted',
          message: `${targetDisplayName} accepted your challenge. Friendly match is ready!`,
          type: 'success',
        });
      }

      if (
        notification.status === 'cancelled' &&
        targetWallet === normalizedCurrentWallet &&
        prevStatus && prevStatus !== 'cancelled'
      ) {
        setNotification({
          isOpen: true,
          title: 'Challenge Cancelled',
          message: `${displayName} cancelled the challenge.`,
          type: 'warning',
        });
      }
    });

    lockNotificationStatusRef.current = lockNotificationsList.reduce(
      (acc, notification) => {
        acc[notification.matchId] = notification.status;
        return acc;
      },
      {} as Record<string, LockNotification['status']>
    );
  }, [lockNotificationsList, normalizedCurrentWallet, formatWalletAddress]);

  // Challenge notifications: no realtime listener; users see new challenges via listenToChallenges

  // Show toasts for new challenge notifications (list stays empty without listener)
  useEffect(() => {
    const previousStatuses = challengeNotificationStatusRef.current;

    challengeNotificationsList.forEach((notification) => {
      const prevStatus = previousStatuses[notification.challengeId];
      const creatorWallet = notification.creator?.toLowerCase();
      const targetWallet = notification.targetPlayer?.toLowerCase();
      const creatorDisplayName =
        notification.creatorDisplayName ||
        (notification.creator ? formatWalletAddress(notification.creator) : 'Player');
      
      const challengeTitle = notification.challengeTitle || 'Challenge';
      const entryFee = notification.entryFee || 0;
      const prizePool = notification.prizePool || entryFee * 2;

      if (
        notification.status === 'pending' &&
        targetWallet === normalizedCurrentWallet &&
        prevStatus !== 'pending'
      ) {
        setNotification({
          isOpen: true,
          title: 'Challenge Received',
          message: `${creatorDisplayName} sent you a challenge: ${challengeTitle}. Challenge Amount: ${entryFee} USDFG, Challenge Reward: ${prizePool} USDFG`,
          type: 'info',
        });
      }
    });

    challengeNotificationStatusRef.current = challengeNotificationsList.reduce(
      (acc, notification) => {
        acc[notification.challengeId] = notification.status;
        return acc;
      },
      {} as Record<string, ChallengeNotification['status']>
    );
  }, [challengeNotificationsList, normalizedCurrentWallet, formatWalletAddress]);

  useEffect(() => {
    if (!normalizedCurrentWallet || !mutualLockOpponentId) {
      setFriendlyMatch(null);
      setShowFriendlySubmitResult(false);
      lastFriendlyMatchIdRef.current = null;
      return;
    }

    const matchId = createFriendlyMatchId(normalizedCurrentWallet, mutualLockOpponentId);
    const opponentFromLeaderboard = topPlayers.find((player) => player.wallet?.toLowerCase() === mutualLockOpponentId);
    const fallbackName = opponentFromLeaderboard?.displayName && opponentFromLeaderboard.displayName.trim().length > 0
      ? opponentFromLeaderboard.displayName
      : formatWalletAddress(mutualLockOpponentId);

    setFriendlyMatch((previous) => {
      if (previous && previous.matchId === matchId) {
        if (previous.opponentName === fallbackName) {
          return previous;
        }
        return { ...previous, opponentName: fallbackName };
      }

      return {
        opponentId: mutualLockOpponentId,
        opponentName: fallbackName,
        matchId,
      };
    });

    const isNewMatch = lastFriendlyMatchIdRef.current !== matchId;
    if (isNewMatch) {
      lastFriendlyMatchIdRef.current = matchId;
      setShowFriendlySubmitResult(true);
      setNotification({
        isOpen: true,
        title: 'Friendly Match Ready',
        message: `You and ${fallbackName} locked in. Submit results whenever you’re ready.`,
        type: 'success',
      });

      if (normalizedCurrentWallet) {
        upsertLockNotification({
          matchId,
          status: 'accepted',
          lastActionBy: normalizedCurrentWallet,
        }).catch((error) => {
          console.error('❌ Failed to mark lock notification accepted:', error);
        });
      }
    }

    let isMounted = true;

    if (!opponentFromLeaderboard?.displayName) {
      getPlayerStats(mutualLockOpponentId).then((stats) => {
        const displayName = stats?.displayName;
        if (!isMounted || !displayName) {
          return;
        }
        setFriendlyMatch((previous) => {
          if (!previous || previous.opponentId !== mutualLockOpponentId) {
            return previous;
          }
          if (previous.opponentName === displayName) {
            return previous;
          }
          return { ...previous, opponentName: displayName };
        });
      }).catch((error) => {
        console.error('❌ Failed to load opponent display name:', error);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [normalizedCurrentWallet, mutualLockOpponentId, topPlayers, createFriendlyMatchId, formatWalletAddress, upsertLockNotification]);
  
  // Refresh leaderboard when a challenge completes (new completion detected)
  // MUST be after firestoreChallenges is defined
  useEffect(() => {
    if (!firestoreChallenges || firestoreChallenges.length === 0) return;

    // Find newly completed challenges (with winner)
    const newlyCompleted = firestoreChallenges.filter((c: any) => 
      c.status === 'completed' && 
      c.winner && 
      c.winner !== 'forfeit' && 
      c.winner !== 'tie' &&
      !completedChallengeIds.has(c.id)
    );

    // If we found a newly completed challenge, refresh leaderboard
    if (newlyCompleted.length > 0) {
      
      // Update tracked completed challenges
      const newCompletedIds = new Set(completedChallengeIds);
      newlyCompleted.forEach((c: any) => newCompletedIds.add(c.id));
      setCompletedChallengeIds(newCompletedIds);

      // Debounce refresh to avoid too many calls (wait for stats to be updated)
      const timeoutId = setTimeout(async () => {
        try {
          const limit = showAllPlayers ? leaderboardLimit : 5;
          const players = await getLeaderboardPlayers(limit, 'totalEarned', showAllPlayers);
          setTopPlayers(players);
        } catch (error) {
          console.error('Failed to refresh leaderboard:', error);
        }
      }, 2000); // Wait 2 seconds for stats to be updated in Firestore
      
      return () => clearTimeout(timeoutId);
    }
  }, [firestoreChallenges, completedChallengeIds, showAllPlayers, leaderboardLimit]);
  
  // Auto-expire challenges after 2 hours
  useChallengeExpiry(firestoreChallenges);
  
  // Monitor result submission deadlines
  useResultDeadlines(firestoreChallenges);
  
  
  // Auto-open Tournament Lobby when player joins a tournament (waiting or in progress)
  useEffect(() => {
    if (!publicKey || !firestoreChallenges || !isConnected) return;
    
    const currentWallet = publicKey.toString();
    
    // Check for tournament challenges where user is a participant
    const myTournamentChallenges = firestoreChallenges.filter((challenge: any) => {
      const format = challenge.format || (challenge.tournament ? 'tournament' : 'standard');
      if (format !== 'tournament') return false;
      
      const playersRaw = challenge.players;
      const players = Array.isArray(playersRaw) ? playersRaw : [];
      const isParticipant = isParticipantWallet(players, currentWallet);
      
      return isParticipant;
    });
    
    // Auto-open tournament lobby if user is in a tournament and modal isn't already open
    if (myTournamentChallenges.length > 0 && !showTournamentLobby && !showSubmitResultModal && !showTrustReview) {
      const challenge = myTournamentChallenges[0];
      const tournament = challenge.tournament;
      const stage = tournament?.stage || 'waiting_for_players';
      
      // Only auto-open if tournament is waiting for players or in progress
      // (Don't auto-open if it's completed or cancelled)
      if (stage === 'waiting_for_players' || stage === 'round_in_progress' || stage === 'awaiting_results') {
        try {
          // Don't open if lobby is already open for this challenge
          if (showStandardLobby && selectedChallenge?.id === challenge.id) {
            return; // Already open (shouldn't happen for tournament, but safety check)
          }
          
          // Update challenge in existing lobby instead of closing (X Spaces style)
          const merged = mergeChallengeDataForModal(challenge, challenge);
          setSelectedChallenge(merged);
          // If standard lobby is open, switch to tournament lobby
          if (showStandardLobby) {
            setShowStandardLobby(false);
          }
          setShowTournamentLobby(true);
          console.log(`🏆 Tournament lobby opened (stage: ${stage})`);
        } catch (error) {
          console.error('Failed to open tournament lobby:', error);
        }
      }
    }
  }, [firestoreChallenges, publicKey, isConnected, showTournamentLobby, showSubmitResultModal, showTrustReview, showStandardLobby, selectedChallenge?.id, mergeChallengeDataForModal]);

  // Update selectedChallenge in real-time when tournament data changes
  useEffect(() => {
    if (!selectedChallenge || !showTournamentLobby || !firestoreChallenges) return;
    
    const challengeId = selectedChallenge.id;
    const updatedChallenge = firestoreChallenges.find((c: any) => c.id === challengeId);
    
    if (updatedChallenge) {
      try {
        const merged = mergeChallengeDataForModal(selectedChallenge, updatedChallenge);
        setSelectedChallenge(merged);
      } catch (error) {
        console.error('Failed to update tournament challenge:', error);
      }
    }
  }, [firestoreChallenges, selectedChallenge?.id, showTournamentLobby, mergeChallengeDataForModal]);

  // Update selectedChallenge in real-time when challenge status/data changes (for join modal)
  useEffect(() => {
    if (!selectedChallenge || !firestoreChallenges || showTournamentLobby) return;
    
    const challengeId = selectedChallenge.id;
    const updatedChallenge = firestoreChallenges.find((c: any) => c.id === challengeId);
    
    if (updatedChallenge) {
      try {
        // Convert Firestore challenge to UI format
        const challengeAny = updatedChallenge as any;
        const title = challengeAny.title || '';
        const game = challengeAny.game || extractGameFromTitle(title) || 'USDFG Arena';
        const category = challengeAny.category || getGameCategory(game) || 'Gaming';
        const mode = extractModeFromTitle(title) || 'Head-to-Head';
        const platform = challengeAny.platform || 'All Platforms';
        const creatorTag = updatedChallenge.creator?.slice(0, 8) + '...' || 'Unknown';
        const prizePool = updatedChallenge.prizePool || (updatedChallenge.entryFee * 2);
        const rules = 'Standard USDFG Arena rules apply';
        
        const getMaxPlayers = (mode: string) => {
          if (!mode) return 2;
          switch (mode.toLowerCase()) {
            case 'head-to-head':
            case '1v1':
              return 2;
            case 'tournament':
            case 'bracket':
              return 8;
            case 'battle royale':
              return 16;
            case 'team vs team':
              return 4;
            default:
              return 2;
          }
        };

        const maxPlayers = updatedChallenge.maxPlayers || getMaxPlayers(mode);
        const playersForMerge = Array.isArray(updatedChallenge.players) ? updatedChallenge.players : [];
        const creatorW = updatedChallenge.creator;
        const challengerW = updatedChallenge.challenger;
        const pendingJoinerW = updatedChallenge.pendingJoiner;
        const mergeSet = new Set<string>();
        if (creatorW) mergeSet.add(creatorW.toLowerCase());
        if (challengerW) mergeSet.add(challengerW.toLowerCase());
        if (pendingJoinerW) mergeSet.add(pendingJoinerW.toLowerCase());
        playersForMerge.forEach((p: string) => p && mergeSet.add(p.toLowerCase()));
        const currentPlayersCount = Math.min(mergeSet.size || 1, maxPlayers);
        const playersArray = playersForMerge;

        const merged = {
          ...selectedChallenge,
          id: updatedChallenge.id,
          title: `${game} ${mode}`,
          game: game,
          mode: mode,
          platform: platform,
          username: creatorTag,
          entryFee: updatedChallenge.entryFee,
          prizePool: prizePool,
          players: currentPlayersCount, // Keep as number for display
          capacity: maxPlayers,
          category: category,
          creator: updatedChallenge.creator,
          rules: rules,
          status: updatedChallenge.status,
          rawData: {
            ...updatedChallenge,
            players: playersArray, // Ensure players array is in rawData
          },
        };
        
        setSelectedChallenge(merged);
      } catch (error) {
        console.error('Failed to update selected challenge:', error);
      }
    }
  }, [firestoreChallenges, selectedChallenge?.id, showTournamentLobby]);

  // Auto-open chat modal when challenge becomes active and user is a participant
  useEffect(() => {
    if (!publicKey || !firestoreChallenges || !isConnected) return;
    
    const currentWallet = publicKey.toString();
    
    // Find challenges where user is a participant and status is active/funded
    const myActiveChallenges = firestoreChallenges.filter((challenge: any) => {
      // Check players array (actual participant list) or creator
      const playersRaw = challenge.players;
      const playersArray = Array.isArray(playersRaw) ? playersRaw : [];
      const isParticipant =
        isParticipantWallet(playersArray, currentWallet) ||
        walletsEqual(challenge.creator, currentWallet);
      
      const status = challenge.status || challenge.rawData?.status;
      const isActive = status === 'active' || 
                      status === 'creator_confirmation_required' ||
                      status === 'creator_funded';
      
      return isParticipant && isActive;
    });
    
    // Note: Chat/voice is now integrated into persistent lobbies (StandardChallengeLobby and TournamentBracketView)
    // No separate chat modal needed
  }, [firestoreChallenges, publicKey, isConnected, showTournamentLobby, showSubmitResultModal]);
  
  // Auto-open Submit Result Room when user's challenge becomes "in-progress"
  useEffect(() => {
    if (!publicKey || !firestoreChallenges || !isConnected) return;
    
    const currentWallet = publicKey.toString();
    
    const myInProgressChallenges = firestoreChallenges.filter((challenge: any) => {
      // Skip tournament challenges (handled separately above)
      const format = challenge.format || (challenge.tournament ? 'tournament' : 'standard');
      if (format === 'tournament') return false;
      
      const st = challenge.status || challenge.rawData?.status;
      if (st !== 'active' && st !== 'awaiting_auto_resolution') return false;
      
      const playersRaw = challenge.players;
      const players = Array.isArray(playersRaw) ? playersRaw : [];
      const isParticipant = isParticipantWallet(players, currentWallet);
      
      return isParticipant;
    });
    
    // If there's an in-progress challenge and modal isn't already open
    if (myInProgressChallenges.length > 0 && !showSubmitResultModal && !showTrustReview && !showStandardLobby) {
      const challenge = myInProgressChallenges[0];
      
      const results = (challenge as any).results || {};
      const hasSubmitted =
        !!currentWallet &&
        Object.keys(results).some((k) => walletsEqual(k, currentWallet));
      
      if (hasSubmitted) {
        return; // Don't auto-open if you already submitted
      }
      
      // Check if opponent already submitted a loss (making current player auto-winner)
      const playersForResult = Array.isArray(challenge.players) ? challenge.players : [];
      const opponentWallet = playersForResult.find((p: string) => p && !walletsEqual(p, currentWallet));
      const opponentResult = opponentWallet && results[opponentWallet];
      const challengeStatus = challenge.status || challenge.rawData?.status;
      const winner = (challenge as any).winner ?? (challenge as any).rawData?.winner;
      const userIsDeclaredWinner =
        !!winner && typeof winner === "string" && walletsEqual(winner, currentWallet);

      if (
        opponentResult &&
        opponentResult.didWin === false &&
        challengeStatus === "completed" &&
        userIsDeclaredWinner
      ) {
        // Only after finalization: never treat provisional loss (awaiting_auto_resolution) as a win
        console.log("🎯 Match finalized with you as winner — opening trust review...");
        
        const opponentName = opponentWallet ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Opponent';
        
        setPendingMatchResult({
          didWin: true,
          proofFile: null,
          challengeId: challenge.id,
          opponentWallet: opponentWallet || undefined,
          autoWon: true
        });
        
      setSelectedChallenge({
        id: challenge.id,
          title: (challenge as any).title || extractGameFromTitle((challenge as any).title || '') || "Challenge",
          ...challenge
        });
        
        setTrustReviewOpponent(opponentName);
        setShowTrustReview(true);
        return;
      }
      
      // Close any existing modals/lobbies first
      // Don't open if lobby is already open for this challenge
      if (showStandardLobby && selectedChallenge?.id === challenge.id) {
        return; // Already open
      }
      // Close other lobby types
      if (showTournamentLobby) {
        setShowTournamentLobby(false);
      }
      
      // Open standard lobby for active or provisional-resolution challenges
      const status = challenge.status || challenge.rawData?.status;
      if (status === 'active' || status === 'awaiting_auto_resolution') {
      setSelectedChallenge({
        id: challenge.id,
        title: (challenge as any).title || extractGameFromTitle((challenge as any).title || '') || "Challenge",
        ...challenge
      });
        setShowStandardLobby(true);
    }
    }
  }, [firestoreChallenges, publicKey, showSubmitResultModal, showTrustReview, showStandardLobby, showTournamentLobby, selectedChallenge?.id, isConnected]);
  
  // Convert Firestore challenges to the format expected by the UI
  const challenges = useMemo(() => firestoreChallenges.map(challenge => {
    // Generate values from stored data (mode, platform, etc. were removed to keep data light)
    // Cast to any to access optional fields that may be stored but aren't in type definition
    const challengeAny = challenge as any;
    const title = challengeAny.title || '';
    const game = challengeAny.game || extractGameFromTitle(title) || 'USDFG Arena';
    const category = challengeAny.category || getGameCategory(game) || 'Gaming';
    const mode = extractModeFromTitle(title) || 'Head-to-Head'; // Extract from title
    const platform = challengeAny.platform || 'All Platforms'; // Read from Firestore data
    const creatorTag = challenge.creator?.slice(0, 8) + '...' || 'Unknown'; // Generate from creator wallet
    const prizePool = challenge.prizePool || (challenge.entryFee * 2);
    const rules = 'Standard USDFG Arena rules apply'; // Default since not stored
    
    // Determine max players based on mode
    const getMaxPlayers = (mode: string) => {
      if (!mode) return 2; // Safety check for undefined mode
      switch (mode.toLowerCase()) {
        case 'head-to-head':
        case '1v1':
          return 2;
        case 'tournament':
        case 'bracket':
          return 8;
        case 'battle royale':
          return 16;
        case 'team vs team':
          return 4;
        default:
          return 2; // Default to 2 players for Head-to-Head
      }
    };

    const maxPlayers = challenge.maxPlayers || getMaxPlayers(mode);
    // Same logic as lobby: count creator + challenger + pendingJoiner + players (dedupe)
    const creatorWallet = challenge.creator || challenge.rawData?.creator;
    const challengerWallet = challenge.challenger || challenge.rawData?.challenger;
    const pendingJoinerWallet = challenge.pendingJoiner || challenge.rawData?.pendingJoiner;
    const playersArr = Array.isArray(challenge.players) ? challenge.players : (Array.isArray(challenge.rawData?.players) ? challenge.rawData.players : []);
    const participantSet = new Set<string>();
    if (creatorWallet) participantSet.add(creatorWallet.toLowerCase());
    if (challengerWallet) participantSet.add(challengerWallet.toLowerCase());
    if (pendingJoinerWallet) participantSet.add(pendingJoinerWallet.toLowerCase());
    playersArr.forEach((p: string) => p && participantSet.add(p.toLowerCase()));
    const currentPlayers = Math.min(participantSet.size || 1, maxPlayers);
    const creatorLc = ((creatorWallet as string) || "").toLowerCase();
    const creatorStats = creatorClientStatsMap[creatorLc];
    const existingSticky = creatorDisplayTrustStickyRef.current[creatorLc];
    const creatorDisplayTrust =
      creatorStats?.displayTrustScore ?? existingSticky ?? 5;
    if (creatorStats?.displayTrustScore != null) {
      creatorDisplayTrustStickyRef.current[creatorLc] = creatorStats.displayTrustScore;
      const MAX_CACHE = 200;
      if (Object.keys(creatorDisplayTrustStickyRef.current).length > MAX_CACHE) {
        creatorDisplayTrustStickyRef.current = {};
      }
    }
    const creatorDisputesWon = Number(creatorStats?.disputesWon) || 0;
    const creatorDisputesLost = Number(creatorStats?.disputesLost) || 0;

    return {
      id: challenge.id,
      clientId: challenge.id,
      title: `${game} ${mode}`,
      game: game,
      mode: mode,
      platform: platform,
      username: creatorTag,
      entryFee: challenge.entryFee,
      prizePool: prizePool,
      players: currentPlayers,
      capacity: maxPlayers,
      category: category,
      creator: challenge.creator,
      challenger: challenge.challenger,
      format: challenge.format,
      tournament: challenge.tournament,
      founderParticipantReward: challenge.founderParticipantReward,
      founderWinnerBonus: challenge.founderWinnerBonus,
      pda: challenge.pda,
      rules: rules,
      createdAt: challenge.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      timestamp: challenge.createdAt?.toDate?.()?.getTime() || Date.now(),
      expiresAt: challenge.expiresAt?.toDate?.()?.getTime() || (Date.now() + (2 * 60 * 60 * 1000)),
      status: challenge.status,
      creatorDisplayTrust,
      creatorDisputesWon,
      creatorDisputesLost,
      rawData: challenge // Keep original Firestore data for player checks and results
    };
  }), [firestoreChallenges, creatorClientStatsMap]);
  
  // Log errors only
  if (challengesError) {
    console.error("❌ Challenges error:", challengesError);
  }

  const handleChallengePlayer = (playerData: any) => {
    const currentWallet = publicKey?.toString();
    if (!currentWallet) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    // Check if user has an active challenge they created
    const userActiveChallenge = challenges.find(c => 
      c.creator === currentWallet && 
      (c.status === 'active' || c.status === 'pending_waiting_for_opponent' || c.status === 'creator_confirmation_required' || c.status === 'creator_funded')
    );

    if (userActiveChallenge) {
      void (async () => {
        const confirmSend = await requestAppConfirm({
          title: "Send challenge?",
          message:
            `Send your challenge "${userActiveChallenge.title}" to ${playerData.displayName || playerData.name}?\n\n` +
            `Game: ${userActiveChallenge.game}\n` +
            `Challenge Amount: ${userActiveChallenge.entryFee} USDFG\n` +
            `Challenge Reward: ${userActiveChallenge.prizePool} USDFG`,
          confirmLabel: "Send",
          cancelLabel: "Cancel",
          destructive: false,
        });
        if (!confirmSend) return;

        try {
          const targetWallet = playerData.address || playerData.wallet;
          if (!targetWallet) {
            showAppToast("Could not find player wallet address.", "error", "Send failed");
            return;
          }

          const { updateChallenge } = await import("@/lib/firebase/firestore");
          await updateChallenge(userActiveChallenge.id!, {
            targetPlayer: targetWallet,
          });

          const creatorStats = await getPlayerStats(currentWallet);
          const creatorDisplayName = creatorStats?.displayName;

          const targetStats = await getPlayerStats(targetWallet);
          const targetDisplayName = targetStats?.displayName;

          await upsertChallengeNotification({
            challengeId: userActiveChallenge.id!,
            creator: currentWallet,
            targetPlayer: targetWallet,
            creatorDisplayName,
            targetDisplayName,
            challengeTitle: userActiveChallenge.title,
            entryFee: userActiveChallenge.entryFee,
            prizePool: userActiveChallenge.prizePool,
            status: "pending",
          });

          setNotification({
            isOpen: true,
            title: "Challenge Sent",
            message: `Challenge sent to ${playerData.displayName || playerData.name}! They will be notified.`,
            type: "success",
          });
          setShowPlayerProfile(false);
        } catch (error: any) {
          console.error("Failed to send challenge:", error);
          showAppToast(`Failed to send challenge: ${error.message || "Unknown error"}`, "error", "Send failed");
        }
      })();
    } else {
      showAppToast(
        "You need to create a challenge first before you can send it to other players. Opening challenge creation.",
        "info",
        "Create a challenge"
      );
      setShowPlayerProfile(false);
      setShowCreateModal(true);
    }
  };

  const handleCreateChallenge = async (challengeData: any) => {
    if (isCreatingChallenge) {
      return;
    }

    const creatorWalletAddr = publicKey?.toString();
    if (creatorWalletAddr) {
      try {
        const creatorStats = await getPlayerStats(creatorWalletAddr);
        if ((creatorStats?.forfeits || 0) > 5) {
          showAppToast("Too many forfeits to create challenges", "error", "Cannot create");
          return;
        }
      } catch (e) {
        console.warn("Could not verify forfeits before create:", e);
      }
    }

    setIsCreatingChallenge(true);
    try {
      const result = await runCreateChallengeFlow({
        challengeData,
        wallet: {
          readPublicKey: () => publicKey?.toString() ?? null,
          readPhantomAdapterPublicKey: () =>
            wallet.wallets.find((w) => w.adapter.name === "Phantom")?.adapter?.publicKey?.toString() ??
            null,
        },
        firestoreChallenges,
        onTeamMissing: async () => {
          setShowCreateModal(false);
          setTimeout(() => setShowTeamModal(true), 100);
        },
        onActiveChallengeBlocked: ({ title, id, status }) => {
          showAppToast(
            `You already have an active challenge (${title || id || id}). Status: ${status}. Complete it before creating a new one.`,
            "warning",
            "Active challenge"
          );
        },
        onSuccess: async () => {
          setShowCreateModal(false);
        },
      });

      if (!result.ok) {
        return;
      }

      if (result.createdIds.length > 1) {
        showAppToast(
          `Created ${result.createdIds.length} challenge${result.createdIds.length > 1 ? "s" : ""}.`,
          "success",
          "Challenges created"
        );
      }
    } catch (error) {
      console.error("❌ Failed to create challenge:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (!errorMessage.includes("Opening team management")) {
        showAppToast("Failed to create challenge: " + errorMessage, "error", "Create failed");
      }
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string, challenge?: any): Promise<boolean> => {
    const confirmedDelete = await requestAppConfirm({
      title: "Delete challenge?",
      message: "Are you sure you want to cancel/delete this challenge? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      destructive: true,
    });
    if (!confirmedDelete) {
      return false;
    }
    try {
        // Check if challenge has on-chain PDA (not a Founder Challenge)
        const challengePDA = challenge?.pda || challenge?.rawData?.pda;
        const challengeStatus = challenge?.status || challenge?.rawData?.status;
        const isCreator = challenge?.creator === currentWallet || challenge?.rawData?.creator === currentWallet;
        
        // Check for expired states
        const creatorFundingDeadline = challenge?.rawData?.creatorFundingDeadline || challenge?.creatorFundingDeadline;
        const expirationTimer = challenge?.rawData?.expirationTimer || challenge?.expirationTimer;
        const pendingJoiner = challenge?.rawData?.pendingJoiner || challenge?.pendingJoiner;
        
        const isDeadlineExpired = creatorFundingDeadline && creatorFundingDeadline.toMillis() < Date.now();
        const isChallengeExpired = expirationTimer && expirationTimer.toMillis() < Date.now();
        
        // Allow cancellation if:
        // 1. User is the creator
        // 2. Challenge is in pending_waiting_for_opponent state (before anyone expresses intent)
        // OR: Confirmation deadline expired (regardless of pendingJoiner - challenge will revert)
        // OR: Challenge expired (60 minutes) and no one joined
        const canCancel = isCreator && (
          challengeStatus === 'pending_waiting_for_opponent' ||
          (challengeStatus === 'creator_confirmation_required' && isDeadlineExpired) ||
          (challengeStatus === 'pending_waiting_for_opponent' && isChallengeExpired && !pendingJoiner)
        );
        
        if (!canCancel) {
          if (!isCreator) {
            showAppToast("Only the challenge creator can cancel this challenge.", "warning");
          } else if (challengeStatus === 'creator_confirmation_required' && !isDeadlineExpired) {
            showAppToast(
              "Cannot cancel: Someone has already expressed intent to join. You must either fund the challenge or wait for the timeout.",
              "warning"
            );
          } else if (challengeStatus === 'creator_funded' || challengeStatus === 'active') {
            showAppToast("Cannot cancel: Challenge is already active with funds locked.", "warning");
          } else {
            showAppToast("This challenge cannot be cancelled in its current state.", "warning");
          }
          return false;
        }
        
        // If challenge has on-chain PDA, cancel on-chain first
        if (challengePDA && challengePDA !== 'founder_' && !challengePDA.startsWith('founder_')) {
          try {
            const { cancelChallenge } = await import("@/lib/chain/contract");
            const { Connection } = await import("@solana/web3.js");
            const { getRpcEndpoint } = await import("@/lib/chain/rpc");
            
            const connection = new Connection(getRpcEndpoint(), 'confirmed');
            const phantomWallet = wallet.wallets.find(w => w.adapter.name === 'Phantom');
            const walletToUse = phantomWallet?.adapter || wallet;
            
            if (!walletToUse || !walletToUse.publicKey) {
              throw new Error("Wallet not connected");
            }
            
            await cancelChallenge(walletToUse, connection, challengePDA);
            console.log("✅ Challenge cancelled on-chain");
          } catch (onChainError) {
            console.error("❌ Failed to cancel on-chain:", onChainError);
            // Continue to delete from Firestore even if on-chain cancel fails
            // (challenge might already be cancelled or not exist on-chain)
          }
        }
        
        // Delete from Firestore
        const { deleteChallenge } = await import("@/lib/firebase/firestore");
        await deleteChallenge(challengeId);
        console.log("✅ Challenge deleted from Firestore");
        
        showAppToast("Challenge cancelled and deleted successfully!", "success");
        return true;
      } catch (error) {
        console.error("❌ Failed to delete challenge:", error);
        showAppToast(
          "Failed to delete challenge: " + (error instanceof Error ? error.message : "Unknown error"),
          "error",
          "Delete failed"
        );
        return false;
      }
  };

  const handleShareChallenge = async (challenge: any) => {
    try {
      // Create shareable URL
      const shareUrl = `${window.location.origin}/app?challenge=${challenge.id}`;
      
      // Create share text
      const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Reward\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
      
      // Try to use Web Share API if available (mobile)
      // CRITICAL FIX: Check both navigator.share existence AND that it's a function
      if (typeof navigator !== 'undefined' && navigator.share && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `USDFG Arena Challenge: ${challenge.title}`,
            text: shareText,
            url: shareUrl
          });
          // If share succeeds, return early (user shared successfully)
          return;
        } catch (shareError: any) {
          // User cancellation is not an error - just return silently
          if (shareError.name === 'AbortError' || shareError.message?.includes('cancel')) {
            return; // User cancelled share dialog - this is fine
          }
          // If share fails for other reasons, fall through to clipboard
          console.warn('Share failed, falling back to clipboard:', shareError);
        }
      }
      
      // Fallback: copy to clipboard
      try {
        // Check if clipboard API is available
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(shareText);
          showAppToast("Challenge link copied to clipboard. Share it with your friends.", "success", "Copied");
        } else {
          // Last resort: show share text in prompt (works everywhere)
          throw new Error('Clipboard not available');
        }
      } catch (clipboardError: any) {
        const shareUrl = `${window.location.origin}/app?challenge=${challenge.id}`;
        const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Reward\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
        showAppToast(`${shareText}\n\n(Copy the text above if needed.)`, "info", "Share this challenge");
      }
    } catch (error: any) {
      console.error('Error sharing challenge:', error);
      const shareUrl = `${window.location.origin}/app?challenge=${challenge.id}`;
      const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Reward\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
      showAppToast(`${shareText}\n\n(Copy the text above if needed.)`, "info", "Share this challenge");
    }
  };
  
  const handleLockToggle = useCallback(async (targetWallet: string) => {
    if (!targetWallet) {
      return;
    }

    if (!normalizedCurrentWallet) {
      connect();
      return;
    }

    const normalizedTarget = targetWallet.toLowerCase();
    if (normalizedTarget === normalizedCurrentWallet) {
      return;
    }

    setLockInProgress(targetWallet);
    try {
      const normalizedCurrentLockTarget = currentLockTarget ?? null;
      const nextLock = normalizedCurrentLockTarget === normalizedTarget ? null : normalizedTarget;
      await setUserCurrentLock(normalizedCurrentWallet, nextLock);

      const matchId = createFriendlyMatchId(normalizedCurrentWallet, normalizedTarget);

      if (nextLock) {
        const targetPlayer = topPlayers.find(
          (player) => player.wallet?.toLowerCase() === normalizedTarget
        );
        const targetCurrentLock = userLocks[normalizedTarget] ?? null;

        await upsertLockNotification({
          matchId,
          status: targetCurrentLock === normalizedCurrentWallet ? 'accepted' : 'pending',
          initiator: normalizedCurrentWallet,
          target: normalizedTarget,
          initiatorDisplayName: userGamerTag && userGamerTag.trim().length > 0
            ? userGamerTag.trim()
            : formatWalletAddress(currentWallet || normalizedCurrentWallet),
          targetDisplayName: targetPlayer?.displayName || formatWalletAddress(targetWallet),
          lastActionBy: normalizedCurrentWallet,
        });
      } else {
        await upsertLockNotification({
          matchId,
          status: 'cancelled',
          lastActionBy: normalizedCurrentWallet,
        });
      }
      getLockNotificationsForWallet(publicKey!.toString()).then(setLockNotificationsList);
    } catch (error) {
      console.error('❌ Failed to update lock state:', error);
      setNotification({
        isOpen: true,
        title: 'Challenge Failed',
        message: 'Could not send challenge request. Please try again.',
        type: 'error',
      });
    } finally {
      setLockInProgress(null);
    }
  }, [normalizedCurrentWallet, currentWallet, currentLockTarget, connect, createFriendlyMatchId, topPlayers, userGamerTag, formatWalletAddress, userLocks]);

  const ensureUsdfgTokenAccount = useCallback(async (walletAddr: string): Promise<boolean> => {
    if (!connection) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return false;
    }
    if (!signTransaction) {
      showAppToast("Wallet does not support transaction signing.", "error", "Wallet");
      return false;
    }

    const walletPubkey = new PublicKey(walletAddr);
    const ata = await getAssociatedTokenAddress(USDFG_MINT, walletPubkey);

    let hasUsdfgAccount = true;
    try {
      await getAccount(connection, ata);
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (error?.name === 'TokenAccountNotFoundError' || errorMsg.includes('could not find account') || errorMsg.includes('InvalidAccountData')) {
        hasUsdfgAccount = false;
      } else {
        console.warn('⚠️ Could not check USDFG token account:', error);
        hasUsdfgAccount = false;
      }
    }

    if (hasUsdfgAccount) {
      return true;
    }

    const shouldCreate = await requestAppConfirm({
      title: "Create USDFG token account?",
      message:
        "Founder payouts use airdrops. You need a USDFG token account (one-time ~0.002 SOL rent). Create it now?",
      confirmLabel: "Create account",
      cancelLabel: "Not now",
    });
    if (!shouldCreate) {
      showAppToast("You must initialize a USDFG token account to receive Founder rewards.", "warning", "USDFG account");
      return false;
    }

    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        walletPubkey,
        ata,
        walletPubkey,
        USDFG_MINT
      )
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    const signedTransaction = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    showAppToast("USDFG token account initialized. You can now join Founder rewards.", "success", "Ready");
    return true;
  }, [connection, signTransaction, requestAppConfirm, showAppToast]);

  // Handle joiner express intent from ChallengeDetailSheet
  const handleDirectJoinerExpressIntent = async (challenge: any) => {
    // CRITICAL: Join intent is Firestore-only - no on-chain transaction required
    const walletAddr = publicKey?.toString() || null;
    if (!walletAddr) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    const currentWallet = walletAddr.toLowerCase();
    const status = getChallengeStatus(challenge);
    const pendingJoiner = getChallengePendingJoiner(challenge);
    const challenger = getChallengeChallenger(challenge);
    const creatorWallet = getChallengeCreator(challenge);
    const isCreator = isChallengeCreator(challenge, currentWallet);
    const creatorFundingDeadline = getCreatorFundingDeadline(challenge);
    const isDeadlineExpired = isCreatorFundingDeadlineExpired(challenge);
    const isAlreadyPendingJoiner = isPendingJoiner(challenge, currentWallet);
    const isChallenger = isChallengeChallenger(challenge, currentWallet);

    const entryFeeValue = getChallengeEntryFee(challenge);
    const isAdminChallenge = creatorWallet && creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const isFounderChallenge = isAdminChallenge && (entryFeeValue === 0 || entryFeeValue < 0.000000001);

    if (isFounderChallenge) {
      const initialized = await ensureUsdfgTokenAccount(walletAddr);
      if (!initialized) {
        return;
      }
    }

    if (creatorWallet) {
      try {
        const [joinerStats, creatorStatsJoin] = await Promise.all([
          getPlayerStats(walletAddr),
          getPlayerStats(creatorWallet),
        ]);
        const userTrust = joinerStats?.displayTrustScore ?? 5;
        const creatorTrust =
          challenge.creatorDisplayTrust ?? creatorStatsJoin?.displayTrustScore ?? 5;
        if (userTrust < 3 && creatorTrust > 6) {
          showAppToast("Trust level too low for this challenge", "error", "Cannot join");
          return;
        }
      } catch (e) {
        console.warn("Trust check before join failed:", e);
      }
    }
    
    // Only prevent creator from joining if deadline hasn't expired and challenge is still waiting for creator funding
    if (isCreator && !isDeadlineExpired && status === 'creator_confirmation_required') {
      showAppToast('You are the creator. Use the "Confirm and Fund Challenge" button instead.', "info", "Creator");
      return;
    }

    // If status is creator_funded and user is the challenger, redirect to funding flow
    if (status === 'creator_funded' && isChallenger) {
      showAppToast(
        'The creator has funded. Please use the "Fund Challenge" button to fund your entry and start the match.',
        "info",
        "Fund your entry"
      );
      return;
    }

    // If creator and deadline expired, revert first
    if (isCreator && status === 'creator_confirmation_required' && isDeadlineExpired) {
      try {
        await revertCreatorTimeout(challenge.id);
        console.log('✅ Challenge reverted, creator can now join');
      } catch (revertError) {
        console.error('Failed to revert challenge:', revertError);
      }
    }
    
    // Quick status validation
    if (status !== 'pending_waiting_for_opponent' && status !== 'creator_confirmation_required') {
      if (status === 'creator_funded' && isChallenger) {
        showAppToast('The creator has funded. Please use the "Fund Challenge" button to fund your entry.', "info", "Fund your entry");
      } else if (status === 'creator_funded') {
        showAppToast(
          "This challenge is already funded by the creator. Waiting for the challenger to fund their entry.",
          "info",
          "Waiting"
        );
      } else {
        showAppToast(`Challenge is not waiting for opponent. Current status: ${status}`, "warning", "Cannot join");
      }
      return;
    }

    try {
      const currentStatus = challenge.status || challenge.rawData?.status;
      const isDeadlineExpired = creatorFundingDeadline && creatorFundingDeadline.toMillis() < Date.now();
      const isAlreadyPendingJoiner = pendingJoiner && pendingJoiner.toLowerCase() === walletAddr.toLowerCase();
    
      // If user is already a pending joiner, nothing to do
      if (isAlreadyPendingJoiner) {
        if (isDeadlineExpired) {
          showAppToast(
            "Confirmation deadline expired. The challenge will automatically revert to open status soon. Please wait a moment and try joining again.",
            "warning",
            "Deadline expired"
          );
          setShowDetailSheet(false);
          return;
        }
        showAppToast("You have already expressed intent to join this challenge. Waiting for creator to fund.", "success", "Already joined");
        setShowDetailSheet(false);
        return;
      }
      
      // If deadline expired and user is NOT the pending joiner, don't try to join
      if (currentStatus === 'creator_confirmation_required' && isDeadlineExpired) {
        throw new Error('⚠️ Confirmation deadline expired. The challenge will automatically revert to open status soon. Please wait a moment and try joining again.');
      }
      
      // Check team restrictions
      const challengeType = challenge.rawData?.challengeType;
      const teamOnly = challenge.rawData?.teamOnly;
      
      if (challengeType === 'team' && teamOnly === true) {
        const userTeam = await getTeamByMember(walletAddr);
        if (!userTeam) {
          throw new Error('This challenge is only open to teams. You must be part of a team to join.');
        }
      }
      
      // Express intent in Firestore first
      console.log("JOIN WRITE PAYLOAD", {
        challengeId: challenge.id,
        wallet: walletAddr,
        status: "creator_confirmation_required",
        pendingJoiner: walletAddr,
        opponentWallet: walletAddr,
      });
      try {
        const res = await expressJoinIntent(challenge.id, walletAddr);
        console.log("JOIN WRITE SUCCESS", { challengeId: challenge.id, wallet: walletAddr, res });
      } catch (error) {
        console.error("JOIN WRITE FAILED", error);
        throw error;
      }
      // DEBUG: Disable optimistic UI so we can inspect real backend state only.
      // const optimisticUpdate = {
      //   ...challenge,
      //   status: 'creator_confirmation_required',
      //   pendingJoiner: walletAddr,
      //   creatorFundingDeadline: { toMillis: () => Date.now() + (5 * 60 * 1000) }, // 5 minutes from now
      //   rawData: {
      //     ...(challenge.rawData || challenge),
      //     status: 'creator_confirmation_required',
      //     pendingJoiner: walletAddr,
      //     creatorFundingDeadline: { toMillis: () => Date.now() + (5 * 60 * 1000) }
      //   }
      // };
      //
      // setSelectedChallenge({
      //   id: optimisticUpdate.id,
      //   title: optimisticUpdate.title || extractGameFromTitle(optimisticUpdate.title || '') || "Challenge",
      //   ...optimisticUpdate,
      //   rawData: optimisticUpdate.rawData || optimisticUpdate
      // });
      //
      // if (firestoreChallenges) {
      //   const updatedChallenges = firestoreChallenges.map((c: any) =>
      //     c.id === challenge.id ? optimisticUpdate : c
      //   );
      // }

      // Read-after-write validation
      const fresh = await fetchChallengeById(challenge.id);
      console.log("POST-JOIN FETCH", {
        status: fresh?.status,
        pendingJoiner: (fresh as any)?.pendingJoiner,
        opponentWallet: (fresh as any)?.opponentWallet,
      });

      // Fetch fresh data to ensure we have the latest (real-time listener will also update)
      const updatedChallenge = fresh || await fetchChallengeById(challenge.id);
      if (updatedChallenge) {
        setSelectedChallenge({
          id: updatedChallenge.id,
          title: updatedChallenge.title || extractGameFromTitle(updatedChallenge.title || '') || "Challenge",
          ...updatedChallenge,
          rawData: updatedChallenge.rawData || updatedChallenge
        });
      }
      
      showAppToast("Join intent recorded. Creator can now fund the challenge.", "success", "Intent recorded");
      setShowDetailSheet(false);
      
      // Open minimized nav bar lobby first (auto-minimizes on mobile)
      setSelectedChallenge({
        id: challenge.id,
        title: challenge.title || extractGameFromTitle(challenge.title || '') || "Challenge",
        ...challenge,
        rawData: challenge.rawData || challenge
      });
      setShowStandardLobby(true);
    } catch (err: any) {
      if ((err as any)?.code) {
        console.error("JOIN WRITE FAILED CODE", (err as any).code);
      }
      console.error("JOIN WRITE FAILED FULL", err);
      console.error("❌ Express join intent failed:", err);
      const errorMessage = err.message || err.toString() || 'Failed to express join intent. Please try again.';
      showAppToast("Failed to express join intent: " + errorMessage, "error", "Join failed");
    }
  };

  // Handle joiner funding from ChallengeDetailSheet
  const handleDirectJoinerFund = async (challenge: any) => {
    // CRITICAL: Disable button immediately on click to prevent double-submission
    if (isJoinerFunding === challenge.id) {
      return; // Already processing
    }
    
    if (!publicKey || !connection) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    const { signTransaction } = wallet;
    if (!signTransaction) {
      showAppToast("Wallet does not support transaction signing.", "error", "Wallet");
      return;
    }

    const pk = publicKey.toString();
    const challengerWallet = challenge.rawData?.challenger || challenge.challenger;
    const isChallenger = challengerWallet && walletsEqual(challengerWallet, pk);
    
    if (!isChallenger) {
      showAppToast("Only the challenger who expressed intent can fund the challenge.", "warning", "Cannot fund");
      return;
    }

    const status = getChallengeStatus(challenge);
    if (status !== 'creator_funded') {
      showAppToast(`Challenge is not waiting for joiner funding. Current status: ${status}`, "warning", "Wrong status");
      return;
    }

    // CRITICAL: Idempotency guard - prevent double funding
    const freshChallenge = await fetchChallengeById(challenge.id);
    if (!freshChallenge) {
      throw new Error('Challenge not found. It may have been cancelled or expired.');
    }

    if (freshChallenge.status === 'active' || freshChallenge.status === 'completed') {
      showAppToast("Challenge already funded. Status: " + freshChallenge.status, "success", "Already funded");
      return;
    }

    // CRITICAL: Set funding state IMMEDIATELY before any async operations
    setIsJoinerFunding(challenge.id);

    try {
      const walletAddr = publicKey.toString();
      const challengePDA = getChallengePDA(freshChallenge) || getChallengePDA(challenge);
      const entryFee = getChallengeEntryFee(freshChallenge) || getChallengeEntryFee(challenge);
      
      if (!challengePDA) {
        throw new Error('Challenge has no on-chain PDA.');
      }

      // Joiner funds on-chain
      const fundingSignature = await joinerFundOnChain(
        { signTransaction, publicKey },
        connection,
        challengePDA,
        entryFee
      );
      
      // Update Firestore
      await joinerFund(challenge.id, walletAddr);

      const explorerUrl = fundingSignature && fundingSignature.length > 30
        ? getExplorerTxUrl(fundingSignature)
        : '';
      if (explorerUrl) {
        await postChallengeSystemMessage(challenge.id, `💸 Challenger funded on-chain: ${explorerUrl}`);
      }
      
      // Refresh balance
      setTimeout(() => {
        refreshUSDFGBalance().catch(() => {});
      }, 2000);

      // Close detail sheet
      setShowDetailSheet(false);
      
      // Wait for status to become active, then open lobby
      let updatedChallenge = null;
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        updatedChallenge = await fetchChallengeById(challenge.id);
        const finalStatus = updatedChallenge?.status || challenge.status || challenge.rawData?.status;
        
        if (finalStatus === 'active') {
          // Open lobby
          const format = updatedChallenge?.format || (updatedChallenge?.tournament ? 'tournament' : 'standard');
          const isTournament = format === 'tournament';
          
          setSelectedChallenge({
            id: challenge.id,
            title: challenge.title || extractGameFromTitle(challenge.title || '') || "Challenge",
            ...updatedChallenge,
            rawData: updatedChallenge
          });
          
          if (isTournament) {
            setShowTournamentLobby(true);
          } else {
            setShowStandardLobby(true);
          }
          break;
        }
        retries++;
      }
      
      showAppToast("Challenge funded successfully. Match is now active.", "success", "Funded");
    } catch (err: any) {
      console.error("❌ Joiner funding failed:", err);
      showAppToast("Failed to fund challenge: " + (err.message || "Unknown error"), "error", "Funding failed");
    } finally {
      // CRITICAL: Always clear funding state, even on error
      setIsJoinerFunding(null);
    }
  };

  // Handle cancel/delete challenge (creator only, when deadline expired or no one joined)
  const handleCancelChallenge = async (challenge: any) => {
    if (!publicKey) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    const currentWallet = publicKey.toString().toLowerCase();
    const creatorWallet = getChallengeCreator(challenge);
    const isCreator = isChallengeCreator(challenge, currentWallet);
    
    if (!isCreator) {
      showAppToast("Only the challenge creator can cancel the challenge.", "warning", "Cannot cancel");
      return;
    }

    const status = getChallengeStatus(challenge);
    const format = challenge.rawData?.format || (challenge.rawData?.tournament ? 'tournament' : 'standard');
    const isTournament = format === 'tournament';
    const tournament = challenge.rawData?.tournament;
    
    // For tournaments, allow deletion if stage is waiting_for_players
    if (isTournament) {
      if (tournament?.stage !== 'waiting_for_players') {
        showAppToast(
          `Cannot cancel tournament in ${tournament?.stage || "unknown"} stage. Only tournaments waiting for players can be cancelled.`,
          "warning",
          "Cannot cancel"
        );
        return;
      }
    } else {
      // For standard challenges, use existing logic
      const isDeadlineExpired = isCreatorFundingDeadlineExpired(challenge);
      
      // Only allow cancel if deadline expired or challenge is still pending (no one joined)
      if (status !== 'pending_waiting_for_opponent' && status !== 'creator_confirmation_required') {
        if (status === 'creator_confirmation_required' && !isDeadlineExpired) {
          showAppToast(
            "Cannot cancel challenge while waiting for your confirmation. Either fund the challenge or wait for the deadline to expire.",
            "warning",
            "Cannot cancel"
          );
        } else {
          showAppToast(`Cannot cancel challenge in ${status} state. Only pending challenges can be cancelled.`, "warning", "Cannot cancel");
        }
        return;
      }

      // First, revert if deadline expired and status hasn't updated yet
      if (status === 'creator_confirmation_required' && isDeadlineExpired) {
        await revertCreatorTimeout(challenge.id);
      }
    }

    try {
      // Delete the challenge
      await deleteChallenge(challenge.id);
      
      // Close the lobby
      setShowStandardLobby(false);
      setShowTournamentLobby(false);
      setSelectedChallenge(null);
      
      showAppToast("Challenge cancelled and deleted successfully.", "success", "Cancelled");
    } catch (err: any) {
      console.error("❌ Cancel challenge failed:", err);
      showAppToast("Failed to cancel challenge: " + (err.message || "Unknown error"), "error", "Cancel failed");
    }
  };

  const handleUpdateEntryFee = async (challenge: any, newEntryFee: number) => {
    if (!publicKey) {
      throw new Error('Please connect your wallet first.');
    }

    const pk = publicKey.toString();
    const creatorWallet = getChallengeCreator(challenge);
    if (!creatorWallet || !walletsEqual(creatorWallet, pk)) {
      throw new Error('Only the challenge creator can edit the amount.');
    }

    const status = getChallengeStatus(challenge);
    if (status !== 'pending_waiting_for_opponent') {
      throw new Error('Amount can only be edited before anyone joins.');
    }

    const pendingJoiner = getChallengePendingJoiner(challenge);
    const challenger = getChallengeChallenger(challenge);
    if (pendingJoiner || challenger) {
      throw new Error('Amount can only be edited before anyone joins.');
    }

    const playersRaw = challenge.players ?? challenge.rawData?.players ?? [];
    const players = Array.isArray(playersRaw) ? playersRaw : [];
    if (players.length > 1) {
      throw new Error('Amount can only be edited before anyone joins.');
    }

    const format =
      challenge.rawData?.format || (challenge.rawData?.tournament ? 'tournament' : 'standard');
    if (format === 'tournament') {
      throw new Error('Tournament amounts cannot be edited.');
    }

    const entryFeeValue = Number(newEntryFee);
    if (!Number.isFinite(entryFeeValue)) {
      throw new Error('Enter a valid amount.');
    }
    if (entryFeeValue <= 0) {
      throw new Error('Amount must be greater than 0.');
    }
    if (entryFeeValue > 1000) {
      throw new Error('Max amount is 1000 USDFG.');
    }

    const previousEntryFee =
      getChallengeEntryFee(challenge) || challenge.entryFee || challenge.rawData?.entryFee || 0;
    if (Math.abs(entryFeeValue - previousEntryFee) < 0.000000001) {
      return;
    }

    const isAdminChallenge =
      creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const isFounderChallenge = isAdminChallenge && (previousEntryFee === 0 || previousEntryFee < 0.000000001);
    if (isFounderChallenge) {
      throw new Error('Founder challenges use fixed rewards and cannot be edited.');
    }

    const platformFee = 0.05;
    const totalPrize = entryFeeValue * 2;
    const prizePool = totalPrize - (totalPrize * platformFee);

    const { updateChallenge, upsertChallengeNotification } = await import("@/lib/firebase/firestore");
    await updateChallenge(challenge.id, {
      entryFee: entryFeeValue,
      prizePool,
      updatedAt: Timestamp.now(),
    });

    const targetPlayer = challenge.targetPlayer || challenge.rawData?.targetPlayer;
    if (targetPlayer) {
      try {
        await upsertChallengeNotification({
          challengeId: challenge.id,
          creator: creatorWallet,
          targetPlayer,
          challengeTitle: challenge.title || challenge.rawData?.title,
          entryFee: entryFeeValue,
          prizePool,
          status: 'pending',
        });
      } catch (error) {
        console.warn('⚠️ Failed to update challenge notification:', error);
      }
    }

    setNotification({
      isOpen: true,
      title: 'Challenge updated',
      message: `Challenge amount updated to ${entryFeeValue} USDFG.`,
      type: 'success',
    });
  };

  // Handle direct creator funding from ChallengeDetailSheet
  const handleCreatorFund = async (challenge: any) => {
    console.log("PARENT FUND HANDLER", challenge.id);

    const { creatorFund } = await import('@/lib/chain/contract');

    const challengePDA = challenge?.pda || challenge?.rawData?.pda;
    const entryFee = challenge?.entryFee ?? challenge?.rawData?.entryFee;
    const tokenMint = challenge?.tokenMint || challenge?.rawData?.tokenMint;

    if (!challengePDA) {
      throw new Error("Missing PDA for funding");
    }
    if (!entryFee || entryFee <= 0) {
      throw new Error("Missing or invalid entryFee for funding");
    }
    if (!tokenMint) {
      throw new Error("Missing tokenMint for funding");
    }
    if (!publicKey || !connection || !wallet.signTransaction) {
      throw new Error("Wallet not ready for funding");
    }

    const signature = await creatorFund(
      { signTransaction: wallet.signTransaction, publicKey },
      connection,
      challengePDA,
      entryFee
    );

    console.log("PARENT FUND SUCCESS", signature);

    const { writeChallengeFields } = await import('@/lib/firebase/firestore');
    await writeChallengeFields(
      challenge.id,
      {
        status: "creator_funded",
        pda: challengePDA,
      },
      { actingWallet: publicKey.toString(), currentData: challenge }
    );

    return;
  };

  const handleDirectCreatorFund = async (challenge: any) => {
    // CRITICAL: Disable button immediately on click to prevent double-submission
    if (isCreatorFunding === challenge.id) {
      return; // Already processing
    }
    
    if (!publicKey || !connection) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    const { signTransaction } = wallet;
    if (!signTransaction) {
      showAppToast("Wallet does not support transaction signing.", "error", "Wallet");
      return;
    }

    const currentWallet = publicKey.toString().toLowerCase();
    const creatorWallet = getChallengeCreator(challenge);
    const isCreator = isChallengeCreator(challenge, currentWallet);
    
    if (!isCreator) {
      showAppToast("Only the challenge creator can fund the challenge.", "warning", "Cannot fund");
      return;
    }

    const status = getChallengeStatus(challenge);
    if (status !== 'creator_confirmation_required') {
      showAppToast(`Challenge is not waiting for creator funding. Current status: ${status}`, "warning", "Wrong status");
      return;
    }

    // CRITICAL: Idempotency guard - prevent double funding
    const freshChallenge = await fetchChallengeById(challenge.id);
    if (!freshChallenge) {
      throw new Error('Challenge not found. It may have been cancelled or expired.');
    }

    if (freshChallenge.status === 'creator_funded' || freshChallenge.status === 'active') {
      showAppToast("Challenge already funded. Status: " + freshChallenge.status, "success", "Already funded");
      return;
    }

    // CRITICAL: Set funding state IMMEDIATELY before any async operations
    setIsCreatorFunding(challenge.id);

    try {
      const freshStatus = freshChallenge.status;
      if (freshStatus !== 'creator_confirmation_required') {
        throw new Error(`Challenge status changed. Current status: ${freshStatus}`);
      }

      // Check deadline before attempting transaction
      const deadline = freshChallenge.creatorFundingDeadline;
      if (deadline && deadline.toMillis() < Date.now()) {
        throw new Error('⚠️ Confirmation deadline expired. The challenge has been reverted to waiting for opponent.');
      }

      // Validate pending joiner exists
      const pendingJoiner = freshChallenge.pendingJoiner || challenge.rawData?.pendingJoiner;
      if (!pendingJoiner) {
        throw new Error('No challenger has expressed intent yet. Please wait for an opponent to join.');
      }

      const entryFee = freshChallenge.entryFee || challenge.entryFee || challenge.rawData?.entryFee || 0;
      
      // CRITICAL: Validate entryFee before proceeding
      if (!entryFee || entryFee <= 0) {
        throw new Error(`Invalid entry fee: ${entryFee}. Cannot fund challenge with zero or negative entry fee.`);
      }
      
      // CRITICAL: Create PDA and fund in a single transaction if it doesn't exist
      // This is the ONLY place PDA creation happens - ensures no SOL is spent until funding
      let challengePDA = freshChallenge.pda || challenge.rawData?.pda || challenge.pda;
      let fundedOnChain = false;
      let fundingSignature: string | null = null;
      
      if (!challengePDA) {
        // PDA doesn't exist - create + fund in one transaction (single fee)
        console.log('📝 Creating challenge PDA and funding on-chain (single transaction)...');
        const { createAndFundChallenge } = await import('@/lib/chain/contract');
        try {
          const result = await createAndFundChallenge(
            { signTransaction, publicKey },
            connection,
            entryFee
          );
          challengePDA = result.pda;
          fundedOnChain = true;
          fundingSignature = result.signature;
          
          // Update Firestore with PDA
          const { writeChallengeFields } = await import('@/lib/firebase/firestore');
          await writeChallengeFields(
            challenge.id,
            { pda: challengePDA },
            { actingWallet: publicKey?.toString?.() ?? null }
          );
          console.log('✅ Challenge PDA created:', challengePDA);
        } catch (createError: any) {
          console.error('❌ Error creating challenge PDA:', createError);
          const errorMsg = createError.message || createError.toString() || '';
          if (errorMsg.includes('InvalidProgramId') || errorMsg.includes('3008')) {
            throw new Error('⚠️ Program ID mismatch. Please refresh the page and try again. If the issue persists, the contract may need to be redeployed.');
          }
          throw createError;
        }
      }
      
      // Now fund the challenge (PDA exists at this point)
      console.log('🚀 CREATOR FUNDING - Entry Fee:', {
        entryFee,
        entryFeeUSDFG: `${entryFee} USDFG`,
        challengePDA,
        challengeId: challenge.id,
        combinedTransaction: fundedOnChain
      });
      
      if (!fundedOnChain) {
        try {
          fundingSignature = await creatorFundOnChain(
            { signTransaction, publicKey },
            connection,
            challengePDA,
            entryFee
          );
        } catch (fundError: any) {
          const errorMsg = fundError.message || fundError.toString() || '';
          console.error('❌ Creator funding on-chain error:', {
            error: fundError,
            message: errorMsg,
            logs: fundError.logs || [],
            code: fundError.code
          });
          
          // Handle "already processed" error - transaction may have succeeded
          if (errorMsg.includes('already been processed') || errorMsg.includes('already processed')) {
            console.log('⚠️ Transaction already processed - checking if challenge was funded...');
            
            // Check if challenge was actually funded by checking escrow balance
            try {
              const { getAccount } = await import('@solana/spl-token');
              const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('escrow_wallet'), new PublicKey(challengePDA).toBuffer(), USDFG_MINT.toBuffer()],
                PROGRAM_ID
              );
              const escrowAccount = await getAccount(connection, escrowTokenAccountPDA);
              const escrowBalance = Number(escrowAccount.amount) / Math.pow(10, 9);
              
              if (escrowBalance >= entryFee) {
                console.log('✅ Challenge was already funded successfully!', {
                  escrowBalance: `${escrowBalance} USDFG`,
                  expected: `${entryFee} USDFG`
                });
                // Funding succeeded, continue to Firestore update
                // Don't throw error - just continue (break out of catch block)
              } else {
                throw new Error('Transaction was already processed, but challenge may not be funded. Please refresh and check the challenge status.');
              }
            } catch (checkError: any) {
              // If we can't verify, show a helpful message
              if (checkError.message?.includes('may not be funded')) {
                throw checkError;
              }
              console.warn('⚠️ Could not verify funding status, but transaction may have succeeded:', checkError);
              // Continue anyway - transaction may have succeeded (don't throw, let it proceed to Firestore update)
            }
          } else if (errorMsg.includes('NotOpen') || errorMsg.includes('0x1770') || errorMsg.includes('6000') || errorMsg.includes('Challenge is not open')) {
            throw new Error('⚠️ Challenge is not open for creator funding on-chain. Please refresh and try again.');
          } else {
            throw fundError; // Re-throw if it's a different error
          }
        }
      }
      
      // Update Firestore - wrap in try-catch to handle errors gracefully
      try {
      await creatorFund(challenge.id, currentWallet);
      const explorerUrl = fundingSignature && fundingSignature.length > 30
        ? getExplorerTxUrl(fundingSignature)
        : '';
      if (explorerUrl) {
        await postChallengeSystemMessage(challenge.id, `💸 Creator funded on-chain: ${explorerUrl}`);
      }
      } catch (firestoreError: any) {
        // If Firestore update fails but on-chain succeeded, we have a state mismatch
        // Check if the challenge status might have changed (e.g., already funded)
        console.error('❌ Firestore update failed after on-chain funding:', firestoreError);
        
        // Try to fetch fresh challenge data to see current state
        try {
          const freshCheck = await fetchChallengeById(challenge.id);
          if (freshCheck && freshCheck.status === 'creator_funded') {
            // Status is already correct - on-chain succeeded and Firestore was updated elsewhere
            console.log('✅ Challenge status is already creator_funded - sync succeeded');
            // Continue with success flow
          } else {
            // Status mismatch - on-chain funded but Firestore not updated
            const errorMsg = firestoreError.message || firestoreError.toString() || '';
            throw new Error(`⚠️ On-chain funding succeeded, but Firestore update failed.\n\n` +
              `The challenge was funded on-chain, but the status couldn't be updated in Firestore.\n\n` +
              `Error: ${errorMsg}\n\n` +
              `Please refresh the page - the status should sync automatically. If it doesn't, contact support.`);
          }
        } catch (checkError) {
          // If we can't check, throw the original error
          throw firestoreError;
        }
      }
      
      // CRITICAL: Immediately refresh challenge data so challenger sees "Fund Challenge" button instantly
      // This ensures both users see the update immediately (onSnapshot listener also updates, but this ensures no delay)
      const updatedChallenge = await fetchChallengeById(challenge.id);
      if (updatedChallenge) {
        setSelectedChallenge({
          id: updatedChallenge.id,
          title: updatedChallenge.title || extractGameFromTitle(updatedChallenge.title || '') || "Challenge",
          ...updatedChallenge,
          rawData: updatedChallenge.rawData || updatedChallenge
        });
        console.log('✅ Challenge data refreshed after creator funding:', updatedChallenge.id, updatedChallenge.status);
      } else {
        console.warn('⚠️ Could not fetch updated challenge after creator funding:', challenge.id);
      }
      
      // Also trigger a refresh of the challenges list to update UI
      // This ensures the challenger sees the updated status in real-time
      window.dispatchEvent(new Event('challengeUpdated'));
      
      // Refresh balance
      setTimeout(() => {
        refreshUSDFGBalance().catch(() => {});
      }, 2000);

      // Close detail sheet
      setShowDetailSheet(false);
      
      showAppToast("Challenge funded successfully. Waiting for opponent to fund.", "success", "Funded");
    } catch (err: any) {
      console.error("❌ Creator funding failed:", err);
      
      const errorMessage = err.message || err.toString() || 'Failed to fund challenge. Please try again.';
      const errorString = errorMessage.toLowerCase();
      
      if (errorString.includes("confirmation expired") || 
          errorString.includes("6015") || 
          errorString.includes("0x177f") ||
          errorString.includes("deadline expired")) {
        showAppToast(
          "Confirmation deadline expired. The challenge has been reverted to waiting for opponent. Please refresh the page.",
          "warning",
          "Deadline expired"
        );
      } else {
        showAppToast("Failed to fund challenge: " + errorMessage, "error", "Funding failed");
      }
    } finally {
      // CRITICAL: Always clear funding state, even on error
      setIsCreatorFunding(null);
    }
  };

  // Handle opening submit result modal for tournament matches
  const handleOpenTournamentSubmitResult = async (matchId: string, opponentWallet: string) => {
    // CRITICAL: Check if match is already completed before opening submit modal
    if (!selectedChallenge || !publicKey) return;
    
    try {
      const currentChallenge = await fetchChallengeById(selectedChallenge.id);
      const currentTournament = currentChallenge?.tournament;
      const currentBracket = currentTournament?.bracket;
      
      // Find the match in the current bracket
      if (currentBracket) {
        for (const round of currentBracket) {
          for (const match of round.matches) {
            if (match.id === matchId) {
              if (match.status === 'completed') {
                console.log('⚠️ Match already completed - preventing submit modal from opening');
                showAppToast("This match is already completed. The tournament may have finished.", "info", "Match finished");
                return;
              }
              // Check if player already submitted
              const pk = publicKey.toString();
              const isPlayer1 = match.player1 && walletsEqual(match.player1, pk);
              const isPlayer2 = match.player2 && walletsEqual(match.player2, pk);
              const existingResult = isPlayer1 ? match.player1Result : (isPlayer2 ? match.player2Result : undefined);
              const opponentResult = isPlayer1 ? match.player2Result : (isPlayer2 ? match.player1Result : undefined);
              const opponentSubmitted = opponentResult !== undefined;
              if (existingResult !== undefined && opponentSubmitted) {
                console.log('⚠️ Both players already submitted - preventing submit modal from opening');
                showAppToast("Results are already submitted for this match. Waiting for bracket update.", "info", "Already submitted");
                return;
              }
              break;
            }
          }
        }
      }
      
      setTournamentMatchData({ matchId, opponentWallet });
      setShowTournamentLobby(false); // Close tournament lobby to show submit result modal
      setShowSubmitResultModal(true);
    } catch (error) {
      console.error('Error checking match status:', error);
      // Still allow modal to open if check fails
      setTournamentMatchData({ matchId, opponentWallet });
      setShowTournamentLobby(false);
      setShowSubmitResultModal(true);
    }
  };

  // Handle result submission - now stores result and shows trust review
  const handleSubmitResult = async (didWin: boolean, proofFile?: File | null) => {
    if (!selectedChallenge || !publicKey) {
      console.error("❌ No challenge selected or wallet not connected");
      return;
    }

    try {
      // Check if this is a tournament match
      const format = selectedChallenge.rawData?.format || (selectedChallenge.rawData?.tournament ? 'tournament' : 'standard');
      const isTournament = format === 'tournament';
      
      // For tournaments, skip trust review and submit directly
      if (isTournament && tournamentMatchData) {
        const walletAddress = publicKey.toBase58();
        showAppToast(
          "Tournament matches skip trust review. Safety is handled via two-party result submission + bracket state (use disputes for conflicts).",
          "info",
          "Tournament policy"
        );
        
        // CRITICAL: Check if match is already completed before submitting
        const currentChallenge = await fetchChallengeById(selectedChallenge.id);
        const currentTournament = currentChallenge?.tournament;
        const currentBracket = currentTournament?.bracket;
        
        // Find the match in the current bracket
        let matchAlreadyCompleted = false;
        if (currentBracket) {
          for (const round of currentBracket) {
            for (const match of round.matches) {
              if (match.id === tournamentMatchData.matchId) {
                if (match.status === 'completed') {
                  matchAlreadyCompleted = true;
                  console.log('⚠️ Match already completed - preventing duplicate submission');
                }
                break;
              }
            }
            if (matchAlreadyCompleted) break;
          }
        }
        
        if (matchAlreadyCompleted) {
          // Match already completed - just close modal and show message
          setShowSubmitResultModal(false);
          setTournamentMatchData(null);
          setShowTournamentLobby(true);
          showAppToast("Match result was already submitted. Tournament may be completed.", "success", "Already submitted");
          return;
        }
        
        try {
          // Submit result (both win and loss are handled the same way)
          await submitTournamentMatchResult(
            selectedChallenge.id,
            tournamentMatchData.matchId,
            walletAddress,
            didWin
          );
          
          // Close submit result modal and reopen tournament lobby
          setShowSubmitResultModal(false);
          setTournamentMatchData(null);
          setShowTournamentLobby(true);
          
          // Check if tournament is completed by fetching fresh challenge data
          const freshChallenge = await fetchChallengeById(selectedChallenge.id);
          const tournament = freshChallenge?.tournament;
          const isCompleted = tournament?.stage === 'completed' || freshChallenge?.status === 'completed';
          
          // Show success message
          const message = isCompleted
            ? "Tournament completed! Check the bracket to see the champion. (Trust review not required for tournaments.)"
            : didWin
              ? "Result submitted. Waiting for opponent to submit their result. (Trust review not required for tournaments.)"
              : "Result submitted. Waiting for opponent to submit their result. (Trust review not required for tournaments.)";
          showAppToast(message, isCompleted || didWin ? "success" : "info", isCompleted ? "Tournament" : "Submitted");
        } catch (error: any) {
          // If error is about already submitted/completed, just close modal
          if (error.message?.includes('already') || error.message?.includes('completed') || error.message?.includes('duplicate')) {
            console.log('⚠️ Submission prevented - match already processed');
            setShowSubmitResultModal(false);
            setTournamentMatchData(null);
            setShowTournamentLobby(true);
            showAppToast("Match result was already processed.", "success", "Already processed");
          } else {
            throw error; // Re-throw other errors
          }
        }
        return;
      }
      
      // Standard challenge - proceed with trust review flow
      // Get opponent wallet - find from players array
      const playersArray = selectedChallenge.rawData?.players || (Array.isArray(selectedChallenge.players) ? selectedChallenge.players : []);
      const opponentWallet = playersArray.find((p: string) => p && !walletsEqual(p, publicKey.toBase58()));
      
      // Store the match result for later submission with trust review
      const matchResult = { 
        didWin, 
        proofFile, 
        challengeId: selectedChallenge.id,
        opponentWallet: opponentWallet || undefined, // Store opponent wallet for trust review
      };
      setPendingMatchResult(matchResult);
      
      // Get opponent name for trust review display
      const opponentName = opponentWallet ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Opponent';
      
      // Show Trust Review Modal
      setTrustReviewOpponent(opponentName);
      setShowTrustReview(true);
      setShowSubmitResultModal(false);
      
    } catch (error) {
      console.error("❌ Failed to submit result:", error);
      throw error; // Let modal handle the error
    }
  };

  // Handle trust review submission - now submits both match result and trust review
  const handleTrustReviewSubmit = async (payload: {
    honesty: number;
    fairness: number;
    sportsmanship: number;
    tags: string[];
    trustScore10: number;
    comment?: string;
  }) => {
    // Debug: Trust review submission (uncomment for debugging)
    // console.log("🏆 Trust review submitted:", payload);
    // console.log("🔍 Debug state:", { selectedChallenge: selectedChallenge?.id, publicKey: publicKey?.toBase58(), pendingMatchResult });
    
    if (!publicKey || !pendingMatchResult) {
      console.error("❌ Missing wallet or pending match result");
      console.error("❌ Details:", {
        hasPublicKey: !!publicKey,
        hasPendingResult: !!pendingMatchResult
      });
      setShowTrustReview(false);
      setTrustReviewOpponent('');
      return;
    }

    // Use stored challenge ID as fallback if selectedChallenge is cleared
    const challengeId = selectedChallenge?.id || pendingMatchResult.challengeId;
    if (!challengeId) {
      console.error("❌ No challenge ID available");
      setShowTrustReview(false);
      setTrustReviewOpponent('');
      return;
    }

    try {
      // Submit the match result to Firestore (if not already submitted or auto-won)
      // If autoWon is true, the result was already auto-determined when opponent submitted loss
      // Note: Tournaments skip trust review entirely and handle results in handleSubmitResult
      if (!pendingMatchResult.autoWon) {
        try {
          // Standard challenge result submission
      await submitChallengeResult(challengeId, publicKey.toBase58(), pendingMatchResult.didWin);
          console.log('✅ Match result submitted');
        } catch (resultError: any) {
          // If result is already submitted, that's okay - we can still store the trust review
          if (resultError?.message?.includes('already submitted') || 
              resultError?.message?.includes('already been processed')) {
            console.log('ℹ️ Result already submitted, continuing with trust review...');
          } else {
            // If it's a different error, still try to store the trust review
            console.warn('⚠️ Result submission failed, but continuing with trust review:', resultError);
          }
        }
      } else {
        console.log('ℹ️ Result was auto-determined (opponent submitted loss), skipping result submission - going straight to review');
      }
      
      // Store trust review in Firestore and update opponent's trust score
      // Use stored opponent wallet from pendingMatchResult, fallback to selectedChallenge if available
      let opponentWallet = pendingMatchResult.opponentWallet;
      
      // Fallback: try to find opponent from selectedChallenge if not stored
      if (!opponentWallet && selectedChallenge) {
        const playersArray = selectedChallenge.rawData?.players || (Array.isArray(selectedChallenge.players) ? selectedChallenge.players : []);
        opponentWallet = playersArray.find((p: string) => p && !walletsEqual(p, publicKey.toBase58()));
      }
      
      if (opponentWallet) {
        console.log(`✅ Storing trust review for opponent: ${opponentWallet.slice(0, 8)}...`);
        await storeTrustReview(
          publicKey.toBase58(),
          opponentWallet,
          challengeId,
          payload
        );
        
        // Refresh leaderboard to show updated trust scores
        setTimeout(async () => {
        try {
          const limit = showAllPlayers ? leaderboardLimit : 5;
          const players = await getLeaderboardPlayers(limit, 'totalEarned', showAllPlayers);
          setTopPlayers(players);
        } catch (error) {
          console.error('Failed to refresh leaderboard after trust review:', error);
        }
        }, 2000); // Wait 2 seconds for Firestore to update and trust score to be recalculated
      } else {
        console.warn('⚠️ Could not find opponent wallet for trust review');
        console.warn('   Debug info:', {
          hasPendingResult: !!pendingMatchResult,
          hasOpponentInPending: !!pendingMatchResult?.opponentWallet,
          hasSelectedChallenge: !!selectedChallenge,
          challengeId
        });
      }
      
      
      // Close modals and clear state
      setShowTrustReview(false);
      setTrustReviewOpponent('');
      
      // Save values before clearing
      const needsClaim = pendingMatchResult.needsClaim;
      const didWin = pendingMatchResult.didWin;
      const autoWon = pendingMatchResult.autoWon;
      const challengeForClaim = needsClaim ? selectedChallenge : null;
      
      // Clear pending match result but keep challenge so both players stay in lobby
      setPendingMatchResult(null);
      
      // Get challenge status to check if completed
      const challengeStatus = selectedChallenge?.status || selectedChallenge?.rawData?.status;
      const isCompleted = challengeStatus === 'completed';
      
      // Keep lobby open for BOTH winner and loser so they can chat and use mic after match ends
      if (!showStandardLobby) {
        setShowStandardLobby(true);
      }
      
      // Show Victory Modal only for real wins — not during provisional loss (awaiting_auto_resolution)
      const showVictoryForWin = (didWin && isCompleted) || (Boolean(autoWon) && isCompleted);
      if (showVictoryForWin) {
        const opponentName = opponentWallet 
          ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}`
          : undefined;
        
        setVictoryModalData({
          autoWon,
          opponentName,
          needsClaim: needsClaim || (isCompleted && didWin)
        });
        setShowVictoryModal(true);
        
        // Check for dispute in background (don't block UI)
        if (selectedChallenge?.id) {
          setTimeout(async () => {
            try {
              const { fetchChallengeById } = await import("@/lib/firebase/firestore");
              const refreshed = await fetchChallengeById(selectedChallenge.id);
              if (refreshed) {
                const refreshedStatus = refreshed.status || refreshed.rawData?.status;
                if (refreshedStatus === 'disputed') {
                  // Dispute detected - close victory modal and show dispute message
                  setShowVictoryModal(false);
                  setVictoryModalData(null);
                  setSelectedChallenge(refreshed);
                  // Keep lobby open to show dispute status
                  if (!showStandardLobby) {
                    setShowStandardLobby(true);
                  }
                  showAppToast(
                    "Dispute detected: both players claimed victory. Waiting for admin resolution.",
                    "warning",
                    "Dispute"
                  );
                } else if (refreshedStatus === 'awaiting_auto_resolution' && autoWon) {
                  setShowVictoryModal(false);
                  setVictoryModalData(null);
                  setSelectedChallenge(refreshed);
                } else if (refreshedStatus === 'completed') {
                  // Challenge completed - update challenge data
                  setSelectedChallenge(refreshed);
                  const winner = refreshed.winner || refreshed.rawData?.winner;
                  const isActualWinner = winner && walletsEqual(winner, publicKey.toBase58());
                  
                  if (!isActualWinner && !autoWon) {
                    // Player claimed win but isn't the actual winner - close victory modal
                    setShowVictoryModal(false);
                    setVictoryModalData(null);
                  }
                }
              }
            } catch (error) {
              console.warn('Could not refresh challenge status:', error);
            }
          }, 2000); // Check after 2 seconds (gives time for determineWinner to run)
        }
      } else {
        const lossMessage = opponentWallet
          ? "You submitted that you lost. Trust review recorded."
          : "You submitted that you lost.";
        showAppToast(lossMessage, "info", "Submitted");
      }
      
    } catch (error: any) {
      console.error("❌ Failed to submit result and trust review:", error);
      
      // If it's just a duplicate submission error, show a more friendly message
      if (error?.message?.includes('already submitted') || 
          error?.message?.includes('already been processed')) {
        showAppToast("Your result was already submitted. Trust review may not have been recorded.", "info", "Already submitted");
      } else if (error?.message?.includes('permission') || error?.message?.includes('Missing or insufficient permissions')) {
        // Trust review permission error - result was submitted successfully, just review failed
        console.warn("⚠️ Trust review failed due to permissions, but result was submitted successfully");
        showAppToast(
          "Result submitted successfully. Trust review could not be saved (permission issue). Your result was still recorded.",
          "success",
          "Submitted"
        );
      } else {
        showAppToast("Failed to submit result and trust review. Please try again.", "error", "Submit failed");
      }
    }
  };

  const handleFriendlyResultSubmit = useCallback(async (didWin: boolean, proofFile?: File | null) => {
    if (!friendlyMatch || !currentWallet) {
      return;
    }

    const opponentId = friendlyMatch.opponentId;
    const opponentName = friendlyMatch.opponentName;

    try {
      setSubmittingFriendlyResult(true);

      await recordFriendlyMatchResult({
        matchId: friendlyMatch.matchId,
        reporter: currentWallet,
        opponent: opponentId,
        didWin,
        proofProvided: !!proofFile,
      });

      await clearMutualLock(currentWallet, opponentId);

      await upsertLockNotification({
        matchId: friendlyMatch.matchId,
        status: 'completed',
        lastActionBy: currentWallet,
      });

      setNotification({
        isOpen: true,
        title: 'Result Submitted',
        message: `Friendly match result recorded vs ${opponentName}`,
        type: 'success',
      });

      setShowFriendlySubmitResult(false);
      setFriendlyMatch(null);
    } catch (error) {
      console.error('❌ Failed to submit friendly match result:', error);
      setNotification({
        isOpen: true,
        title: 'Submission Failed',
        message: 'Could not submit match result. Please try again.',
        type: 'error',
      });
      throw error;
    } finally {
      setSubmittingFriendlyResult(false);
    }
  }, [friendlyMatch, currentWallet, upsertLockNotification]);

  // Handle reward claiming
  const handleClaimPrize = async (challenge: any) => {
    // CRITICAL: Disable button immediately on click to prevent double-submission
    if (claimingPrize === challenge.id) {
      return; // Already processing
    }
    
    if (!publicKey || !connection) {
      console.error("❌ Wallet not connected");
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    // CRITICAL: Set claiming state IMMEDIATELY before any async operations
    // This prevents double-clicks even if early returns happen
    setClaimingPrize(challenge.id);

    try {
      // CRITICAL: Ensure tournament lobby is open if this is a tournament
      const isTournament = challenge.format === 'tournament' || challenge.rawData?.format === 'tournament' || challenge.tournament;
      if (isTournament && !showTournamentLobby) {
        // Merge challenge data and open tournament lobby
        const merged = mergeChallengeDataForModal(challenge, challenge);
        setSelectedChallenge(merged);
        setShowStandardLobby(false);
        setShowTournamentLobby(true);
        // Small delay to ensure lobby opens before showing review modal
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check if user has reviewed this challenge before allowing claim
      try {
        const hasReviewed = await hasUserReviewedChallenge(publicKey.toBase58(), challenge.id);
        
        if (!hasReviewed) {
          // User hasn't reviewed yet - show review modal first
          console.log('🎯 User tried to claim reward but hasn\'t reviewed yet - showing review modal');
          
          // Ensure challenge is selected and lobby is open
          if (!selectedChallenge || selectedChallenge.id !== challenge.id) {
            const merged = mergeChallengeDataForModal(challenge, challenge);
            setSelectedChallenge(merged);
            if (isTournament) {
              setShowStandardLobby(false);
              setShowTournamentLobby(true);
            } else {
              setShowTournamentLobby(false);
              setShowStandardLobby(true);
            }
          }
          
          // Get players array - handle both rawData and challenge.players formats
          const playersArray = challenge.rawData?.players || (Array.isArray(challenge.players) ? challenge.players : []);
          const pk = publicKey.toString();
          const opponentWallet = Array.isArray(playersArray)
            ? playersArray.find((p: string) => p && !walletsEqual(p, pk))
            : null;
          const opponentName = opponentWallet ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}` : 'Opponent';
          
          // Set up pending match result as if they won (which they did)
          setPendingMatchResult({
            didWin: true,
            proofFile: null,
            challengeId: challenge.id,
            opponentWallet: opponentWallet || undefined,
            autoWon: true,
            needsClaim: true // Flag to indicate they need to claim after review
          });
          
          // Show trust review modal (must review before claiming)
          setTrustReviewOpponent(opponentName);
          setShowTrustReview(true);
          
          showAppToast(
            "Please review your opponent before claiming your reward. This helps maintain USDFG integrity.",
            "info",
            "Review first"
          );
          // Clear claiming state since we're showing modal (user will claim after review)
          setClaimingPrize(null);
          return;
        }
      } catch (error) {
        console.error('Error checking if user reviewed challenge:', error);
        // Continue with claim if check fails (allow claim but log warning)
      }
      // Founder Tournament: rewards distributed by platform — show info and return (don't call claimChallengePrize)
      const data = challenge.rawData || challenge;
      const entryFeeNum = Number(data.entryFee ?? 0);
      const creatorWalletClaim = data.creator || '';
      const isFreeClaim = entryFeeNum === 0 || entryFeeNum < 0.000000001;
      const formatClaim =
        data.format ?? challenge.format ?? challenge.rawData?.format;
      const isTournamentClaim =
        formatClaim === 'tournament' ||
        challenge.tournament != null ||
        challenge.rawData?.tournament != null ||
        (data as { tournament?: unknown }).tournament != null;
      const isAdminCreatorClaim = creatorWalletClaim && creatorWalletClaim.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
      const founderParticipantRewardNum = Number(data.founderParticipantReward ?? 0);
      const founderWinnerBonusNum = Number(data.founderWinnerBonus ?? 0);
      const isFounderTournamentClaim = isTournamentClaim && isAdminCreatorClaim && isFreeClaim && (founderParticipantRewardNum > 0 || founderWinnerBonusNum > 0);
      if (isFounderTournamentClaim) {
        setClaimingPrize(null);
        try {
          const { acknowledgeFounderTournamentPayout } = await import('@/lib/firebase/firestore');
          await acknowledgeFounderTournamentPayout(challenge.id, publicKey.toString());
        } catch (e) {
          console.warn('Could not save Founder Tournament acknowledgment:', e);
        }
        showAppToast(
          "This is a Founder Tournament. Rewards are distributed by the platform after the tournament concludes. No action is required from you.",
          "info",
          "Founder Tournament"
        );
        return;
      }
      // Pre-check: Verify challenge is actually claimable on-chain
      if (challenge.pda) {
        try {
          const { PublicKey } = await import('@solana/web3.js');
          const accountInfo = await connection.getAccountInfo(new PublicKey(challenge.pda));
          if (accountInfo && accountInfo.data) {
            const data = accountInfo.data;
            const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator, creator, challenger, entry_fee, then status
            // Status 2 = Completed (already resolved)
            if (statusByte === 2) {
              showAppToast(
                "This reward has already been claimed. Syncing latest state…",
                "warning",
                "Already claimed"
              );
              const list = await resyncAfterClaimData();
              let synced: ChallengeData | null = null;
              if (Array.isArray(list)) {
                synced = list.find((c) => c.id === challenge.id) || null;
              }
              if (!synced) {
                synced = await fetchChallengeById(challenge.id);
              }
              if (synced && selectedChallenge?.id === challenge.id) {
                setSelectedChallenge(mergeChallengeDataForModal(synced, synced));
              }
              setUnclaimedPrizeChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
              return;
            }
            
            // ✅ REMOVED: Expiration check for reward claims
            // Winners can claim rewards ANYTIME after challenge completion (no expiration).
            // The dispute_timer only prevents joining expired challenges, not claiming rewards.
          }
        } catch (onChainError) {
        }
      }
      
      const beforeClaimed = isChallengeRewardClaimed(challenge);
      const { claimChallengePrize } = await import("@/lib/firebase/firestore");

      await claimChallengePrize(challenge.id, wallet, connection);

      let fresh = await fetchChallengeById(challenge.id);
      if (!fresh) {
        showAppToast("Syncing latest state…", "info", "Syncing");
        const list = await resyncAfterClaimData();
        if (Array.isArray(list)) {
          fresh = list.find((c) => c.id === challenge.id) || null;
        }
        if (!fresh) {
          fresh = await fetchChallengeById(challenge.id);
        }
      }
      if (!fresh) {
        await new Promise((r) => setTimeout(r, 300));
        const retryFresh = await fetchChallengeById(challenge.id);
        if (isMountedRef.current) {
          fresh = retryFresh;
        }
      }
      if (!fresh) {
        if (isMountedRef.current) {
          showAppToast("Challenge not found. Try again in a moment.", "info", "Syncing");
        }
        return;
      }

      if (fresh) {
        if (selectedChallenge && fresh.id === selectedChallenge.id) {
          setSelectedChallenge(mergeChallengeDataForModal(fresh, fresh));
        }
        if (isChallengeRewardClaimed(fresh)) {
          setUnclaimedPrizeChallenges((prev) =>
            prev.filter((c) => c.id !== fresh.id)
          );
        }
      }

      const afterClaimed = isChallengeRewardClaimed(fresh);

      if (!beforeClaimed && afterClaimed) {
        showAppToast("Reward claimed. Check your wallet for the USDFG tokens.", "success", "Claimed");
        setTimeout(() => {
          refreshUSDFGBalance().catch(() => {});
        }, 2000);
      } else {
        showAppToast("This reward was already processed earlier.", "info", "Already processed");
      }
    } catch (error) {
      console.error("❌ Failed to claim reward:", error);
      
      // Check for expired challenge error
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("ChallengeExpired") || 
          errorMessage.includes("6005") || 
          errorMessage.includes("challenge has expired") ||
          errorMessage.includes("Challenge has expired")) {
        errorMessage = "⚠️ Old contract version detected. The contract needs to be redeployed to remove the expiration check for reward claims. Please contact support.";
      } else if (errorMessage.includes("already been processed") || 
                 errorMessage.includes("already processed") ||
                 errorMessage.includes("already claimed") ||
                 errorMessage.includes("Reward already claimed")) {
        errorMessage = "✅ This reward has already been claimed. Please refresh the page to see the latest status.";
        // Remove from unclaimed so the green button disappears
        setUnclaimedPrizeChallenges(prev => prev.filter(c => c.id !== challenge.id));
        await resyncAfterClaimData();
      } else if (errorMessage.includes("NotInProgress") || 
                 errorMessage.includes("not in progress")) {
        errorMessage = "❌ Challenge is not in progress. It may have already been completed or cancelled.";
      }
      
      showAppToast("Failed to claim reward: " + errorMessage, "error", "Claim failed");
    } finally {
      setClaimingPrize(null);
    }
  };

  const handleFounderTournamentAirdrop = useCallback(async (
    recipients: { wallet: string; amount: number }[],
    challenge: any,
    skipConfirm?: boolean
  ) => {
    if (isAirdropping) {
      return;
    }
    if (!publicKey || !connection) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }
    if (!signTransaction && !signAllTransactions) {
      showAppToast("Wallet does not support transaction signing.", "error", "Wallet");
      return;
    }

    const adminWallet = publicKey.toString().toLowerCase();
    if (adminWallet !== ADMIN_WALLET.toString().toLowerCase()) {
      showAppToast("Only the founder can send airdrops.", "error", "Permission");
      return;
    }

    const recipientMap = new Map<string, { wallet: string; amount: number }>();
    recipients.forEach((entry) => {
      if (!entry.wallet || entry.amount <= 0) return;
      const key = entry.wallet.toLowerCase();
      const existing = recipientMap.get(key);
      if (existing) {
        existing.amount += entry.amount;
      } else {
        recipientMap.set(key, { wallet: entry.wallet, amount: entry.amount });
      }
    });

    const uniqueRecipients = Array.from(recipientMap.values());
    if (uniqueRecipients.length === 0) {
      showAppToast("No payout recipients available.", "warning", "Airdrop");
      return;
    }

    const totalAmount = uniqueRecipients.reduce((sum, entry) => sum + entry.amount, 0);
    if (!skipConfirm) {
      const confirmed = await requestAppConfirm({
        title: "Confirm airdrop",
        message: `Send ${totalAmount} USDFG to ${uniqueRecipients.length} wallet(s)?`,
        confirmLabel: "Send",
        cancelLabel: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
    }

    setIsAirdropping(true);
    const payer = publicKey;
    try {
      const payerAta = await getAssociatedTokenAddress(USDFG_MINT, payer);
      const payerAccount = await getAccount(connection, payerAta);
      const totalLamports = uniqueRecipients.reduce(
        (sum, entry) => sum + Math.floor(entry.amount * Math.pow(10, 9)),
        0
      );
      if (Number(payerAccount.amount) < totalLamports) {
        throw new Error('Insufficient USDFG balance to send this airdrop.');
      }

      const missingAccounts: string[] = [];
      const transferTargets: { wallet: string; ata: PublicKey; amountLamports: number }[] = [];

      for (const entry of uniqueRecipients) {
        const amountLamports = Math.floor(entry.amount * Math.pow(10, 9));
        if (amountLamports <= 0) {
          continue;
        }
        const recipientPubkey = new PublicKey(entry.wallet);
        const recipientAta = await getAssociatedTokenAddress(USDFG_MINT, recipientPubkey);
        try {
          await getAccount(connection, recipientAta);
          transferTargets.push({
            wallet: entry.wallet,
            ata: recipientAta,
            amountLamports
          });
        } catch {
          missingAccounts.push(entry.wallet);
        }
      }

      if (transferTargets.length === 0) {
        throw new Error('No recipients have a USDFG token account.');
      }

      const batchSize = 8;
      const transactions: Transaction[] = [];
      for (let i = 0; i < transferTargets.length; i += batchSize) {
        const batch = transferTargets.slice(i, i + batchSize);
        const tx = new Transaction();
        batch.forEach((target) => {
          tx.add(createTransferInstruction(payerAta, target.ata, payer, target.amountLamports));
        });
        // CRITICAL: Get fresh blockhash for each transaction to avoid "already processed" errors
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        tx.recentBlockhash = blockhash;
        tx.feePayer = payer;
        transactions.push(tx);
      }

      const signedTransactions = signAllTransactions
        ? await signAllTransactions(transactions)
        : await Promise.all(transactions.map((tx) => signTransaction!(tx)));

      const signatures: string[] = [];
      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        try {
          // Send transaction
          const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            maxRetries: 3
          });
          signatures.push(signature);
          
          // Wait for confirmation with timeout
          await Promise.race([
            connection.confirmTransaction(signature, 'confirmed'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
            )
          ]);
          
          console.log(`✅ Transaction ${i + 1}/${signedTransactions.length} confirmed: ${signature}`);
        } catch (error: any) {
          // Check if transaction was already processed (might have succeeded)
          if (error.message?.includes('already been processed') || error.message?.includes('already processed')) {
            console.warn(`⚠️ Transaction ${i + 1} was already processed (may have succeeded):`, error);
            // Try to get the signature from the error or continue
            // The transaction might have actually succeeded
            continue;
          }
          throw error;
        }
      }

      const sentCount = transferTargets.length;
      const sentTotal = transferTargets.reduce(
        (sum, t) => sum + t.amountLamports,
        0
      ) / Math.pow(10, 9);

      if (challenge?.id && signatures.length > 0) {
        const explorerUrl = getExplorerTxUrl(signatures[signatures.length - 1]);
        await postChallengeSystemMessage(
          challenge.id,
          `🚀 Founder airdrop sent: ${sentCount} wallets · ${sentTotal} USDFG · ${explorerUrl}`
        );
        const { markFounderPayoutSent } = await import('@/lib/firebase/firestore');
        await markFounderPayoutSent(challenge.id);
      }

      let message = `✅ Airdrop sent to ${sentCount} wallets (${sentTotal} USDFG).`;
      if (missingAccounts.length > 0) {
        message += `\n\nSkipped ${missingAccounts.length} wallets without USDFG accounts.`;
      }
      setNotification({
        isOpen: true,
        title: "Airdrop sent",
        message,
        type: "success",
      });
    } catch (error: any) {
      console.error('❌ Airdrop failed:', error);
      
      // Check if error is "already processed" - transaction might have succeeded
      if (error.message?.includes('already been processed') || error.message?.includes('already processed')) {
        const message = `⚠️ Transaction was already processed. This usually means:\n\n` +
          `1. The airdrop may have already succeeded\n` +
          `2. Check your wallet transactions or Solana Explorer\n` +
          `3. If rewards were sent, you can ignore this error\n\n` +
          `If rewards were NOT sent, please try again.`;
        setNotification({
          isOpen: true,
          title: "Airdrop status unclear",
          message,
          type: "warning",
        });
      } else {
        setNotification({
          isOpen: true,
          title: "Airdrop failed",
          message: `Airdrop failed: ${error.message || "Unknown error"}\n\nPlease check your wallet balance and try again.`,
          type: "error",
        });
      }
    } finally {
      setIsAirdropping(false);
    }
  }, [isAirdropping, publicKey, connection, signTransaction, signAllTransactions, requestAppConfirm, showAppToast]);

  // Handle marking Founder Challenge reward as transferred (admin only)
  const handleMarkPrizeTransferred = async (challenge: any) => {
    if (!publicKey) {
      showAppToast("Please connect your wallet first.", "warning", "Wallet");
      return;
    }

    // Check if user is admin
    const currentWallet = publicKey.toString().toLowerCase();
    const isAdmin = currentWallet === ADMIN_WALLET.toString().toLowerCase();
    
    if (!isAdmin) {
      showAppToast("Only the founder can mark rewards as transferred.", "error", "Permission");
      return;
    }

    // Check if this is a Founder Challenge
    const founderChallenge = isFounderChallenge(challenge);
    if (!founderChallenge) {
      showAppToast("This action is only for Founder Challenges.", "warning", "Not applicable");
      return;
    }

    // Check if challenge is completed and has a winner
    if (challenge.status !== "completed" || !challenge.rawData?.winner) {
      showAppToast("Challenge must be completed with a winner.", "warning", "Not ready");
      return;
    }

      // Check if already marked as transferred
      if (challenge.rawData?.payoutTriggered) {
        showAppToast("Reward has already been marked as transferred.", "info", "Already done");
        return;
      }

    // Prevent double-clicks
    if (markingPrizeTransferred === challenge.id) {
      return;
    }
    setFounderTransferAmount("");
    setFounderTransferTxSignature("");
    setFounderTransferModal({ challenge });
  };

  const isChallengeOwner = (challenge: any) => {
    const w = publicKey?.toString() || null;
    const challengeCreator = challenge.creator?.toString() || null;
    if (!w || !challengeCreator) return false;
    return walletsEqual(w, challengeCreator);
  };

  // Check if a challenge is a Founder Challenge (admin-created with 0 entry fee)
  const isFounderChallenge = (challenge: any) => {
    const creatorWallet = challenge.creator || challenge.rawData?.creator || '';
    const entryFee = challenge.entryFee || challenge.rawData?.entryFee || 0;
    const isAdmin = creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const isFree = entryFee === 0 || entryFee < 0.000000001;
    return isAdmin && isFree;
  };

  // Memoize helper functions to prevent recalculation
  const getGameCategoryMemo = useCallback((game: string) => getGameCategory(game), []);
  const getGameImageMemo = useCallback((game: string) => getGameImage(game), []);
  const extractGameFromTitleMemo = useCallback((title: string) => extractGameFromTitle(title), []);

  const { visibleChallenges, trustBrowseUsedFallback } = useMemo(() => {
    let trustBrowseUsedFallback = false;
    let base: typeof challenges;
    if (showMyChallenges || !publicKey) {
      base = challenges;
    } else {
      const userTrust = currentUserDisplayTrust ?? 5;
      let narrowed = challenges.filter((c) => {
        const creatorTrust = c.creatorDisplayTrust ?? 5;
        return Math.abs(creatorTrust - userTrust) <= 3.5;
      });
      const usedFallback = narrowed.length < 3;
      if (usedFallback) {
        trustBrowseUsedFallback = true;
        narrowed = challenges;
      }
      base = narrowed;
    }

    const userTrust = currentUserDisplayTrust ?? 5;
    function getTime(c: (typeof challenges)[number] | any) {
      const ts = c.timestamp;
      const fromTs =
        (typeof ts === "number" && Number.isFinite(ts) ? ts : ts?.toMillis?.()) ?? 0;
      return (
        fromTs ||
        c.rawData?.createdAt?.toMillis?.() ||
        c.rawData?.createdAt?.toDate?.()?.getTime?.() ||
        0
      );
    }

    let orderedWithIdx = base.map((c, i) => ({
      ...c,
      __idx: i,
    }));

    orderedWithIdx = [...orderedWithIdx].sort((a, b) => {
      const aTrust = a.creatorDisplayTrust ?? 5;
      const bTrust = b.creatorDisplayTrust ?? 5;

      const aWon = Number(a.creatorDisputesWon) || 0;
      const aLost = Number(a.creatorDisputesLost) || 0;
      const bWon = Number(b.creatorDisputesWon) || 0;
      const bLost = Number(b.creatorDisputesLost) || 0;

      const aPenalty = aLost > aWon * 2 ? 1 : 0;
      const bPenalty = bLost > bWon * 2 ? 1 : 0;

      if (aPenalty !== bPenalty) return aPenalty - bPenalty;

      const aDiff = Math.abs(aTrust - userTrust);
      const bDiff = Math.abs(bTrust - userTrust);
      if (aDiff !== bDiff) return aDiff - bDiff;

      const timeDiff = getTime(b) - getTime(a);
      if (timeDiff !== 0) return timeDiff;

      return a.__idx - b.__idx;
    });

    const visibleChallenges = orderedWithIdx.map(({ __idx: _i, ...rest }) => rest);

    return { visibleChallenges, trustBrowseUsedFallback };
  }, [challenges, currentUserDisplayTrust, showMyChallenges, publicKey]);

  // Memoize filtered challenges to prevent unnecessary re-renders
  // Wrapped in try/catch so malformed challenge data (e.g. players not an array) never crashes the page for any wallet
  const filteredChallenges = useMemo(() => {
    const now = Date.now();
    const connectedWallet = publicKey?.toString() || '';
    // Always return a real array so .some() never runs on a number or object (Firestore can store players as count)
    const getPlayerList = (c: any): string[] => {
      // In this page we often normalize `players` to a COUNT (number) for UI,
      // but participation checks need the underlying array from Firestore (`rawData.players`).
      const playersTop = c?.players;
      if (Array.isArray(playersTop)) return playersTop;
      const playersRaw = c?.rawData?.players;
      return Array.isArray(playersRaw) ? playersRaw : [];
    };
    const playerListIncludes = (c: any, wallet: string): boolean => {
      return isParticipantWallet(getPlayerList(c), wallet);
    };

    return visibleChallenges.filter(challenge => {
      try {
      // Filter by category
      const categoryMatch = filterCategory === 'All' || challenge.category === filterCategory;
      // Filter by game
      const gameMatch = filterGame === 'All' || challenge.game === filterGame;
      // Filter by "My Challenges" toggle (creator OR challenger OR in players so loser can see their challenges)
      const myChallengesMatch =
        !showMyChallenges ||
        walletsEqual(challenge.creator ?? challenge.rawData?.creator, connectedWallet) ||
        walletsEqual(challenge.challenger ?? challenge.rawData?.challenger, connectedWallet) ||
        playerListIncludes(challenge, connectedWallet);
      
      // Check if challenge is expired (normalize Timestamp to ms for comparison)
      const status = (challenge.status ?? challenge.rawData?.status) as string | undefined;
      const expVal = challenge.expiresAt as unknown;
      const expMs =
        expVal != null
          ? typeof expVal === 'number'
            ? expVal
            : (expVal as { toMillis?: () => number; toDate?: () => Date })?.toMillis?.() ??
              (expVal as { toDate?: () => Date })?.toDate?.()?.getTime?.() ??
              null
          : null;
      const timerVal = challenge.rawData?.expirationTimer as unknown;
      const timerMs =
        timerVal != null
          ? typeof timerVal === 'number'
            ? timerVal
            : (timerVal as { toMillis?: () => number; toDate?: () => Date })?.toMillis?.() ??
              (timerVal as { toDate?: () => Date })?.toDate?.()?.getTime?.() ??
              null
          : null;
      const timeExpired = (expMs != null && expMs < now) || (timerMs != null && timerMs < now);
      // Only treat time as "expired" for pre-match states.
      // Active matches may legitimately run past `expiresAt` if the backend didn't flip statuses promptly.
      const isPreMatch =
        status === 'pending_waiting_for_opponent' ||
        status === 'creator_confirmation_required' ||
        status === 'creator_funded';
      const isExpired = status === 'cancelled' || (isPreMatch && timeExpired);
      
      // Also exclude completed and disputed challenges from joinable list
      const isCompleted = status === 'completed' || status === 'disputed';
      
      // Only show joinable challenges (unless user wants to see their own challenges)
      // OR if admin viewing completed Founder Tournament (for payout)
      const isJoinable = !isExpired && !isCompleted;
      
      // Check if this is a completed Founder Tournament that admin should see
      const isAdmin = !!publicKey && walletsEqual(publicKey.toString(), ADMIN_WALLET.toString());

      // Check format from both challenge and rawData
      const challengeFormat = challenge.format || challenge.rawData?.format;
      const isTournamentFormat = challengeFormat === 'tournament' || challenge.tournament || challenge.rawData?.tournament;

      // Check founder tournament properties from both challenge and rawData
      const entryFee = challenge.entryFee ?? challenge.rawData?.entryFee ?? 0;
      const founderParticipantReward = challenge.founderParticipantReward ?? challenge.rawData?.founderParticipantReward ?? 0;
      const founderWinnerBonus = challenge.founderWinnerBonus ?? challenge.rawData?.founderWinnerBonus ?? 0;
      const creatorWallet = challenge.creator ?? challenge.rawData?.creator ?? '';
      const tournamentStage = challenge.tournament?.stage ?? challenge.rawData?.tournament?.stage;

      const isFounderTournament = isTournamentFormat &&
        walletsEqual(creatorWallet, ADMIN_WALLET.toString()) &&
        (entryFee === 0 || entryFee < 0.000000001) &&
        (founderParticipantReward > 0 || founderWinnerBonus > 0);

      const isFounderChallenge = !isTournamentFormat &&
        !(challenge.pda ?? challenge.rawData?.pda) &&
        walletsEqual(creatorWallet, ADMIN_WALLET.toString()) &&
        (entryFee === 0 || entryFee < 0.000000001);
      
      const isFounderTournamentOrChallenge = isFounderTournament || isFounderChallenge;
      const isCompletedFounderTournament = isCompleted && isFounderTournament && tournamentStage === 'completed';
      const adminShouldSeeCompletedFounderTournament = isAdmin && isCompletedFounderTournament;
      // Show expired Founder Tournaments/Challenges to admin so they can open and delete/manage manually
      const adminSeesExpiredFounder = isAdmin && isFounderTournamentOrChallenge && isExpired;
      
      // Show completed/disputed challenges to participants so they can re-open lobby (chat/mic)
      const isParticipant =
        !!connectedWallet &&
        (walletsEqual(creatorWallet, connectedWallet) ||
          walletsEqual(challenge.challenger ?? challenge.rawData?.challenger, connectedWallet) ||
          playerListIncludes(challenge, connectedWallet));

      const participantSeesCompleted = isParticipant && isCompleted && categoryMatch && gameMatch;
      
      // If user is participant in ACTIVE or creator_funded challenge, ALWAYS show it (so they can find their in-progress match)
      const participantInActive = isParticipant && (status === 'active' || status === 'creator_funded');
      // If showing "My Challenges", show all their challenges regardless of status
      // OR if admin viewing completed Founder Tournament
      // OR if admin viewing expired Founder Tournament/Challenge (so they can open and delete manually; show even when category/game filter applied)
      // OR if user is participant in completed challenge (so they can re-open lobby to chat/mic)
      // Otherwise show joinable OR completed (so completed challenges don't "disappear" from the list)
      const shouldShow = participantInActive || (showMyChallenges 
        ? (categoryMatch && gameMatch && myChallengesMatch) 
        : (adminSeesExpiredFounder || (categoryMatch && gameMatch && (isJoinable || isCompleted || adminShouldSeeCompletedFounderTournament || participantSeesCompleted))));
      
      return shouldShow;
      } catch (err) {
        console.warn('Filter challenge skip (malformed data):', challenge?.id, err);
        return false;
      }
    });
  }, [visibleChallenges, filterCategory, filterGame, showMyChallenges, publicKey]);

  const rankedSoloLeaderboard = useMemo(() => {
    return topPlayers
      .map((player) => {
        const trust = player.displayTrustScore ?? 5;
        const penalty =
          (player.disputesLost || 0) > (player.disputesWon || 0) * 2 ? 50 : 0;
        const skillRaw = player.skillScore;
        const skillForLb: number =
          typeof skillRaw === 'number' && Number.isFinite(skillRaw) ? skillRaw : 100;
        const skillLbInput = skillForLb > 0 ? skillForLb : 100;
        const leaderboardScore =
          player.wins * 10 +
          (player.totalEarned || 0) * 0.001 +
          trust * 20 -
          ((player.forfeits || 0) * 15) -
          penalty +
          Math.log(skillLbInput) * 50;
        return { ...player, leaderboardScore };
      })
      .sort((a, b) => b.leaderboardScore - a.leaderboardScore);
  }, [topPlayers]);

  const rankedTeamLeaderboard = useMemo(() => {
    return topTeams
      .map((team) => {
        const trust = team.behaviorTrustScore ?? team.trustScore ?? 5;
        const skillRaw = team.skillScore;
        const skillForLb: number =
          typeof skillRaw === 'number' && Number.isFinite(skillRaw) ? skillRaw : 100;
        const skillLbInput = skillForLb > 0 ? skillForLb : 100;
        const leaderboardScore =
          (team.wins || 0) * 10 +
          (team.totalEarned || 0) * 0.001 +
          trust * 20 -
          ((team.forfeits || 0) * 15) +
          Math.log(skillLbInput) * 50;
        return { ...team, leaderboardScore };
      })
      .sort((a, b) => b.leaderboardScore - a.leaderboardScore);
  }, [topTeams]);

  /** Build payout recipients for a Founder Tournament (same logic as TournamentBracketView). */
  const getFounderTournamentRecipients = useCallback((challenge: any): { wallet: string; amount: number }[] => {
    const raw = challenge.rawData || challenge;
    const tournament = raw.tournament || challenge.tournament;
    const playersRaw = raw.players || challenge.players;
    let players: string[] = Array.isArray(playersRaw) ? playersRaw : [];
    if (players.length === 0 && tournament?.bracket) {
      const set = new Set<string>();
      (tournament.bracket || []).forEach((round: any) => {
        (round.matches || []).forEach((m: any) => {
          if (m.player1) set.add(m.player1);
          if (m.player2) set.add(m.player2);
        });
      });
      players = Array.from(set);
    }
    const unique = Array.from(new Map(players.filter(Boolean).map((p: string) => [p.toLowerCase(), p])).values()) as string[];
    const championRaw = (tournament?.champion ?? '') as string;
    const founderPart = Number(raw.founderParticipantReward ?? 0);
    const founderWin = Number(raw.founderWinnerBonus ?? 0);
    return unique.map((wallet: string) => {
      let amount = founderPart > 0 ? founderPart : 0;
      if (championRaw && walletsEqual(wallet, championRaw)) amount += founderWin > 0 ? founderWin : 0;
      return { wallet, amount };
    }).filter((entry: { wallet: string; amount: number }) => entry.amount > 0);
  }, []);

  /** Send ONE combined airdrop for all completed Founder Tournaments needing payout (one SOL fee). Uses challenges directly to avoid TDZ with filteredChallenges. */
  const handleBatchFounderAirdrop = useCallback(async () => {
    if (!publicKey || publicKey.toString().toLowerCase() !== ADMIN_WALLET.toString().toLowerCase()) return;
    if (isAirdropping) return;
    if (!connection || (!signTransaction && !signAllTransactions)) {
      showAppToast("Wallet and connection required.", "warning", "Wallet");
      return;
    }
    const needing = challenges.filter((c: any) => {
      const fmt = c.format || c.rawData?.format;
      const isTournament = fmt === 'tournament' || !!c.tournament || !!c.rawData?.tournament;
      const creator = (c.creator ?? c.rawData?.creator) ?? '';
      const fee = c.entryFee ?? c.rawData?.entryFee ?? 0;
      const founderPart = c.founderParticipantReward ?? c.rawData?.founderParticipantReward ?? 0;
      const founderWin = c.founderWinnerBonus ?? c.rawData?.founderWinnerBonus ?? 0;
      const stage = c.tournament?.stage ?? c.rawData?.tournament?.stage;
      const status = c.status || c.rawData?.status;
      const paid = !!(c.founderPayoutSentAt ?? c.rawData?.founderPayoutSentAt);
      return isTournament && creator?.toLowerCase() === ADMIN_WALLET.toString().toLowerCase() &&
        (fee === 0 || fee < 1e-9) && (founderPart > 0 || founderWin > 0) &&
        (status === 'completed' || status === 'disputed') && stage === 'completed' && !paid;
    });
    if (needing.length === 0) {
      showAppToast("No Founder Tournaments need payout right now.", "info", "Payouts");
      return;
    }
    const recipientMap = new Map<string, { wallet: string; amount: number }>();
    needing.forEach((challenge: any) => {
      getFounderTournamentRecipients(challenge).forEach((entry: { wallet: string; amount: number }) => {
        if (!entry.wallet || entry.amount <= 0) return;
        const key = entry.wallet.toLowerCase();
        const existing = recipientMap.get(key);
        if (existing) {
          existing.amount += entry.amount;
        } else {
          recipientMap.set(key, { wallet: entry.wallet, amount: entry.amount });
        }
      });
    });
    const uniqueRecipients = Array.from(recipientMap.values());
    if (uniqueRecipients.length === 0) {
      showAppToast("No payout recipients across these tournaments.", "warning", "Payouts");
      return;
    }
    const totalAmount = uniqueRecipients.reduce((sum, e) => sum + e.amount, 0);
    const confirmed = await requestAppConfirm({
      title: "Confirm batch airdrop",
      message: `Send ${totalAmount.toFixed(1)} USDFG to ${uniqueRecipients.length} wallet(s) for ${needing.length} tournament(s) in one go (one SOL fee)?`,
      confirmLabel: "Send",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;
    setIsAirdropping(true);
    try {
      const payer = publicKey;
      const payerAta = await getAssociatedTokenAddress(USDFG_MINT, payer);
      const payerAccount = await getAccount(connection, payerAta);
      const totalLamports = uniqueRecipients.reduce(
        (sum, e) => sum + Math.floor(e.amount * 1e9),
        0
      );
      if (Number(payerAccount.amount) < totalLamports) {
        throw new Error('Insufficient USDFG balance for this airdrop.');
      }
      const missingAccounts: string[] = [];
      const transferTargets: { wallet: string; ata: PublicKey; amountLamports: number }[] = [];
      for (const entry of uniqueRecipients) {
        const amountLamports = Math.floor(entry.amount * 1e9);
        if (amountLamports <= 0) continue;
        const recipientPubkey = new PublicKey(entry.wallet);
        const recipientAta = await getAssociatedTokenAddress(USDFG_MINT, recipientPubkey);
        try {
          await getAccount(connection, recipientAta);
          transferTargets.push({ wallet: entry.wallet, ata: recipientAta, amountLamports });
        } catch {
          missingAccounts.push(entry.wallet);
        }
      }
      if (transferTargets.length === 0) {
        throw new Error('No recipients have a USDFG token account.');
      }
      const batchSize = 8;
      const transactions: Transaction[] = [];
      for (let i = 0; i < transferTargets.length; i += batchSize) {
        const batch = transferTargets.slice(i, i + batchSize);
        const tx = new Transaction();
        batch.forEach((t) => tx.add(createTransferInstruction(payerAta, t.ata, payer, t.amountLamports)));
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        tx.recentBlockhash = blockhash;
        tx.feePayer = payer;
        transactions.push(tx);
      }
      const signedTxs = signAllTransactions
        ? await signAllTransactions(transactions)
        : await Promise.all(transactions.map((tx) => signTransaction!(tx)));
      const signatures: string[] = [];
      for (let i = 0; i < signedTxs.length; i++) {
        const sig = await connection.sendRawTransaction(signedTxs[i].serialize(), { skipPreflight: false, maxRetries: 3 });
        signatures.push(sig);
        await Promise.race([
          connection.confirmTransaction(sig, 'confirmed'),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 30000))
        ]);
      }
      const sentTotal = transferTargets.reduce((s, t) => s + t.amountLamports, 0) / 1e9;
      const { markFounderPayoutSent, postChallengeSystemMessage } = await import('@/lib/firebase/firestore');
      const explorerUrl = getExplorerTxUrl(signatures[signatures.length - 1]);
      for (const challenge of needing) {
        const cid = challenge.id;
        if (!cid) continue;
        await markFounderPayoutSent(cid);
        await postChallengeSystemMessage(
          cid,
          `🚀 Founder airdrop sent (batch): ${transferTargets.length} wallets · ${sentTotal.toFixed(1)} USDFG · ${explorerUrl}`
        );
      }
      let msg = `✅ Sent ${sentTotal.toFixed(1)} USDFG to ${transferTargets.length} wallet(s) for ${needing.length} tournament(s) — one SOL fee.`;
      if (missingAccounts.length > 0) msg += `\n\nSkipped ${missingAccounts.length} wallet(s) without USDFG accounts.`;
      setNotification({
        isOpen: true,
        title: "Batch airdrop sent",
        message: msg,
        type: "success",
      });
    } catch (err: any) {
      console.error('❌ Batch airdrop failed:', err);
      setNotification({
        isOpen: true,
        title: "Batch airdrop failed",
        message:
          err?.message?.includes("already been processed") || err?.message?.includes("already processed")
            ? "Transaction may have succeeded. Check your wallet."
            : `Airdrop failed: ${err?.message ?? "Unknown error"}`,
        type:
          err?.message?.includes("already been processed") || err?.message?.includes("already processed")
            ? "warning"
            : "error",
      });
    } finally {
      setIsAirdropping(false);
    }
  }, [publicKey, connection, signTransaction, signAllTransactions, isAirdropping, challenges, getFounderTournamentRecipients, requestAppConfirm, showAppToast]);

  // Auto-delete expired challenges to save Firebase storage
  useEffect(() => {
    if (!challenges.length || showMyChallenges) return; // Don't delete user's own challenges
    
    const now = Date.now();
    const expiredIds: string[] = [];
    
    challenges.forEach(challenge => {
      // CRITICAL: Never delete active tournaments or active challenges
      const isTournament = challenge.format === 'tournament' || challenge.tournament;
      const tournamentStage = challenge.tournament?.stage || challenge.rawData?.tournament?.stage;
      const isActiveTournament = isTournament && (
        tournamentStage === 'round_in_progress' || 
        tournamentStage === 'awaiting_results' ||
        challenge.status === 'active'
      );
      const isActiveChallenge = challenge.status === 'active';
      
      // Skip active tournaments and active challenges - never delete them
      if (isActiveTournament || isActiveChallenge) {
        return;
      }
      
      // Founder Tournaments (admin-created, free entry, founder rewards): never auto-delete; admin deletes manually
      const creatorWallet = (challenge.creator ?? challenge.rawData?.creator ?? '').toString().toLowerCase();
      const isAdminCreator = creatorWallet === ADMIN_WALLET.toString().toLowerCase();
      const isFree = (challenge.entryFee ?? challenge.rawData?.entryFee ?? 0) === 0 || (challenge.entryFee ?? 0) < 0.000000001;
      const hasFounderRewards = (challenge.founderParticipantReward ?? challenge.rawData?.founderParticipantReward ?? 0) > 0 || (challenge.founderWinnerBonus ?? challenge.rawData?.founderWinnerBonus ?? 0) > 0;
      const isFounderTournament = isTournament && isAdminCreator && isFree && hasFounderRewards;
      if (isFounderTournament) return;
      
      const expiresAtMs =
        challenge.expiresAt != null
          ? typeof challenge.expiresAt === 'number'
            ? challenge.expiresAt
            : (challenge.expiresAt as Timestamp).toMillis()
          : null;
      const rawTimer = challenge.rawData?.expirationTimer as Timestamp | number | undefined;
      const expirationTimerMs =
        rawTimer != null
          ? typeof rawTimer === 'number'
            ? rawTimer
            : rawTimer.toMillis()
          : null;
      const isExpired =
        challenge.status === 'cancelled' ||
        (expiresAtMs != null && expiresAtMs < now) ||
        (expirationTimerMs != null && expirationTimerMs < now);
      
      // For tournaments, only delete if completed or cancelled
      if (isTournament) {
        const isCompleted = tournamentStage === 'completed' || challenge.status === 'completed';
        const isCancelled = challenge.status === 'cancelled';
        if (!isCompleted && !isCancelled) {
          return; // Don't delete active or in-progress tournaments
        }
      }
      
      if (isExpired && challenge.id) {
        expiredIds.push(challenge.id);
      }
    });
    
    // Delete expired challenges asynchronously
    if (expiredIds.length > 0) {
      expiredIds.forEach(challengeId => {
        cleanupExpiredChallenge(challengeId).catch(err => {
          console.error('Failed to delete expired challenge:', challengeId, err);
        });
      });
    }
  }, [challenges, showMyChallenges]);

  // Memoize unique games and categories
  const uniqueGames = useMemo(() => ['All', ...Array.from(new Set(challenges.map(c => c.game)))], [challenges]);
  const categories = useMemo(() => ['All', 'Fighting', 'Sports', 'Shooting', 'Racing'], []);

  // Check if user has active challenge (for button disable logic)
  // EXCLUDE completed, cancelled, disputed, and expired challenges
  // Use Firestore data directly for most reliable status check
  const isAdminUser = currentWallet && walletsEqual(currentWallet, ADMIN_WALLET.toString());
  const hasActiveChallenge = !isAdminUser && currentWallet && firestoreChallenges.some((fc: any) => {
    const isCreator = walletsEqual(fc.creator, currentWallet);
    const isParticipant = isParticipantWallet(fc.players, currentWallet);
    
    if (!isCreator && !isParticipant) return false; // Not relevant to this user
    
    // Get status from Firestore data directly (most reliable)
    const status = fc.status || fc.rawData?.status || 'unknown';
    
    // EXCLUDE completed, cancelled, disputed, and expired challenges
    const isActive =
      status === 'active' ||
      status === 'in-progress' ||
      status === 'pending_waiting_for_opponent' ||
      status === 'creator_confirmation_required' ||
      status === 'creator_funded';
    const isCompleted = status === 'completed' || status === 'cancelled' || status === 'disputed' || status === 'expired';
    
    const shouldBlock = (isCreator || isParticipant) && isActive && !isCompleted;
    
    if ((isCreator || isParticipant)) {
      // Debug: Navbar challenge check (uncomment for debugging)
      // console.log(`🔍 Navbar check - Challenge: ${fc.id}, Status: ${status}, IsActive: ${isActive}, IsCompleted: ${isCompleted}, ShouldBlock: ${shouldBlock}`);
    }
    
    return shouldBlock;
  });

  // Add arena-page class to body for mobile CSS
  useEffect(() => {
    document.body.classList.add('arena-page');
    return () => {
      document.body.classList.remove('arena-page');
    };
  }, []);

  const isTeamsView = leaderboardView === 'teams';
  const isSoloView = !isTeamsView;
  const leaderboardSearchPlaceholder = isTeamsView 
    ? 'Search by team name or key...'
    : 'Search by name or wallet address...';
  const isLoadingLeaderboard = isTeamsView ? loadingTopTeams : loadingTopPlayers;
  const hasLeaderboardEntries = isTeamsView ? topTeams.length > 0 : topPlayers.length > 0;
  const leaderboardTitle = isTeamsView ? 'Top Teams' : 'Top Players';
  const leaderboardSubtitle = isTeamsView
    ? 'Top ranked teams • Search by team name or key'
    : 'Top ranked players • Search by name or wallet address';
  const leaderboardEmptyStateTitle = isTeamsView ? 'No teams yet' : 'No players yet';
  const leaderboardEmptyStateSubtitle = isTeamsView
    ? 'Create a team and enter the leaderboard!'
    : 'Be the first to compete!';
  const currentLeaderboardItems = isTeamsView ? topTeams : topPlayers;
  const leaderboardEntityLabel = isTeamsView ? 'Teams' : 'Players';
  const setLeaderboardLoading = useCallback((value: boolean) => {
    if (isTeamsView) {
      setLoadingTopTeams(value);
    } else {
      setLoadingTopPlayers(value);
    }
  }, [isTeamsView]);

  const renderLockAction = useCallback((playerWallet: string, displayName: string) => {
    if (!playerWallet) {
      return null;
    }

    const resolvedName = displayName && displayName.trim().length > 0 ? displayName : formatWalletAddress(playerWallet);

    if (playerWallet === currentWallet) {
      return (
        <div className="text-xs text-green-400 font-semibold pointer-events-none">
          You
        </div>
      );
    }

    if (!currentWallet) {
      return (
        <button
          className="px-3 py-1.5 rounded-lg border border-purple-500/35 bg-zinc-900/70 text-purple-100 text-xs font-semibold hover:border-purple-400/55 transition-colors pointer-events-auto"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if ('stopImmediatePropagation' in event.nativeEvent) {
              event.nativeEvent.stopImmediatePropagation();
            }
            connect();
          }}
        >
          Connect to Lock
        </button>
      );
    }

    const normalizedPlayerWallet = playerWallet.toLowerCase();
    const isLoading = lockInProgress?.toLowerCase() === normalizedPlayerWallet;
    const playerLockTarget = userLocks[normalizedPlayerWallet] ?? null;
    const isLockedByMe = currentLockTarget === normalizedPlayerWallet;
    const isLockedOnMe = playerLockTarget === normalizedCurrentWallet;
    const isMutual = mutualLockOpponentId === normalizedPlayerWallet;
    const isPendingRequest = pendingLockInitiators.has(playerWallet.toLowerCase());

    if (isMutual) {
      return (
        <button
          className="px-3 py-1.5 rounded-lg border border-green-500/40 bg-green-600/20 text-green-200 text-xs font-semibold hover:bg-green-600/30 transition-colors pointer-events-auto"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if ('stopImmediatePropagation' in event.nativeEvent) {
              event.nativeEvent.stopImmediatePropagation();
            }
            setFriendlyMatch((previous) => {
              if (previous && previous.opponentId === normalizedPlayerWallet) {
                if (displayName && previous.opponentName !== displayName) {
                  return { ...previous, opponentName: displayName };
                }
                return previous;
              }
              return {
                opponentId: normalizedPlayerWallet,
                opponentName: resolvedName,
                matchId: normalizedCurrentWallet
                  ? createFriendlyMatchId(normalizedCurrentWallet, normalizedPlayerWallet)
                  : `friendly-pending-${normalizedPlayerWallet}`,
              };
            });
            setShowFriendlySubmitResult(true);
          }}
        >
          Submit Result
        </button>
      );
    }

    let label = 'Challenge Friendly';
    let buttonClass = 'px-3 py-1.5 rounded-lg border border-purple-500/35 bg-zinc-900/70 text-purple-100 text-xs font-semibold hover:border-purple-400/55 hover:bg-zinc-800/70 transition-colors pointer-events-auto';

    if (isLockedByMe) {
      label = 'Cancel Challenge';
      buttonClass = 'px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-600/20 text-red-200 text-xs font-semibold hover:bg-red-600/30 transition-colors pointer-events-auto';
    } else if (isLockedOnMe) {
      label = isPendingRequest ? 'Accept Challenge (New)' : 'Accept Challenge';
      buttonClass = 'px-3 py-1.5 rounded-lg border border-purple-500/45 bg-purple-600/20 text-purple-100 text-xs font-semibold hover:bg-purple-600/30 transition-colors pointer-events-auto';
    }

    if (isPendingRequest && !isMutual) {
      buttonClass += ' shadow-[0_0_10px_rgba(124,58,237,0.35)] animate-pulse';
    }

    return (
      <button
        className={`${buttonClass} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={isLoading}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if ('stopImmediatePropagation' in event.nativeEvent) {
            event.nativeEvent.stopImmediatePropagation();
          }
          handleLockToggle(playerWallet);
        }}
        title={isLockedByMe && !isLockedOnMe ? 'Waiting for opponent to accept challenge' : undefined}
      >
        {isLoading ? 'Updating...' : label}
      </button>
    );
  }, [currentWallet, normalizedCurrentWallet, connect, lockInProgress, userLocks, currentLockTarget, mutualLockOpponentId, handleLockToggle, formatWalletAddress, createFriendlyMatchId, pendingLockInitiators]);

  // Platform icon helper (used in detail sheet)
  const platformIcon = (platform: string) => {
    const p = String(platform || '').toLowerCase();
    if (p.includes('ps')) return '🎮';
    if (p.includes('xbox')) return '🟩';
    if (p.includes('pc')) return '🖥️';
    if (p.includes('mobile')) return '📱';
    return '🎮';
  };

  // Detail row component for bottom sheet
  const DetailRow = ({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) => {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 ring-1 ring-purple-500/5">
        <div className="text-white/60 text-xs">{label}</div>
        <div className={`font-semibold text-sm ${multiline ? 'whitespace-normal leading-snug' : 'truncate'}`}>{value}</div>
      </div>
    );
  };

  // Challenge detail sheet component (bottom sheet)
  const ChallengeDetailSheet = ({ challenge, onClose, onFund, onExpressIntent, onJoinerFund, onViewChallenge }: { 
    challenge: any; 
    onClose: () => void; 
    onFund?: (challenge: any) => Promise<void>;
    onExpressIntent?: (challenge: any) => Promise<void>;
    onJoinerFund?: (challenge: any) => Promise<void>;
    onViewChallenge?: (challenge: any) => void;
  }) => {
    const gameName = challenge.game || extractGameFromTitle(challenge.title);
    const imagePath = getGameImage(gameName, { isCustomGame: isChallengeCustomGame(challenge) });
    const isOwner = isChallengeOwner(challenge);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
      // Lock body scroll when modal is open - prevent background scroll
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }, []);

    // Prevent auto-scroll on mobile - ensure scroll position is maintained
    React.useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Prevent scroll restoration
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      
      // Start at top when opened, but don't force it repeatedly
      let scrollPosition = 0;
      let isUserScrolling = false;
      
      const handleScroll = () => {
        isUserScrolling = true;
        scrollPosition = container.scrollTop;
      };
      
      const handleTouchStart = () => {
        isUserScrolling = true;
      };
      
      const handleTouchEnd = () => {
        // Small delay to allow scroll to settle
        setTimeout(() => {
          isUserScrolling = false;
        }, 100);
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      // Only set scrollTop initially, not on every render
      container.scrollTop = 0;
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }, []);

    // Calculate expiration time
    const getExpiresText = () => {
      if (challenge.expiresAt && challenge.expiresAt > Date.now()) {
        const minutes = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / (1000 * 60)));
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h`;
      }
      if (challenge.rawData?.expirationTimer) {
        const timer = challenge.rawData.expirationTimer;
        const now = Date.now();
        const expires = timer.toMillis();
        if (expires > now) {
          const minutes = Math.max(0, Math.floor((expires - now) / (1000 * 60)));
          if (minutes < 60) return `${minutes}m`;
          const hours = Math.floor(minutes / 60);
          return `${hours}h`;
        }
      }
      return 'Expired';
    };

    const status = challenge.status || challenge.rawData?.status;
    
    // Check if creator funding deadline has expired
    const creatorFundingDeadline = challenge.rawData?.creatorFundingDeadline || challenge.creatorFundingDeadline;
    const isDeadlineExpired = creatorFundingDeadline && creatorFundingDeadline.toMillis() < Date.now();
    const canCreatorFund = status === 'creator_confirmation_required' && !isDeadlineExpired;
    
    // Status pill for detail sheet (lifecycle before capacity — never let FULL override completed / disputed / in-progress / awaiting_auto_resolution)
    const StatusPillDetail = ({ status, isOwner, players, capacity }: { status: string; isOwner: boolean; players: number; capacity: number }) => {
      if (status === "completed") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-neutral-700/30 text-neutral-300 border-neutral-600/30">
            COMPLETED
          </span>
        );
      }
      if (status === "disputed") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-red-500/20 text-red-300 border-red-500/30">
            DISPUTED
          </span>
        );
      }
      if (status === "pending_waiting_for_opponent") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-emerald-500/20 text-emerald-200 border-emerald-500/30 ring-1 ring-emerald-400/20">
            OPEN
          </span>
        );
      }
      if (status === "active" || status === "creator_funded") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-rose-500/20 text-rose-200 border-rose-500/30 ring-1 ring-rose-400/25">
            LIVE
          </span>
        );
      }
      if (status === "creator_confirmation_required") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-purple-500/15 text-purple-100 border-purple-500/35 ring-1 ring-purple-400/25">
            {isOwner ? 'CONFIRM' : 'LIVE'}
          </span>
        );
      }
      if (status === "in-progress") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-green-500/20 text-green-300 border-green-500/30">
            LIVE
          </span>
        );
      }
      if (status === "awaiting_auto_resolution") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            RESOLVING
          </span>
        );
      }
      if (players >= capacity) {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-neutral-600/25 text-neutral-200 border-neutral-500/30">
            FULL
          </span>
        );
      }
      return (
        <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-white/10 text-white border-white/10">
          {status.toUpperCase()}
        </span>
      );
    };

    return (
      <div 
        className="fixed inset-0 z-50 flex items-end bg-black/70" 
        onClick={onClose} 
        role="dialog" 
        aria-modal="true"
        style={{
          // Prevent body scroll when modal is open
          touchAction: 'none',
          // Ensure modal is above everything
          zIndex: 50
        }}
      >
        <div
          className="w-full max-h-[90vh] sm:max-h-[85%] rounded-t-2xl bg-[#07080C] border border-white/10 ring-1 ring-purple-500/10 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            // Prevent scroll interference
            touchAction: 'pan-y',
            // Ensure proper stacking
            position: 'relative',
            zIndex: 1
          }}
        >
          <div className="relative h-[130px] flex-shrink-0">
            <img 
              src={`${imagePath}?v=2&game=${encodeURIComponent(gameName)}`}
              alt="" 
              aria-hidden="true" 
              className="absolute inset-0 h-full w-full object-cover scale-110" 
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                console.error(`❌ Failed to load detail sheet image: ${imagePath} for game: ${gameName}`);
                target.src = '/assets/usdfgtokenn.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080C] via-black/60 to-black/20" />
            <div className="absolute inset-0 shadow-[inset_0_-40px_60px_rgba(0,0,0,0.9)]" />

            <div className="relative z-10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">{gameName}</h3>
                  <p className="text-sm text-white/60 truncate">{challenge.mode || 'Head-to-Head'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPillDetail 
                    status={status} 
                    isOwner={isOwner} 
                    players={challenge.players || 0} 
                    capacity={challenge.capacity || 2} 
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="ml-2 p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 pb-24"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'none', // Prevent bounce-back scroll on mobile
              paddingBottom: '6rem', // Extra padding to ensure buttons are visible
              touchAction: 'pan-y', // Allow vertical scrolling only
              willChange: 'scroll-position' // Optimize scroll performance
            }}
            onTouchStart={(e) => {
              // Prevent scroll jumps on touch
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Allow natural scrolling
              e.stopPropagation();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Game" value={gameName} />
              <DetailRow label="Mode" value={challenge.mode || 'Head-to-Head'} />
              <DetailRow label="💰 Challenge Amount" value={`${challenge.entryFee} USDFG`} />
              <DetailRow label="🏆 Challenge Reward" value={`${challenge.prizePool} USDFG`} />
              <DetailRow label="👥 Players" value={`${challenge.players || 0}/${challenge.capacity || 2}`} />
              <DetailRow label="🎮 Platform" value={`${platformIcon(challenge.platform)} ${challenge.platform || 'All'}`} />
              <DetailRow label="👤 Creator" value={challenge.username || challenge.creator?.slice(0, 8) + '...' || 'Unknown'} />
              <DetailRow label="⏱ Expires" value={getExpiresText()} />
              <div className="col-span-2">
                <DetailRow label="📜 Rules" value={challenge.rules || 'Standard USDFG Arena rules apply'} multiline />
              </div>
            </div>

            {/* Show Cancel button for creator ONLY in pending_waiting_for_opponent state (before anyone joins) */}
            {/* IMPORTANT: Cannot cancel after someone expresses intent (creator_confirmation_required) - prevents cheating */}
            {/* Hidden on mobile - shown in sticky container instead */}
            {isOwner && status === 'pending_waiting_for_opponent' && (
              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-red-600/20 border border-red-500/40 py-3 text-red-200 font-semibold hover:bg-red-600/30 transition-colors hidden sm:block"
                onClick={async (e) => {
                  e.stopPropagation();
                  const deleted = await handleDeleteChallenge(challenge.id, challenge);
                  if (deleted) onClose();
                }}
              >
                🗑️ Cancel Challenge
              </button>
            )}
            
            {/* Show deadline expired message for creators */}
            {isOwner && status === 'creator_confirmation_required' && isDeadlineExpired && (
              <div className="mt-5 w-full rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-200 text-sm">
                <div className="font-semibold mb-1">⚠️ Confirmation Deadline Expired</div>
                <p className="text-xs text-red-200/80 mb-3">
                  The 5-minute deadline to confirm and fund has passed. The challenge will automatically revert to waiting for opponent (the same user can rejoin).
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const deleted = await handleDeleteChallenge(challenge.id, challenge);
                    if (deleted) setShowDetailSheet(false);
                  }}
                  className="w-full rounded-lg bg-red-700/30 border border-red-600/50 py-2 text-red-200 text-sm font-semibold hover:bg-red-700/40 transition-colors"
                >
                  🗑️ Delete Challenge
                </button>
              </div>
            )}
            
            {/* Show expired challenge message (60-minute expiration) */}
            {isOwner && status === 'pending_waiting_for_opponent' && (() => {
              const expirationTimer = challenge.rawData?.expirationTimer || challenge.expirationTimer;
              const isExpired = expirationTimer && expirationTimer.toMillis() < Date.now();
              const hasPendingJoiner = challenge.rawData?.pendingJoiner || challenge.pendingJoiner;
              return isExpired && !hasPendingJoiner; // Only show if expired and no one joined
            })() && (
              <div className="mt-5 w-full rounded-xl bg-[#07080C]/95 border border-white/10 p-4 text-white/85 text-sm">
                <div className="font-semibold mb-1 text-orange-300/90">⏰ Challenge Expired</div>
                <p className="text-xs text-white/60 mb-3">
                  This challenge has expired (60 minutes) and no one has joined. It will be automatically deleted soon.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const deleted = await handleDeleteChallenge(challenge.id, challenge);
                    if (deleted) setShowDetailSheet(false);
                  }}
                  className="w-full rounded-lg bg-orange-600/20 border border-orange-500/40 py-2 text-orange-100 text-sm font-semibold hover:bg-orange-600/30 transition-colors"
                >
                  🗑️ Delete Challenge
                </button>
              </div>
            )}

            {/* Show button for creators when confirmation required - fund directly without opening modal */}
            {/* Hidden on mobile - shown in sticky container instead */}
            {isOwner && canCreatorFund && onFund && (
              <div className="mt-5 space-y-2 hidden sm:block">
                {creatorFundingDeadline && (
                  <div className="text-xs text-white/55 text-center">
                    Deadline: {new Date(creatorFundingDeadline.toMillis()).toLocaleTimeString()} ({Math.max(0, Math.floor((creatorFundingDeadline.toMillis() - Date.now()) / 1000 / 60))}m remaining)
                  </div>
                )}
                <button
                  type="button"
                  className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 py-3 text-white font-bold hover:brightness-110 transition-all border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onFund(challenge);
                  }}
                >
                  ✨ Confirm and Fund Challenge ✨
                </button>
              </div>
            )}

            {/* Show Express Join Intent button for non-owners when challenge is waiting */}
            {/* Hidden on mobile - shown in sticky container instead */}
            {!isOwner && status === 'pending_waiting_for_opponent' && onExpressIntent && (
              <button
                type="button"
                className="mt-5 w-full rounded-xl border border-white/10 bg-purple-600/25 py-3 text-white font-semibold hover:bg-purple-600/35 transition-all ring-1 ring-purple-500/15 hidden sm:block"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onExpressIntent(challenge);
                }}
              >
                Express Join Intent (No Payment)
              </button>
            )}

            {/* Show Fund button for joiner when creator has funded */}
            {/* Hidden on mobile - shown in sticky container instead */}
            {!isOwner && status === 'creator_funded' && onJoinerFund && (
              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 py-3 text-white font-semibold hover:brightness-110 transition-all border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)] hidden sm:block"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onJoinerFund(challenge);
                }}
              >
                Fund Now ({challenge.entryFee} USDFG)
              </button>
            )}

            {/* View Challenge button - allows anyone to watch/view the challenge as a spectator */}
            {onViewChallenge && (status === 'active' || status === 'creator_funded' || status === 'completed') && (
              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 py-3 text-white font-semibold hover:brightness-110 transition-all border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChallenge(challenge);
                }}
              >
                👁️ View Challenge (Watch as Spectator)
              </button>
            )}

            {/* Close button - hidden on mobile, shown in sticky container instead */}
            <button
              type="button"
              className="mt-3 mb-4 w-full rounded-xl border border-white/10 py-3 text-white/80 font-semibold hidden sm:block"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          
          {/* Fixed button container for mobile - ensures buttons are always visible without scroll interference */}
          <div 
            className="fixed bottom-0 left-0 right-0 bg-[#07080C]/98 border-t border-white/10 ring-1 ring-purple-500/10 p-4 pb-4 sm:hidden z-[60] shadow-[0_-8px_28px_rgba(0,0,0,0.5)]"
            style={{
              // Ensure it's above the scroll container and modal overlay
              position: 'fixed',
              // Prevent touch events from interfering with scroll
              touchAction: 'none',
              // Add safe area padding for iOS
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
            }}
            onTouchStart={(e) => {
              // Prevent touch events from bubbling to scroll container
              e.stopPropagation();
            }}
          >
            {/* PRIORITY: Show Delete/Cancel buttons FIRST so they're never hidden by Fund button */}
            
            {/* Show Cancel button for creator ONLY in pending_waiting_for_opponent state */}
            {isOwner && status === 'pending_waiting_for_opponent' && (
              <button
                type="button"
                className="w-full rounded-xl bg-red-600/20 border border-red-500/40 py-3 text-red-200 font-semibold mb-2"
                onClick={async (e) => {
                  e.stopPropagation();
                  const deleted = await handleDeleteChallenge(challenge.id, challenge);
                  if (deleted) onClose();
                }}
              >
                🗑️ Cancel Challenge
              </button>
            )}
            
            {/* Show Delete button for creators when deadline expired (creator_confirmation_required) - MOBILE ONLY */}
            {isOwner && status === 'creator_confirmation_required' && isDeadlineExpired && (
              <button
                type="button"
                className="w-full rounded-xl bg-red-700/30 border border-red-600/50 py-3 text-red-200 font-semibold mb-2"
                onClick={async (e) => {
                  e.stopPropagation();
                  const deleted = await handleDeleteChallenge(challenge.id, challenge);
                  if (deleted) onClose();
                }}
              >
                🗑️ Delete Challenge (Deadline Expired)
              </button>
            )}
            
            {/* Show Delete button for expired challenges (60-minute expiration) - MOBILE ONLY */}
            {isOwner && status === 'pending_waiting_for_opponent' && (() => {
              const expirationTimer = challenge.rawData?.expirationTimer || challenge.expirationTimer;
              const isExpired = expirationTimer && expirationTimer.toMillis() < Date.now();
              const hasPendingJoiner = challenge.rawData?.pendingJoiner || challenge.pendingJoiner;
              return isExpired && !hasPendingJoiner;
            })() && (
              <button
                type="button"
                className="w-full rounded-xl bg-orange-600/20 border border-orange-500/45 py-3 text-orange-100 font-semibold mb-2 hover:bg-orange-600/28 transition-colors"
                onClick={async (e) => {
                  e.stopPropagation();
                  const deleted = await handleDeleteChallenge(challenge.id, challenge);
                  if (deleted) onClose();
                }}
              >
                🗑️ Delete Expired Challenge
              </button>
            )}
            
            {/* Show button for creators when confirmation required - AFTER delete buttons */}
            {isOwner && canCreatorFund && onFund && (
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 py-3 text-white font-bold mb-2 border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)] hover:brightness-110 transition-all"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onFund(challenge);
                }}
              >
                ✨ Confirm and Fund Challenge ✨
              </button>
            )}
            
            {/* Show Express Join Intent button for non-owners */}
            {!isOwner && status === 'pending_waiting_for_opponent' && onExpressIntent && (
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-purple-600/25 py-3 text-white font-semibold mb-2 ring-1 ring-purple-500/15 hover:bg-purple-600/35 transition-all"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onExpressIntent(challenge);
                }}
              >
                Express Join Intent (No Payment)
              </button>
            )}
            
            {/* Show Fund button for joiner */}
            {!isOwner && status === 'creator_funded' && onJoinerFund && (
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 py-3 text-white font-semibold mb-2 border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)] hover:brightness-110 transition-all"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onJoinerFund(challenge);
                }}
              >
                Fund Now ({challenge.entryFee} USDFG)
              </button>
            )}
            
            {/* Close button - always visible on mobile */}
            <button
              type="button"
              className="w-full rounded-xl border border-white/10 py-3 text-white/80 font-semibold"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>USDFG Arena | USDFG.PRO</title>
        <meta name="description" content="Enter the USDFG Arena - Compete in skill-based challenges, earn USDFG, and prove your gaming prowess." />
      </Helmet>

      <div className="relative min-h-screen w-full bg-void text-zinc-100 overflow-x-hidden">
        <ParticleBackground />
        <div className="pointer-events-none absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        {/* Header */}
        <ElegantNavbar>
          {/* Desktop Only Buttons */}
          <div className="hidden md:flex items-center justify-center gap-3 h-10">
            {/* Admin: Quick access to completed Founder Tournament */}
            {publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase() && (
              <button
                onClick={async () => {
                  // Find completed Founder Tournament
                  const completedFounderTournament = firestoreChallenges.find((c: any) => {
                    const format = c.format || c.rawData?.format;
                    const isTournament = format === 'tournament' || c.tournament || c.rawData?.tournament;
                    const creator = c.creator || c.rawData?.creator || '';
                    const entryFee = c.entryFee ?? c.rawData?.entryFee ?? 0;
                    const founderParticipantReward = c.founderParticipantReward ?? c.rawData?.founderParticipantReward ?? 0;
                    const founderWinnerBonus = c.founderWinnerBonus ?? c.rawData?.founderWinnerBonus ?? 0;
                    const stage = c.tournament?.stage ?? c.rawData?.tournament?.stage;
                    const status = c.status || c.rawData?.status;
                    
                    return isTournament &&
                      creator?.toLowerCase() === ADMIN_WALLET.toString().toLowerCase() &&
                      (entryFee === 0 || entryFee < 0.000000001) &&
                      (founderParticipantReward > 0 || founderWinnerBonus > 0) &&
                      (status === 'completed' || status === 'disputed') &&
                      stage === 'completed';
                  });
                  
                  if (completedFounderTournament) {
                    const merged = mergeChallengeDataForModal(completedFounderTournament, completedFounderTournament);
                    setSelectedChallenge(merged);
                    setShowStandardLobby(false);
                    setShowTournamentLobby(true);
                  } else {
                    showAppToast(
                      "No completed Founder Tournament found. Check Firestore or open via /app?challenge=eQIatd7tEHwTr9y08i9I",
                      "info",
                      "Founder payout"
                    );
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 h-10 bg-purple-600/50 hover:bg-purple-600/70 rounded-xl border border-purple-500/50 transition-all text-white text-xs font-semibold"
                title="Open completed Founder Tournament for payout"
              >
                <span className="text-purple-200">🏆</span>
                <span className="text-white">Founder Payout</span>
              </button>
            )}
            
            <button
              onClick={() => {
                if (isCreatingChallenge) return;
                setShowCreateModal(true);
              }}
              disabled={isCreatingChallenge}
              className="flex items-center justify-center gap-2 px-4 py-2 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-purple-500/45 transition-all text-white text-sm font-semibold"
              title={isCreatingChallenge ? "Creating challenge..." : "Create a new challenge"}
            >
              <span className="text-purple-300">⚡</span>
              <span className="text-white">
                {isCreatingChallenge ? "Creating..." : "Start Match"}
              </span>
            </button>
            
            {publicKey && (
              <>
                {/* Team Management Button */}
                <button
                  onClick={async () => {
                    // Fetch user's team
                    const { getTeamByMember } = await import("@/lib/firebase/firestore");
                    const team = await getTeamByMember(publicKey.toString());
                    setUserTeam(team);
                    setShowTeamModal(true);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-purple-500/45 transition-all text-white text-sm font-semibold"
                  title="View or manage your team"
                >
                  <span className="text-purple-300">👥</span>
                  <span className="hidden sm:inline">Team</span>
                </button>
              </>
            )}
            
            <WalletConnectSimple 
              isConnected={isConnected}
              onConnect={() => {
                localStorage.setItem('wallet_connected', 'true');
                // Force state update
                setPhantomConnectionState(prev => ({ ...prev }));
              }}
              onDisconnect={() => {
                localStorage.removeItem('wallet_connected');
                localStorage.removeItem('wallet_address');
                clearPhantomConnectionState();
                // Force state update
                setPhantomConnectionState({ connected: false, publicKey: null });
              }}
              profileAvatar={publicKey ? renderNavAvatar("md") : undefined}
              onProfileClick={() => {
                void handleOpenProfile();
              }}
              onAppToast={showAppToast}
            />
            
          </div>

          {/* Mobile Only - Admin Founder Payout + Wallet */}
          <div className="flex md:hidden items-center gap-2">
            {publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase() && (
              <button
                onClick={async () => {
                  const completedFounderTournament = firestoreChallenges.find((c: any) => {
                    const format = c.format || c.rawData?.format;
                    const isTournament = format === 'tournament' || c.tournament || c.rawData?.tournament;
                    const creator = (c.creator || c.rawData?.creator) ?? '';
                    const entryFee = c.entryFee ?? c.rawData?.entryFee ?? 0;
                    const founderParticipantReward = c.founderParticipantReward ?? c.rawData?.founderParticipantReward ?? 0;
                    const founderWinnerBonus = c.founderWinnerBonus ?? c.rawData?.founderWinnerBonus ?? 0;
                    const stage = c.tournament?.stage ?? c.rawData?.tournament?.stage;
                    const status = c.status || c.rawData?.status;
                    return isTournament &&
                      creator?.toLowerCase() === ADMIN_WALLET.toString().toLowerCase() &&
                      (entryFee === 0 || entryFee < 0.000000001) &&
                      (founderParticipantReward > 0 || founderWinnerBonus > 0) &&
                      (status === 'completed' || status === 'disputed') &&
                      stage === 'completed';
                  });
                  if (completedFounderTournament) {
                    const merged = mergeChallengeDataForModal(completedFounderTournament, completedFounderTournament);
                    setSelectedChallenge(merged);
                    setShowStandardLobby(false);
                    setShowTournamentLobby(true);
                  } else {
                    showAppToast(
                      "No completed Founder Tournament found. Check Firestore or open via /app?challenge=eQIatd7tEHwTr9y08i9I",
                      "info",
                      "Founder payout"
                    );
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 h-9 bg-purple-600/50 hover:bg-purple-600/70 rounded-xl border border-purple-500/50 transition-all text-white text-xs font-semibold shrink-0"
                title="Founder Payout – Open completed Founder Tournament"
                aria-label="Founder Payout"
              >
                <span className="text-purple-200">🏆</span>
                <span>Payout</span>
              </button>
            )}
            <WalletConnectSimple 
              isConnected={isConnected}
              onConnect={() => {
                localStorage.setItem('wallet_connected', 'true');
                setPhantomConnectionState(prev => ({ ...prev }));
              }}
              onDisconnect={() => {
                localStorage.removeItem('wallet_connected');
                localStorage.removeItem('wallet_address');
                clearPhantomConnectionState();
                setPhantomConnectionState({ connected: false, publicKey: null });
              }}
              compact={true}
              profileAvatar={publicKey ? renderNavAvatar("sm") : undefined}
              onProfileClick={() => {
                void handleOpenProfile();
              }}
              onAppToast={showAppToast}
            />
          </div>
        </ElegantNavbar>

        {/* Live Activity Ticker */}
        <LiveActivityTicker />

        {/* Elegant Notification */}
        <ElegantNotification
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          message={notification.message}
          title={notification.title}
          type={notification.type}
          duration={5000}
        />

        <AppConfirmModal
          isOpen={confirmDialog !== null}
          title={confirmDialog?.title ?? ""}
          message={confirmDialog?.message ?? ""}
          confirmLabel={confirmDialog?.confirmLabel}
          cancelLabel={confirmDialog?.cancelLabel}
          destructive={confirmDialog?.destructive}
          onConfirm={() => resolveAppConfirm(true)}
          onCancel={() => resolveAppConfirm(false)}
        />

        <ElegantModal
          isOpen={founderTransferModal !== null}
          onClose={() => setFounderTransferModal(null)}
          title="Mark reward as transferred"
        >
          <div className="space-y-3">
            <div className="text-xs text-white/65">
              This writes a Firestore record to reflect an off-chain transfer. Only use after funds are actually sent.
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/70">Amount (USDFG)</label>
              <input
                value={founderTransferAmount}
                onChange={(e) => setFounderTransferAmount(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 50"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-purple/50"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/70">Solana tx signature (optional)</label>
              <input
                value={founderTransferTxSignature}
                onChange={(e) => setFounderTransferTxSignature(e.target.value)}
                placeholder="Paste signature (optional)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-purple/50"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                onClick={() => setFounderTransferModal(null)}
                disabled={!!markingPrizeTransferred}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-purple to-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!founderTransferModal?.challenge?.id || !!markingPrizeTransferred}
                onClick={async () => {
                  const challenge = founderTransferModal?.challenge;
                  if (!challenge?.id) return;
                  const amount = parseFloat((founderTransferAmount || "").trim());
                  if (!Number.isFinite(amount) || amount <= 0) {
                    showAppToast("Please enter a valid positive amount.", "warning", "Amount");
                    return;
                  }
                  const txSig = (founderTransferTxSignature || "").trim();
                  const txSignatureFinal = txSig.length > 0 ? txSig : undefined;

                  setMarkingPrizeTransferred(challenge.id);
                  try {
                    const { recordFounderChallengeReward } = await import("@/lib/firebase/firestore");
                    await recordFounderChallengeReward(
                      challenge.rawData.winner,
                      challenge.id,
                      amount,
                      txSignatureFinal
                    );

                    try {
                      const total = await getTotalUSDFGRewarded();
                      setTotalUSDFGRewarded(total);
                      console.log(`✅ Updated USDFG Rewarded stat: ${total} USDFG`);
                    } catch (error) {
                      console.error("❌ Error refreshing USDFG Rewarded stat:", error);
                    }

                    showAppToast("Reward marked as transferred.", "success", "Saved");
                    setFounderTransferModal(null);
                  } catch (error) {
                    console.error("❌ Failed to mark reward as transferred:", error);
                    showAppToast(
                      "Failed to mark reward as transferred: " +
                        (error instanceof Error ? error.message : "Unknown error"),
                      "error",
                      "Failed"
                    );
                  } finally {
                    setMarkingPrizeTransferred(null);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </ElegantModal>

        {/* Live Data Tracker */}
        <div className="container mx-auto px-4 md:px-2 py-1.5 w-full border-b border-white/[0.06]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 flex-shrink-0 min-w-0">
              <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${!challengesLoading && !challengesError ? 'bg-emerald-500/80' : 'bg-red-400'}`}></div>
              <span className="text-[11px] sm:text-xs text-white/40 truncate">
                {challengesLoading ? 'Loading...' : challengesError ? 'Error' : 'Firestore Live'} · {challenges.length} active
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-white/35 hidden sm:block shrink-0">
              Real-time sync enabled
            </div>
          </div>
        </div>

        {/* Main Content - constrained width on desktop for better density */}
        <div className="container mx-auto px-4 md:px-2 pt-8 sm:pt-10 pb-8 sm:pb-10 w-full max-w-6xl">
          {/* Hero Section - tighter on desktop */}
          <div className="text-center neocore-section mb-8 md:mb-10">
            {/* USDFG Price Ticker */}
            <div className="inline-flex items-center bg-[#07080C]/95 border border-white/10 rounded-full px-2.5 py-1 mb-3 backdrop-blur-sm ring-1 ring-purple-500/15 transition-all hover:border-white/15">
              <div className="w-1.5 h-1.5 bg-purple-400/90 rounded-full mr-2"></div>
              <span className="text-sm text-white/60 mr-2">USDFG Price:</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-300 font-semibold">{usdfgPrice.toFixed(4)} USDFG</span>
              <span className="text-xs font-semibold ml-2 animate-pulse-live">Live</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              Welcome to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-orange-400">Arena</span>
            </h1>
            <p className="relative z-10 block text-sm md:text-base max-w-2xl mx-auto text-white/70 mb-5 px-0 leading-relaxed opacity-100">
              Compete in skill-based challenges, earn USDFG, and prove your gaming prowess against players worldwide.
            </p>
            
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-0">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="elite-btn neocore-button px-2 sm:px-3 py-1 sm:py-1.5 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Start Match
                  </button>
                  <Link 
                    to="#challenges"
                    className="text-purple-300 underline underline-offset-4 hover:text-orange-300/90 transition-colors neocore-body text-sm sm:text-base"
                  >
                    Browse Challenges
                  </Link>
                </div>
            
            {!isConnected && (
              <div className="bg-[#07080C]/95 border border-white/10 rounded-lg p-3.5 max-w-md mx-auto mt-5 ring-1 ring-purple-500/10">
                <p className="text-white/75 text-sm leading-relaxed">
                  <span className="text-orange-300/95 font-medium">Connect your wallet</span> to start competing and earning rewards!
                </p>
              </div>
            )}
            
            {/* Unclaimed Reward Notification */}
            {isConnected && unclaimedPrizeChallenges.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/40 rounded-xl p-4 max-w-md mx-auto mt-5 shadow-[0_0_20px_rgba(34,197,94,0.22)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💰</div>
                    <div>
                      <p className="text-emerald-200 font-bold text-sm">
                        {unclaimedPrizeChallenges.length} Unclaimed Reward{unclaimedPrizeChallenges.length > 1 ? 's' : ''}!
                      </p>
                      <p className="text-emerald-300/80 text-xs mt-1">
                        Click to claim your rewards
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const challenge = unclaimedPrizeChallenges[0];
                      const merged = mergeChallengeDataForModal(challenge, challenge);
                      setSelectedChallenge(merged);
                      const format = merged.format === 'tournament' || merged.rawData?.format === 'tournament' || merged.tournament;
                      if (format) {
                        setShowStandardLobby(false);
                        setShowTournamentLobby(true);
                      } else {
                        setShowTournamentLobby(false);
                        setShowStandardLobby(true);
                      }
                      // Start claim flow so lobby opens and review/claim runs (first click opens and proceeds)
                      handleClaimPrize(merged);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:shadow-[0_0_25px_rgba(34,197,94,0.7)]"
                  >
                    Claim Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats - Kimi-like compact strip on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-12">
            <div className="relative min-h-[100px] md:min-h-[112px] rounded-lg bg-[#07080C]/95 border border-white/10 p-3 md:p-4 text-center hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.07),transparent_72%)] pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-none tracking-tight tabular-nums">
                  {activeChallengesCount.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-white/35 leading-none" aria-hidden>🏆</div>
                <div className="text-[11px] sm:text-sm text-purple-300/90 mt-0.5 font-medium leading-snug">Active Challenges</div>
              </div>
            </div>
            
            <div className="relative min-h-[100px] md:min-h-[112px] rounded-lg bg-[#07080C]/95 border border-white/10 p-3 md:p-4 text-center hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.07),transparent_72%)] pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-none tracking-tight tabular-nums">
                  {arenaPlayersCount.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-white/35 leading-none" aria-hidden>👥</div>
                <div className="text-[11px] sm:text-sm text-purple-300/90 mt-0.5 font-medium leading-snug">Join the arena</div>
              </div>
            </div>
            
            <div className="relative min-h-[100px] md:min-h-[112px] rounded-lg bg-[#07080C]/95 border border-white/10 p-3 md:p-4 text-center hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.07),transparent_72%)] pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-none tracking-tight tabular-nums">
                  {totalUSDFGRewarded.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-white/35 leading-none" aria-hidden>⚡</div>
                <div className="text-[11px] sm:text-sm text-purple-300/90 mt-0.5 font-medium leading-snug">USDFG Rewarded</div>
              </div>
            </div>
            
            {/* Win Rate Stat Box - Now with rotating ad images */}
            <AdRotationBox />
          </div>

          {/* Live Challenges Discovery Section - Category-based horizontal scrolling (id for #challenges anchor on mobile) */}
          <div id="challenges" className="relative mb-12 md:mb-14 scroll-mt-6">
            <div className="mb-5 md:mb-6 px-0 md:px-0 space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1.5">
                <h1 className="text-lg md:text-2xl font-semibold text-white">Live Challenges</h1>
                {selectedCategoryFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter(null)}
                    className="text-xs px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-200 border border-purple-500/40 hover:bg-purple-500/25"
                  >
                    Show all
                  </button>
                )}
              </div>
              <p className="text-sm text-white/50 leading-relaxed text-center md:text-left max-w-2xl mx-auto md:mx-0">
                Browse by category. Swipe horizontally within each row to see more cards.
              </p>
              {trustBrowseUsedFallback && (
                <div className="animate-fade-in">
                  <div className="text-xs text-gray-500 text-center mb-2">
                    Showing broader results to find more matches
                  </div>
                </div>
              )}
            </div>
                
            {/* Helper function to map challenge categories to discovery categories */}
            {(() => {
              const isAdminUser = !!publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
              const completedFounderForPayout = isAdminUser ? filteredChallenges.filter((c: any) => {
                const fmt = c.format || c.rawData?.format;
                const isTournament = fmt === 'tournament' || !!c.tournament || !!c.rawData?.tournament;
                const creator = (c.creator ?? c.rawData?.creator) ?? '';
                const fee = c.entryFee ?? c.rawData?.entryFee ?? 0;
                const founderPart = c.founderParticipantReward ?? c.rawData?.founderParticipantReward ?? 0;
                const founderWin = c.founderWinnerBonus ?? c.rawData?.founderWinnerBonus ?? 0;
                const stage = c.tournament?.stage ?? c.rawData?.tournament?.stage;
                const status = c.status || c.rawData?.status;
                return isTournament && creator?.toLowerCase() === ADMIN_WALLET.toString().toLowerCase() &&
                  (fee === 0 || fee < 1e-9) && (founderPart > 0 || founderWin > 0) &&
                  (status === 'completed' || status === 'disputed') && stage === 'completed';
              }) : [];
              const completedFounderNeedingPayout = completedFounderForPayout.filter(
                (c: any) => !(c.founderPayoutSentAt ?? c.rawData?.founderPayoutSentAt)
              );

              const openChallengeLobby = (challenge: any) => {
                const merged = mergeChallengeDataForModal(challenge, challenge.rawData ?? challenge);
                setSelectedChallenge(merged);
                const format = (merged.rawData as any)?.format || ((merged.rawData as any)?.tournament ? "tournament" : "standard");
                if (format === "tournament") {
                  setShowStandardLobby(false);
                  setShowTournamentLobby(true);
                } else {
                  if (showTournamentLobby) setShowTournamentLobby(false);
                  setShowStandardLobby(true);
                }
              };

              // Group challenges by discovery category (Sports, Fighting, FPS, Racing, Strategy, Tournaments, Other)
              type DiscoveryCategory = 'Sports' | 'Fighting' | 'FPS' | 'Racing' | 'Strategy' | 'Tournaments' | 'Other';
              const categorizeChallenge = (challenge: any): DiscoveryCategory => {
                const category = challenge.category?.toUpperCase() || '';
                const game = challenge.game?.toLowerCase() || '';
                const isTournament = challenge.format === 'tournament' || challenge.tournament || challenge.rawData?.tournament;
                if (isTournament) return 'Tournaments';
                if (category.includes('SPORTS') || category.includes('BASKETBALL') || 
                    category.includes('SOCCER') || category.includes('FOOTBALL') || 
                    category.includes('BASEBALL') || category.includes('GOLF')) {
                  return 'Sports';
                }
                if (category.includes('UFC') || category.includes('FIGHTING') || category.includes('BOXING') ||
                    game.includes('ufc') || game.includes('ea sports ufc')) {
                  return 'Fighting';
                }
                if (category.includes('SHOOTING') || category.includes('FPS') || 
                    game.includes('cod') || game.includes('call of duty') || 
                    game.includes('valorant') || game.includes('cs') || 
                    game.includes('battlefield')) {
                  return 'FPS';
                }
                if (category.includes('RACING')) return 'Racing';
                if (category.includes('STRATEGY') || category.includes('BOARDGAMES')) return 'Strategy';
                return 'Other';
              };

              const categoryGroups: Record<string, any[]> = {
                Sports: [],
                Fighting: [],
                FPS: [],
                Racing: [],
                Strategy: [],
                Tournaments: [],
                Other: []
              };

              filteredChallenges.forEach(challenge => {
                const category = categorizeChallenge(challenge);
                if (categoryGroups[category]) {
                  categoryGroups[category].push(challenge);
                }
              });

              const gridKeyToDiscovery: Record<string, string> = { SPORTS: 'Sports', FIGHTING: 'Fighting', FPS: 'FPS', RACING: 'Racing', STRATEGY: 'Strategy', TOURNAMENTS: 'Tournaments' };
              const discoveryToGridKey: Record<string, string> = { Sports: 'SPORTS', Fighting: 'FIGHTING', FPS: 'FPS', Racing: 'RACING', Strategy: 'STRATEGY', Tournaments: 'TOURNAMENTS' };
              const sectionsToShow: [string, any[]][] = selectedCategoryFilter
                ? [[selectedCategoryFilter, categoryGroups[selectedCategoryFilter] || []]]
                : Object.entries(categoryGroups);

              const categoryTitleClass = (title: string) => {
                if (title === 'Sports') return 'text-emerald-400';
                if (title === 'Fighting') return 'text-rose-400';
                if (title === 'FPS') return 'text-indigo-400';
                if (title === 'Racing') return 'text-orange-400';
                if (title === 'Strategy') return 'text-cyan-400';
                if (title === 'Tournaments') return 'text-purple-400';
                if (title === 'Other') return 'text-white/80';
                return 'text-white';
              };

              // Status badge component
              const StatusPill = ({ status, isOwner, players, capacity }: { status: string; isOwner: boolean; players: number; capacity: number }) => {
                if (status === "completed") {
                  return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-neutral-700/30 text-neutral-300 border-neutral-600/30">
                      COMPLETED
                    </span>
                  );
                }
                if (status === "pending_waiting_for_opponent") {
                            return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-emerald-500/20 text-emerald-200 border-emerald-500/30 ring-1 ring-emerald-400/20 shadow-[0_0_8px_rgba(16,185,129,0.18)]">
                      OPEN
                              </span>
                  );
                }
                if (status === "active" || status === "creator_funded") {
                                return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-rose-500/20 text-rose-200 border-rose-500/30 ring-1 ring-rose-400/25 shadow-[0_0_10px_rgba(244,63,94,0.22)]">
                      LIVE
                                    </span>
                                );
                              }
                if (status === "creator_confirmation_required") {
                  return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-purple-500/15 text-purple-100 border-purple-500/35 ring-1 ring-purple-400/25 shadow-[0_0_8px_rgba(124,58,237,0.2)]">
                      {isOwner ? 'CONFIRM' : 'LIVE'}
                              </span>
                  );
                }
                if (players >= capacity) {
                            return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-neutral-600/25 text-neutral-200 border-neutral-500/30">
                      FULL
                                    </span>
                  );
                }
                            return (
                  <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-white/10 text-white border-white/10">
                    {status.toUpperCase()}
                  </span>
                );
              };

              // Platform icon helper (local scope version for cards)
              const platformIconLocal = (platform: string) => {
                const p = String(platform || '').toLowerCase();
                if (p.includes('ps')) return '🎮';
                if (p.includes('xbox')) return '🟩';
                if (p.includes('pc')) return '🖥️';
                if (p.includes('mobile')) return '📱';
                return '🎮';
              };

              // Discovery card component
              const DiscoveryCard = ({ challenge, onSelect }: { challenge: any; onSelect: () => void }) => {
                const gameName = resolveGameName(challenge.game, challenge.title);
                const imagePath = getGameImage(gameName, { isCustomGame: isChallengeCustomGame(challenge) });
                const isOwner = isChallengeOwner(challenge);
                
                const status = challenge.status;
                const isOpen = status === "pending_waiting_for_opponent";
                const isLive = status === "active" || status === "creator_funded";
                const isFull = challenge.players >= challenge.capacity;

                const creatorDisputesWon = Number(challenge.creatorDisputesWon) || 0;
                const creatorDisputesLost = Number(challenge.creatorDisputesLost) || 0;
                const isPenalized = creatorDisputesLost > creatorDisputesWon * 2;

                const edgeGlow = isOpen
                  ? 'border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/15'
                  : isLive
                    ? 'border-rose-400/45 shadow-[0_0_12px_rgba(244,63,94,0.24)] ring-1 ring-rose-400/15'
                    : 'border-white/10';

                return (
                  <div className={isPenalized ? "opacity-70 hover:opacity-100 transition" : ""}>
                  <div className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      className={`relative text-left rounded-xl border overflow-hidden p-3 pb-4 transition active:scale-[0.99] w-[176px] min-h-[200px] sm:w-[180px] sm:min-h-[200px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/45 ${edgeGlow}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect();
                      }}
                      onTouchStart={(e) => {
                        // Ensure touch events work on mobile
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect();
                        }
                      }}
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        WebkitUserSelect: 'none',
                        userSelect: 'none'
                      }}
                      aria-label={`Open ${gameName} challenge`}
                    >
                                    <img 
                      src={`${imagePath}?v=2&game=${encodeURIComponent(gameName)}`}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover scale-110"
                      loading="lazy"
                      draggable={false}
                      key={`${challenge.id}-${gameName}-${imagePath}`}
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                        // Only log errors in development
                        if (process.env.NODE_ENV === 'development') {
                        console.error(`❌ Failed to load image: ${imagePath} for game: ${gameName}, challenge: ${challenge.id}`);
                        }
                        target.src = '/assets/usdfgtokenn.png';
                      }}
                      onLoad={() => {
                        // Remove excessive logging - images are cached by browser anyway
                        // Only log for problematic games in development mode
                        if (process.env.NODE_ENV === 'development' && (gameName.toLowerCase().includes('nba') || gameName.toLowerCase().includes('2k'))) {
                          console.log(`✅ Successfully loaded image: ${imagePath} for game: ${gameName}`);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 pointer-events-none" />
                    <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] pointer-events-none" />
                    <div className="absolute inset-0 ring-1 ring-white/5 rounded-xl pointer-events-none" />

                    <div className="relative z-10 flex h-full flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold truncate">{gameName}</div>
                          <div className="text-xs text-white/70 truncate">{challenge.mode || 'Head-to-Head'}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-white/60">👥</span>
                            <span className="text-[10px] font-semibold text-white/80">
                              {(() => {
                                const maxPlayers = challenge.capacity || challenge.maxPlayers || 2;
                                if (typeof challenge.players === 'number') {
                                  return `${Math.min(challenge.players, maxPlayers)}/${maxPlayers}`;
                                }
                                const rawPlayers = Array.isArray(challenge.players) ? challenge.players : [];
                                const creatorWallet = challenge.creator || challenge.rawData?.creator;
                                const challengerWallet = challenge.challenger || challenge.rawData?.challenger;
                                const pendingJoiner = challenge.pendingJoiner || challenge.rawData?.pendingJoiner;
                                const participantSet = new Set<string>();
                                if (creatorWallet) participantSet.add(creatorWallet.toLowerCase());
                                if (challengerWallet) participantSet.add(challengerWallet.toLowerCase());
                                if (pendingJoiner) participantSet.add(pendingJoiner.toLowerCase());
                                rawPlayers.forEach((p: string) => p && participantSet.add(p.toLowerCase()));
                                const playersCount = participantSet.size || rawPlayers.length;
                                return `${Math.min(playersCount, maxPlayers)}/${maxPlayers}`;
                              })()}
                            </span>
                            <span className="text-[9px] text-white/40">•</span>
                            <span className="text-[10px] text-white/60">👁️</span>
                            <span className="text-[10px] font-semibold text-purple-300/80">Watch</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusPill 
                            status={status} 
                            isOwner={isOwner} 
                            players={Array.isArray(challenge.players) ? challenge.players.length : (typeof challenge.players === 'number' ? challenge.players : 0)} 
                            capacity={challenge.capacity || 2} 
                          />
                          {/* Share button - positioned below status */}
                                        <button
                            type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                              handleShareChallenge(challenge);
                            }}
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleShareChallenge(challenge);
                            }}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 hover:border-purple-400/45 transition-all touch-manipulation"
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            title="Share challenge"
                            aria-label="Share challenge"
                          >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                                        </button>
                                              </div>
                                              </div>

                      <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-black/45 p-2">
                          <div className="text-white/70">💰 Challenge Amount</div>
                          <div className="font-semibold">{challenge.entryFee} USDFG</div>
                                        </div>
                        <div className="rounded-lg bg-black/45 p-2">
                          <div className="text-white/70">🏆 Reward</div>
                          <div className="font-semibold">{challenge.prizePool} USDFG</div>
                            </div>
                          </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-white/80 mt-1.5">
                        <div className="min-w-0 flex-1 flex items-center gap-1.5">
                          <span className="text-white/60 shrink-0">👤 </span>
                          <span className="font-semibold truncate">{challenge.username || challenge.creator?.slice(0, 8) + '...'}</span>
                          {!isOwner && (
                            <TrustBadge score={challenge.creatorDisplayTrust ?? 5} compact className="shrink-0" />
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="text-white/60">{platformIconLocal(challenge.platform)}</span>
                          <span className="font-semibold">{challenge.platform || 'All'}</span>
                        </div>
                      </div>
                                  </div>
                                </div>
                              </div>
                  </div>
                            );
              };

              // Render Founder Payout row for admin (so completed Founder Tournament is always clickable)
              return (
                <>
                  {visibleChallenges.length === challenges.length &&
                    filteredChallenges.length === 0 &&
                    !challengesLoading && (
                      <div className="text-center text-gray-400 py-8">
                        No challenges available right now.
                      </div>
                    )}
                  {completedFounderNeedingPayout.length > 0 && (
                    <section className="mb-6">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0 md:px-0">
                        <h2 className="text-sm font-semibold tracking-wide text-purple-300">
                          Batch Founder Payout
                        </h2>
                        <button
                          type="button"
                          onClick={handleBatchFounderAirdrop}
                          disabled={isAirdropping}
                          className="rounded-lg border border-purple-500/45 bg-purple-600/20 px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAirdropping ? 'Sending…' : `Send all in one (${completedFounderNeedingPayout.length} tournament${completedFounderNeedingPayout.length === 1 ? '' : 's'}) — one SOL fee`}
                        </button>
                      </div>
                      <p className="mb-2 px-0 md:px-0 text-xs text-white/50">
                        One combined airdrop for all tournaments above — pay SOL fee once.
                      </p>
                    </section>
                  )}
                  {completedFounderForPayout.length > 0 && (
                    <section className="mb-8 md:mb-9">
                      <div className="mb-2 flex items-center justify-between px-0 md:px-0">
                        <h2 className="text-sm font-semibold tracking-wide text-purple-400">
                          Founder Payout
                        </h2>
                        <span className="text-xs text-white/45">Tap to open & send airdrop per tournament</span>
                      </div>
                      <div
                        className="flex gap-3 overflow-x-auto pb-4 px-0 md:px-0 md:pb-2"
                        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {completedFounderForPayout.map((challenge: any) => (
                          <div key={challenge.id} className="flex-none">
                            <DiscoveryCard
                              challenge={challenge}
                              onSelect={() => openChallengeLobby(challenge)}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {sectionsToShow.map(([categoryTitle, items]) => {
                    if (items.length === 0 && !selectedCategoryFilter) return null;
                    if (items.length === 0 && selectedCategoryFilter === categoryTitle) {
                      return (
                        <section key={categoryTitle} className="mb-9 md:mb-10">
                          <h2 className={`text-sm font-semibold tracking-wide mb-3 px-0 md:px-0 ${categoryTitleClass(categoryTitle)}`}>{categoryTitle}</h2>
                          <p className="text-sm text-white/50 px-0 md:px-0">No challenges in this category yet.</p>
                        </section>
                      );
                    }
                    if (items.length === 0) return null;
                    
                                return (
                      <section key={categoryTitle} className="mb-9 md:mb-10">
                        <div className="mb-3 px-0 md:px-0">
                          <h2 className={`text-sm font-semibold tracking-wide ${categoryTitleClass(categoryTitle)}`}>
                            {categoryTitle}
                          </h2>
                        </div>

                        <div 
                          className="flex gap-3 overflow-x-auto pb-4 px-0 md:px-0 md:pb-3" 
                          style={{ 
                            WebkitOverflowScrolling: 'touch',
                            touchAction: 'pan-x',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                          }}
                        >
                          {items.map((challenge) => (
                            <div 
                              key={challenge.id} 
                              className="flex-none"
                            >
                              <DiscoveryCard 
                                challenge={challenge}
                                onSelect={async () => {
                                  const now = Date.now();
                                  const expMs = (() => {
                                    const fromExpiresAt = challenge.expiresAt != null
                                      ? (typeof challenge.expiresAt === 'number'
                                        ? challenge.expiresAt
                                        : (challenge.expiresAt?.toMillis?.() ?? challenge.expiresAt?.toDate?.()?.getTime?.()))
                                      : null;
                                    const timer = challenge.rawData?.expirationTimer;
                                    const fromTimer = timer != null
                                      ? (typeof timer === 'number' ? timer : (timer?.toMillis?.() ?? timer?.toDate?.()?.getTime?.()))
                                      : null;
                                    return fromExpiresAt ?? fromTimer ?? null;
                                  })();
                                  const status = (challenge.status ?? challenge.rawData?.status) as string | undefined;
                                  const timeExpired = expMs != null && expMs < now;
                                  const isPreMatch =
                                    status === 'pending_waiting_for_opponent' ||
                                    status === 'creator_confirmation_required' ||
                                    status === 'creator_funded';
                                  const isExpired = status === 'cancelled' || (isPreMatch && timeExpired);
                                  if (isExpired) return;

                                  const isCompletedOrDisputed = status === "completed" || status === "disputed";
                                  const payoutTriggered = !!challenge.rawData?.payoutTriggered;
                                  const creator = (challenge.creator ?? challenge.rawData?.creator) ?? '';
                                  const challenger = (challenge.challenger ?? challenge.rawData?.challenger) ?? '';
                                  const pk = publicKey?.toString() ?? '';
                                  const playersList = Array.isArray(challenge.players) ? challenge.players : (Array.isArray(challenge.rawData?.players) ? challenge.rawData.players : []);
                                  const isParticipant =
                                    !!pk &&
                                    (walletsEqual(creator, pk) ||
                                      walletsEqual(challenger, pk) ||
                                      isParticipantWallet(playersList, pk));
                                  const isAdmin = !!publicKey && walletsEqual(publicKey.toString(), ADMIN_WALLET.toString());
                                  const fmt = challenge.format || challenge.rawData?.format;
                                  const isTournament = fmt === 'tournament' || !!challenge.tournament || !!challenge.rawData?.tournament;
                                  const fee = challenge.entryFee ?? challenge.rawData?.entryFee ?? 0;
                                  const founderPart = challenge.founderParticipantReward ?? challenge.rawData?.founderParticipantReward ?? 0;
                                  const founderWin = challenge.founderWinnerBonus ?? challenge.rawData?.founderWinnerBonus ?? 0;
                                  const isFounderTournament = isTournament &&
                                    walletsEqual(creator, ADMIN_WALLET.toString()) &&
                                    (fee === 0 || fee < 1e-9) &&
                                    (founderPart > 0 || founderWin > 0);
                                  if (isCompletedOrDisputed || payoutTriggered) {
                                    // Allow participants to open (view result, claim, chat); allow admin to open any completed/disputed (payout or dispute resolution)
                                    if (!isParticipant && !isAdmin) return;
                                  }

                                  // Check if this is a team challenge with teamOnly restriction
                                  const challengeType = challenge.rawData?.challengeType;
                                  const teamOnly = challenge.rawData?.teamOnly;
                                  
                                  if (challengeType === 'team' && teamOnly === true) {
                                    // Team-only challenge - verify user is in a team
                                    if (!currentWallet) {
                                      setNotification({
                                        isOpen: true,
                                        message: 'Please connect your wallet to join this team challenge.',
                                        title: 'Wallet Required',
                                        type: 'warning'
                                      });
                                      return;
                                    }
                                    
                                    const userTeam = await getTeamByMember(currentWallet);
                                    if (!userTeam) {
                                      setNotification({
                                        isOpen: true,
                                        message: 'This challenge is only open to teams. You must be part of a team to join. Please create or join a team first.',
                                        title: 'Team Required',
                                        type: 'warning'
                                      });
                                      return;
                                    }
                                  }
                                  
                                  openChallengeLobby(challenge);
                                }}
                              />
                                </div>
                          ))}
                                </div>
                      </section>
                                );
                  })}
                </>
                          );
                        })()}
          </div>

          {/* Live Challenges Grid - filters Live Challenges section above (no navigation) */}
          <div className="mb-8 md:mb-10 pt-2 md:pt-3 border-t border-white/[0.06]">
            <h2 className="mb-4 md:mb-5 text-base md:text-lg font-semibold text-white tracking-tight text-center md:text-left">
              All Challenges
            </h2>
            <LiveChallengesGrid
              challenges={challenges}
              selectedCategoryKey={selectedCategoryFilter ? { Sports: 'SPORTS', Fighting: 'FIGHTING', FPS: 'FPS', Racing: 'RACING', Strategy: 'STRATEGY', Tournaments: 'TOURNAMENTS' }[selectedCategoryFilter] : null}
              onCategorySelect={(key) =>
                setSelectedCategoryFilter((prev) => {
                  const discovery = {
                    SPORTS: 'Sports',
                    FIGHTING: 'Fighting',
                    FPS: 'FPS',
                    RACING: 'Racing',
                    STRATEGY: 'Strategy',
                    TOURNAMENTS: 'Tournaments',
                  }[key];
                  if (discovery === undefined) return prev;
                  return prev === discovery ? null : discovery;
                })
              }
            />
          </div>

          {/* Arena Leaders Section — KIMI visual system */}
          <div className="relative rounded-2xl bg-void-light/85 border border-white/10 overflow-hidden backdrop-blur-sm shadow-[0_0_48px_rgba(0,0,0,0.45)] mb-8 md:mb-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(126,67,255,0.12),transparent_55%)] pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-purple/15 via-transparent to-transparent pointer-events-none opacity-90" />
              <div className="relative z-10 text-center py-6 px-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-orange shrink-0" aria-hidden />
                  <span>Arena leaders</span>
                  <span className="text-sm font-body font-semibold text-white/55 uppercase tracking-widest">
                    {leaderboardTitle}
                  </span>
                </h2>
                <p className="font-body text-sm text-white/50 mt-2 max-w-md mx-auto">{leaderboardSubtitle}</p>
                
                <div className="mt-5 flex items-center justify-center gap-2 px-4 md:px-6">
                  <button
                    type="button"
                    onClick={() => handleLeaderboardViewChange('individual')}
                    aria-pressed={isSoloView}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-semibold transition-all border min-h-[2.5rem] ${
                      isSoloView
                        ? 'border-purple/45 bg-purple/[0.12] text-white ring-1 ring-purple/25'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <User className="h-3.5 w-3.5 opacity-90" aria-hidden />
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLeaderboardViewChange('teams')}
                    aria-pressed={isTeamsView}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-semibold transition-all border min-h-[2.5rem] ${
                      isTeamsView
                        ? 'border-purple/45 bg-purple/[0.12] text-white ring-1 ring-purple/25'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 opacity-90" aria-hidden />
                    Teams
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="mt-5 px-4 md:px-6">
                  <div className="relative max-w-xl mx-auto">
                    <input
                      type="text"
                      placeholder={leaderboardSearchPlaceholder}
                      value={leaderboardSearchTerm}
                      onChange={(e) => setLeaderboardSearchTerm(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-void-light/70 border border-white/10 rounded-xl text-white placeholder:text-white/35 focus:border-purple/45 focus:outline-none focus:ring-1 focus:ring-purple/25 transition-all text-sm font-body"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/35">
                      <Search className="h-4 w-4" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 p-4 md:p-6 pt-0">
                
                {isLoadingLeaderboard ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/15 border-t-purple"></div>
                  </div>
                ) : !hasLeaderboardEntries ? (
                  <div className="text-center py-10">
                    <div className="font-body text-white/65 text-sm">{leaderboardEmptyStateTitle}</div>
                    <div className="font-body text-white/40 text-xs mt-2">{leaderboardEmptyStateSubtitle}</div>
                  </div>
                ) : (
                  <div className="relative divide-y divide-white/10 rounded-xl border border-white/5 overflow-hidden">
                    {(() => {
                      if (isTeamsView) {
                        const transformedTeams = rankedTeamLeaderboard.map((team, index) => ({
                          rank: index + 1,
                          name: team.teamName && team.teamName.trim().length > 0
                            ? team.teamName
                            : `Team ${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`,
                          trust: typeof team.trustScore === 'number' ? team.trustScore : 0,
                          wins: team.wins || 0,
                          losses: team.losses || 0,
                          winRate: Number.isFinite(team.winRate) ? team.winRate : 0,
                          totalEarned: team.totalEarned || 0,
                          membersCount: Array.isArray(team.members) ? team.members.length : 0,
                          teamKey: team.teamKey,
                          teamId: team.teamId,
                          teamImage: team.teamImage, // Team logo/image (separate from creator's profile image)
                          members: Array.isArray(team.members) ? team.members : [],
                          trustReviews: team.trustReviews || 0,
                        }));

                        const normalizedTerm = leaderboardSearchTerm.trim().toLowerCase();
                        const filteredTeams = normalizedTerm === ''
                          ? transformedTeams
                          : transformedTeams.filter((team) => {
                              const matchesName = team.name.toLowerCase().includes(normalizedTerm);
                              const matchesKey = team.teamKey.toLowerCase().includes(normalizedTerm);
                              const matchesId = (team.teamId || '').toLowerCase().includes(normalizedTerm);
                              const membersArr = Array.isArray(team.members) ? team.members : [];
                              const matchesMember = membersArr.some((member) =>
                                member && typeof member === 'string' && member.toLowerCase().includes(normalizedTerm)
                              );
                              return matchesName || matchesKey || matchesId || matchesMember;
                            });

                        if (filteredTeams.length === 0 && leaderboardSearchTerm !== '') {
                          return (
                            <div className="text-center py-8">
                              <div className="font-body text-white/60 text-sm">
                                No {leaderboardEntityLabel.toLowerCase()} found matching "{leaderboardSearchTerm}"
                              </div>
                              <div className="font-body text-white/40 text-xs mt-2">Try a different search term</div>
                            </div>
                          );
                        }

                        return filteredTeams.map((team) => (
                          <div
                            key={team.teamId || team.teamKey}
                            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.04] transition cursor-pointer relative group ${
                              team.rank <= 3 ? "bg-gradient-to-r from-purple/[0.08] to-transparent" : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTeamModalJoinPrefill(team.teamKey);
                              setShowTeamModal(true);
                            }}
                            style={{ zIndex: 10, position: 'relative' }}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pointer-events-none">
                              <div
                                className={`h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-base sm:text-sm font-display font-bold border shrink-0 overflow-hidden relative ${
                                  team.rank === 1
                                    ? "border-purple/60 text-white ring-1 ring-purple/25"
                                    : team.rank === 2
                                    ? "border-white/35 text-white/90"
                                    : team.rank === 3
                                    ? "border-orange/55 text-orange-200"
                                    : "border-white/12 text-white/45"
                                }`}
                              >
                                {team.teamImage ? (
                                  <>
                                    {/* Team image as background */}
                                    <img 
                                      src={team.teamImage} 
                                      alt={team.name}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to rank number if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = String(team.rank);
                                        }
                                      }}
                                    />
                                    {/* Rank number centered on top of image */}
                                    <div className={`absolute inset-0 flex items-center justify-center ${
                                      team.rank === 1
                                        ? "text-white"
                                        : team.rank === 2
                                        ? "text-white/90"
                                        : team.rank === 3
                                        ? "text-orange-200"
                                        : "text-white/50"
                                    }`}>
                                      <span className="text-base sm:text-sm font-bold relative z-10 bg-black/30 rounded-full w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center backdrop-blur-[1px] border border-white/15 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
                                {team.rank}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  team.rank
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-base sm:text-lg font-display font-semibold text-white">
                                  <span className="truncate">{team.name}</span>
                                  <span className="text-xs font-body text-white/45 shrink-0 inline-flex items-center gap-1">
                                    <Users className="h-3 w-3 opacity-80" aria-hidden />
                                    {team.membersCount} members
                                  </span>
                                  {team.rank === 1 && <Crown className="h-4 w-4 text-orange shrink-0" aria-hidden />}
                                </div>
                                <div className="font-body text-xs text-white/45 mt-0.5">
                                  Trust {team.trust.toFixed(1)}/10 • Win Rate {team.winRate.toFixed(1)}%
                                </div>
                                <div className="flex items-center gap-2 mt-1 pointer-events-auto">
                                  <div className="text-xs text-zinc-500 font-mono truncate">
                                    {`${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`}
                                  </div>
                                  <button
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      event.nativeEvent.stopImmediatePropagation();
                                      navigator.clipboard.writeText(team.teamKey);
                                      const button = event.target as HTMLElement;
                                      const originalText = button.textContent;
                                      button.textContent = '✓';
                                      button.className = 'text-xs text-green-400 transition-colors shrink-0';
                                      setTimeout(() => {
                                        button.textContent = originalText;
                                        button.className = 'text-xs text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer pointer-events-auto shrink-0';
                                      }, 1000);
                                    }}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer pointer-events-auto shrink-0"
                                    title="Copy team key"
                                    style={{ zIndex: 20 }}
                                  >
                                    📋
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-xs text-white/70 pointer-events-none font-body">
                                  <span className="font-semibold text-white/55">Total earned</span>
                                  <span className="text-orange/90">{team.totalEarned.toLocaleString()} USDFG</span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-4 pointer-events-none font-body">
                              <div className="flex items-center gap-1 text-green-400/95 text-sm font-semibold">
                                <span className="text-xs text-white/35">W</span>
                                <span>{team.wins}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-400/95 text-sm font-semibold">
                                <span className="text-xs text-white/35">L</span>
                                <span>{team.losses}</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/85 text-sm font-semibold">
                                <span className="text-xs text-white/35">USDFG</span>
                                <span className="text-orange/90">{team.totalEarned.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/85 text-sm font-semibold">
                                <span className="text-xs text-white/35">Trust</span>
                                <span>{team.trust.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="flex sm:hidden items-center justify-between gap-3 mt-2 pt-2 border-t border-white/10 pointer-events-none font-body">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-0">
                                  <div className="text-xs text-zinc-500">W</div>
                                  <div className="text-sm font-bold text-green-400">{team.wins}</div>
                                </div>
                                <div className="flex flex-col items-center gap-0">
                                  <div className="text-xs text-zinc-500">L</div>
                                  <div className="text-sm font-bold text-red-400">{team.losses}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-0">
                                <div className="text-xs text-white/35">USDFG</div>
                                <div className="text-sm font-bold text-orange/90">{team.totalEarned.toLocaleString()}</div>
                              </div>
                              <div className="flex flex-col items-center gap-0">
                                <div className="text-xs text-white/35">Trust</div>
                                <div className="text-sm font-bold text-white/90">{team.trust.toFixed(1)}</div>
                              </div>
                            </div>
                          </div>
                        ));
                      }

                      // Helper function to get country flag from country code
                      const getCountryFlag = (countryCode: string | null | undefined): string => {
                        if (!countryCode) return '🌍'; // Default world map if no country set
                        
                        // Country codes to flag emojis mapping (same as in PlayerProfileModal)
                        const countryFlags: { [key: string]: string } = {
                          'US': '🇺🇸', 'CA': '🇨🇦', 'MX': '🇲🇽', 'GT': '🇬🇹', 'CU': '🇨🇺', 'JM': '🇯🇲', 'HT': '🇭🇹', 'DO': '🇩🇴', 'CR': '🇨🇷', 'PA': '🇵🇦',
                          'BR': '🇧🇷', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'VE': '🇻🇪', 'EC': '🇪🇨', 'BO': '🇧🇴', 'PY': '🇵🇾', 'UY': '🇺🇾', 'GY': '🇬🇾', 'SR': '🇸🇷',
                          'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'AT': '🇦🇹', 'CH': '🇨🇭', 'BE': '🇧🇪', 'IE': '🇮🇪', 'PT': '🇵🇹', 'GR': '🇬🇷', 'TR': '🇹🇷', 'RU': '🇷🇺', 'UA': '🇺🇦', 'RO': '🇷🇴', 'BG': '🇧🇬', 'HR': '🇭🇷', 'RS': '🇷🇸', 'BA': '🇧🇦', 'SI': '🇸🇮', 'SK': '🇸🇰', 'LT': '🇱🇹', 'LV': '🇱🇻', 'EE': '🇪🇪', 'BY': '🇧🇾', 'MD': '🇲🇩', 'AL': '🇦🇱', 'MK': '🇲🇰', 'ME': '🇲🇪', 'XK': '🇽🇰', 'IS': '🇮🇸', 'LU': '🇱🇺', 'MT': '🇲🇹', 'CY': '🇨🇾',
                          'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳', 'TH': '🇹🇭', 'VN': '🇻🇳', 'PH': '🇵🇭', 'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼', 'MN': '🇲🇳', 'KP': '🇰🇵', 'MM': '🇲🇲', 'LA': '🇱🇦', 'KH': '🇰🇭', 'BN': '🇧🇳', 'TL': '🇹🇱', 'BD': '🇧🇩', 'PK': '🇵🇰', 'AF': '🇦🇫', 'IR': '🇮🇷', 'IQ': '🇮🇶', 'SY': '🇸🇾', 'LB': '🇱🇧', 'JO': '🇯🇴', 'IL': '🇮🇱', 'PS': '🇵🇸', 'SA': '🇸🇦', 'AE': '🇦🇪', 'QA': '🇶🇦', 'BH': '🇧🇭', 'KW': '🇰🇼', 'OM': '🇴🇲', 'YE': '🇾🇪',
                          'AU': '🇦🇺', 'NZ': '🇳🇿', 'FJ': '🇫🇯', 'PG': '🇵🇬', 'SB': '🇸🇧', 'VU': '🇻🇺', 'NC': '🇳🇨', 'PF': '🇵🇫', 'WS': '🇼🇸', 'TO': '🇹🇴', 'KI': '🇰🇮', 'TV': '🇹🇻', 'NR': '🇳🇷', 'PW': '🇵🇼', 'FM': '🇫🇲', 'MH': '🇲🇭',
                          'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'ET': '🇪🇹', 'EG': '🇪🇬', 'MA': '🇲🇦', 'DZ': '🇩🇿', 'TN': '🇹🇳', 'LY': '🇱🇾', 'SD': '🇸🇩', 'GH': '🇬🇭', 'UG': '🇺🇬', 'TZ': '🇹🇿', 'CM': '🇨🇲', 'AO': '🇦🇴', 'MZ': '🇲🇿', 'MW': '🇲🇼', 'ZM': '🇿🇲', 'ZW': '🇿🇼', 'BW': '🇧🇼', 'NA': '🇳🇦', 'SN': '🇸🇳', 'CI': '🇨🇮', 'BF': '🇧🇫', 'ML': '🇲🇱', 'NE': '🇳🇪', 'TD': '🇹🇩', 'MR': '🇲🇷', 'SO': '🇸🇴', 'DJ': '🇩🇯', 'ER': '🇪🇷', 'SS': '🇸🇸', 'CF': '🇨🇫', 'CD': '🇨🇩', 'RW': '🇷🇼', 'BI': '🇧🇮', 'KM': '🇰🇲', 'SC': '🇸🇨', 'MU': '🇲🇺', 'CV': '🇨🇻', 'ST': '🇸🇹', 'GW': '🇬🇼', 'GQ': '🇬🇶', 'GA': '🇬🇦', 'CG': '🇨🇬'
                        };
                        
                        return countryFlags[countryCode.toUpperCase()] || '🌍';
                      };
                      
                      // Rank by composite leaderboard score (trust, wins, earnings, forfeits, dispute visibility)
                      const transformedPlayers = rankedSoloLeaderboard.map((player, index) => {
                        // Get country code from Firestore first (shared across all users), then fallback to localStorage
                        const playerCountryCode = player.country || getWalletScopedValue(PROFILE_STORAGE_KEYS.country, player.wallet);
                        const countryFlag = getCountryFlag(playerCountryCode);
                        
                        const displayTrust =
                          player.displayTrustScore ?? computeDisplayTrustScore(player);
                        
                        // Removed excessive logging - only log on initial load if needed for debugging
                        
                        return {
                          rank: index + 1,
                          name: (player.displayName && player.displayName.trim()) ? player.displayName : `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`,
                          country: countryFlag, // Use player's actual country flag
                          trust: displayTrust,
                          wins: player.wins,
                          losses: player.losses,
                          winRate: player.winRate || 0, // Win rate percentage
                          streak: 0, // We don't track streak yet
                          integrity: displayTrust,
                          wallet: player.wallet,
                          gamesPlayed: player.gamesPlayed,
                          profileImage: player.profileImage || getWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, player.wallet), // Use Firestore image first, fallback to localStorage
                          playerStats: player, // Store full PlayerStats for modal
                          displayTrustScore: player.displayTrustScore,
                        };
                      });
                      
                      const filteredPlayers = transformedPlayers.filter(player => 
                        leaderboardSearchTerm === '' || 
                        player.name.toLowerCase().includes(leaderboardSearchTerm.toLowerCase()) ||
                        player.wallet.toLowerCase().includes(leaderboardSearchTerm.toLowerCase())
                      );

                      if (filteredPlayers.length === 0 && leaderboardSearchTerm !== '') {
                        return (
                          <div className="text-center py-8">
                            <div className="font-body text-white/60 text-sm">
                              No {leaderboardEntityLabel.toLowerCase()} found matching "{leaderboardSearchTerm}"
                            </div>
                            <div className="font-body text-white/40 text-xs mt-2">
                              Try a different search term
                            </div>
                          </div>
                        );
                      }

                      return filteredPlayers.map((player) => (
                      <div
                        key={player.wallet}
                        className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.04] transition cursor-pointer relative group ${
                          player.rank <= 3 ? "bg-gradient-to-r from-purple/[0.08] to-transparent" : ""
                        }`}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Fetch latest player stats from Firestore to ensure we have the most up-to-date trust score
                          if (player.playerStats) {
                            try {
                              const latestStats = await getPlayerStats(player.playerStats.wallet);
                              if (latestStats) {
                                setSelectedPlayer(latestStats);
                              } else {
                                // Fallback to cached data if fetch fails
                                setSelectedPlayer(player.playerStats);
                              }
                            } catch (error) {
                              console.error('Failed to fetch latest player stats:', error);
                              // Fallback to cached data if fetch fails
                              setSelectedPlayer(player.playerStats);
                            }
                          setShowPlayerProfile(true);
                          }
                        }}
                        style={{ zIndex: 10, position: 'relative' }}
                      >
                        {/* Top Row: Rank, Name, and Basic Info */}
                        <div className="flex items-center gap-3 sm:gap-4 pointer-events-none flex-1 min-w-0">
                          <div
                            className={`h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-base sm:text-sm font-display font-bold border shrink-0 overflow-hidden relative ${
                              player.rank === 1
                                ? "border-purple/60 text-white ring-1 ring-purple/25"
                                : player.rank === 2
                                ? "border-white/35 text-white/90"
                                : player.rank === 3
                                ? "border-orange/55 text-orange-200"
                                : "border-white/12 text-white/45"
                            }`}
                          >
                            {player.profileImage ? (
                              <>
                                {/* Profile image as background */}
                                <img 
                                  src={player.profileImage} 
                                  alt={player.name}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to rank number if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = String(player.rank);
                                    }
                                  }}
                                />
                                {/* Rank number centered on top of image */}
                                <div className={`absolute inset-0 flex items-center justify-center ${
                                  player.rank === 1
                                    ? "text-white"
                                    : player.rank === 2
                                    ? "text-white/90"
                                    : player.rank === 3
                                    ? "text-orange-200"
                                    : "text-white/50"
                                }`}>
                                  <span className="text-base sm:text-sm font-bold relative z-10 bg-black/30 rounded-full w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center backdrop-blur-[1px] border border-white/15 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
                            {player.rank}
                                  </span>
                                </div>
                              </>
                            ) : (
                              player.rank
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-base sm:text-lg font-display font-semibold text-white flex-wrap">
                              <span className="truncate">{player.name}</span> <span className="shrink-0">{player.country}</span>
                              {player.displayTrustScore != null && (
                                <TrustBadge score={player.displayTrustScore} compact className="shrink-0" />
                              )}
                              {player.rank === 1 && <Crown className="h-4 w-4 text-orange shrink-0" aria-hidden />}
                            </div>
                            <div className="font-body text-xs text-white/45 mt-0.5">Integrity {player.integrity.toFixed(1)}/10 • Streak {player.streak}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-xs text-zinc-500 font-mono truncate">{`${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`}</div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.nativeEvent.stopImmediatePropagation();
                                  navigator.clipboard.writeText(player.wallet);
                                  // Show a brief success indicator
                                  const button = e.target as HTMLElement;
                                  const originalText = button.textContent;
                                  button.textContent = '✓';
                                  button.className = 'text-xs text-green-400 transition-colors shrink-0';
                                  setTimeout(() => {
                                    button.textContent = originalText;
                                    button.className = 'text-xs text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer pointer-events-auto shrink-0';
                                  }, 1000);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer pointer-events-auto shrink-0"
                                title="Copy wallet address"
                                style={{ zIndex: 20 }}
                              >
                                📋
                              </button>
                            </div>
                            </div>
                          </div>

                        {/* Mobile: Trophies and Stats in a Row Below */}
                        <div className="flex items-center justify-between gap-3 sm:hidden mt-2 pt-2 border-t border-white/10">
                          {/* Trophy Display - Mobile */}
                          <div className="flex items-center justify-start gap-2 pointer-events-auto">
                            {(() => {
                              const gamesPlayed = player.gamesPlayed;
                              const allTrophies = [
                                { id: 'initiate', icon: '/assets/trophies/usdfg-initiate.png', requiredGames: 2 },
                                { id: 'contender', icon: '/assets/trophies/usdfg-contender.png', requiredGames: 10 },
                                { id: 'veteran', icon: '/assets/trophies/usdfg-veteran.png', requiredGames: 15 },
                                { id: 'enforcer', icon: '/assets/trophies/usdfg-enforcer.png', requiredGames: 30 },
                                { id: 'unbroken', icon: '/assets/trophies/usdfg-unbroken.png', requiredGames: 60 },
                                { id: 'disciple', icon: '/assets/trophies/usdfg-disciple.png', requiredGames: 90 },
                                { id: 'immortal', icon: '/assets/trophies/usdfg-immortal.png', requiredGames: 120 }
                              ];
                              
                              return allTrophies.slice(0, 3).map((trophy, index) => {
                                const isUnlocked = gamesPlayed >= trophy.requiredGames;
                                return (
                                  <img
                                    key={trophy.id}
                                    src={trophy.icon}
                                    alt={trophy.id}
                                    className={`w-8 h-8 sm:w-6 sm:h-6 transition-all duration-300 cursor-pointer relative z-10 ${
                                      isUnlocked 
                                        ? 'opacity-100 drop-shadow-[0_0_8px_rgba(126,67,255,0.35)] hover:drop-shadow-[0_0_12px_rgba(255,126,62,0.35)] hover:scale-110' 
                                        : 'opacity-40 grayscale'
                                    }`}
                                    loading="lazy"
                                    decoding="async"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.nativeEvent.stopImmediatePropagation();
                                      setSelectedTrophy({
                                        id: trophy.id,
                                        name: `USDFG ${trophy.id.toUpperCase()}`,
                                        icon: trophy.icon,
                                        requiredGames: trophy.requiredGames
                                      });
                                      setShowTrophyModal(true);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                );
                              });
                            })()}
                          </div>

                          {/* Stats - Mobile: Horizontal Layout */}
                          <div className="flex items-center gap-3 pointer-events-none">
                            <div className="flex flex-col items-center gap-0">
                              <div className="text-xs text-zinc-500">W</div>
                              <div className="text-sm font-bold text-green-400">{player.wins}</div>
                          </div>
                            <div className="flex flex-col items-center gap-0">
                              <div className="text-xs text-zinc-500">L</div>
                              <div className="text-sm font-bold text-red-400">{player.losses}</div>
                          </div>
                            <div className="flex flex-col items-center gap-0">
                              <div className="text-xs text-zinc-500">WR</div>
                              <div className="text-sm font-bold text-cyan-400">{player.winRate.toFixed(1)}%</div>
                          </div>
                            <div className="flex flex-col items-center gap-0">
                              <div className="text-xs text-white/35">🛡️</div>
                              <div className="text-sm font-bold text-white/90">{player.trust.toFixed(1)}</div>
                        </div>
                      </div>
                  </div>

                        {/* Desktop: Trophy Display and Stats Side by Side */}
                        <div className="hidden sm:flex items-center gap-4 pointer-events-none">
                          {/* Trophy Display - Desktop */}
                          <div className="flex items-center justify-center gap-1.5 pointer-events-auto">
                            {(() => {
                              const gamesPlayed = player.gamesPlayed;
                              const allTrophies = [
                                { id: 'initiate', icon: '/assets/trophies/usdfg-initiate.png', requiredGames: 2 },
                                { id: 'contender', icon: '/assets/trophies/usdfg-contender.png', requiredGames: 10 },
                                { id: 'veteran', icon: '/assets/trophies/usdfg-veteran.png', requiredGames: 15 },
                                { id: 'enforcer', icon: '/assets/trophies/usdfg-enforcer.png', requiredGames: 30 },
                                { id: 'unbroken', icon: '/assets/trophies/usdfg-unbroken.png', requiredGames: 60 },
                                { id: 'disciple', icon: '/assets/trophies/usdfg-disciple.png', requiredGames: 90 },
                                { id: 'immortal', icon: '/assets/trophies/usdfg-immortal.png', requiredGames: 120 }
                              ];
                              
                              return allTrophies.slice(0, 3).map((trophy, index) => {
                                const isUnlocked = gamesPlayed >= trophy.requiredGames;
                      return (
                                  <img
                                    key={trophy.id}
                                    src={trophy.icon}
                                    alt={trophy.id}
                                    className={`w-8 h-8 transition-all duration-300 cursor-pointer relative z-10 ${
                                      isUnlocked 
                                        ? 'opacity-100 drop-shadow-[0_0_8px_rgba(126,67,255,0.35)] hover:drop-shadow-[0_0_12px_rgba(255,126,62,0.35)] hover:scale-110' 
                                        : 'opacity-40 grayscale'
                                    }`}
                                    loading="lazy"
                                    decoding="async"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.nativeEvent.stopImmediatePropagation();
                                      setSelectedTrophy({
                                        id: trophy.id,
                                        name: `USDFG ${trophy.id.toUpperCase()}`,
                                        icon: trophy.icon,
                                        requiredGames: trophy.requiredGames
                                      });
                                      setShowTrophyModal(true);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                );
                              });
                            })()}
                                </div>

                          {/* Stats - Desktop: Horizontal Layout */}
                          <div className="flex items-center gap-4 pointer-events-none font-body">
                            <div className="flex items-center gap-1 text-green-400/95 text-sm font-semibold">
                              <span className="text-xs text-white/35">W</span>
                              <span>{player.wins}</span>
                              </div>
                            <div className="flex items-center gap-1 text-red-400/95 text-sm font-semibold">
                              <span className="text-xs text-white/35">L</span>
                              <span>{player.losses}</span>
                            </div>
                            <div className="flex items-center gap-1 text-cyan-400/90 text-sm font-semibold">
                              <span className="text-xs text-white/35">WR</span>
                              <span>{player.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/90 text-sm font-semibold">
                              <span className="text-white/50">🛡️</span>
                              <span>{player.trust.toFixed(1)}</span>
                          </div>
                        </div>
                        </div>
                    <div className="mt-3 sm:mt-0 sm:ml-6 flex items-center justify-end pointer-events-auto">
                      {renderLockAction(player.wallet, player.name)}
                    </div>
                      </div>
                      ));
                    })()}
                    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple/50 to-transparent animate-[pulseLine_3s_ease-in-out_infinite]" />
                    <style>{`
                      @keyframes pulseLine {0%,100%{opacity:.4}50%{opacity:1}}
                    `}</style>
                  </div>
                )}
                
                {/* Show More/Less and Load More Buttons */}
                {currentLeaderboardItems.length > 0 && (
                  <div className="px-6 pb-6 space-y-2">
                    {showAllPlayers ? (
                      <>
                    <button
                      type="button"
                      onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setShowAllPlayers(false);
                            setLeaderboardLimit(30); // Reset to default
                            setLeaderboardLoading(true);
                            try {
                              if (isTeamsView) {
                                await refreshTopTeams(5, false);
                              } else {
                                await loadTopPlayers(5, false);
                              }
                            } catch (error) {
                              console.error('Failed to load top 5:', error);
                            } finally {
                              setLeaderboardLoading(false);
                            }
                      }}
                      disabled={isLoadingLeaderboard}
                      className="w-full py-2.5 rounded-xl font-display font-semibold text-sm border border-white/12 bg-white/[0.04] text-white/90 hover:bg-purple/15 hover:border-purple/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                          {isLoadingLeaderboard ? 'Loading...' : '← Show Less (Top 5)'}
                    </button>
                        {/* Load More button - only show if we got the full limit (meaning there might be more) */}
                        {leaderboardLimit > 0 && currentLeaderboardItems.length === leaderboardLimit && (
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setLeaderboardLoading(true);
                              const newLimit = leaderboardLimit + 30; // Load 30 more
                              setLeaderboardLimit(newLimit);
                              try {
                                if (isTeamsView) {
                                  await refreshTopTeams(newLimit, true);
                                } else {
                                  await loadTopPlayers(newLimit, true);
                                }
                              } catch (error) {
                                console.error('Failed to load more players:', error);
                              } finally {
                                setLeaderboardLoading(false);
                              }
                            }}
                            disabled={isLoadingLeaderboard}
                            className="w-full py-2.5 rounded-xl font-display font-semibold text-sm bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingLeaderboard ? 'Loading...' : `Load More ${leaderboardEntityLabel} (+30)`}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setShowAllPlayers(true);
                          setLeaderboardLimit(0); // 0 = no limit (show all)
                          setLeaderboardLoading(true);
                          try {
                            if (isTeamsView) {
                              await refreshTopTeams(0, true);
                            } else {
                              await loadTopPlayers(0, true);
                            }
                          } catch (error) {
                            console.error('Failed to load all players:', error);
                          } finally {
                            setLeaderboardLoading(false);
                          }
                        }}
                        disabled={isLoadingLeaderboard}
                        className="w-full py-2.5 rounded-xl font-display font-semibold text-sm border border-purple/35 bg-purple/[0.08] text-white hover:bg-purple/20 hover:border-purple/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingLeaderboard ? 'Loading...' : `View All ${leaderboardEntityLabel} →`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

        {/* Create Challenge Modal */}
        <ElegantModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
          }}
          title="Create New Challenge"
        >
          <CreateChallengeForm
            isConnected={isConnected}
            onConnect={async () => {
              // CRITICAL: Prioritize MWA first to enable Safari → Phantom → Safari flow
              // Selecting Phantom first triggers deep link fallback, which breaks the flow
              try {
                // Log all available adapters for debugging
                console.log('🔍 Available wallets for connection:');
                wallet.wallets.forEach((w, i) => {
                  console.log(`  ${i + 1}. ${w.adapter.name} (readyState: ${w.adapter.readyState})`);
                });
                
                // CRITICAL: Prioritize MWA first to prevent deep link fallback
                const walletToConnect = wallet.wallets.find(w => 
                  w.adapter.name === 'Solana Mobile Wallet Adapter' || 
                  w.adapter.name === 'Mobile Wallet Adapter'
                ) || wallet.wallets.find(w => w.adapter.name === 'Phantom') || wallet.wallets[0];
                
                if (walletToConnect) {
                  console.log(`🎯 Selected wallet: ${walletToConnect.adapter.name}`);
                  wallet.select(walletToConnect.adapter.name);
                  
                  // Wait for selection to complete
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  // Connect using the adapter's connect method directly
                  await walletToConnect.adapter.connect();
                } else {
                  showAppToast("No wallet detected. Please install Phantom or another Solana wallet.", "warning", "Wallet");
                }
              } catch (error: any) {
                console.error('Connection error:', error);
                if (!error.message?.includes('User rejected') && !error.message?.includes('User cancelled')) {
                  showAppToast(`Connection failed: ${error.message || "Unknown error"}`, "error", "Connection");
                }
              }
            }}
            onCreateChallenge={handleCreateChallenge}
            usdfgPrice={usdfgPrice}
            usdfgToUsd={usdfgToUsd}
            userGamerTag={userGamerTag}
            currentWallet={publicKey?.toString()}
          />
        </ElegantModal>

        {/* Team Management Modal */}
        {showTeamModal && (
          <Suspense fallback={<div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>}>
            <ElegantModal
              isOpen={showTeamModal}
              onClose={() => setShowTeamModal(false)}
              title="Team Management"
            >
              <TeamManagementModal
                currentWallet={publicKey?.toString() || null}
                prefillJoinTeamId={teamModalJoinPrefill}
                onClose={() => {
                  setShowTeamModal(false);
                  setTeamModalJoinPrefill(null);
                }}
                onTeamUpdated={refreshTopTeams}
                requestAppConfirm={requestAppConfirm}
              />
            </ElegantModal>
          </Suspense>
        )}

        {/* Challenge Detail Sheet (Bottom Sheet) */}
        {showDetailSheet && selectedChallenge && (
          <ChallengeDetailSheet
            challenge={selectedChallenge}
            onClose={() => setShowDetailSheet(false)}
            onFund={handleDirectCreatorFund}
            onExpressIntent={handleDirectJoinerExpressIntent}
            onJoinerFund={handleDirectJoinerFund}
            onViewChallenge={(challenge) => {
              // Close detail sheet and open the appropriate lobby as a viewer
              setShowDetailSheet(false);
              setSelectedChallenge(challenge);
              
              // Determine if it's a tournament or standard challenge
              const format = challenge.rawData?.format || (challenge.rawData?.tournament ? "tournament" : "standard");
              if (format === "tournament") {
                setShowTournamentLobby(true);
              } else {
                setShowStandardLobby(true);
              }
            }}
          />
        )}


        {/* Submit Result Room - Only render for main challengers (creator and first challenger who accepted) */}
        {selectedChallenge?.id && (() => {
          const format =
            (selectedChallenge.rawData as any)?.format ||
            ((selectedChallenge.rawData as any)?.tournament ? "tournament" : "standard");
          const isTournament = format === "tournament";
          const currentWallet = publicKey?.toString()?.toLowerCase();
          const playersRaw = (selectedChallenge.rawData as any)?.players ?? (selectedChallenge as any).players;
          const players = Array.isArray(playersRaw) ? playersRaw : [];

          if (isTournament) {
            // Render tournament lobby modal - persistent room
            if (showTournamentLobby) {
              return (
                <RightSidePanel
                  isOpen={showTournamentLobby}
                  onClose={() => {
                    setShowTournamentLobby(false);
                    setSelectedChallenge(null);
                  }}
                  title={`${selectedChallenge.title || "Tournament"} Bracket`}
                  className="max-w-none w-full sm:max-w-[92vw] md:max-w-[88vw] lg:max-w-[85vw] xl:max-w-6xl"
                  players={players.map((wallet: string) => ({ wallet }))}
                  gameName={selectedChallenge.title || "Tournament"}
                  voiceChatChallengeId={selectedChallenge.id}
                  voiceChatCurrentWallet={publicKey?.toString() || ""}
                >
                  <TournamentBracketView
                    tournament={selectedChallenge.rawData?.tournament}
                    players={players}
                    currentWallet={publicKey?.toString() || null}
                    challengeId={selectedChallenge.id}
                    onAppToast={showAppToast}
                    requestAppConfirm={requestAppConfirm}
                    onOpenSubmitResult={handleOpenTournamentSubmitResult}
                    onPlayerClick={async (wallet: string) => {
                      try {
                        const playerStats = await getPlayerStats(wallet);
                        if (playerStats) {
                          setSelectedPlayer(playerStats);
                          setShowPlayerProfile(true);
                        } else {
                          setSelectedPlayer(minimalPlayerStatsForWallet(wallet));
                          setShowPlayerProfile(true);
                        }
                      } catch (error) {
                        console.error('Error fetching player stats:', error);
                        setSelectedPlayer(minimalPlayerStatsForWallet(wallet));
                        setShowPlayerProfile(true);
                      }
                    }}
                    onJoinTournament={async (challengeId: string) => {
                      if (!publicKey) {
                        showAppToast("Please connect your wallet first.", "warning", "Wallet");
                        return;
                      }
                      if (!connection) {
                        showAppToast("Solana connection not ready.", "error", "Wallet");
                        return;
                      }
                      if (!signTransaction) {
                        showAppToast("Wallet does not support signing transactions.", "error", "Wallet");
                        return;
                      }
                      const currentChallenge = selectedChallenge?.rawData || selectedChallenge;
                      const creatorWallet = currentChallenge?.creator || '';
                      if (creatorWallet) {
                        try {
                          const [joinerStats, creatorStatsJoin] = await Promise.all([
                            getPlayerStats(publicKey.toString()),
                            getPlayerStats(creatorWallet),
                          ]);
                          const userTrust = joinerStats?.displayTrustScore ?? 5;
                          const creatorTrust =
                            (selectedChallenge as { creatorDisplayTrust?: number })?.creatorDisplayTrust ??
                            creatorStatsJoin?.displayTrustScore ??
                            5;
                          if (userTrust < 3 && creatorTrust > 6) {
                            showAppToast("Trust level too low for this challenge", "error", "Cannot join");
                            return;
                          }
                        } catch (e) {
                          console.warn("Trust check before tournament join failed:", e);
                        }
                      }
                      const entryFeeValue = Number(currentChallenge?.entryFee ?? 0);
                      const founderParticipantReward = Number(currentChallenge?.founderParticipantReward ?? 0);
                      const founderWinnerBonus = Number(currentChallenge?.founderWinnerBonus ?? 0);
                      const isAdminChallenge =
                        creatorWallet &&
                        creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                      const isFounderTournament =
                        isAdminChallenge &&
                        (entryFeeValue === 0 || entryFeeValue < 0.000000001) &&
                        (founderParticipantReward > 0 || founderWinnerBonus > 0);
                      if (isFounderTournament) {
                        const initialized = await ensureUsdfgTokenAccount(publicKey.toString());
                        if (!initialized) {
                          return;
                        }
                      }
                      const isPaidTournament =
                        !isFounderTournament && entryFeeValue > CHALLENGE_CONFIG.MIN_ENTRY_FEE;
                      if (isPaidTournament) {
                        const pda =
                          getChallengePDA(currentChallenge) ||
                          getChallengePDA({ ...currentChallenge, id: challengeId });
                        if (!pda) {
                          showAppToast(
                            "This paid tournament has no on-chain PDA. Complete on-chain setup before joining.",
                            "error",
                            "Join failed"
                          );
                          return;
                        }
                        const { transferTournamentEntryFee } = await import("@/lib/chain/contract");
                        await transferTournamentEntryFee(
                          { signTransaction, publicKey },
                          connection,
                          pda,
                          entryFeeValue
                        );
                      }
                      const { becameFull } = await joinTournament(challengeId, publicKey.toString());
                      if (becameFull && isPaidTournament) {
                        await verifyPaidTournamentEscrowAndActivate(challengeId, connection);
                      }
                    }}
                    onClaimPrize={handleClaimPrize}
                    onCancelChallenge={handleCancelChallenge}
                    challenge={selectedChallenge}
                    isClaiming={claimingPrize === selectedChallenge.id}
                    onAirdropPayouts={handleFounderTournamentAirdrop}
                    isAirdropping={isAirdropping}
                  />
                </RightSidePanel>
              );
            }
            
            // Render submit result modal for tournament matches - overlay on lobby
            if (showSubmitResultModal && tournamentMatchData) {
              const tournamentParticipants = Array.isArray(selectedChallenge.rawData?.players) ? selectedChallenge.rawData.players : (Array.isArray(selectedChallenge.players) ? selectedChallenge.players : []);
              const tournamentCreator = selectedChallenge.creator || selectedChallenge.rawData?.creator || "";
              return (
                <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>}>
                  <SubmitResultRoom
                    isOpen={showSubmitResultModal}
                    onClose={() => {
                      setShowSubmitResultModal(false);
                      setTournamentMatchData(null);
                      // Reopen tournament lobby after closing submit result modal
                      setShowTournamentLobby(true);
                    }}
                    challengeId={selectedChallenge.id}
                    challengeTitle={selectedChallenge.title || ""}
                    currentWallet={publicKey?.toString() || ""}
                    onSubmit={handleSubmitResult}
                    onAppToast={showAppToast}
                    challengeStatus="active"
                    isSpectator={false}
                    isCreator={Boolean(publicKey && tournamentCreator && publicKey.toString().toLowerCase() === tournamentCreator.toLowerCase())}
                    participants={tournamentParticipants.filter(Boolean)}
                    spectators={[]}
                  />
                </Suspense>
              );
            }
            
            return null;
          }

          // Standard challenge: render persistent lobby with inline submit form
          const challengePlayersRaw = selectedChallenge.players || selectedChallenge.rawData?.players;
          const challengePlayers = Array.isArray(challengePlayersRaw) ? challengePlayersRaw : [];
          
          // Include pending joiner and challenger in the players list for the minimized header
          const pendingJoiner = selectedChallenge.pendingJoiner || selectedChallenge.rawData?.pendingJoiner;
          const challenger = selectedChallenge.challenger || selectedChallenge.rawData?.challenger;
          const creator = selectedChallenge.creator || selectedChallenge.rawData?.creator;
          
          // Build comprehensive players list: creator, challenger, pending joiner, and confirmed players
          // CRITICAL: Always include creator first (even if players array is empty) to ensure minimized header shows
          const allPlayersSet = new Set<string>();
          if (creator) allPlayersSet.add(creator); // Always add creator first
          if (challenger) allPlayersSet.add(challenger);
          if (pendingJoiner) allPlayersSet.add(pendingJoiner);
          challengePlayers.forEach((p: string) => allPlayersSet.add(p));
          
          // Ensure we always have at least the creator (challenge always has a creator)
          const allPlayers = Array.from(allPlayersSet).map((wallet: string) => ({ wallet }));
          
          // Fallback: if somehow no players, use creator as fallback (should never happen, but safety check)
          if (allPlayers.length === 0 && creator) {
            allPlayers.push({ wallet: creator });
          }
          const gameName = selectedChallenge.game || selectedChallenge.rawData?.game || 'Challenge';
          
          return (
            <>
              {showStandardLobby && (
                <RightSidePanel
                  isOpen={showStandardLobby}
          onClose={() => {
                    setShowStandardLobby(false);
                    setSelectedChallenge(null);
                  }}
                  title={`${selectedChallenge.title || "Challenge"} Lobby`}
                  players={allPlayers}
                  gameName={gameName}
                  voiceChatChallengeId={selectedChallenge.id}
                  voiceChatCurrentWallet={publicKey?.toString() || ""}
                >
                  <StandardChallengeLobby
                    challenge={selectedChallenge}
                    currentWallet={publicKey?.toString() || null}
                    onSubmitResult={handleSubmitResult}
                    onClaimPrize={handleClaimPrize}
                    onJoinChallenge={handleDirectJoinerExpressIntent}
                    onCreatorFund={handleDirectCreatorFund}
                    onJoinerFund={handleDirectJoinerFund}
                    onCancelChallenge={handleCancelChallenge}
                    onAppToast={showAppToast}
                    requestAppConfirm={requestAppConfirm}
                    onUpdateEntryFee={handleUpdateEntryFee}
                    onClose={() => {
                      setShowStandardLobby(false);
                      setSelectedChallenge(null);
                    }}
                    isSubmitting={false}
                    isClaiming={claimingPrize === selectedChallenge.id}
                    isCreatorFunding={isCreatorFunding === selectedChallenge.id}
                    isJoinerFunding={isJoinerFunding === selectedChallenge.id}
                    onPlayerClick={async (wallet: string) => {
                      try {
                        const playerStats = await getPlayerStats(wallet);
                        if (playerStats) {
                          setSelectedPlayer(playerStats);
                          setShowPlayerProfile(true);
                        } else {
                          setSelectedPlayer(minimalPlayerStatsForWallet(wallet));
                          setShowPlayerProfile(true);
                        }
                      } catch (error) {
                        console.error('Error fetching player stats:', error);
                        setSelectedPlayer(minimalPlayerStatsForWallet(wallet));
                        setShowPlayerProfile(true);
                      }
                    }}
                  />
                </RightSidePanel>
              )}
            </>
          );
        })()}


          {friendlyMatch && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>}>
              <SubmitResultRoom
                isOpen={showFriendlySubmitResult}
                onClose={() => setShowFriendlySubmitResult(false)}
                challengeId={friendlyMatch.matchId}
                challengeTitle={`Friendly Match vs ${friendlyMatch.opponentName || formatWalletAddress(friendlyMatch.opponentId)}`}
                currentWallet={publicKey?.toString() || ""}
                onSubmit={handleFriendlyResultSubmit}
                isSubmitting={submittingFriendlyResult}
                onAppToast={showAppToast}
              />
            </Suspense>
          )}

        {/* Mobile FAB - Create Challenge - Smaller and positioned to not block content */}
        <button
          onClick={() => {
            if (isCreatingChallenge) return;
            setShowCreateModal(true);
          }}
          disabled={isCreatingChallenge}
          className={`fixed bottom-20 right-4 md:hidden ${
            isCreatingChallenge 
              ? 'bg-gray-600/50 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-orange-500 hover:brightness-110'
          } text-white p-3 rounded-full shadow-[0_0_14px_rgba(124,58,237,0.35)] transition-all z-30 flex items-center justify-center w-12 h-12`}
          title="Start Match"
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>}>
          <PlayerProfileModal
          isOpen={showPlayerProfile}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayer(null);
          }}
          player={{
            name: selectedPlayer.displayName || selectedPlayer.wallet || 'Player',
            address: selectedPlayer.wallet,
            ...selectedPlayer,
            ...(userCountry && selectedPlayer.wallet === publicKey?.toString() ? { country: userCountry } : {}),
            // Use Firestore profileImage first (visible to everyone), then fallback to localStorage
            profileImage:
              selectedPlayer.profileImage ||
              (selectedPlayer.wallet === publicKey?.toString()
                ? (userProfileImage ?? undefined)
                : undefined) ||
              (selectedPlayer.wallet !== publicKey?.toString()
                ? (getWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, selectedPlayer.wallet) ?? undefined)
                : undefined),
            lastActive: selectedPlayer.lastActive?.seconds ? { seconds: selectedPlayer.lastActive.seconds } : undefined
          }}
          isCurrentUser={!!(publicKey && selectedPlayer.wallet === publicKey.toString())}
            onEditProfile={async (newName) => {
              setUserGamerTag(newName);
              if (publicKey) {
                const walletKey = publicKey.toString();
                setWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey, newName);
              }
              
              // Update selectedPlayer immediately to show new name in modal
              if (selectedPlayer) {
                setSelectedPlayer({
                  ...selectedPlayer,
                  displayName: newName
                });
              }
              
              // Update display name in Firestore
              if (publicKey) {
                try {
                  await updatePlayerDisplayName(publicKey.toString(), newName);
                  const limit = showAllPlayers ? 50 : 5;
                  const players = await getLeaderboardPlayers(limit, 'totalEarned', showAllPlayers);
                  setTopPlayers(players);
                } catch (error) {
                  console.error('Failed to update display name in Firestore:', error);
                }
              }
            }}
            onCountryChange={async (country) => {
              setUserCountry(country);
              if (publicKey) {
                const walletKey = publicKey.toString();
                if (country) {
                  setWalletScopedValue(PROFILE_STORAGE_KEYS.country, walletKey, country);
                } else {
                  clearWalletScopedValue(PROFILE_STORAGE_KEYS.country, walletKey);
                }
                
                try {
                  const { updatePlayerCountry } = await import("@/lib/firebase/firestore");
                  await updatePlayerCountry(walletKey, country);
                } catch (error) {
                  console.error('❌ Failed to save country to Firestore:', error);
                }
              }
            }}
            onProfileImageChange={async (image, file) => {
              if (publicKey) {
                const walletKey = publicKey.toString();
                
                if (file && image) {
                  // Upload to Firebase Storage and get URL
                  try {
                    const imageURL = await uploadProfileImage(walletKey, file);
                    // Save URL to Firestore
                    await updatePlayerProfileImage(walletKey, imageURL);
                    // Update local state with Storage URL
                    setUserProfileImage(imageURL);
                    // Also save to localStorage as backup
                    setWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, walletKey, imageURL);
                    
                    // Refresh leaderboard to show updated image
                    const limit = showAllPlayers ? 50 : 5;
                    const players = await getLeaderboardPlayers(limit, 'totalEarned', showAllPlayers);
                    setTopPlayers(players);
                  } catch (error) {
                    console.error('❌ Failed to upload profile image:', error);
                    showAppToast("Failed to upload profile image. Please try again.", "error", "Upload failed");
                  }
                } else if (!image) {
                  // Removing image
                  try {
                    await updatePlayerProfileImage(walletKey, null);
                    setUserProfileImage(null);
                  clearWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, walletKey);
                    
                    // Refresh leaderboard
                    const limit = showAllPlayers ? 50 : 5;
                    const players = await getLeaderboardPlayers(limit, 'totalEarned', showAllPlayers);
                    setTopPlayers(players);
                  } catch (error) {
                    console.error('❌ Failed to remove profile image:', error);
                    showAppToast("Failed to remove profile image. Please try again.", "error", "Remove failed");
                  }
                } else {
                  // Fallback: just update local state (for backwards compatibility)
                  setUserProfileImage(image);
                  setWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, walletKey, image);
                }
              }
            }}
          onChallengePlayer={handleChallengePlayer}
          hasActiveChallenge={publicKey ? challenges.some(c => 
            c.creator === publicKey.toString() && 
            (c.status === 'active' ||
              c.status === 'pending_waiting_for_opponent' ||
              c.status === 'creator_confirmation_required' ||
              c.status === 'creator_funded')
          ) : false}
          currentWallet={publicKey?.toString() || null}
          onTeamUpdated={refreshTopTeams}
        />
        </Suspense>
      )}

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        currentGamerTag={userGamerTag}
        onToast={showAppToast}
        onSave={async (gamerTag) => {
          setUserGamerTag(gamerTag);
            if (publicKey) {
              const walletKey = publicKey.toString();
              setWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey, gamerTag);
            }
        }}
      />


      {/* Trust Review Modal */}
      <TrustReviewModal
        isOpen={showTrustReview}
        opponentName={trustReviewOpponent}
        completionRate={1} // Default to 1 (100% completion)
        onClose={() => {
          setShowTrustReview(false);
          setTrustReviewOpponent('');
        }}
        onSubmit={handleTrustReviewSubmit}
      />

      {/* Trophy Modal */}
      {showTrophyModal && selectedTrophy && (
        <ElegantModal
          isOpen={showTrophyModal}
          onClose={() => {
            setShowTrophyModal(false);
            setSelectedTrophy(null);
          }}
          title={selectedTrophy.name}
        >
          <div className="text-center space-y-6">
            <div className="relative">
              <img
                src={selectedTrophy.icon}
                alt={selectedTrophy.name}
                className="w-32 h-32 mx-auto animate-bounce-slow drop-shadow-[0_0_14px_rgba(124,58,237,0.35)]"
              />
              <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-purple-500/15 to-orange-400/15 animate-pulse"></div>
            </div>
            <p className="text-white/80 text-lg leading-relaxed">
              [Hidden Description - Unlock to reveal]
            </p>
            <div className="bg-[#0B0C12]/90 border border-white/10 rounded-lg p-4 ring-1 ring-purple-500/15">
              <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-300 font-bold text-lg mb-3">Mystery Requirement</h3>
              <p className="text-white font-bold text-2xl">
                ??? games played
              </p>
              <p className="text-purple-200/80 text-sm mt-2 italic">
                Keep playing to discover the secret!
              </p>
            </div>
          </div>
        </ElegantModal>
      )}

      {/* Victory Modal */}
      <VictoryModal
        isOpen={showVictoryModal}
        onClose={() => {
          setShowVictoryModal(false);
          setVictoryModalData(null);
        }}
        onClaimReward={() => {
          // Ensure lobby is open for claiming reward
          if (selectedChallenge && !showStandardLobby) {
            setShowStandardLobby(true);
          }
        }}
        autoWon={victoryModalData?.autoWon}
        opponentName={victoryModalData?.opponentName}
      />
      </div>

    </>
  );
};



// JoinChallengeModal REMOVED - functionality moved to ChallengeDetailSheet with direct handlers


// Profile Settings Modal Component
const ProfileSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentGamerTag: string;
  onSave: (gamerTag: string) => void;
  onToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
}> = ({ isOpen, onClose, currentGamerTag, onSave, onToast }) => {
  const [gamerTag, setGamerTag] = useState(currentGamerTag);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!gamerTag.trim()) {
      onToast?.("Please enter a gamer tag.", "warning", "Gamer tag");
      return;
    }
    
    setSaving(true);
    try {
      await onSave(gamerTag.trim());
      onClose();
    } catch (error) {
      console.error('Error saving gamer tag:', error);
      onToast?.("Error saving gamer tag. Please try again.", "error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#07080C]/95 p-4 ring-1 ring-purple-500/15 shadow-none">
        {/* Ambient wash */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_72%)] pointer-events-none rounded-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">
              Profile Settings
            </h3>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
            >
              <span className="text-zinc-400 hover:text-white text-lg">✕</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Gamer Tag
              </label>
              <input
                type="text"
                value={gamerTag}
                onChange={(e) => setGamerTag(e.target.value)}
                placeholder="Enter your gamer tag"
                className="w-full p-3 bg-[#0B0C12]/90 border border-zinc-800 rounded-2xl text-white placeholder-zinc-400 hover:border-purple-500/45 focus:border-purple-400/60 focus:ring-1 focus:ring-purple-500/30 focus:outline-none transition-all"
                maxLength={20}
              />
              <p className="text-xs text-zinc-400 mt-1">
                This will be shown when you create challenges (max 20 characters)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !gamerTag.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ArenaHome;