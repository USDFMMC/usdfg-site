import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy, useRef } from "react";
import { Helmet } from "react-helmet";
import ElegantNotification from "@/components/ui/ElegantNotification";
import { Link } from "react-router-dom";
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
import { ChallengeData, expressJoinIntent, creatorFund, joinerFund, revertCreatorTimeout, revertJoinerTimeout, expirePendingChallenge, cleanupExpiredChallenge, submitChallengeResult, startResultSubmissionPhase, getLeaderboardPlayers, getLeaderboardTeams, PlayerStats, TeamStats, getTotalUSDFGRewarded, getPlayersOnlineCount, updatePlayerLastActive, updatePlayerDisplayName, getPlayerStats, storeTrustReview, hasUserReviewedChallenge, createTeam, joinTeam, leaveTeam, getTeamByMember, getTeamStats, ensureUserLockDocument, setUserCurrentLock, listenToAllUserLocks, clearMutualLock, recordFriendlyMatchResult, upsertLockNotification, listenToLockNotifications, LockNotification, uploadProfileImage, updatePlayerProfileImage, uploadTeamImage, updateTeamImage, upsertChallengeNotification, listenToChallengeNotifications, ChallengeNotification, fetchChallengeById, postChallengeSystemMessage, submitTournamentMatchResult, deleteChallenge, joinTournament } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useConnection } from '@solana/wallet-adapter-react';
// Oracle removed - no longer needed
import { ADMIN_WALLET, USDFG_MINT, PROGRAM_ID, SEEDS } from '@/lib/chain/config';
import { getExplorerTxUrl } from '@/lib/chain/explorer';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { testFirestoreConnection } from "@/lib/firebase/firestore";
import { getWalletScopedValue, setWalletScopedValue, clearWalletScopedValue, PROFILE_STORAGE_KEYS } from "@/lib/storage/profile";
import { getPhantomConnectionState, setPhantomConnectionState, clearPhantomConnectionState } from "@/lib/utils/wallet-state";
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
  canCancelChallenge
} from "@/lib/utils/challenge-helpers";
import ElegantButton from "@/components/ui/ElegantButton";
import ElegantModal from "@/components/ui/ElegantModal";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";
import ElegantNavbar from "@/components/layout/ElegantNavbar";
import LiveChallengesGrid from "@/components/arena/LiveChallengesGrid";
// Lazy load heavy modals for better performance on all devices
const SubmitResultRoom = lazy(() => import("@/components/arena/SubmitResultRoom").then(module => ({ default: module.SubmitResultRoom })));
const PlayerProfileModal = lazy(() => import("@/components/arena/PlayerProfileModal"));
import TrustReviewModal from "@/components/arena/TrustReviewModal";
const TeamManagementModal = lazy(() => import("@/components/arena/TeamManagementModal"));
import VictoryModal from "@/components/arena/VictoryModal";

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
      <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
        <div className="relative z-10">
          <div className="text-lg mb-1">📈</div>
          <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">+12.5%</div>
          <div className="text-sm text-amber-400 mt-1 font-semibold">Win Rate</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
      
      {/* Rotating Ad Images */}
      <div className="relative w-full h-full min-h-[80px] flex items-center justify-center">
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
  
  // Use stored public key if adapter doesn't have one
  const effectivePublicKey = publicKey || (storedPhantomPublicKey ? new PublicKey(storedPhantomPublicKey) : null);

  // CRITICAL: Handle Phantom deep link return on same page (Smithii-style)
  // Phantom returns to /app with query params, we decrypt and restore session here
  useEffect(() => {
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
          window.history.replaceState({}, "", "/");
        }
      }
      return;
    }
    
    const params2 = new URLSearchParams(window.location.search);
    
    // Handle user cancellation - Phantom may redirect without params
    // If we're on / with no params and we have a pending deep link, user likely cancelled
    if (!params2.has("phantom_encryption_public_key") && (window.location.pathname === "/" || window.location.pathname === "")) {
      const hasPendingNonce = sessionStorage.getItem(SESSION_STORAGE_NONCE);
      if (hasPendingNonce) {
        console.log("⚠️ Phantom deep link cancelled by user - staying on /");
        // Clear the pending nonce and connecting flag
        sessionStorage.removeItem(SESSION_STORAGE_NONCE);
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_original_tab');
        // Ensure we stay on / (don't redirect anywhere)
        window.history.replaceState({}, "", "/");
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
            // This makes the app think it's connected even if adapter.connect() fails
            setPhantomConnectionState(true, result.publicKey);
            
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
              
              // Clean URL
              window.history.replaceState({}, "", "/");
              
              // Show message and try to close this tab
              alert("✅ Wallet connected! Closing this tab - please use the original tab.");
              
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
              
              // Clean query params from URL immediately
              window.history.replaceState({}, "", "/");
              
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
              
              // Clean query params from URL immediately
              window.history.replaceState({}, "", "/");
              
              // Trigger a state update to reflect the connection
              window.dispatchEvent(new Event('phantomConnected'));
            }
          } else {
            console.error("❌ Failed to decrypt Phantom payload - user may have cancelled");
            // Clean URL even on error
            window.history.replaceState({}, "", "/");
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
          window.history.replaceState({}, "", "/");
          // Clear any pending nonce and connecting flag
          sessionStorage.removeItem(SESSION_STORAGE_NONCE);
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_original_tab');
        }
      } else {
        // Invalid return - clean up
        console.warn("⚠️ Invalid Phantom return - missing required params");
        window.history.replaceState({}, "", "/");
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
      // Also update localStorage for consistency
      setPhantomConnectionState(true, publicKey.toString());
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

  const extractGameFromTitle = (title: string) => {
    const gameKeywords = [
      'FIFA 24', 'Madden NFL 24', 'NBA 2K25',
      'Street Fighter 6', 'Tekken 8', 'Mortal Kombat',
      'Call of Duty', 'Valorant',
      'Forza Horizon', 'UFC 25', 'EA Sports UFC 5', 'EA Sports UFC 4', 'EA Sports UFC 3',
      'EA UFC 5', 'EA UFC 4', 'EA UFC 3'
    ];
    
    for (const game of gameKeywords) {
      if (title.includes(game)) {
        return game;
      }
    }
    
    // If no specific game found, return a generic but more descriptive name
    // Check for specific versions first (most specific to least specific)
    if (title.toLowerCase().includes('nba 2k26') || title.toLowerCase().includes('nba2k26')) return 'NBA 2K26';
    if (title.toLowerCase().includes('nba 2k25') || title.toLowerCase().includes('nba2k25')) return 'NBA 2K25';
    if (title.toLowerCase().includes('ufc 25') || title.toLowerCase().includes('ufc25')) return 'UFC 25';
    if (title.toLowerCase().includes('ea sports ufc 5') || title.toLowerCase().includes('ea sports ufc5')) return 'EA Sports UFC 5';
    if (title.toLowerCase().includes('ea sports ufc 4') || title.toLowerCase().includes('ea sports ufc4')) return 'EA Sports UFC 4';
    if (title.toLowerCase().includes('ea sports ufc 3') || title.toLowerCase().includes('ea sports ufc3')) return 'EA Sports UFC 3';
    if (title.toLowerCase().includes('ea ufc 5') || title.toLowerCase().includes('eaufc5')) return 'EA UFC 5';
    if (title.toLowerCase().includes('ea ufc 4') || title.toLowerCase().includes('eaufc4')) return 'EA UFC 4';
    if (title.toLowerCase().includes('ea ufc 3') || title.toLowerCase().includes('eaufc3')) return 'EA UFC 3';
    if (title.toLowerCase().includes('fifa')) return 'FIFA 24';
    if (title.toLowerCase().includes('madden')) return 'Madden NFL 24';
    if (title.toLowerCase().includes('nba') || title.toLowerCase().includes('2k')) return 'NBA 2K26'; // Default to 2K26 for NBA games
    if (title.toLowerCase().includes('street fighter')) return 'Street Fighter 6';
    if (title.toLowerCase().includes('tekken')) return 'Tekken 8';
    if (title.toLowerCase().includes('mortal kombat')) return 'Mortal Kombat';
    if (title.toLowerCase().includes('call of duty') || title.toLowerCase().includes('cod')) return 'Call of Duty';
    if (title.toLowerCase().includes('valorant')) return 'Valorant';
    if (title.toLowerCase().includes('forza')) return 'Forza Horizon';
    if (title.toLowerCase().includes('ufc') || title.toLowerCase().includes('ea sports ufc')) return 'UFC 25'; // Default to UFC 25 for UFC games
    
    return 'Gaming'; // Fallback
  };

  // Determine category based on game
  const getGameCategory = (game: string) => {
    if (!game || game === 'Gaming' || game === 'Other/Custom') {
      return 'Sports'; // Default to Sports for unknown games
    }
    
    // Normalize game name for comparison
    const normalizedGame = game.trim();
    
    // Check for UFC games
    if (['EA Sports UFC 6', 'EA Sports UFC 5', 'EA Sports UFC 4', 'EA Sports UFC 3', 'EA UFC 6', 'EA UFC 5', 'EA UFC 4', 'EA UFC 3'].includes(normalizedGame)) return 'UFC';
    
    // Check for Football games (American football)
    if (['Madden NFL 26', 'Madden NFL 24', 'Madden NFL 23', 'Madden NFL 22', 'NFL Blitz', 'Mutant Football League', 'Retro Bowl', 'Axis Football'].includes(normalizedGame)) return 'Football';
    
    // Check for Board Games
    if (['Chess.com', 'Lichess', 'Chess Ultra', '8 Ball Pool', 'Pool Hall', 'PBA Bowling Challenge', 'Brunswick Pro Bowling', 'Checkers', 'Backgammon', 'Monopoly Plus', 'Uno', 'Scrabble'].includes(normalizedGame)) return 'BoardGames';
    
    if (['NBA 2K25', 'FIFA 24'].includes(normalizedGame)) return 'Sports';
    if (['Street Fighter 6', 'Tekken 8', 'Mortal Kombat', 'Mortal Kombat 1', 'Mortal Kombat 11'].includes(normalizedGame)) return 'Fighting';
    if (['Call of Duty', 'Valorant'].includes(normalizedGame)) return 'Shooting';
    if (['Forza Horizon', 'Gran Turismo 7', 'Forza Motorsport'].includes(normalizedGame)) return 'Racing';
    
    // Fallback: try case-insensitive matching
    const lowerGame = normalizedGame.toLowerCase();
    // Check for UFC games
    if (lowerGame.includes('ufc') || lowerGame.includes('ea sports ufc')) return 'UFC';
    
    // Check for American football games
    if (lowerGame.includes('madden') || lowerGame.includes('nfl') || lowerGame.includes('retro bowl') || lowerGame.includes('axis football') || lowerGame.includes('mutant football')) return 'Football';
    
    // Check for Board Games
    if (lowerGame.includes('chess') || lowerGame.includes('pool') || lowerGame.includes('bowling') || lowerGame.includes('checkers') || lowerGame.includes('backgammon') || lowerGame.includes('monopoly') || lowerGame.includes('uno') || lowerGame.includes('scrabble')) return 'BoardGames';
    
    if (lowerGame.includes('nba') || lowerGame.includes('fifa') || lowerGame.includes('sports')) return 'Sports';
    if (lowerGame.includes('street fighter') || lowerGame.includes('tekken') || lowerGame.includes('mortal kombat') || lowerGame.includes('guilty gear') || lowerGame.includes('fighting')) return 'Fighting';
    if (lowerGame.includes('call of duty') || lowerGame.includes('cod') || lowerGame.includes('valorant') || lowerGame.includes('shooting')) return 'Shooting';
    if (lowerGame.includes('forza') || lowerGame.includes('gran turismo') || lowerGame.includes('f1') || lowerGame.includes('mario kart') || lowerGame.includes('racing')) return 'Racing';
    
    return 'Sports'; // Default fallback to Sports
  };

  // Get game/category image based on game name - using category images from /assets/categories/
  const getGameImage = (game: string) => {
    if (!game || game === 'Gaming') {
      return '/assets/categories/basketball.png'; // Default fallback (sports.png doesn't exist)
    }
    
    // Check for specific games first (check this FIRST before category check)
    const lowerGame = game.toLowerCase().trim();
    
    // Valorant - use specific Valorant image
    if (lowerGame === 'valorant' || lowerGame.includes('valorant')) {
      return '/assets/categories/valorant.png';
    }
    
    // Fortnite - use specific Fortnite image
    if (lowerGame.includes('fortnite')) {
      return '/assets/categories/fortnite.png';
    }
    
    // UFC games - use ufc.png (EA Sports UFC, UFC)
    if (lowerGame.includes('ufc') || lowerGame.includes('ea sports ufc')) {
      return '/assets/categories/ufc.png';
    }
    
    // American Football games - use football.png (Madden, NFL, etc.) - CHECK THIS BEFORE SOCCER
    if (lowerGame.includes('madden') || 
        lowerGame.includes('nfl') ||
        lowerGame.includes('retro bowl') ||
        lowerGame.includes('axis football') ||
        lowerGame.includes('mutant football')) {
      return '/assets/categories/football.png';
    }
    
    // Basketball games - use basketball.png (NBA 2K, basketball, etc.)
    // Check for NBA 2K26 specifically first (most common)
    if (lowerGame.includes('nba 2k26') || lowerGame.includes('nba2k26')) {
      return '/assets/categories/basketball.png';
    }
    if (lowerGame.includes('nba') || 
        lowerGame.includes('2k') ||
        lowerGame.includes('basketball')) {
      return '/assets/categories/basketball.png';
    }
    
    // Soccer games - use soccer.png (FIFA, FC, EA Sports FC, etc.)
    if (lowerGame.includes('fifa') || 
        lowerGame.startsWith('fc') || 
        lowerGame.includes('fc 26') || 
        lowerGame.includes('fc26') || 
        lowerGame.includes('fc ') ||
        lowerGame.includes('ea sports fc') ||
        lowerGame.includes('soccer')) {
      return '/assets/categories/soccer.png';
    }
    
    // Street Fighter games - use tekken.png (Street Fighter 6, Street Fighter V, etc.)
    if (lowerGame.includes('street fighter')) {
      return '/assets/categories/tekken.png';
    }
    
    // Tekken games - use tekken.png (Tekken 8, Tekken 7, etc.)
    if (lowerGame.includes('tekken')) {
      return '/assets/categories/tekken.png';
    }
    
    // Mortal Kombat games - use tekken.png (Mortal Kombat 1, Mortal Kombat 11, etc.)
    if (lowerGame.includes('mortal kombat')) {
      return '/assets/categories/tekken.png';
    }
    
    // Battlefield games - use battlefield.png (Battlefield 2042, V, 1, etc.)
    if (lowerGame.includes('battlefield')) {
      return '/assets/categories/battlefield.png';
    }
    
    // GTA games - use gta.png (GTA 6, GTA V, GTA IV, etc.)
    if (lowerGame.includes('gta')) {
      return '/assets/categories/gta.png';
    }
    
    // Call of Duty games - use cod.png (COD MW3, Black Ops, Warzone, etc.)
    if (lowerGame.includes('cod') || lowerGame.includes('call of duty')) {
      return '/assets/categories/cod.png';
    }
    
    // Boxing games - use boxing.png (Undisputed, Fight Night, Creed, etc.)
    if (lowerGame.includes('boxing') || 
        lowerGame.includes('fight night') || 
        lowerGame.includes('creed') || 
        lowerGame.includes('undisputed') ||
        lowerGame.includes('esports boxing')) {
      return '/assets/categories/boxing.png';
    }
    
    // Baseball games - use baseball.png (MLB The Show, RBI Baseball, etc.)
    if (lowerGame.includes('mlb') || 
        lowerGame.includes('baseball') ||
        lowerGame.includes('the show')) {
      return '/assets/categories/baseball.png';
    }
    
    // Golf games - use golf.png (PGA Tour, The Golf Club, etc.) - EXCLUDE Mario Golf
    if ((lowerGame.includes('golf') || lowerGame.includes('pga')) && !lowerGame.includes('mario')) {
      return '/assets/categories/golf.png';
    }
    
    // Tennis games - use tennis.png (TopSpin, AO Tennis, Tennis World Tour, etc.)
    if (lowerGame.includes('tennis') || lowerGame.includes('topspin') || lowerGame.includes('matchpoint')) {
      return '/assets/categories/tennis.png';
    }
    
    // Street Basketball games - use nbastreet.png (NBA Street, Playgrounds, NBA The Run, etc.)
    if (lowerGame.includes('nba street') || 
        lowerGame.includes('playgrounds') || 
        lowerGame.includes('street hoops') ||
        lowerGame.includes('street basketball') ||
        lowerGame.includes('nba the run')) {
      return '/assets/categories/nbastreet.png';
    }
    
    // Racing games - use racing.png (Gran Turismo, Forza, F1, etc.) - EXCLUDE Mario Kart
    if (!lowerGame.includes('mario') && 
        (lowerGame.includes('forza') || 
         lowerGame.includes('gran turismo') || 
         lowerGame.includes('f1') || 
         lowerGame.includes('assetto corsa') || 
         lowerGame.includes('project cars') || 
         lowerGame.includes('iracing') || 
         lowerGame.includes('need for speed') || 
         lowerGame.includes('the crew'))) {
      return '/assets/categories/racing.png';
    }
    
    const category = getGameCategory(game);
    
    switch (category) {
      case 'UFC':
        return '/assets/categories/ufc.png';
      case 'Football':
        return '/assets/categories/football.png';
      case 'BoardGames':
        return '/assets/categories/boardgames.png';
      case 'Sports':
        return '/assets/categories/basketball.png'; // Using basketball.png (sports.png doesn't exist)
      case 'Racing':
        return '/assets/categories/racing.png';
      case 'Shooting':
        return '/assets/categories/cod.png'; // Using cod.png (shooting.png doesn't exist)
      case 'Fighting':
        return '/assets/categories/tekken.png'; // Fighting games category (Street Fighter, Tekken, Mortal Kombat)
      default:
        return '/assets/categories/basketball.png'; // Default to basketball category image (sports.png doesn't exist)
    }
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitResultModal, setShowSubmitResultModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterGame, setFilterGame] = useState<string>('All');
  const [showMyChallenges, setShowMyChallenges] = useState<boolean>(false);
  const [claimingPrize, setClaimingPrize] = useState<string | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [markingPrizeTransferred, setMarkingPrizeTransferred] = useState<string | null>(null);
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
  const [playersOnlineCount, setPlayersOnlineCount] = useState<number>(0);
  
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
  const [userLocks, setUserLocks] = useState<Record<string, string | null>>({});
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
            className={`${dimension} rounded-full object-cover border border-amber-400/40 shadow-[0_0_12px_rgba(255,215,130,0.25)]`}
          />
        );
      }
      return (
        <div
          className={`${dimension} rounded-full bg-gradient-to-br from-amber-400/30 via-orange-400/20 to-amber-300/10 border border-amber-400/40 flex items-center justify-center text-sm font-semibold text-amber-100`}
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

  const currentLockTarget = useMemo(() => {
    if (!normalizedCurrentWallet) return null;
    const rawTarget = userLocks[normalizedCurrentWallet] ?? null;
    return rawTarget ?? null;
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
      const isMyChallenge = selectedChallenge.creator === publicKey.toString() || 
                             selectedChallenge.players?.includes(publicKey.toString());
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
    const priceInterval = setInterval(fetchUsdfgPrice, 30000);
    return () => clearInterval(priceInterval);
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
  
  // Use Firestore real-time challenges
  const { challenges: firestoreChallenges, loading: challengesLoading, error: challengesError } = useChallenges();
  
  // Separate state for completed challenges with unclaimed rewards (persists even after refresh)
  const [unclaimedPrizeChallenges, setUnclaimedPrizeChallenges] = useState<any[]>([]);
  
  // Listen for completed challenges where current user won but hasn't claimed reward
  useEffect(() => {
    if (!publicKey || !isConnected) {
      setUnclaimedPrizeChallenges([]);
      return;
    }
    
    const currentWallet = publicKey.toString().toLowerCase();
    
    // Check firestoreChallenges for completed challenges with unclaimed rewards
    const unclaimed = firestoreChallenges.filter((challenge: any) => {
      const status = challenge.status || challenge.rawData?.status;
      const winner = challenge.rawData?.winner || challenge.winner;
      const prizeClaimedAt = challenge.rawData?.prizeClaimedAt || challenge.prizeClaimedAt;
      const payoutTriggered = challenge.rawData?.payoutTriggered || challenge.payoutTriggered;
      const userWon = winner && winner.toLowerCase() === currentWallet.toLowerCase();
      
      // Reward is claimed if either prizeClaimedAt exists OR payoutTriggered is true
      const isClaimed = prizeClaimedAt || payoutTriggered;
      
      return status === 'completed' && userWon && !isClaimed;
    });
    
    setUnclaimedPrizeChallenges(unclaimed);
  }, [firestoreChallenges, publicKey, isConnected]);
  
  // Calculate active challenges count from real-time data
  useEffect(() => {
    if (firestoreChallenges) {
      const activeCount = firestoreChallenges.filter((c: any) => 
        c.status === 'active' || c.status === 'pending_waiting_for_opponent' || c.status === 'creator_confirmation_required' || c.status === 'creator_funded'
      ).length;
      setActiveChallengesCount(activeCount);
    }
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
  
  // Update current user's lastActive when they connect/view the page
  useEffect(() => {
    if (publicKey) {
      const wallet = publicKey.toString();
      updatePlayerLastActive(wallet);
      
      // Update every 5 minutes while connected
      const interval = setInterval(() => {
        updatePlayerLastActive(wallet);
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [publicKey]);
  
  useEffect(() => {
    if (!publicKey) {
      return;
    }

    ensureUserLockDocument(publicKey.toString()).catch((error) => {
      console.error('❌ Failed to ensure user lock document:', error);
    });
  }, [publicKey]);
  
  // Fetch players online count
  useEffect(() => {
    const fetchPlayersOnline = async () => {
      try {
        const count = await getPlayersOnlineCount();
        setPlayersOnlineCount(count);
      } catch (error) {
        console.error('❌ Error fetching players online count:', error);
      }
    };
    fetchPlayersOnline();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPlayersOnline, 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const unsubscribe = listenToAllUserLocks((locks) => {
      setUserLocks(locks);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setLockNotificationsList([]);
      lockNotificationStatusRef.current = {};
      return;
    }

    const unsubscribe = listenToLockNotifications(publicKey.toString(), (notifications) => {
      setLockNotificationsList(notifications);
    });

    return () => unsubscribe();
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

  // Listen to challenge notifications
  useEffect(() => {
    if (!publicKey) {
      setChallengeNotificationsList([]);
      challengeNotificationStatusRef.current = {};
      return;
    }

    const unsubscribe = listenToChallengeNotifications(publicKey.toString(), (notifications) => {
      setChallengeNotificationsList(notifications);
    });

    return () => unsubscribe();
  }, [publicKey]);

  // Show toasts for new challenge notifications
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
        if (!isMounted || !stats?.displayName) {
          return;
        }
        setFriendlyMatch((previous) => {
          if (!previous || previous.opponentId !== mutualLockOpponentId) {
            return previous;
          }
          if (previous.opponentName === stats.displayName) {
            return previous;
          }
          return { ...previous, opponentName: stats.displayName };
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
    
    const currentWallet = publicKey.toString().toLowerCase();
    
    // Check for tournament challenges where user is a participant
    const myTournamentChallenges = firestoreChallenges.filter((challenge: any) => {
      const format = challenge.format || (challenge.tournament ? 'tournament' : 'standard');
      if (format !== 'tournament') return false;
      
      const players = challenge.players || [];
      const isParticipant = players.some((player: string) => 
        player.toLowerCase() === currentWallet
      );
      
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
        const currentPlayersCount = updatedChallenge.players?.length || (updatedChallenge.challenger ? 2 : 1);
        const playersArray = updatedChallenge.players || []; // Preserve actual players array

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
    
    const currentWallet = publicKey.toString().toLowerCase();
    
    // Find challenges where user is a participant and status is active/funded
    const myActiveChallenges = firestoreChallenges.filter((challenge: any) => {
      // Check players array (actual participant list) or creator
      const playersArray = challenge.players || [];
      const isParticipant = playersArray.some((player: string) => 
        player.toLowerCase() === currentWallet
      ) || challenge.creator?.toLowerCase() === currentWallet;
      
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
    
    const currentWallet = publicKey.toString().toLowerCase();
    
    const myInProgressChallenges = firestoreChallenges.filter((challenge: any) => {
      // Skip tournament challenges (handled separately above)
      const format = challenge.format || (challenge.tournament ? 'tournament' : 'standard');
      if (format === 'tournament') return false;
      
      if (challenge.status !== 'active') return false;
      
      const players = challenge.players || [];
      const isParticipant = players.some((player: string) => 
        player.toLowerCase() === currentWallet
      );
      
      return isParticipant;
    });
    
    // If there's an in-progress challenge and modal isn't already open
    if (myInProgressChallenges.length > 0 && !showSubmitResultModal && !showTrustReview && !showStandardLobby) {
      const challenge = myInProgressChallenges[0];
      
      const results = (challenge as any).results || {};
      const hasSubmitted = currentWallet && results[currentWallet];
      
      if (hasSubmitted) {
        return; // Don't auto-open if you already submitted
      }
      
      // Check if opponent already submitted a loss (making current player auto-winner)
      const players = challenge.players || [];
      const opponentWallet = players.find((p: string) => p.toLowerCase() !== currentWallet);
      const opponentResult = opponentWallet && results[opponentWallet];
      
      if (opponentResult && opponentResult.didWin === false) {
        // Opponent submitted loss - current player is automatically the winner
        // Skip result submission, go straight to review
        console.log('🎯 Opponent submitted loss - you won automatically! Going straight to review...');
        
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
      
      // Open standard lobby for active challenges only (completed challenges with rewards handled separately)
      const status = challenge.status || challenge.rawData?.status;
      if (status === 'active') {
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
  const challenges = firestoreChallenges.map(challenge => {
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
    // Use players array if available, otherwise check challenger
    const currentPlayers = challenge.players?.length || (challenge.challenger ? 2 : 1);

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
      rules: rules,
      createdAt: challenge.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      timestamp: challenge.createdAt?.toDate?.()?.getTime() || Date.now(),
      expiresAt: challenge.expiresAt?.toDate?.()?.getTime() || (Date.now() + (2 * 60 * 60 * 1000)),
      status: challenge.status,
      rawData: challenge // Keep original Firestore data for player checks and results
    };
  });
  
  // Log errors only
  if (challengesError) {
    console.error("❌ Challenges error:", challengesError);
  }

  const handleChallengePlayer = (playerData: any) => {
    const currentWallet = publicKey?.toString();
    if (!currentWallet) {
      alert("Please connect your wallet first");
      return;
    }

    // Check if user has an active challenge they created
    const userActiveChallenge = challenges.find(c => 
      c.creator === currentWallet && 
      (c.status === 'active' || c.status === 'pending_waiting_for_opponent' || c.status === 'creator_confirmation_required' || c.status === 'creator_funded')
    );

    if (userActiveChallenge) {
      // User has an active challenge, send it to this specific player
      const confirmSend = confirm(
        `Send your challenge "${userActiveChallenge.title}" to ${playerData.displayName || playerData.name}?\n\n` +
        `Game: ${userActiveChallenge.game}\n` +
        `Challenge Amount: ${userActiveChallenge.entryFee} USDFG\n` +
        `Challenge Reward: ${userActiveChallenge.prizePool} USDFG`
      );
      
      if (confirmSend) {
        // Update challenge to target this specific player and create notification
        (async () => {
          try {
            const targetWallet = playerData.address || playerData.wallet;
            if (!targetWallet) {
              alert('Could not find player wallet address');
              return;
            }

            // Update challenge with targetPlayer
            const { updateChallenge } = await import("@/lib/firebase/firestore");
            await updateChallenge(userActiveChallenge.id!, {
              targetPlayer: targetWallet,
            });

            // Get creator display name
            const creatorStats = await getPlayerStats(currentWallet);
            const creatorDisplayName = creatorStats?.displayName;

            // Get target player display name
            const targetStats = await getPlayerStats(targetWallet);
            const targetDisplayName = targetStats?.displayName;

            // Create challenge notification
            await upsertChallengeNotification({
              challengeId: userActiveChallenge.id!,
              creator: currentWallet,
              targetPlayer: targetWallet,
              creatorDisplayName,
              targetDisplayName,
              challengeTitle: userActiveChallenge.title,
              entryFee: userActiveChallenge.entryFee,
              prizePool: userActiveChallenge.prizePool,
              status: 'pending',
            });

            setNotification({
              isOpen: true,
              title: 'Challenge Sent',
              message: `Challenge sent to ${playerData.displayName || playerData.name}! They will be notified.`,
              type: 'success',
            });
        setShowPlayerProfile(false);
          } catch (error: any) {
            console.error('Failed to send challenge:', error);
            alert(`Failed to send challenge: ${error.message || 'Unknown error'}`);
          }
        })();
      }
    } else {
      // User doesn't have an active challenge, redirect to create one
      alert("You need to create a challenge first before you can send it to other players.\n\nRedirecting to challenge creation...");
      setShowPlayerProfile(false);
      setShowCreateModal(true);
    }
  };

  const handleCreateChallenge = async (challengeData: any) => {
    // Prevent double-clicks
    if (isCreatingChallenge) {
      return;
    }
    
    if (challengeData.game) {
      const category = getGameCategory(challengeData.game);
      const image = getGameImage(challengeData.game);
    }
    
    setIsCreatingChallenge(true);
    
    try {
      // Check if this is a team challenge
      const isTeamChallenge = challengeData.challengeType === 'team';
      
      // Wait for wallet state to be fully ready (especially after connecting via form)
      let attempts = 0;
      let currentWallet = publicKey?.toString() || null;
      
      // Check adapter state directly as well
      const phantomWallet = wallet.wallets.find(w => w.adapter.name === 'Phantom');
      const adapterPublicKey = phantomWallet?.adapter?.publicKey?.toString() || null;
      
      // Use adapter's publicKey if hook's publicKey isn't ready yet
      if (!currentWallet && adapterPublicKey) {
        currentWallet = adapterPublicKey;
      }
      
      // Wait up to 2 seconds for wallet state to update
      while (!currentWallet && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        currentWallet = publicKey?.toString() || phantomWallet?.adapter?.publicKey?.toString() || null;
        attempts++;
      }
      
      if (!currentWallet) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      
      // For team challenges, check if user is a team key holder
      if (isTeamChallenge) {
        const { getTeamByMember } = await import("@/lib/firebase/firestore");
        const userTeam = await getTeamByMember(currentWallet);
        
        if (!userTeam) {
          // Close create challenge modal and open team management modal
          setShowCreateModal(false);
          // Small delay to ensure modal closes before opening new one
          setTimeout(() => {
            setShowTeamModal(true);
          }, 100);
          throw new Error("You must be part of a team to create team challenges. Opening team management...");
        }
        
        if (userTeam.teamKey !== currentWallet) {
          throw new Error("Only the team key holder can create team challenges. You are a team member, not the key holder.");
        }
        
        // Use team's wallet (teamKey) for team challenges
        currentWallet = userTeam.teamKey;
      }

      const entryFeeValue = typeof challengeData.entryFee === 'string'
        ? parseFloat(challengeData.entryFee) || 0
        : challengeData.entryFee || 0;
      const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
      const isFounderChallenge = isAdmin && (entryFeeValue === 0 || entryFeeValue < 0.000000001);
      const founderChallengeCount = isFounderChallenge
        ? Math.min(25, Math.max(1, Math.floor(Number(challengeData.founderChallengeCount || 1))))
        : 1;
      const isTournament = challengeData.format === 'tournament' || challengeData.tournament;
      const founderParticipantReward = isFounderChallenge && isTournament
        ? Math.max(0, Number(challengeData.founderParticipantReward || 0))
        : 0;
      const founderWinnerBonus = isFounderChallenge && isTournament
        ? Math.max(0, Number(challengeData.founderWinnerBonus || 0))
        : 0;

      // 🔍 Check if the user already has an active challenge (as creator OR participant)
      // EXCLUDE completed, cancelled, disputed, and expired challenges
      
      // Debug: Log all user's challenges
      const allUserChallenges = challenges.filter(c => {
        const isCreator = c.creator === currentWallet;
        const isParticipant = firestoreChallenges.some(fc => 
          fc.id === c.id && 
          fc.players?.includes(currentWallet)
        );
        return isCreator || isParticipant;
      });
      // Debug: All user challenges (uncomment for debugging)
      // console.log("🔍 All user challenges:", allUserChallenges.map(c => ({ id: c.id, status: c.status, isCreator: c.creator === currentWallet, title: c.title || 'N/A' })));
      
      const existingActive = firestoreChallenges.find((fc: any) => {
        const isCreator = fc.creator === currentWallet;
        const isParticipant = fc.players?.includes(currentWallet);
        
        // Get status from Firestore data directly (most reliable)
        const status = fc.status || fc.rawData?.status || 'unknown';
        
        // Only block if status is active or in pending/funding states (NOT completed, cancelled, disputed)
        const isActive = status === 'active' || status === 'pending_waiting_for_opponent' || status === 'creator_confirmation_required' || status === 'creator_funded';
        const isCompleted = status === 'completed' || status === 'cancelled' || status === 'disputed' || status === 'expired';
        
        const shouldBlock = (isCreator || isParticipant) && isActive && !isCompleted;
        
        // Debug: Challenge found but not blocking (uncomment for debugging)
        // if ((isCreator || isParticipant) && !shouldBlock) {
        //   console.log("✅ Challenge found but not blocking:", { id: fc.id, status, isCreator, isParticipant, isActive, isCompleted });
        // }
        
        if (shouldBlock) {
          // Debug: Found blocking challenge (uncomment for debugging)
          // console.log("🚫 Found blocking challenge:", { id: fc.id, status, isCreator, isParticipant, isActive, isCompleted });
        }
        
        return shouldBlock;
      });

      if (existingActive && !isFounderChallenge) {
        const status = existingActive.status || existingActive.rawData?.status || 'unknown';
        // Debug: Blocked by active challenge
        // console.log("❌ Blocked: User already has active challenge:", existingActive.id, "Status:", status);
        alert(`You already have an active challenge (${existingActive.title || existingActive.id || existingActive.id}). Status: ${status}. Complete it before creating a new one.`);
        return;
      }

      // CRITICAL: Challenge creation is now Firestore-only - no on-chain calls
      // PDA will be created later when creator funds (in handleDirectCreatorFund)
      
      // Determine max players based on mode
      const getMaxPlayersForMode = (mode: string) => {
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
          case 'lobby':
          case 'community lobby':
          case 'open lobby':
            return 24; // Support up to 24 players for lobby mode
          case 'team vs team':
            return 4;
          default:
            return 2; // Default to 1v1
        }
      };

      const maxPlayers = challengeData.maxPlayers || getMaxPlayersForMode(challengeData.mode);

      // Check if this is a Founder Challenge (admin with 0 entry fee)
      // Ensure we have a valid wallet address
      if (!currentWallet) {
        throw new Error("Wallet address not found. Please connect your wallet first.");
      }
      
      const entryFee = entryFeeValue;
      
      // CRITICAL: No PDA creation here - PDA will be created when creator funds
      // This ensures no SOL is spent until real money movement happens
      const challengePDA = null; // PDA will be created later in creatorFund
      console.log('📝 Challenge created in Firestore only. PDA will be created when creator funds.');
      
      // Calculate reward pool
      // For Founder Challenges: admin sets reward pool manually (no platform fee)
      // For tournaments: entryFee * maxPlayers minus 5% platform fee
      // For regular challenges: 2x entry fee minus 5% platform fee
      const platformFee = 0.05; // 5% platform fee
      
      let totalPrize: number;
      if (isFounderChallenge) {
        totalPrize = isTournament ? founderWinnerBonus : (challengeData.prizePool || 0);
      } else if (isTournament) {
        // Tournament: all entry fees collected
        totalPrize = entryFee * maxPlayers;
      } else {
        // Regular 1v1 challenge: 2x entry fee
        totalPrize = entryFee * 2;
      }
      
      // Apply platform fee to all challenges except Founder Challenges
      const prizePool = isFounderChallenge 
        ? totalPrize 
        : totalPrize - (totalPrize * platformFee);
      
      
      // Create Firestore challenge data
      const { addChallenge } = await import("@/lib/firebase/firestore");
      const { Timestamp } = await import("firebase/firestore");
      
      // OPTIMIZED: Only store essential data for leaderboards
      // Generate title from challenge data
      const challengeTitle = challengeData.title || 
        `${challengeData.game || 'Game'} - ${challengeData.mode || 'Challenge'}${challengeData.username ? ` by ${challengeData.username}` : ''}`;
      
      // Calculate timers
      const now = Date.now();
      const expirationTimer = Timestamp.fromDate(new Date(now + (60 * 60 * 1000))); // 60 minutes TTL for pending challenges
      
      const initialPlayers = isFounderChallenge && isTournament ? [] : [currentWallet];

      const firestoreChallengeData = {
        creator: currentWallet,
        // challenger: undefined, // Will be set when someone expresses join intent (don't include undefined fields)
        entryFee: entryFee,
        status: 'pending_waiting_for_opponent' as const, // NEW: No payment required, waiting for opponent
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(now + (2 * 60 * 60 * 1000))), // 2 hours from now (legacy, kept for compatibility)
        expirationTimer, // TTL for pending challenges (60 minutes)
        // pendingJoiner: undefined, // Will be set when someone expresses join intent
        // creatorFundingDeadline: undefined, // Will be set when joiner expresses intent
        // joinerFundingDeadline: undefined, // Will be set when creator funds
        // fundedByCreatorAt: undefined, // Will be set when creator funds
        // fundedByJoinerAt: undefined, // Will be set when joiner funds
        // winner: undefined, // Will be set when match completes (don't include undefined fields)
        // UI fields for display
        players: initialPlayers,
        maxPlayers: challengeData.maxPlayers || maxPlayers, // Respect tournament size when provided
        format: challengeData.format || (challengeData.tournament ? 'tournament' : 'standard'),
        tournament: challengeData.format === 'tournament' ? challengeData.tournament : undefined,
        // Reward claim fields
        pda: isFounderChallenge ? null : undefined, // PDA will be created when creator funds (null for Founder Challenges)
        prizePool: prizePool, // Reward pool (for Founder Challenges, admin sets this)
        founderParticipantReward: isFounderChallenge && isTournament ? founderParticipantReward : undefined,
        founderWinnerBonus: isFounderChallenge && isTournament ? founderWinnerBonus : undefined,
        // Store only the title which contains game info - saves storage costs
        title: challengeTitle, // Generated title with game info
        // Store game name for display - players need to know which game
        game: challengeData.game || extractGameFromTitle(challengeTitle), // Store game name separately
        category: getGameCategory(challengeData.game || extractGameFromTitle(challengeTitle)), // Store category for filtering
        // Store platform for display - players need to know which platform
        platform: challengeData.platform || 'All Platforms', // Store platform for display
                 // Challenge type - solo or team
                 challengeType: isTeamChallenge ? 'team' : 'solo', // Store challenge type
                 // For team challenges: only teams can accept, or open to any challenger
                 teamOnly: isTeamChallenge ? (challengeData.teamOnly || false) : undefined, // Only set for team challenges
        // REMOVED: creatorTag, mode, rules, solanaAccountId
        // These are not needed for leaderboards and increase storage costs unnecessarily
      };
      
      // Debug: Firestore challenge data
      console.log("🔥 Adding challenge to Firestore...");
      console.log("🔥 Firestore Challenge Data:", firestoreChallengeData);
      console.log("🔥 Challenge PDA: Will be created when creator funds (no PDA at creation time)");
      
      // Validate required fields before sending
      if (!firestoreChallengeData.creator) {
        throw new Error("Creator wallet is required");
      }
      if (firestoreChallengeData.entryFee === undefined || firestoreChallengeData.entryFee === null) {
        throw new Error("Challenge amount is required");
      }
      if (!firestoreChallengeData.status) {
        throw new Error("Status is required");
      }
      
      const totalChallengesToCreate = isFounderChallenge ? founderChallengeCount : 1;
      const createdChallengeIds: string[] = [];
      for (let i = 1; i <= totalChallengesToCreate; i++) {
        const titleSuffix = totalChallengesToCreate > 1 ? ` #${i}` : '';
        const payload = {
          ...firestoreChallengeData,
          title: `${challengeTitle}${titleSuffix}`,
        };
        const createdId = await addChallenge(payload);
        createdChallengeIds.push(createdId);
      }
      // The real-time listener will automatically update the UI
      
      // Close the modal after successful creation
      setShowCreateModal(false);

      if (totalChallengesToCreate > 1) {
        alert(`✅ Created ${totalChallengesToCreate} Founder Challenges`);
      }
      
      // No balance refresh needed - no USDFG was moved (challenge creation is free)
      
    } catch (error) {
      console.error("❌ Failed to create challenge:", error);
      // Don't show alert if we're redirecting to team management (to avoid double popups)
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (!errorMessage.includes("Opening team management")) {
        alert("Failed to create challenge: " + errorMessage);
      }
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string, challenge?: any) => {
    if (window.confirm("Are you sure you want to cancel/delete this challenge? This action cannot be undone.")) {
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
            alert("Only the challenge creator can cancel this challenge.");
          } else if (challengeStatus === 'creator_confirmation_required' && !isDeadlineExpired) {
            alert("Cannot cancel: Someone has already expressed intent to join. You must either fund the challenge or wait for the timeout.");
          } else if (challengeStatus === 'creator_funded' || challengeStatus === 'active') {
            alert("Cannot cancel: Challenge is already active with funds locked.");
          } else {
            alert("This challenge cannot be cancelled in its current state.");
          }
          return;
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
        
        // Show success message
        alert("Challenge cancelled and deleted successfully!");
      } catch (error) {
        console.error("❌ Failed to delete challenge:", error);
        alert("Failed to delete challenge: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    }
  };

  const handleShareChallenge = async (challenge: any) => {
    try {
      // Create shareable URL
      const shareUrl = `${window.location.origin}/?challenge=${challenge.id}`;
      
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
          alert('Challenge link copied to clipboard! Share it with your friends!');
        } else {
          // Last resort: show share text in prompt (works everywhere)
          throw new Error('Clipboard not available');
        }
      } catch (clipboardError: any) {
        // Clipboard failed - show share text in alert as final fallback
        const shareUrl = `${window.location.origin}/?challenge=${challenge.id}`;
        const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Reward\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
        alert(`Share this challenge:\n\n${shareText}\n\n(Copy the link above)`);
      }
    } catch (error: any) {
      console.error('Error sharing challenge:', error);
      // Final fallback: show share text in alert
      const shareUrl = `${window.location.origin}/?challenge=${challenge.id}`;
      const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Reward\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
      alert(`Share this challenge:\n\n${shareText}\n\n(Copy the link above)`);
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
      alert('Please connect your wallet first');
      return false;
    }
    if (!signTransaction) {
      alert('Wallet does not support transaction signing');
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

    const shouldCreate = window.confirm(
      'Founder payouts use airdrops. You need a USDFG token account (one-time ~0.002 SOL rent). Create it now?'
    );
    if (!shouldCreate) {
      alert('You must initialize a USDFG token account to receive Founder rewards.');
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
    alert('✅ USDFG token account initialized. You can now join Founder rewards.');
    return true;
  }, [connection, signTransaction]);

  // Handle joiner express intent from ChallengeDetailSheet
  const handleDirectJoinerExpressIntent = async (challenge: any) => {
    // CRITICAL: Join intent is Firestore-only - no on-chain transaction required
    const walletAddr = publicKey?.toString() || null;
    if (!walletAddr) {
      alert('Please connect your wallet first');
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
    
    // Only prevent creator from joining if deadline hasn't expired and challenge is still waiting for creator funding
    if (isCreator && !isDeadlineExpired && status === 'creator_confirmation_required') {
      alert('You are the creator. Use the "Confirm and Fund Challenge" button instead.');
      return;
    }

    // If status is creator_funded and user is the challenger, redirect to funding flow
    if (status === 'creator_funded' && isChallenger) {
      alert('The creator has funded. Please use the "Fund Challenge" button to fund your entry and start the match.');
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
        alert('The creator has funded. Please use the "Fund Challenge" button to fund your entry.');
      } else if (status === 'creator_funded') {
        alert('This challenge is already funded by the creator. Waiting for the challenger to fund their entry.');
      } else {
        alert(`Challenge is not waiting for opponent. Current status: ${status}`);
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
          alert('⚠️ Confirmation deadline expired. The challenge will automatically revert to open status soon. Please wait a moment and try joining again.');
          setShowDetailSheet(false);
          return;
        }
        alert('✅ You have already expressed intent to join this challenge. Waiting for creator to fund.');
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
      await expressJoinIntent(challenge.id, walletAddr);
      
      // CRITICAL: Immediately update the challenge in state for instant UI update
      // This ensures creator sees the update immediately without waiting for Firestore listener
      const optimisticUpdate = {
        ...challenge,
        status: 'creator_confirmation_required',
        pendingJoiner: walletAddr,
        creatorFundingDeadline: { toMillis: () => Date.now() + (5 * 60 * 1000) }, // 5 minutes from now
        rawData: {
          ...(challenge.rawData || challenge),
          status: 'creator_confirmation_required',
          pendingJoiner: walletAddr,
          creatorFundingDeadline: { toMillis: () => Date.now() + (5 * 60 * 1000) }
        }
      };
      
      // Update selectedChallenge immediately for instant UI feedback
      setSelectedChallenge({
        id: optimisticUpdate.id,
        title: optimisticUpdate.title || extractGameFromTitle(optimisticUpdate.title || '') || "Challenge",
        ...optimisticUpdate,
        rawData: optimisticUpdate.rawData || optimisticUpdate
      });
      
      // Also update in firestoreChallenges array if it exists
      if (firestoreChallenges) {
        const updatedChallenges = firestoreChallenges.map((c: any) => 
          c.id === challenge.id ? optimisticUpdate : c
        );
        // Trigger a re-render by updating a state that depends on firestoreChallenges
        // The real-time listener will sync the actual data shortly
      }
      
      // Fetch fresh data to ensure we have the latest (real-time listener will also update)
      const updatedChallenge = await fetchChallengeById(challenge.id);
      if (updatedChallenge) {
        setSelectedChallenge({
          id: updatedChallenge.id,
          title: updatedChallenge.title || extractGameFromTitle(updatedChallenge.title || '') || "Challenge",
          ...updatedChallenge,
          rawData: updatedChallenge.rawData || updatedChallenge
        });
      }
      
      alert('✅ Join intent recorded! Creator can now fund the challenge.');
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
      console.error("❌ Express join intent failed:", err);
      const errorMessage = err.message || err.toString() || 'Failed to express join intent. Please try again.';
      alert('Failed to express join intent: ' + errorMessage);
    }
  };

  // Handle joiner funding from ChallengeDetailSheet
  const handleDirectJoinerFund = async (challenge: any) => {
    // CRITICAL: Disable button immediately on click to prevent double-submission
    if (isJoinerFunding === challenge.id) {
      return; // Already processing
    }
    
    if (!publicKey || !connection) {
      alert('Please connect your wallet first');
      return;
    }

    const { signTransaction } = wallet;
    if (!signTransaction) {
      alert('Wallet does not support transaction signing');
      return;
    }

    const currentWallet = publicKey.toString().toLowerCase();
    const challengerWallet = challenge.rawData?.challenger || challenge.challenger;
    const isChallenger = challengerWallet && challengerWallet.toLowerCase() === currentWallet;
    
    if (!isChallenger) {
      alert('Only the challenger who expressed intent can fund the challenge');
      return;
    }

    const status = getChallengeStatus(challenge);
    if (status !== 'creator_funded') {
      alert(`Challenge is not waiting for joiner funding. Current status: ${status}`);
      return;
    }

    // CRITICAL: Idempotency guard - prevent double funding
    const freshChallenge = await fetchChallengeById(challenge.id);
    if (!freshChallenge) {
      throw new Error('Challenge not found. It may have been cancelled or expired.');
    }

    if (freshChallenge.status === 'active' || freshChallenge.status === 'completed') {
      alert('✅ Challenge already funded. Status: ' + freshChallenge.status);
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
      
      alert('✅ Challenge funded successfully! Match is now active.');
    } catch (err: any) {
      console.error("❌ Joiner funding failed:", err);
      alert('Failed to fund challenge: ' + (err.message || 'Unknown error'));
    } finally {
      // CRITICAL: Always clear funding state, even on error
      setIsJoinerFunding(null);
    }
  };

  // Handle cancel/delete challenge (creator only, when deadline expired or no one joined)
  const handleCancelChallenge = async (challenge: any) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    const currentWallet = publicKey.toString().toLowerCase();
    const creatorWallet = getChallengeCreator(challenge);
    const isCreator = isChallengeCreator(challenge, currentWallet);
    
    if (!isCreator) {
      alert('Only the challenge creator can cancel the challenge');
      return;
    }

    const status = getChallengeStatus(challenge);
    const format = challenge.rawData?.format || (challenge.rawData?.tournament ? 'tournament' : 'standard');
    const isTournament = format === 'tournament';
    const tournament = challenge.rawData?.tournament;
    
    // For tournaments, allow deletion if stage is waiting_for_players
    if (isTournament) {
      if (tournament?.stage !== 'waiting_for_players') {
        alert(`Cannot cancel tournament in ${tournament?.stage || 'unknown'} stage. Only tournaments waiting for players can be cancelled.`);
        return;
      }
    } else {
      // For standard challenges, use existing logic
      const isDeadlineExpired = isCreatorFundingDeadlineExpired(challenge);
      
      // Only allow cancel if deadline expired or challenge is still pending (no one joined)
      if (status !== 'pending_waiting_for_opponent' && status !== 'creator_confirmation_required') {
        if (status === 'creator_confirmation_required' && !isDeadlineExpired) {
          alert('Cannot cancel challenge while waiting for your confirmation. Either fund the challenge or wait for the deadline to expire.');
        } else {
          alert(`Cannot cancel challenge in ${status} state. Only pending challenges can be cancelled.`);
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
      
      alert('✅ Challenge cancelled and deleted successfully.');
    } catch (err: any) {
      console.error("❌ Cancel challenge failed:", err);
      alert('Failed to cancel challenge: ' + (err.message || 'Unknown error'));
    }
  };

  // Handle direct creator funding from ChallengeDetailSheet
  const handleDirectCreatorFund = async (challenge: any) => {
    // CRITICAL: Disable button immediately on click to prevent double-submission
    if (isCreatorFunding === challenge.id) {
      return; // Already processing
    }
    
    if (!publicKey || !connection) {
      alert('Please connect your wallet first');
      return;
    }

    const { signTransaction } = wallet;
    if (!signTransaction) {
      alert('Wallet does not support transaction signing');
      return;
    }

    const currentWallet = publicKey.toString().toLowerCase();
    const creatorWallet = getChallengeCreator(challenge);
    const isCreator = isChallengeCreator(challenge, currentWallet);
    
    if (!isCreator) {
      alert('Only the challenge creator can fund the challenge');
      return;
    }

    const status = getChallengeStatus(challenge);
    if (status !== 'creator_confirmation_required') {
      alert(`Challenge is not waiting for creator funding. Current status: ${status}`);
      return;
    }

    // CRITICAL: Idempotency guard - prevent double funding
    const freshChallenge = await fetchChallengeById(challenge.id);
    if (!freshChallenge) {
      throw new Error('Challenge not found. It may have been cancelled or expired.');
    }

    if (freshChallenge.status === 'creator_funded' || freshChallenge.status === 'active') {
      alert('✅ Challenge already funded. Status: ' + freshChallenge.status);
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
          const { updateDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/config');
          await updateDoc(doc(db, 'challenges', challenge.id), {
            pda: challengePDA
          });
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
      
      alert('✅ Challenge funded successfully! Waiting for opponent to fund.');
    } catch (err: any) {
      console.error("❌ Creator funding failed:", err);
      
      const errorMessage = err.message || err.toString() || 'Failed to fund challenge. Please try again.';
      const errorString = errorMessage.toLowerCase();
      
      if (errorString.includes("confirmation expired") || 
          errorString.includes("6015") || 
          errorString.includes("0x177f") ||
          errorString.includes("deadline expired")) {
        alert('⚠️ Confirmation deadline expired. The challenge has been reverted to waiting for opponent. Please refresh the page.');
      } else {
        alert('Failed to fund challenge: ' + errorMessage);
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
                alert("This match is already completed. The tournament may have finished.");
                return;
              }
              // Check if player already submitted
              const currentWalletLower = publicKey.toString().toLowerCase();
              const isPlayer1 = match.player1?.toLowerCase() === currentWalletLower;
              const isPlayer2 = match.player2?.toLowerCase() === currentWalletLower;
              const existingResult = isPlayer1 ? match.player1Result : (isPlayer2 ? match.player2Result : undefined);
              const opponentResult = isPlayer1 ? match.player2Result : (isPlayer2 ? match.player1Result : undefined);
              const opponentSubmitted = opponentResult !== undefined;
              if (existingResult !== undefined && opponentSubmitted) {
                console.log('⚠️ Both players already submitted - preventing submit modal from opening');
                alert("Results are already submitted for this match. Waiting for bracket update...");
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
          alert("✅ Match result was already submitted. Tournament may be completed.");
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
            ? "🏆 Tournament completed! Check the bracket to see the champion."
            : (didWin 
              ? "🏆 Result submitted! Waiting for opponent to submit their result..."
              : "😔 Result submitted. Waiting for opponent to submit their result...");
          alert(message);
        } catch (error: any) {
          // If error is about already submitted/completed, just close modal
          if (error.message?.includes('already') || error.message?.includes('completed') || error.message?.includes('duplicate')) {
            console.log('⚠️ Submission prevented - match already processed');
            setShowSubmitResultModal(false);
            setTournamentMatchData(null);
            setShowTournamentLobby(true);
            alert("✅ Match result was already processed.");
          } else {
            throw error; // Re-throw other errors
          }
        }
        return;
      }
      
      // Standard challenge - proceed with trust review flow
      // Get opponent wallet - find from players array
      const playersArray = selectedChallenge.rawData?.players || (Array.isArray(selectedChallenge.players) ? selectedChallenge.players : []);
      const opponentWallet = playersArray.find((p: string) => p?.toLowerCase() !== publicKey.toBase58().toLowerCase());
      
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
        opponentWallet = playersArray.find((p: string) => p?.toLowerCase() !== publicKey.toBase58().toLowerCase());
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
      
      // Clear pending match result but keep challenge if needs claim or completed
      setPendingMatchResult(null);
      
      // Get challenge status to check if completed
      const challengeStatus = selectedChallenge?.status || selectedChallenge?.rawData?.status;
      const isCompleted = challengeStatus === 'completed';
      
      // Keep lobby open if needs claim or if challenge is completed (for reward claiming)
      if (!needsClaim && !isCompleted) {
      setSelectedChallenge(null);
        // Only close lobby if challenge is not completed
        setShowStandardLobby(false);
      } else {
        // Keep lobby open for reward claiming - ensure it's open
        if (!showStandardLobby) {
          setShowStandardLobby(true);
        }
      }
      
      // Show Victory Modal for wins, regular alert for losses
      if (didWin || autoWon) {
        // Show Victory Modal for wins
        const opponentName = opponentWallet 
          ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}`
          : undefined;
        
        setVictoryModalData({
          autoWon,
          opponentName,
          needsClaim: needsClaim || (isCompleted && didWin)
        });
        setShowVictoryModal(true);
      } else {
        // Show regular alert for losses
        let successMessage = opponentWallet 
          ? "😔 You submitted that you LOST. Trust review recorded."
          : "😔 You submitted that you LOST.";
        alert(successMessage);
      }
      
    } catch (error: any) {
      console.error("❌ Failed to submit result and trust review:", error);
      
      // If it's just a duplicate submission error, show a more friendly message
      if (error?.message?.includes('already submitted') || 
          error?.message?.includes('already been processed')) {
        alert("✅ Your result was already submitted. Trust review may not have been recorded.");
      } else if (error?.message?.includes('permission') || error?.message?.includes('Missing or insufficient permissions')) {
        // Trust review permission error - result was submitted successfully, just review failed
        console.warn("⚠️ Trust review failed due to permissions, but result was submitted successfully");
        alert("✅ Result submitted successfully. Trust review could not be saved (permission issue - this is okay, your result was recorded).");
      } else {
        alert("Failed to submit result and trust review. Please try again.");
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
      alert("Please connect your wallet first");
      return;
    }

    // CRITICAL: Set claiming state IMMEDIATELY before any async operations
    // This prevents double-clicks even if early returns happen
    setClaimingPrize(challenge.id);

    try {
      // Check if user has reviewed this challenge before allowing claim
      try {
        const hasReviewed = await hasUserReviewedChallenge(publicKey.toBase58(), challenge.id);
        
        if (!hasReviewed) {
          // User hasn't reviewed yet - show review modal first
          console.log('🎯 User tried to claim reward but hasn\'t reviewed yet - showing review modal');
          
          // Get players array - handle both rawData and challenge.players formats
          const playersArray = challenge.rawData?.players || (Array.isArray(challenge.players) ? challenge.players : []);
          const currentWallet = publicKey.toString().toLowerCase();
          const opponentWallet = Array.isArray(playersArray) ? playersArray.find((p: string) => p?.toLowerCase() !== currentWallet) : null;
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
          
          setSelectedChallenge(challenge);
          
          // Show trust review modal (must review before claiming)
          setTrustReviewOpponent(opponentName);
          setShowTrustReview(true);
          
          // Show message explaining they need to review first
          alert("📝 Please review your opponent before claiming your reward. This helps maintain USDFG integrity.");
          // Clear claiming state since we're showing modal (user will claim after review)
          setClaimingPrize(null);
          return;
        }
      } catch (error) {
        console.error('Error checking if user reviewed challenge:', error);
        // Continue with claim if check fails (allow claim but log warning)
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
              alert("This reward has already been claimed. Please refresh the page to see the latest status.");
              setClaimingPrize(null);
              // Force refresh the page to sync with on-chain state
              window.location.reload();
              return;
            }
            
            // ✅ REMOVED: Expiration check for reward claims
            // Winners can claim rewards ANYTIME after challenge completion (no expiration).
            // The dispute_timer only prevents joining expired challenges, not claiming rewards.
          }
        } catch (onChainError) {
        }
      }
      
      // Import the claimChallengePrize function
      const { claimChallengePrize } = await import("@/lib/firebase/firestore");
      
      // Call the claim function
      await claimChallengePrize(challenge.id, wallet, connection);
      
      // Immediately remove this challenge from unclaimed list (optimistic update)
      setUnclaimedPrizeChallenges(prev => 
        prev.filter(c => c.id !== challenge.id)
      );
      
      alert("🏆 Reward claimed! Check your wallet for the USDFG tokens.");
      
      // Refresh USDFG balance after successful reward claim
      setTimeout(() => {
        refreshUSDFGBalance().catch(() => {
          // Silently handle errors
        });
      }, 2000); // Wait 2 seconds for transaction to confirm
      
      // The real-time listener will update the UI automatically
      // But we've already optimistically removed it from the list above
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
                 errorMessage.includes("already processed")) {
        errorMessage = "✅ This reward has already been claimed. Please refresh the page to see the latest status.";
        // Force refresh after a delay
        setTimeout(() => window.location.reload(), 2000);
      } else if (errorMessage.includes("NotInProgress") || 
                 errorMessage.includes("not in progress")) {
        errorMessage = "❌ Challenge is not in progress. It may have already been completed or cancelled.";
      }
      
      alert("Failed to claim reward: " + errorMessage);
    } finally {
      setClaimingPrize(null);
    }
  };

  const handleFounderTournamentAirdrop = useCallback(async (
    recipients: { wallet: string; amount: number }[],
    challenge: any
  ) => {
    if (isAirdropping) {
      return;
    }
    if (!publicKey || !connection) {
      alert('Please connect your wallet first');
      return;
    }
    if (!signTransaction && !signAllTransactions) {
      alert('Wallet does not support transaction signing');
      return;
    }

    const adminWallet = publicKey.toString().toLowerCase();
    if (adminWallet !== ADMIN_WALLET.toString().toLowerCase()) {
      alert('Only the founder can send airdrops');
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
      alert('No payout recipients available.');
      return;
    }

    const totalAmount = uniqueRecipients.reduce((sum, entry) => sum + entry.amount, 0);
    const confirmed = window.confirm(
      `Send ${totalAmount} USDFG to ${uniqueRecipients.length} wallets?`
    );
    if (!confirmed) {
      return;
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
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = payer;
        transactions.push(tx);
      }

      const signedTransactions = signAllTransactions
        ? await signAllTransactions(transactions)
        : await Promise.all(transactions.map((tx) => signTransaction!(tx)));

      const signatures: string[] = [];
      for (const signedTx of signedTransactions) {
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        signatures.push(signature);
        await connection.confirmTransaction(signature, 'confirmed');
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
      }

      let message = `✅ Airdrop sent to ${sentCount} wallets (${sentTotal} USDFG).`;
      if (missingAccounts.length > 0) {
        message += `\n\nSkipped ${missingAccounts.length} wallets without USDFG accounts.`;
      }
      alert(message);
    } catch (error: any) {
      console.error('❌ Airdrop failed:', error);
      alert(`Airdrop failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAirdropping(false);
    }
  }, [isAirdropping, publicKey, connection, signTransaction, signAllTransactions]);

  // Handle marking Founder Challenge reward as transferred (admin only)
  const handleMarkPrizeTransferred = async (challenge: any) => {
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }

    // Check if user is admin
    const currentWallet = publicKey.toString().toLowerCase();
    const isAdmin = currentWallet === ADMIN_WALLET.toString().toLowerCase();
    
    if (!isAdmin) {
      alert("Only the founder can mark rewards as transferred");
      return;
    }

    // Check if this is a Founder Challenge
    const founderChallenge = isFounderChallenge(challenge);
    if (!founderChallenge) {
      alert("This function is only for Founder Challenges");
      return;
    }

    // Check if challenge is completed and has a winner
    if (challenge.status !== "completed" || !challenge.rawData?.winner) {
      alert("Challenge must be completed with a winner");
      return;
    }

      // Check if already marked as transferred
      if (challenge.rawData?.payoutTriggered) {
        alert("Reward has already been marked as transferred");
        return;
      }

    // Prevent double-clicks
    if (markingPrizeTransferred === challenge.id) {
      return;
    }

    // Prompt for amount transferred
    const amountStr = prompt("Enter the USDFG amount transferred to the winner:");
    if (!amountStr) {
      return; // User cancelled
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }

    // Optional: Prompt for transaction signature
    const txSignature = prompt("Enter the Solana transaction signature (optional, press OK to skip):") || undefined;
    if (txSignature === "") {
      // User pressed OK with empty string, treat as undefined
      var txSignatureFinal: string | undefined = undefined;
    } else {
      txSignatureFinal = txSignature || undefined;
    }

    setMarkingPrizeTransferred(challenge.id);

    try {
      // Import the function
      const { recordFounderChallengeReward } = await import("@/lib/firebase/firestore");

      // Record the reward (updates player stats and challenge document)
      await recordFounderChallengeReward(
        challenge.rawData.winner,
        challenge.id,
        amount,
        txSignatureFinal
      );

      // Refresh the USDFG Rewarded stat to show updated total
      try {
        const total = await getTotalUSDFGRewarded();
        setTotalUSDFGRewarded(total);
        console.log(`✅ Updated USDFG Rewarded stat: ${total} USDFG`);
      } catch (error) {
        console.error('❌ Error refreshing USDFG Rewarded stat:', error);
      }

      alert(`✅ Reward marked as transferred!\n\nWinner: ${challenge.rawData.winner.slice(0, 8)}...\nAmount: ${amount} USDFG\n\nTotal USDFG Rewarded: ${totalUSDFGRewarded + amount}`);
    } catch (error) {
      console.error("❌ Failed to mark reward as transferred:", error);
      alert("Failed to mark reward as transferred: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setMarkingPrizeTransferred(null);
    }
  };

  const isChallengeOwner = (challenge: any) => {
    const currentWallet = publicKey?.toString()?.toLowerCase() || null;
    const challengeCreator = challenge.creator?.toString()?.toLowerCase() || null;
    
    // Must have both wallet addresses to compare
    if (!currentWallet || !challengeCreator) {
      return false;
    }
    
    return currentWallet === challengeCreator;
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

  // Memoize filtered challenges to prevent unnecessary re-renders
  const filteredChallenges = useMemo(() => {
    const now = Date.now();
    
    return challenges.filter(challenge => {
      // Filter by category
      const categoryMatch = filterCategory === 'All' || challenge.category === filterCategory;
      // Filter by game
      const gameMatch = filterGame === 'All' || challenge.game === filterGame;
      // Filter by "My Challenges" toggle
      const myChallengesMatch = !showMyChallenges || challenge.creator === (publicKey?.toString() || null);
      
      // Check if challenge is expired (these will be deleted automatically)
      const isExpired = challenge.status === 'cancelled' || 
        (challenge.expiresAt && challenge.expiresAt < now) ||
        (challenge.rawData?.expirationTimer && challenge.rawData.expirationTimer.toMillis() < now);
      
      // Also exclude completed and disputed challenges from joinable list
      const isCompleted = challenge.status === 'completed' || challenge.status === 'disputed';
      
      // Only show joinable challenges (unless user wants to see their own challenges)
      const isJoinable = !isExpired && !isCompleted;
      
      // If showing "My Challenges", show all their challenges regardless of status
      // Otherwise, only show joinable challenges
      const shouldShow = showMyChallenges ? (categoryMatch && gameMatch && myChallengesMatch) : (categoryMatch && gameMatch && isJoinable);
      
      return shouldShow;
    });
  }, [challenges, filterCategory, filterGame, showMyChallenges, publicKey]);

  // Auto-delete expired challenges to save Firebase storage
  useEffect(() => {
    if (!challenges.length || showMyChallenges) return; // Don't delete user's own challenges
    
    const now = Date.now();
    const expiredIds: string[] = [];
    
    challenges.forEach(challenge => {
      const isExpired = challenge.status === 'cancelled' || 
        (challenge.expiresAt && challenge.expiresAt < now) ||
        (challenge.rawData?.expirationTimer && challenge.rawData.expirationTimer.toMillis() < now);
      
      if (isExpired) {
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
  const isAdminUser = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  const hasActiveChallenge = !isAdminUser && currentWallet && firestoreChallenges.some((fc: any) => {
    // Check if user created this challenge
    const isCreator = fc.creator === currentWallet;
    
    // Check if user is a participant in this challenge
    const isParticipant = fc.players?.includes(currentWallet);
    
    if (!isCreator && !isParticipant) return false; // Not relevant to this user
    
    // Get status from Firestore data directly (most reliable)
    const status = fc.status || fc.rawData?.status || 'unknown';
    
    // EXCLUDE completed, cancelled, disputed, and expired challenges
    const isActive = status === 'active' || status === 'pending' || status === 'in-progress';
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
          className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-zinc-800/60 text-amber-200 text-xs font-semibold hover:border-amber-400/50 transition-colors pointer-events-auto"
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
                matchId: createFriendlyMatchId(normalizedCurrentWallet, normalizedPlayerWallet),
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
    let buttonClass = 'px-3 py-1.5 rounded-lg border border-amber-500/30 bg-zinc-800/60 text-amber-200 text-xs font-semibold hover:border-amber-400/50 hover:bg-zinc-700/60 transition-colors pointer-events-auto';

    if (isLockedByMe) {
      label = 'Cancel Challenge';
      buttonClass = 'px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-600/20 text-red-200 text-xs font-semibold hover:bg-red-600/30 transition-colors pointer-events-auto';
    } else if (isLockedOnMe) {
      label = isPendingRequest ? 'Accept Challenge (New)' : 'Accept Challenge';
      buttonClass = 'px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-600/20 text-amber-200 text-xs font-semibold hover:bg-amber-600/30 transition-colors pointer-events-auto';
    }

    if (isPendingRequest && !isMutual) {
      buttonClass += ' shadow-[0_0_12px_rgba(255,200,0,0.45)] animate-pulse';
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
      <div className="rounded-lg bg-black/40 p-3">
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
    const imagePath = getGameImage(gameName);
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
    
    // Status pill for detail sheet
    const StatusPillDetail = ({ status, isOwner, players, capacity }: { status: string; isOwner: boolean; players: number; capacity: number }) => {
      if (status === "pending_waiting_for_opponent") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-emerald-500/20 text-emerald-200 border-emerald-500/30 ring-1 ring-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            OPEN
          </span>
        );
      }
      if (status === "active" || status === "creator_funded") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-rose-500/20 text-rose-200 border-rose-500/30 ring-1 ring-rose-400/40 shadow-[0_0_16px_rgba(244,63,94,0.35)]">
            LIVE
          </span>
        );
      }
      if (status === "creator_confirmation_required") {
        return (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-amber-500/20 text-amber-200 border-amber-500/30 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
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
          className="w-full max-h-[90vh] sm:max-h-[85%] rounded-t-2xl bg-neutral-900 overflow-hidden flex flex-col"
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
                target.src = '/assets/usdfgtoken.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-black/60 to-black/20" />
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
                    className="ml-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors"
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
                  await handleDeleteChallenge(challenge.id, challenge);
                  onClose();
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
                    if (window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) {
                      try {
                        await handleDeleteChallenge(challenge.id, challenge);
                        setShowDetailSheet(false);
                      } catch (error: any) {
                        alert('Failed to delete challenge: ' + (error.message || 'Unknown error'));
                      }
                    }
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
              <div className="mt-5 w-full rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-200 text-sm">
                <div className="font-semibold mb-1">⏰ Challenge Expired</div>
                <p className="text-xs text-amber-200/80 mb-3">
                  This challenge has expired (60 minutes) and no one has joined. It will be automatically deleted soon.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this expired challenge? This action cannot be undone.")) {
                      try {
                        await handleDeleteChallenge(challenge.id, challenge);
                        setShowDetailSheet(false);
                      } catch (error: any) {
                        alert('Failed to delete challenge: ' + (error.message || 'Unknown error'));
                      }
                    }
                  }}
                  className="w-full rounded-lg bg-amber-700/30 border border-amber-600/50 py-2 text-amber-200 text-sm font-semibold hover:bg-amber-700/40 transition-colors"
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
                  <div className="text-xs text-amber-300/80 text-center">
                    Deadline: {new Date(creatorFundingDeadline.toMillis()).toLocaleTimeString()} ({Math.max(0, Math.floor((creatorFundingDeadline.toMillis() - Date.now()) / 1000 / 60))}m remaining)
                  </div>
                )}
                <button
                  type="button"
                  className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-white font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(34,197,94,0.35)]"
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
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 py-3 text-white font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)] hidden sm:block"
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
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-green-400 to-green-500 py-3 text-white font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(34,197,94,0.35)] hidden sm:block"
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
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-500/80 to-indigo-500/80 py-3 text-white font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)]"
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
            className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10 p-4 pb-4 sm:hidden z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
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
                  await handleDeleteChallenge(challenge.id, challenge);
                  onClose();
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
                  if (window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) {
                    try {
                      await handleDeleteChallenge(challenge.id, challenge);
                      onClose();
                    } catch (error: any) {
                      alert('Failed to delete challenge: ' + (error.message || 'Unknown error'));
                    }
                  }
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
                className="w-full rounded-xl bg-amber-700/30 border border-amber-600/50 py-3 text-amber-200 font-semibold mb-2"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm("Are you sure you want to delete this expired challenge? This action cannot be undone.")) {
                    try {
                      await handleDeleteChallenge(challenge.id, challenge);
                      onClose();
                    } catch (error: any) {
                      alert('Failed to delete challenge: ' + (error.message || 'Unknown error'));
                    }
                  }
                }}
              >
                🗑️ Delete Expired Challenge
              </button>
            )}
            
            {/* Show button for creators when confirmation required - AFTER delete buttons */}
            {isOwner && canCreatorFund && onFund && (
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-white font-bold mb-2"
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
                className="w-full rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 py-3 text-white font-semibold mb-2"
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
                className="w-full rounded-xl bg-gradient-to-r from-green-400 to-green-500 py-3 text-white font-semibold mb-2"
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
        <title>USDFG Arena - Gaming Platform | USDFGAMING</title>
        <meta name="description" content="Enter the USDFG Arena - Compete in skill-based challenges, earn USDFG, and prove your gaming prowess." />
      </Helmet>

      <div className="relative min-h-screen w-full bg-[#040507] text-zinc-100 overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
        {/* Header */}
        <ElegantNavbar>
          {/* Desktop Only Buttons */}
          <div className="hidden md:flex items-center justify-center gap-3 h-10">
            <button
              onClick={() => {
                if (hasActiveChallenge) {
                  alert("You already have an active challenge (created or joined). Complete it before creating a new one.");
                  return;
                }
                if (isCreatingChallenge) {
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={hasActiveChallenge || isCreatingChallenge}
              className="flex items-center justify-center gap-2 px-4 py-2 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-amber-300/50 transition-all text-white text-sm font-semibold"
              title={hasActiveChallenge ? "You have an active challenge (created or joined)" : isCreatingChallenge ? "Creating challenge..." : "Create a new challenge"}
            >
              <span className="text-amber-300">⚡</span>
              <span className="text-white">
                {hasActiveChallenge ? "In Challenge" : isCreatingChallenge ? "Creating..." : "Create Challenge"}
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
                  className="flex items-center justify-center gap-2 px-3 py-2 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-amber-300/50 transition-all text-white text-sm font-semibold"
                  title="View or manage your team"
                >
                  <span className="text-amber-300">👥</span>
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
            />
            
          </div>

          {/* Mobile Only - Wallet */}
          <div className="flex md:hidden items-center gap-2">
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
              compact={true}
              profileAvatar={publicKey ? renderNavAvatar("sm") : undefined}
              onProfileClick={() => {
                void handleOpenProfile();
              }}
            />
          </div>
        </ElegantNavbar>

        {/* Elegant Notification */}
        <ElegantNotification
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          message={notification.message}
          title={notification.title}
          type={notification.type}
          duration={5000}
        />

        {/* Live Data Tracker */}
        <div className="container mx-auto px-4 py-2 w-full">
          <div className="flex items-center justify-between text-sm w-full">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${!challengesLoading && !challengesError ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-text-dim text-xs sm:text-sm">
                {challengesLoading ? 'Loading...' : challengesError ? 'Error' : 'Firestore Live'} • {challenges.length} active
              </span>
            </div>
            <div className="text-text-dim text-xs sm:text-sm hidden sm:block">
              Real-time sync enabled
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-2 py-1 sm:py-2 w-full">
          {/* Hero Section */}
          <div className="text-center neocore-section">
            {/* USDFG Price Ticker */}
            <div className="inline-flex items-center bg-[#07080C]/95 border border-amber-500/30 rounded-full px-2 py-1 mb-2 backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,130,0.15)] hover:shadow-[0_0_30px_rgba(255,215,130,0.25)] transition-all">
              <div className="w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-amber-300 mr-2">USDFG Price:</span>
              <span className="text-amber-400 font-semibold">{usdfgPrice.toFixed(4)} USDFG</span>
              <span className="text-xs font-semibold ml-2 animate-pulse-live">Live</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,215,130,0.3)]">
              Welcome to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">Arena</span>
            </h1>
            <p className="text-sm md:text-base max-w-2xl mx-auto neocore-body mb-4 px-4">
              Compete in skill-based challenges, earn USDFG, and prove your gaming prowess against players worldwide.
            </p>
            
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-4">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="elite-btn neocore-button px-2 sm:px-3 py-1 sm:py-1.5 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Create Challenge
                  </button>
                  <Link 
                    to="#challenges"
                    className="text-amber-300 underline underline-offset-4 hover:text-amber-200 transition-colors neocore-body text-sm sm:text-base"
                  >
                    Browse Challenges
                  </Link>
                </div>
            
            {!isConnected && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 max-w-md mx-auto">
                <p className="text-yellow-400 text-sm">
                  Connect your wallet to start competing and earning rewards!
                </p>
              </div>
            )}
            
            {/* Unclaimed Reward Notification */}
            {isConnected && unclaimedPrizeChallenges.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-400/50 rounded-xl p-4 max-w-md mx-auto mt-4 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
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
                      setSelectedChallenge({
                        id: challenge.id,
                        title: (challenge as any).title || extractGameFromTitle((challenge as any).title || '') || "Challenge",
                        ...challenge
                      });
                      setShowStandardLobby(true);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:shadow-[0_0_25px_rgba(34,197,94,0.7)]"
                  >
                    Claim Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">🏆</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">
                  {activeChallengesCount.toLocaleString()}
                </div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">Active Challenges</div>
              </div>
            </div>
            
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">👥</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">
                  {playersOnlineCount.toLocaleString()}
                </div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">Players Online</div>
              </div>
            </div>
            
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">⚡</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">
                  {totalUSDFGRewarded.toLocaleString()}
                </div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">USDFG Rewarded</div>
              </div>
            </div>
            
            {/* Win Rate Stat Box - Now with rotating ad images */}
            <AdRotationBox />
          </div>

          {/* Live Challenges Discovery Section - Category-based horizontal scrolling */}
          <div className="relative mb-6">
            {/* Header */}
            <div className="mb-5 px-4 md:px-0">
              <h1 className="text-lg md:text-2xl font-semibold text-white mb-1">Live Challenges</h1>
              <p className="text-sm text-white/55">Browse by category. Swipe left or right inside each section.</p>
                </div>
                
            {/* Helper function to map challenge categories to discovery categories */}
            {(() => {
              // Group challenges by discovery category (Sports, Fighting, FPS, Racing)
              const categorizeChallenge = (challenge: any): 'Sports' | 'Fighting' | 'FPS' | 'Racing' | null => {
                const category = challenge.category?.toUpperCase() || '';
                const game = challenge.game?.toLowerCase() || '';
                
                // Map to discovery categories
                if (category.includes('SPORTS') || category.includes('BASKETBALL') || 
                    category.includes('SOCCER') || category.includes('FOOTBALL') || 
                    category.includes('BASEBALL') || category.includes('GOLF')) {
                  return 'Sports';
                }
                // UFC should map to Fighting category for discovery
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
                if (category.includes('RACING')) {
                  return 'Racing';
                }
                return null; // Exclude uncategorized
              };

              const categoryGroups: Record<string, any[]> = {
                Sports: [],
                Fighting: [],
                FPS: [],
                Racing: []
              };

              filteredChallenges.forEach(challenge => {
                const category = categorizeChallenge(challenge);
                if (category && categoryGroups[category]) {
                  categoryGroups[category].push(challenge);
                }
              });

              // Category title colors matching prototype
              const categoryTitleClass = (title: string) => {
                if (title === 'Sports') return 'text-emerald-400';
                if (title === 'Fighting') return 'text-rose-400';
                if (title === 'FPS') return 'text-indigo-400';
                if (title === 'Racing') return 'text-amber-400';
                return 'text-white';
              };

              // Status badge component
              const StatusPill = ({ status, isOwner, players, capacity }: { status: string; isOwner: boolean; players: number; capacity: number }) => {
                if (status === "pending_waiting_for_opponent") {
                            return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-emerald-500/20 text-emerald-200 border-emerald-500/30 ring-1 ring-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                      OPEN
                              </span>
                  );
                }
                if (status === "active" || status === "creator_funded") {
                                return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-rose-500/20 text-rose-200 border-rose-500/30 ring-1 ring-rose-400/40 shadow-[0_0_16px_rgba(244,63,94,0.35)]">
                      LIVE
                                    </span>
                                );
                              }
                if (status === "creator_confirmation_required") {
                  return (
                    <span className="shrink-0 text-[11px] px-2 py-1 rounded-md border bg-amber-500/20 text-amber-200 border-amber-500/30 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
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
                // Always use challenge.game if available, otherwise extract from title
                // Normalize game name to ensure consistency, especially for NBA 2K26
                let gameName = challenge.game || extractGameFromTitle(challenge.title) || 'Gaming';
                // Ensure NBA 2K26 is recognized (handle variations like "NBA 2K26", "NBA2K26", "NBA 2K 26")
                const lowerGame = gameName.toLowerCase();
                if (lowerGame.includes('nba') && (lowerGame.includes('2k') || lowerGame.includes('2 k'))) {
                  // Check if it's specifically 2K26
                  if (lowerGame.includes('2k26') || lowerGame.includes('2k 26') || lowerGame.includes('2 k 26')) {
                    gameName = 'NBA 2K26';
                  } else if (lowerGame.includes('2k25') || lowerGame.includes('2k 25') || lowerGame.includes('2 k 25')) {
                    gameName = 'NBA 2K25';
                  } else {
                    // Default to 2K26 for any NBA 2K game without specific version
                    gameName = 'NBA 2K26';
                  }
                }
                const imagePath = getGameImage(gameName);
                const isOwner = isChallengeOwner(challenge);
                
                const status = challenge.status;
                const isOpen = status === "pending_waiting_for_opponent";
                const isLive = status === "active" || status === "creator_funded";
                const isFull = challenge.players >= challenge.capacity;

                const edgeGlow = isOpen
                  ? 'border-emerald-400/50 shadow-[0_0_18px_rgba(16,185,129,0.40)] ring-1 ring-emerald-400/20'
                  : isLive
                    ? 'border-rose-400/55 shadow-[0_0_22px_rgba(244,63,94,0.48)] ring-1 ring-rose-400/20'
                    : 'border-white/10';

                return (
                  <div className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      className={`relative text-left rounded-xl border overflow-hidden p-3 transition active:scale-[0.99] w-[176px] h-[176px] sm:w-[180px] sm:h-[180px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${edgeGlow}`}
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
                        target.src = '/assets/usdfgtoken.png';
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
                                const rawPlayers = Array.isArray(challenge.players)
                                  ? challenge.players
                                  : (typeof challenge.players === 'number' ? [] : []);
                                const creatorWallet = challenge.creator || challenge.rawData?.creator;
                                const playersCount = rawPlayers.filter((player: string) =>
                                  creatorWallet ? player?.toLowerCase() !== creatorWallet.toLowerCase() : true
                                ).length;
                                const maxPlayers = challenge.capacity || challenge.maxPlayers || 2;
                                return `${playersCount}/${maxPlayers}`;
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
                            players={challenge.players || 0} 
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
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 hover:border-amber-400/40 transition-all touch-manipulation"
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
                          <div className="text-white/70">💰 Entry</div>
                          <div className="font-semibold">{challenge.entryFee} USDFG</div>
                                        </div>
                        <div className="rounded-lg bg-black/45 p-2">
                          <div className="text-white/70">🏆 Reward</div>
                          <div className="font-semibold">{challenge.prizePool} USDFG</div>
                            </div>
                          </div>

                      <div className="flex items-center justify-between gap-2 text-[12px] text-white/80">
                        <div className="min-w-0 truncate">
                          <span className="text-white/60">👤 Creator</span>{' '}
                          <span className="font-semibold">{challenge.username || challenge.creator?.slice(0, 8) + '...'}</span>
                            </div>
                        <div className="shrink-0">
                          <span className="text-white/60">{platformIconLocal(challenge.platform)}</span>{' '}
                          <span className="font-semibold">{challenge.platform || 'All'}</span>
                          </div>
                              </div>
                                  </div>
                                </div>
                              </div>
                            );
              };

              // Render category rows
                            return (
                <>
                  {(Object.entries(categoryGroups) as Array<[string, any[]]>).map(([categoryTitle, items]) => {
                    if (items.length === 0) return null;
                    
                                return (
                      <section key={categoryTitle} className="mb-6">
                        <div className="mb-2 flex items-center justify-between px-4 md:px-0">
                          <h2 className={`text-sm font-semibold tracking-wide ${categoryTitleClass(categoryTitle)}`}>
                            {categoryTitle}
                          </h2>
                          <div className="text-xs text-white/45">Swipe</div>
                                  </div>

                        <div 
                          className="flex gap-3 overflow-x-auto pb-2 px-4 md:px-0" 
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
                                  // Don't open join modal for completed, expired, or disputed challenges
                                  const isExpired = challenge.status === 'cancelled' || 
                                    (challenge.expiresAt && challenge.expiresAt < Date.now()) ||
                                    (challenge.rawData?.expirationTimer && challenge.rawData.expirationTimer.toMillis() < Date.now());
                                  
                                  if (challenge.status === "completed" || 
                                      challenge.status === "disputed" || 
                                      challenge.rawData?.payoutTriggered ||
                                      isExpired) {
                                    return;
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
                                  
                                  // Always open lobby directly (X Spaces style) instead of detail sheet
                                  setSelectedChallenge({
                                    id: challenge.id,
                                    title: (challenge as any).title || extractGameFromTitle((challenge as any).title || '') || "Challenge",
                                    ...challenge
                                  });
                                  
                                  // Determine format and open appropriate lobby
                                  const format = challenge.rawData?.format || (challenge.rawData?.tournament ? "tournament" : "standard");
                                  const status = challenge.status || challenge.rawData?.status;
                                  
                                  // For tournament challenges, open tournament lobby
                                  if (format === "tournament") {
                                    // If standard lobby is open, close it first
                                    if (showStandardLobby) {
                                      setShowStandardLobby(false);
                                    }
                                    setShowTournamentLobby(true);
                                  } else {
                                    // For standard challenges, always open standard lobby
                                    // If tournament lobby is open, close it first
                                    if (showTournamentLobby) {
                                      setShowTournamentLobby(false);
                                    }
                                    // If lobby is already open, just update the challenge (X Spaces style)
                                    if (!showStandardLobby) {
                                      setShowStandardLobby(true);
                                    }
                                  }
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

          {/* Live Challenges Grid - Mobile First (iPhone 13 Pro optimized) */}
          <div className="mb-6 md:hidden">
            <LiveChallengesGrid challenges={challenges} />
          </div>

          {/* Arena Leaders Section */}
          <div className="relative rounded-[20px] bg-[#07080C]/95 border border-zinc-800 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.08)] mb-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent" />
              <div className="relative z-10 text-center py-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)] flex items-center justify-center">
                  <span className="mr-2">🏆</span>
                  Arena Leaders
                  <span className="ml-2 text-sm text-amber-300 font-semibold uppercase tracking-normal">
                    {leaderboardTitle}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">{leaderboardSubtitle}</p>
                
                <div className="mt-4 flex items-center justify-center gap-2 px-6">
                  <button
                    type="button"
                    onClick={() => handleLeaderboardViewChange('individual')}
                    aria-pressed={isSoloView}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      isSoloView
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black border-amber-300 shadow-[0_0_15px_rgba(255,215,130,0.35)]'
                        : 'bg-transparent text-amber-300 border-amber-400/40 hover:border-amber-300/70 hover:text-white'
                    }`}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLeaderboardViewChange('teams')}
                    aria-pressed={isTeamsView}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      isTeamsView
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black border-amber-300 shadow-[0_0_15px_rgba(255,215,130,0.35)]'
                        : 'bg-transparent text-amber-300 border-amber-400/40 hover:border-amber-300/70 hover:text-white'
                    }`}
                  >
                    Teams
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="mt-4 px-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={leaderboardSearchPlaceholder}
                      value={leaderboardSearchTerm}
                      onChange={(e) => setLeaderboardSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:border-amber-300/50 focus:outline-none transition-all text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-zinc-400 text-sm">🔍</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                
                {isLoadingLeaderboard ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                  </div>
                ) : !hasLeaderboardEntries ? (
                  <div className="text-center py-8">
                    <div className="text-zinc-400 text-sm">{leaderboardEmptyStateTitle}</div>
                    <div className="text-zinc-500 text-xs mt-2">{leaderboardEmptyStateSubtitle}</div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {(() => {
                      if (isTeamsView) {
                        const transformedTeams = topTeams.map((team, index) => ({
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
                              const matchesMember = team.members.some((member) =>
                                member.toLowerCase().includes(normalizedTerm)
                              );
                              return matchesName || matchesKey || matchesId || matchesMember;
                            });

                        if (filteredTeams.length === 0 && leaderboardSearchTerm !== '') {
                          return (
                            <div className="text-center py-8">
                              <div className="text-zinc-400 text-sm">
                                No {leaderboardEntityLabel.toLowerCase()} found matching "{leaderboardSearchTerm}"
                              </div>
                              <div className="text-zinc-500 text-xs mt-2">Try a different search term</div>
                            </div>
                          );
                        }

                        return filteredTeams.map((team) => (
                          <div
                            key={team.teamId || team.teamKey}
                            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#0B0C12]/60 transition cursor-pointer relative group ${
                              team.rank <= 3 ? "bg-gradient-to-r from-amber-300/10 to-transparent" : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPendingJoinTeamId(team.teamKey);
                              setShowTeamModal(true);
                            }}
                            style={{ zIndex: 10, position: 'relative' }}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pointer-events-none">
                              <div
                                className={`h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-base sm:text-sm font-bold border shrink-0 overflow-hidden relative ${
                                  team.rank === 1
                                    ? "border-amber-300 text-amber-300"
                                    : team.rank === 2
                                    ? "border-zinc-400 text-zinc-300"
                                    : team.rank === 3
                                    ? "border-orange-400 text-orange-300"
                                    : "border-zinc-700 text-zinc-400"
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
                                        ? "text-amber-300"
                                        : team.rank === 2
                                        ? "text-zinc-300"
                                        : team.rank === 3
                                        ? "text-orange-300"
                                        : "text-zinc-400"
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
                                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
                                  <span className="truncate">{team.name}</span>
                                  <span className="text-xs text-amber-300 shrink-0">👥 {team.membersCount} members</span>
                                  {team.rank === 1 && <span className="text-amber-300 shrink-0">👑</span>}
                                </div>
                                <div className="text-xs text-zinc-400 mt-0.5">
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
                                <div className="flex items-center gap-2 mt-2 text-xs text-amber-200 pointer-events-none">
                                  <span className="font-semibold">Total Earned:</span>
                                  <span>{team.totalEarned.toLocaleString()} USDFG</span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-4 pointer-events-none">
                              <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                                <span className="text-xs text-zinc-500">W</span>
                                <span>{team.wins}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                                <span className="text-xs text-zinc-500">L</span>
                                <span>{team.losses}</span>
                              </div>
                              <div className="flex items-center gap-1 text-amber-200 text-sm font-semibold">
                                <span className="text-xs text-zinc-500">USDFG</span>
                                <span>{team.totalEarned.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-amber-200 text-sm font-semibold">
                                <span className="text-xs text-zinc-500">Trust</span>
                                <span>{team.trust.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="flex sm:hidden items-center justify-between gap-3 mt-2 pt-2 border-t border-zinc-800/50 pointer-events-none">
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
                                <div className="text-xs text-zinc-500">USDFG</div>
                                <div className="text-sm font-bold text-amber-200">{team.totalEarned.toLocaleString()}</div>
                              </div>
                              <div className="flex flex-col items-center gap-0">
                                <div className="text-xs text-zinc-500">Trust</div>
                                <div className="text-sm font-bold text-amber-200">{team.trust.toFixed(1)}</div>
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
                      
                      // Transform live data from topPlayers
                      const transformedPlayers = topPlayers.map((player, index) => {
                        // Get country code from Firestore first (shared across all users), then fallback to localStorage
                        const playerCountryCode = player.country || getWalletScopedValue(PROFILE_STORAGE_KEYS.country, player.wallet);
                        const countryFlag = getCountryFlag(playerCountryCode);
                        
                        // Get trust score - ensure it's a number and defaults to 0 if undefined
                        const trustScore = typeof player.trustScore === 'number' ? player.trustScore : 0;
                        
                        // Removed excessive logging - only log on initial load if needed for debugging
                        
                        return {
                          rank: index + 1,
                          name: (player.displayName && player.displayName.trim()) ? player.displayName : `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`,
                          country: countryFlag, // Use player's actual country flag
                          trust: trustScore,
                          wins: player.wins,
                          losses: player.losses,
                          winRate: player.winRate || 0, // Win rate percentage
                          streak: 0, // We don't track streak yet
                          integrity: trustScore, // Use trustScore for integrity display
                          wallet: player.wallet,
                          gamesPlayed: player.gamesPlayed,
                          profileImage: player.profileImage || getWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, player.wallet), // Use Firestore image first, fallback to localStorage
                          playerStats: player // Store full PlayerStats for modal
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
                            <div className="text-zinc-400 text-sm">
                              No {leaderboardEntityLabel.toLowerCase()} found matching "{leaderboardSearchTerm}"
                            </div>
                            <div className="text-zinc-500 text-xs mt-2">
                              Try a different search term
                            </div>
                          </div>
                        );
                      }

                      return filteredPlayers.map((player) => (
                      <div
                        key={player.rank}
                        className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#0B0C12]/60 transition cursor-pointer relative group ${
                          player.rank <= 3 ? "bg-gradient-to-r from-amber-300/10 to-transparent" : ""
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
                            className={`h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-base sm:text-sm font-bold border shrink-0 overflow-hidden relative ${
                              player.rank === 1
                                ? "border-amber-300 text-amber-300"
                                : player.rank === 2
                                ? "border-zinc-400 text-zinc-300"
                                : player.rank === 3
                                ? "border-orange-400 text-orange-300"
                                : "border-zinc-700 text-zinc-400"
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
                                    ? "text-amber-300"
                                    : player.rank === 2
                                    ? "text-zinc-300"
                                    : player.rank === 3
                                    ? "text-orange-300"
                                    : "text-zinc-400"
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
                            <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
                              <span className="truncate">{player.name}</span> <span className="shrink-0">{player.country}</span>
                              {player.rank === 1 && <span className="text-amber-300 shrink-0">👑</span>}
                            </div>
                            <div className="text-xs sm:text-xs text-zinc-400 mt-0.5">Integrity {player.integrity.toFixed(1)}/10 • Streak {player.streak}</div>
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
                        <div className="flex items-center justify-between gap-3 sm:hidden mt-2 pt-2 border-t border-zinc-800/50">
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
                                        ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,215,130,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,215,130,0.8)] hover:scale-110' 
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
                              <div className="text-xs text-zinc-500">🛡️</div>
                              <div className="text-sm font-bold text-amber-200">{player.trust.toFixed(1)}</div>
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
                                        ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,215,130,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,215,130,0.8)] hover:scale-110' 
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
                          <div className="flex items-center gap-4 pointer-events-none">
                            <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                              <span className="text-xs text-zinc-500">W</span>
                              <span>{player.wins}</span>
                              </div>
                            <div className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                              <span className="text-xs text-zinc-500">L</span>
                              <span>{player.losses}</span>
                            </div>
                            <div className="flex items-center gap-1 text-cyan-400 text-sm font-semibold">
                              <span className="text-xs text-zinc-500">WR</span>
                              <span>{player.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-200 text-sm font-semibold">
                              <span>🛡️</span>
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
                    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[pulseLine_3s_ease-in-out_infinite]" />
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
                      className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-amber-400 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-amber-400 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  alert('No wallet detected. Please install Phantom or another Solana wallet.');
                }
              } catch (error: any) {
                console.error('Connection error:', error);
                if (!error.message?.includes('User rejected') && !error.message?.includes('User cancelled')) {
                  alert(`Connection failed: ${error.message || 'Unknown error'}`);
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
          <Suspense fallback={<div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
            <ElegantModal
              isOpen={showTeamModal}
              onClose={() => setShowTeamModal(false)}
              title="Team Management"
            >
              <TeamManagementModal
                currentWallet={publicKey?.toString() || null}
                onClose={() => setShowTeamModal(false)}
                onTeamUpdated={refreshTopTeams}
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
          const players = selectedChallenge.rawData?.players || [];

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
                  className="max-w-none sm:max-w-[95vw] w-full"
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
                    onOpenSubmitResult={handleOpenTournamentSubmitResult}
                    onJoinTournament={async (challengeId: string) => {
                      if (!publicKey) {
                        alert('Please connect your wallet first');
                        return;
                      }
                      const currentChallenge = selectedChallenge?.rawData || selectedChallenge;
                      const creatorWallet = currentChallenge?.creator || '';
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
                      await joinTournament(challengeId, publicKey.toString());
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
              return (
                <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
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
                    onClose={() => {
                      setShowStandardLobby(false);
                      setSelectedChallenge(null);
                    }}
                    isSubmitting={false}
                    isClaiming={claimingPrize === selectedChallenge.id}
                    isCreatorFunding={isCreatorFunding === selectedChallenge.id}
                    isJoinerFunding={isJoinerFunding === selectedChallenge.id}
                  />
                </RightSidePanel>
              )}
            </>
          );
        })()}


          {friendlyMatch && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
              <SubmitResultRoom
                isOpen={showFriendlySubmitResult}
                onClose={() => setShowFriendlySubmitResult(false)}
                challengeId={friendlyMatch.matchId}
                challengeTitle={`Friendly Match vs ${friendlyMatch.opponentName || formatWalletAddress(friendlyMatch.opponentId)}`}
                currentWallet={publicKey?.toString() || ""}
                onSubmit={handleFriendlyResultSubmit}
                isSubmitting={submittingFriendlyResult}
              />
            </Suspense>
          )}

        {/* Mobile FAB - Create Challenge - Smaller and positioned to not block content */}
        <button
          onClick={() => {
            if (hasActiveChallenge) {
              alert("You already have an active challenge (created or joined). Complete it before creating a new one.");
              return;
            }
            setShowCreateModal(true);
          }}
          disabled={hasActiveChallenge || isCreatingChallenge}
          className={`fixed bottom-20 right-4 md:hidden ${
            hasActiveChallenge || isCreatingChallenge 
              ? 'bg-gray-600/50 cursor-not-allowed' 
              : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110'
          } text-white p-3 rounded-full shadow-[0_0_20px_rgba(255,215,130,0.5)] transition-all z-30 flex items-center justify-center w-12 h-12`}
          title={hasActiveChallenge ? "You have an active challenge" : "Create Challenge"}
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
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
            profileImage: selectedPlayer.profileImage || 
              (selectedPlayer.wallet === publicKey?.toString() ? userProfileImage : undefined) ||
              (selectedPlayer.wallet !== publicKey?.toString() ? getWalletScopedValue(PROFILE_STORAGE_KEYS.profileImage, selectedPlayer.wallet) : undefined),
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
                    alert('Failed to upload profile image. Please try again.');
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
                    alert('Failed to remove profile image. Please try again.');
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
            (c.status === 'active' || c.status === 'pending')
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
                className="w-32 h-32 mx-auto animate-bounce-slow drop-shadow-[0_0_20px_rgba(255,215,130,0.6)]"
              />
              <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-300/20 animate-pulse"></div>
            </div>
            <p className="text-amber-200 text-lg leading-relaxed">
              [Hidden Description - Unlock to reveal]
            </p>
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-lg p-4">
              <h3 className="text-amber-400 font-bold text-lg mb-3">Mystery Requirement</h3>
              <p className="text-amber-200 font-bold text-2xl">
                ??? games played
              </p>
              <p className="text-amber-300 text-sm mt-2 italic">
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

// Field component for form inputs
const Field = ({ label, children, helperText }: { label: string | React.ReactNode; children: React.ReactNode; helperText?: string }) => (
  <label className="block text-sm">
    <div className="mb-1 block text-sm font-semibold text-white">{label}</div>
    {children}
    {helperText && (
      <p className="text-xs text-muted mb-2 mt-2">{helperText}</p>
    )}
  </label>
);

// Primary button component
const PrimaryButton = ({ children, onClick, disabled, className = "", type }: { 
  children: any; 
  onClick?: () => void; 
  disabled?: boolean; 
  className?: string;
  type?: "button" | "submit" | "reset";
}) => (
  <button
    type={type || "button"}
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

// Tertiary button component
const TertiaryButton = ({ children, onClick, disabled, className = "" }: { 
  children: any; 
  onClick?: () => void; 
  disabled?: boolean; 
  className?: string; 
}) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-white border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

// Create Challenge Modal Component
const CreateChallengeModal: React.FC<{ 
  onClose: () => void; 
  isConnected: boolean; 
  onConnect: () => void; 
  onCreateChallenge: (data: any) => void;
  usdfgPrice: number;
  usdfgToUsd: (amount: number) => number;
}> = ({ onClose, isConnected, onConnect, onCreateChallenge, usdfgPrice, usdfgToUsd }) => {
  const [formData, setFormData] = useState({
    game: 'NBA 2K25',
    platform: 'PS5',
    username: '',
    entryFee: 50,
    mode: 'Head-to-Head',
    customMode: '',
    rules: '',
    customRules: false,
    tournamentMaxPlayers: 8 as 4 | 8 | 16
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  // Dynamic total steps based on mode
  const totalSteps = formData.mode === 'Custom Mode' ? 3 : 2;
  const isTournamentMode = useMemo(() => {
    const mode = formData.mode || '';
    return mode.toLowerCase().includes('tournament');
  }, [formData.mode]);

  // Clear connecting state when wallet connects or disconnects
  useEffect(() => {
    if (isConnected) {
      setConnecting(false);
      // Clear any stale connecting flags
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('phantom_connecting');
      }
    }
  }, [isConnected]);

  // Also clear connecting state if it gets stuck (timeout after 15 seconds)
  useEffect(() => {
    if (connecting) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Connection timeout - clearing stuck connecting state');
        setConnecting(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('phantom_connecting');
        }
      }, 15000);
      
      return () => clearTimeout(timeout);
    }
  }, [connecting]);

  // Available games for selection
  const availableGames = [
    'NBA 2K25',
    'FIFA 24', 
    'Street Fighter 6',
    'Call of Duty',
    'Tekken 8',
    'Forza Horizon',
    'Valorant',
    'Madden NFL 24',
    'Other/Custom'
  ];

  // Platform options
  const platforms = ['PS5', 'Xbox', 'PC', 'Switch', 'Other/Custom'];
  const tournamentPlayerOptions: Array<4 | 8 | 16> = [4, 8, 16];

  // Game-specific modes - Enhanced with competitive options
  const gameModes = {
    'NBA 2K25': ['Head-to-Head (Full Game)', 'Best of 3 Series', 'Quick Match (2 Quarters)', 'Park Match (2v2/3v3)', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'FIFA 24': ['Head-to-Head (Full Match)', 'Best of 3 Series', 'Quick Match (2 Halves)', 'Squad Match (2v2)', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Street Fighter 6': ['Versus Match', 'Best of 3 Series', 'Elimination Bracket', 'First to 5', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Call of Duty': ['Duel (1v1)', 'Squad Battle (2v2)', 'Full Lobby (5v5)', 'Battle Royale', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Tekken 8': ['Versus Match', 'Best of 3 Series', 'Elimination Bracket', 'First to 5', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Forza Horizon': ['Time Trial', 'Head-to-Head Race', 'Grand Prix Series', 'Drift Challenge', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Valorant': ['Duel (1v1)', 'Squad Battle (2v2)', 'Full Lobby (5v5)', 'Tournament Bracket', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Madden NFL 24': ['Head-to-Head (Full Game)', 'Best of 3 Series', 'Quick Match (2 Quarters)', 'Squad Match (2v2)', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Other/Custom': ['Custom Challenge', 'Tournament (Bracket Mode)']
  };

  // Comprehensive preset JSON for game + mode combinations
  const challengePresets = {
    'NBA 2K25': {
      'Head-to-Head (Full Game)': {
        rules: ['Game Length: 4x6 minute quarters', 'Difficulty: All-Star', 'No duplicate teams', 'Standard NBA rules', 'Pause abuse = forfeit', 'Disconnect = forfeit unless rematch agreed']
      },
      'Best of 3 Series': {
        rules: ['First to 2 wins advances', 'Each game 4x6 minute quarters', 'Difficulty: All-Star', 'Disconnect = forfeit unless rematch agreed', 'Winner keeps team choice', 'Loser can switch teams']
      },
      'Quick Match (2 Quarters)': {
        rules: ['2 quarters only', 'Standard teams only', 'Difficulty: All-Star', 'No pause abuse', 'Disconnect = forfeit unless rematch agreed', 'Quick timeout rules apply']
      },
      'Park Match (2v2/3v3)': {
        rules: ['2v2 or 3v3 MyPlayer mode', 'No AI teammates', 'Win by 2 points', 'Disconnect = forfeit unless rematch agreed', 'Communication allowed', 'Standard park rules']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'FIFA 24': {
      'Head-to-Head (Full Match)': {
        rules: ['Match length: 6-minute halves', 'Difficulty: World Class', 'No duplicate teams', 'Draw = penalties', 'Disconnect = forfeit unless rematch agreed', 'Standard FIFA rules apply']
      },
      'Best of 3 Series': {
        rules: ['First to 2 wins advances', 'Each match 6-minute halves', 'Difficulty: World Class', 'Disconnect = forfeit unless rematch agreed', 'Winner keeps team choice', 'Loser can switch teams']
      },
      'Quick Match (2 Halves)': {
        rules: ['2 halves only', 'Standard teams only', 'Difficulty: World Class', 'No pause abuse', 'Disconnect = forfeit unless rematch agreed', 'Quick timeout rules apply']
      },
      'Squad Match (2v2)': {
        rules: ['2v2 or 3v3 format', 'Teams must be different', 'Voice chat allowed', 'Both players must agree to restart', 'Communication required', 'Standard FIFA squad rules']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Street Fighter 6': {
      'Versus Match': {
        rules: ['Best of 3 rounds per match', 'Standard character roster', 'No duplicate characters', 'Tournament legal stages only', 'Rage quit = forfeit', 'Standard round timer (99 seconds)']
      },
      'Best of 3 Series': {
        rules: ['Best of 5 matches', 'Winner keeps character', 'Loser can switch', 'Tournament legal stages', 'Standard round timer', 'No pause abuse']
      },
      'Elimination Bracket': {
        rules: ['Single elimination format', 'Best of 3 per match', 'Character lock per match', 'Tournament legal stages', 'Winner advances', 'Loser eliminated']
      },
      'First to 5': {
        rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'The winner claims the challenge reward']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Call of Duty': {
      'Duel (1v1)': {
        rules: ['First to 6 rounds wins', 'Random weapon rotation', 'No killstreaks', 'Standard gunfight maps', 'Connection issues require rematch', 'No camping allowed']
      },
      'Squad Battle (2v2)': {
        rules: ['First to 6 rounds', 'Standard loadouts only', 'Communication allowed', 'No scorestreaks', 'Team must stay together', '2v2 or 3v3 format']
      },
      'Full Lobby (5v5)': {
        rules: ['Team vs team format', '5v5 or 6v6 matches', 'Standard game modes', 'Communication allowed', 'No cheating/exploits', 'Best of 3 maps']
      },
      'Battle Royale': {
        rules: ['Last player/team standing', 'Solo or squad entry allowed', 'No teaming in solos', 'Standard BR rules', 'No stream sniping', 'Connection issues = rematch if early']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Tekken 8': {
      'Versus Match': {
        rules: ['Best of 3 rounds per match', 'All characters allowed', 'Tournament legal stages', 'No rage quitting', 'Standard round timer', 'No pause abuse']
      },
      'Best of 3 Series': {
        rules: ['Best of 5 matches', 'Character switching allowed', 'Tournament legal stages', 'Winner keeps character option', 'Standard combo rules', 'No infinite combos']
      },
      'Elimination Bracket': {
        rules: ['Single elimination tournament', 'Best of 3 per match', 'Character lock per set', 'Tournament stages only', 'Winner advances', 'Standard Tekken rules']
      },
      'First to 5': {
        rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'The winner claims the challenge reward']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Forza Horizon': {
      'Time Trial': {
        rules: ['Best single lap time wins', 'Stock vehicle restrictions', 'No collision detection', 'Track boundaries enforced', '3 attempts maximum', 'Weather conditions: clear']
      },
      'Head-to-Head Race': {
        rules: ['1v1 or small group races', 'Clean racing required', 'No ramming/griefing', 'Stock or tuned vehicles allowed', 'Best of 3 races', 'Track vote system']
      },
      'Grand Prix Series': {
        rules: ['Multi-track championship', 'Points system: 25-18-15-12-10-8-6-4-2-1', 'Clean racing enforced', 'Vehicle restrictions by class', 'Weather randomization', '5-7 race series']
      },
      'Drift Challenge': {
        rules: ['Best drift score wins', 'Stock or tuned vehicles allowed', 'No collision detection', 'Track boundaries enforced', '3 attempts maximum', 'Clean racing required']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Valorant': {
      'Duel (1v1)': {
        rules: ['First to 13 rounds wins', 'Standard competitive rules', 'No coaching mid-game', 'Agent selection standard', 'Connection issues = pause/rematch', 'Anti-cheat required']
      },
      'Squad Battle (2v2)': {
        rules: ['2v2 competitive format', 'Standard map pool', 'Agent restrictions by team agreement', 'Communication allowed', 'Standard economy rules', 'Overtime rules apply']
      },
      'Full Lobby (5v5)': {
        rules: ['Full team vs team', 'Tournament format', 'Map bans/picks allowed', 'Professional ruleset', 'Coaching allowed between maps', 'Best of 3 maps']
      },
      'Tournament Bracket': {
        rules: ['Single elimination format', 'Best of 3 maps per match', 'Map bans/picks allowed', 'Professional ruleset', 'Winner advances', 'Loser eliminated']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    },
    'Madden NFL 24': {
      'Head-to-Head (Full Game)': {
        rules: ['4x6 minute quarters', 'All-Pro difficulty', 'No duplicate teams', 'Standard NFL rules', 'No pause abuse', 'Disconnect = forfeit unless technical issue']
      },
      'Best of 3 Series': {
        rules: ['First to 2 wins advances', 'Each game 4x6 minute quarters', 'All-Pro difficulty', 'Disconnect = forfeit unless technical issue', 'Winner keeps team choice', 'Loser can switch teams']
      },
      'Quick Match (2 Quarters)': {
        rules: ['2 quarters only', 'Standard teams only', 'All-Pro difficulty', 'No pause abuse', 'Disconnect = forfeit unless technical issue', 'Quick timeout rules apply']
      },
      'Squad Match (2v2)': {
        rules: ['2v2 or 3v3 format', 'Each player controls specific positions', 'Communication required', 'Team coordination essential', 'Standard game length', 'No AI assistance']
      },
      'Custom Challenge': {
        rules: ['Add your own clear, fair, and balanced rules.', 'Unclear or unfair custom rules may be rejected.', 'Ensure both players understand the rules before starting.']
      }
    }
  };


  // Auto-fill preset based on game + mode selection
  const applyPreset = useCallback(() => {
    if (!formData.customRules && formData.game !== 'Other/Custom') {
      const preset = (challengePresets as any)[formData.game]?.[formData.mode];
      if (preset) {
        updateFormData({
          rules: preset.rules.join('\n• ')
        });
      } else if (formData.mode === 'Tournament (Bracket Mode)') {
        updateFormData({
          rules: '• Single elimination bracket\n• Winners advance automatically\n• Challenge amounts locked until tournament ends\n• Submit results with proof each round\n• Disconnects = round loss unless rematch agreed'
        });
      }
    }
  }, [formData.game, formData.mode, formData.customRules]);

  // Memoized update functions to prevent re-renders
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Provide clear explanations for each mode
  const getModeExplanation = (selectedMode: string): string => {
    switch (selectedMode) {
      case "Head-to-Head (Full Game)":
        return "Game Length: 4 × 6 minute quarters • Difficulty: All-Star • No duplicate teams • Pause abuse = forfeit.";
      case "Best of 3 Series":
        return "First to 2 wins advances • Each game 4 × 6 min quarters • Disconnect = forfeit unless rematch agreed.";
      case "Quick Match (2 Quarters)":
        return "2 quarters only • No pause abuse • Standard teams only.";
      case "Park Match (2v2/3v3)":
        return "2v2 or 3v3 MyPlayer mode • No AI teammates • Win by 2.";
      case "Tournament (Bracket Mode)":
        return "Single-elimination bracket • Choose 4/8/16 players • Winners advance until a champion remains.";
      case "Custom Challenge":
        return "Add your own rules clearly and fairly. Unclear or unfair rules may be rejected.";
      default:
        return "";
    }
  };

  // Form validation functions
  const validateStep1 = useCallback(() => {
    const errors: string[] = [];
    
    if (!formData.game || formData.game.trim() === '') {
      errors.push('Please select a game');
    }
    
    if (!formData.mode || formData.mode.trim() === '') {
      errors.push('Please select a game mode');
    }
    
    if (formData.mode === 'Custom Mode' && (!formData.customMode || formData.customMode.trim() === '')) {
      errors.push('Please enter a custom mode name');
    }
    
    if (!formData.platform || formData.platform.trim() === '') {
      errors.push('Please select a platform');
    }
    
    if (!formData.username || formData.username.trim() === '') {
      errors.push('Please enter your username/gamertag');
    }
    
    const entryFeeNum = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) : (typeof formData.entryFee === 'number' ? formData.entryFee : 0);
    const entryFeeStr = typeof formData.entryFee === 'string' ? formData.entryFee : String(formData.entryFee || '');
    
    // Check if user is admin (allow 0 entry fee for Founder Challenges)
    const isAdmin = publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    
    if (isNaN(entryFeeNum)) {
      errors.push('Challenge amount must be a valid number');
    } else if (!isAdmin && (entryFeeNum < 0.000000001 || entryFeeNum === 0)) {
      errors.push('Challenge amount must be between 0.000000001 and 1000 USDFG');
    } else if (isAdmin && entryFeeNum < 0) {
      errors.push('Challenge amount cannot be negative');
    } else if (entryFeeNum > 1000) {
      errors.push('Maximum challenge amount is 1000 USDFG');
    }
    
    // Allow 0 entry fee for admin (Founder Challenges)
    if (isAdmin && entryFeeNum === 0) {
      // Valid - no error for Founder Challenges
    }

    const isTournamentSelected = (formData.mode || '').toLowerCase().includes('tournament');
    if (isTournamentSelected) {
      const maxPlayers = Number(formData.tournamentMaxPlayers);
      if (!tournamentPlayerOptions.includes(maxPlayers as 4 | 8 | 16)) {
        errors.push('Select a valid bracket size (4, 8, or 16 players).');
      }
    }
    
    return errors;
  }, [formData]);

  const validateStep2 = useCallback(() => {
    const errors: string[] = [];
    
    if (!formData.rules || formData.rules.trim() === '') {
      errors.push('Rules cannot be empty');
    }
    
    if (formData.rules && formData.rules.trim().length < 10) {
      errors.push('Rules must be at least 10 characters long');
    }
    
    return errors;
  }, [formData.rules]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedNext(true);
    
    // Final validation before submitting
    const step1Errors = validateStep1();
    const step2Errors = validateStep2();
    const allErrors = [...step1Errors, ...step2Errors];
    
    setValidationErrors(allErrors);

    if (allErrors.length > 0) {
      return; // Don't submit if there are errors
    }
    
    // Create the challenge with tournament metadata when relevant
    const selectedMode = formData.mode || '';
    const isTournamentSelected = selectedMode.toLowerCase().includes('tournament');
    const defaultMaxPlayers = selectedMode.includes('2v2')
      ? 2
      : selectedMode.includes('3v3')
      ? 3
      : selectedMode.includes('5v5')
      ? 5
      : 2;

    const resolvedMaxPlayers = isTournamentSelected ? formData.tournamentMaxPlayers : defaultMaxPlayers;

    const challengePayload = {
      ...formData,
      maxPlayers: resolvedMaxPlayers,
      format: isTournamentSelected ? 'tournament' : 'standard',
      tournament: isTournamentSelected
        ? {
            format: 'tournament',
            maxPlayers: formData.tournamentMaxPlayers,
            currentRound: 1,
            stage: 'waiting_for_players',
            bracket: []
          }
        : undefined
    };

    onCreateChallenge(challengePayload);
    onClose();
  }, [formData, onCreateChallenge, onClose, validateStep1, validateStep2]);

  const nextStep = useCallback(() => {
    setAttemptedNext(true);
    
    if (currentStep < totalSteps) {
      let errors: string[] = [];
      
      // Validate current step before advancing
      if (currentStep === 1) {
        errors = validateStep1();
      } else if (currentStep === 2) {
        errors = validateStep2();
      }
      
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        return; // Don't advance if there are errors
      }
      
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      setAttemptedNext(false); // Reset for next step
      setValidationErrors([]); // Clear errors when advancing
      
      // Auto-apply preset when reaching Step 2 (Rules & Customization)
      // Rules are now applied based on Step 1 selections
      if (newStep === 2) {
        setTimeout(() => applyPreset(), 100);
      }
    }
  }, [currentStep, totalSteps, applyPreset, validateStep1, validateStep2]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors([]); // Clear errors when going back
      setAttemptedNext(false);
    }
  }, [currentStep]);

  // Helper function to check if a field has validation error
  const hasFieldError = useCallback((fieldName: string) => {
    if (!attemptedNext) return false;
    return validationErrors.some(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  }, [attemptedNext, validationErrors]);

  // Apply preset when component loads and when game/mode changes
  useEffect(() => {
    setTimeout(() => applyPreset(), 100);
  }, [formData.game, formData.mode, applyPreset]);

  const handleConnect = async () => {
    // Don't close modal - let user see connection progress
    setConnecting(true);
    
    try {
      // Call the parent's onConnect handler which will trigger wallet connection
      await onConnect();
      
      // Note: The useEffect above will clear connecting state when isConnected becomes true
      // But also set a fallback timeout in case the connection state doesn't update immediately
      setTimeout(() => {
        if (isConnected) {
          setConnecting(false);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Connection error:', error);
      setConnecting(false);
      
      // Clear any stale connecting flags
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('phantom_connecting');
      }
      
      // Show user-friendly error if not a user cancellation
      if (!error?.message?.includes('User rejected') && !error?.message?.includes('User cancelled')) {
        alert(`Connection failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[92vw] max-w-xl max-h-[90vh] rounded-xl border border-amber-400/20 bg-gradient-to-br from-gray-900/95 via-gray-900/95 to-black/95 backdrop-blur-md p-4 overflow-y-auto shadow-[0_0_40px_rgba(0,0,0,0.6)] shadow-amber-400/8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Create Challenge</h3>
            <p className="text-xs text-gray-400 mt-1">Step {currentStep} of {totalSteps}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i + 1 <= currentStep ? 'bg-amber-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          {currentStep === 1 && (
            <p className="text-xs text-gray-400 mt-2">
              Step 1 of {totalSteps} — {formData.mode === 'Custom Mode' ? 'Game Setup' : 'Game Setup & Configuration'}
            </p>
          )}
          {currentStep === 2 && formData.mode === 'Custom Mode' && (
            <p className="text-xs text-gray-400 mt-2">Step 2 of 3 — Rules & Customization</p>
          )}
          {currentStep === 2 && formData.mode !== 'Custom Mode' && (
            <p className="text-xs text-gray-400 mt-2">Step 2 of 2 — Review & Confirm</p>
          )}
          {currentStep === 3 && (
            <p className="text-xs text-gray-400 mt-2">Step 3 of 3 — Review & Confirm</p>
          )}
        </div>

        {!isConnected ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-gray-300">Connect your wallet to start a challenge.</p>
            <div className="mt-3">
              <PrimaryButton onClick={handleConnect} disabled={connecting}>
                {connecting ? "Connecting..." : "Connect Wallet First"}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            {/* Validation Errors Display */}
            {attemptedNext && validationErrors.length > 0 && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center text-red-400 text-sm mb-2">
                  <span className="mr-2">⚠️</span>
                  Please complete the following fields:
                </div>
                <ul className="text-red-300 text-xs space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 1: Game Setup */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Field label={<span className="flex items-center"><span className="mr-2">🎮</span>Game Selection</span>}>
                  <select 
                    value={formData.game}
                    onChange={(e) => {
                      const game = e.target.value;
                      const firstMode = gameModes[game as keyof typeof gameModes]?.[0] || 'Custom Mode';
                      updateFormData({
                        game,
                        mode: firstMode
                      });
                    }}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white mt-4 mb-4"
                  >
                    {availableGames.map(game => (
                      <option key={game} value={game}>{game}</option>
                    ))}
                  </select>
                </Field>

                <Field label="🎯 Mode Selection">
                  <select 
                    value={formData.mode}
                    onChange={(e) => {
                      updateFormData({mode: e.target.value});
                      // Trigger preset application after a short delay
                      setTimeout(() => applyPreset(), 100);
                    }}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white mt-4 mb-4"
                  >
                    {gameModes[formData.game as keyof typeof gameModes]?.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                  
                  {/* Mode Explanation */}
                  {formData.mode && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 italic leading-relaxed">
                        {getModeExplanation(formData.mode)}
                      </p>
                      <div className="h-[1px] bg-gray-700 my-3"></div>
                    </div>
                  )}
                </Field>

                {formData.mode === 'Custom Mode' && (
                  <Field label={<span>Custom Mode Name <span className="text-red-400 ml-1">*</span></span>}>
                  <input
                    type="text"
                      value={formData.customMode}
                      onChange={(e) => updateFormData({customMode: e.target.value})}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white mt-4 mb-4 ${
                        hasFieldError('custom mode') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                      }`}
                      placeholder="Enter your custom mode name..."
                      required
                  />
                </Field>
                )}

                <Field label={<span className="flex items-center"><span className="mr-2">🖥️</span>Platform</span>}>
                  <select 
                    value={formData.platform}
                    onChange={(e) => updateFormData({platform: e.target.value})}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white mt-4 mb-4"
                  >
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </Field>

                <Field label={<span className="flex items-center"><span className="mr-2">👤</span>Username / Gamertag <span className="text-red-400 ml-1">*</span></span>}>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => updateFormData({username: e.target.value})}
                    className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white mt-4 mb-4 ${
                      hasFieldError('username') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                    }`}
                    placeholder="PSN ID, Xbox Gamertag, Steam, etc."
                    required
                  />
                </Field>

                <Field label={
                  <span className="flex items-center">
                    <span className="mr-2">💰</span>Challenge Amount <span className="text-red-400 ml-1">*</span>
                    {publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase() && (
                      <span className="text-purple-400 ml-2 text-xs">🏆 (Enter 0 for Founder Challenge)</span>
                    )}
                  </span>
                }>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.entryFee || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow typing freely, including decimals
                        if (value === '') {
                          updateFormData({entryFee: '' as any});
                        } else if (value === '.') {
                          updateFormData({entryFee: '.' as any});
                        } else if (value.endsWith('.')) {
                          updateFormData({entryFee: value as any});
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            updateFormData({entryFee: numValue as any});
                          } else if (value.match(/^\d*\.?\d*$/)) {
                            // Allow partial decimal input like "0." or "0.0"
                            updateFormData({entryFee: value as any});
                          }
                        }
                      }}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white mt-4 mb-1 ${
                        hasFieldError('challenge amount') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                      }`}
                      placeholder={publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase() ? "0 for Founder Challenge" : "0.1"}
                      required
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]*\.?[0-9]*"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-2">
                      <span className="text-gray-400 text-sm">USDFG</span>
                    </div>
                  </div>
                  
                  {/* USD Conversion Display */}
                  <div className="mt-2 mb-4 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-400 text-sm">💵 USD Equivalent:</span>
                        <span className="text-white font-semibold">
{usdfgToUsd(formData.entryFee).toFixed(2)} USD
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
1 USDFG = {usdfgPrice.toFixed(4)} USD
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(() => {
                        const isAdmin = publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                        const entryFee = formData.entryFee || 0;
                        if (isAdmin && entryFee === 0) {
                          return <span className="text-purple-300">🏆 Founder Challenge - Challenge reward set manually</span>;
                        }
                        return <>Challenge reward: {(usdfgToUsd(formData.entryFee) * 2 * 0.95).toFixed(2)} USD (after 5% platform fee)</>;
                      })()}
                    </div>
                  </div>

              {isTournamentMode && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Bracket Size
                  </label>
                  <select
                    value={formData.tournamentMaxPlayers}
                    onChange={(e) =>
                      updateFormData({
                        tournamentMaxPlayers: Number(e.target.value) as 4 | 8 | 16
                      })
                    }
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400/60 focus:outline-none transition-all"
                  >
                    {tournamentPlayerOptions.map(option => (
                      <option key={option} value={option}>
                        {option} Players
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Single-elimination. Challenge reward = challenge amount × number of players.
                  </p>
                </div>
              )}
                </Field>

                <div className="flex justify-end mt-6 mb-4 sticky bottom-0 bg-[#11051E] pt-4">
                  {formData.mode === 'Custom Mode' ? (
                    <PrimaryButton onClick={nextStep} className="min-h-[44px] px-6 py-3 text-base touch-manipulation">
                      Next: Customize Rules
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton onClick={nextStep} className="min-h-[44px] px-6 py-3 text-base touch-manipulation bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400">
                      Review & Create Challenge
                    </PrimaryButton>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Rules & Customization */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Preview Selected Game & Mode */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                  <h4 className="text-white font-semibold mb-2">📋 Challenge Preview</h4>
                  <div className="text-sm text-gray-300">
                    <span className="text-amber-400">🎮 {formData.game}</span> • 
                    <span className="text-amber-300 ml-1">🎯 {formData.mode === 'Custom Mode' ? formData.customMode : formData.mode}</span> • 
                    <span className="text-green-400 ml-1">🖥️ {formData.platform}</span>
                  </div>
                </div>

                <Field label="⚖️ Rules & Regulations">
                  <div className="mb-2">
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.customRules}
                        onChange={(e) => updateFormData({customRules: e.target.checked})}
                        className="mr-2 rounded border-gray-600 bg-gray-700 text-amber-400 focus:ring-amber-400"
                      />
                      Custom Rules (override presets)
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.customRules 
                        ? "Write your own rules to customize the challenge experience." 
                        : "Professional rules are auto-generated based on your game and mode selection."
                      }
                    </p>
                  </div>
                  <textarea
                    value={formData.rules}
                    onChange={(e) => updateFormData({rules: e.target.value})}
                    className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white h-40 resize-none mt-2 mb-4 ${
                      hasFieldError('rules') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                    }`}
                    placeholder={formData.customRules ? "Enter your custom rules..." : "Rules auto-fill based on game and mode selection..."}
                    readOnly={!formData.customRules && formData.game !== 'Other/Custom'}
                    required
                  />
                </Field>

                {!formData.customRules && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-center text-amber-300 text-sm mb-1">
                      <span className="mr-2">ℹ️</span>
                      Professional Rules Applied
                    </div>
                    <p className="text-xs text-gray-400">
                      These rules are automatically generated based on competitive standards for {formData.game} {formData.mode} matches.
                    </p>
                  </div>
                )}

                <div className="flex justify-between mt-6 mb-4 sticky bottom-0 bg-[#11051E] pt-4">
                  <TertiaryButton onClick={prevStep} className="min-h-[44px] px-6 py-3 text-base touch-manipulation">Back</TertiaryButton>
                  {formData.mode === 'Custom Mode' ? (
                    <PrimaryButton onClick={nextStep} className="min-h-[44px] px-6 py-3 text-base touch-manipulation">Review & Create</PrimaryButton>
                  ) : (
                    <PrimaryButton type="submit" className="min-h-[44px] px-6 py-3 text-base touch-manipulation bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400">
                      Create Challenge
                    </PrimaryButton>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">📋</span>Challenge Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-400">🎮 Game + Platform:</span>
                      <span className="text-white font-semibold">{formData.game} ({formData.platform})</span>
                      </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-400">👤 Host Username:</span>
                      <span className="text-white font-semibold">{formData.username}</span>
                      </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-400">💰 Challenge Amount:</span>
                      <div className="text-right">
                        {(() => {
                          const isAdmin = publicKey && publicKey.toString().toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                          const entryFee = formData.entryFee || 0;
                          if (isAdmin && entryFee === 0) {
                            return (
                              <>
                                <span className="text-green-400 font-bold">FREE</span>
                                <div className="text-xs text-purple-300">🏆 Founder Challenge</div>
                              </>
                            );
                          }
                          return (
                            <>
                        <span className="text-amber-400 font-bold">{formData.entryFee} USDFG</span>
                        <div className="text-xs text-gray-400">{usdfgToUsd(formData.entryFee).toFixed(2)} USD</div>
                            </>
                          );
                        })()}
                      </div>
                      </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-400">🎯 Selected Mode:</span>
                      <span className="text-white font-semibold">
                        {formData.mode === 'Custom Mode' ? formData.customMode : formData.mode}
                      </span>
                  </div>
                </div>

                  <div className="mt-4">
                    <h4 className="text-white font-semibold mb-2">⚖️ Rules List:</h4>
                    <div className="bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap">{formData.rules}</pre>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <TertiaryButton onClick={prevStep}>Back</TertiaryButton>
                  <PrimaryButton type="submit" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400">
                    Create Challenge
                  </PrimaryButton>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};


// JoinChallengeModal REMOVED - functionality moved to ChallengeDetailSheet with direct handlers


// Profile Settings Modal Component
const ProfileSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentGamerTag: string;
  onSave: (gamerTag: string) => void;
}> = ({ isOpen, onClose, currentGamerTag, onSave }) => {
  const [gamerTag, setGamerTag] = useState(currentGamerTag);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!gamerTag.trim()) {
      alert('Please enter a gamer tag');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(gamerTag.trim());
      onClose();
    } catch (error) {
      console.error('Error saving gamer tag:', error);
      alert('Error saving gamer tag. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-[#07080C]/95 p-4 shadow-[0_0_40px_rgba(255,215,130,0.06)]">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.25)]">
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
                className="w-full p-3 bg-[#0B0C12]/90 border border-zinc-800 rounded-2xl text-white placeholder-zinc-400 hover:border-amber-300/50 focus:border-amber-300/70 focus:outline-none transition-all"
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-300 to-yellow-200 hover:from-amber-200 hover:to-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-xl transition-all"
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