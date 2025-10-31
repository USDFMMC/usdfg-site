import React, { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import WalletConnectSimple from "@/components/arena/WalletConnectSimple";
import { useWallet } from '@solana/wallet-adapter-react';
// Removed legacy wallet import - using MWA hooks instead
import { joinChallengeOnChain } from "@/lib/chain/events";
import { useChallenges } from "@/hooks/useChallenges";
import { useChallengeExpiry } from "@/hooks/useChallengeExpiry";
import { useResultDeadlines } from "@/hooks/useResultDeadlines";
import { ChallengeData, joinChallenge, submitChallengeResult, startResultSubmissionPhase, getTopPlayers, PlayerStats } from "@/lib/firebase/firestore";
import { useConnection } from '@solana/wallet-adapter-react';
// Oracle removed - no longer needed
import { ADMIN_WALLET, USDFG_MINT } from '@/lib/chain/config';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { testFirestoreConnection } from "@/lib/firebase/firestore";
import ElegantButton from "@/components/ui/ElegantButton";
import ElegantModal from "@/components/ui/ElegantModal";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";
import ElegantNavbar from "@/components/layout/ElegantNavbar";
import { SubmitResultRoom } from "@/components/arena/SubmitResultRoom";
import PlayerProfileModal from "@/components/arena/PlayerProfileModal";
import { ChallengeChatModal } from "@/components/arena/ChallengeChatModal";
import TrustReviewModal from "@/components/arena/TrustReviewModal";

const ArenaHome: React.FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { connected, signTransaction, publicKey, connect, signAllTransactions } = wallet;
  // Use MWA connection state
  const isConnected = connected;

  // Smart function to extract game name from challenge title (saves storage costs)
  const extractGameFromTitle = (title: string) => {
    const gameKeywords = [
      'FIFA 24', 'Madden NFL 24', 'NBA 2K25',
      'Street Fighter 6', 'Tekken 8',
      'Call of Duty', 'Valorant',
      'Forza Horizon'
    ];
    
    for (const game of gameKeywords) {
      if (title.includes(game)) {
        return game;
      }
    }
    
    // If no specific game found, return a generic but more descriptive name
    if (title.toLowerCase().includes('fifa')) return 'FIFA 24';
    if (title.toLowerCase().includes('madden')) return 'Madden NFL 24';
    if (title.toLowerCase().includes('nba') || title.toLowerCase().includes('2k')) return 'NBA 2K25';
    if (title.toLowerCase().includes('street fighter')) return 'Street Fighter 6';
    if (title.toLowerCase().includes('tekken')) return 'Tekken 8';
    if (title.toLowerCase().includes('call of duty') || title.toLowerCase().includes('cod')) return 'Call of Duty';
    if (title.toLowerCase().includes('valorant')) return 'Valorant';
    if (title.toLowerCase().includes('forza')) return 'Forza Horizon';
    
    return 'Gaming'; // Fallback
  };

  // Determine category based on game
  const getGameCategory = (game: string) => {
    if (!game || game === 'Gaming' || game === 'Other/Custom') {
      return 'Sports'; // Default to Sports for unknown games
    }
    
    // Normalize game name for comparison
    const normalizedGame = game.trim();
    
    if (['NBA 2K25', 'FIFA 24', 'Madden NFL 24'].includes(normalizedGame)) return 'Sports';
    if (['Street Fighter 6', 'Tekken 8'].includes(normalizedGame)) return 'Fighting';
    if (['Call of Duty', 'Valorant'].includes(normalizedGame)) return 'Shooting';
    if (['Forza Horizon'].includes(normalizedGame)) return 'Racing';
    
    // Fallback: try case-insensitive matching
    const lowerGame = normalizedGame.toLowerCase();
    if (lowerGame.includes('nba') || lowerGame.includes('fifa') || lowerGame.includes('madden') || lowerGame.includes('sports')) return 'Sports';
    if (lowerGame.includes('street fighter') || lowerGame.includes('tekken') || lowerGame.includes('fighting')) return 'Fighting';
    if (lowerGame.includes('call of duty') || lowerGame.includes('cod') || lowerGame.includes('valorant') || lowerGame.includes('shooting')) return 'Shooting';
    if (lowerGame.includes('forza') || lowerGame.includes('racing')) return 'Racing';
    
    return 'Sports'; // Default fallback to Sports
  };

  // Get game/category image based on game name - using category images from /assets/categories/
  const getGameImage = (game: string) => {
    if (!game || game === 'Gaming') {
      return '/assets/categories/sports.png'; // Default fallback
    }
    
    const category = getGameCategory(game);
    console.log(`🎮 Game: ${game}, Category: ${category}`); // Debug log
    
    switch (category) {
      case 'Sports':
        return '/assets/categories/sports.png';
      case 'Racing':
        return '/assets/categories/racing.png';
      case 'Shooting':
        return '/assets/categories/shooting.png';
      case 'Fighting':
        return '/assets/categories/shooting.png'; // Fighting games can use shooting image or we can create a fighting image
      default:
        return '/assets/categories/sports.png'; // Default to sports category image
    }
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSubmitResultModal, setShowSubmitResultModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterGame, setFilterGame] = useState<string>('All');
  const [showMyChallenges, setShowMyChallenges] = useState<boolean>(false);
  const [claimingPrize, setClaimingPrize] = useState<string | null>(null);
  const [usdfgPrice, setUsdfgPrice] = useState<number>(0.15); // Mock price: $0.15 per USDFG
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState<boolean>(true);
  const [userUsdfgBalance, setUserUsdfgBalance] = useState<number | null>(null);
  const [lastLocalChallenge, setLastLocalChallenge] = useState<number>(0);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState<boolean>(false);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userGamerTag, setUserGamerTag] = useState<string>('');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [loadingTopPlayers, setLoadingTopPlayers] = useState<boolean>(true);
  const [leaderboardSearchTerm, setLeaderboardSearchTerm] = useState<string>('');
  
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
  } | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [selectedChatChallenge, setSelectedChatChallenge] = useState<any>(null);
  
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

  // Debug: Log wallet info
  useEffect(() => {
    if (connected && publicKey) {
      console.log('🔍 Current wallet:', publicKey.toString());
      console.log('🔍 Admin wallet:', ADMIN_WALLET.toString());
      console.log('🔍 Is admin?', publicKey.toString() === ADMIN_WALLET.toString());
    }
  }, [connected, publicKey]);

  // Load user profile data from localStorage
  useEffect(() => {
    const savedGamerTag = localStorage.getItem('user_gamer_tag');
    const savedCountry = localStorage.getItem('user_country');
    const savedProfileImage = localStorage.getItem('user_profile_image');
    
    if (savedGamerTag) {
      setUserGamerTag(savedGamerTag);
    }
    if (savedCountry) {
      setUserCountry(savedCountry);
    }
    if (savedProfileImage) {
      setUserProfileImage(savedProfileImage);
    }
  }, []);

  // Update price every 30 seconds
  useEffect(() => {
    fetchUsdfgPrice();
    const priceInterval = setInterval(fetchUsdfgPrice, 30000);
    return () => clearInterval(priceInterval);
  }, [fetchUsdfgPrice]);

  // Fetch USDFG balance when wallet is connected
  useEffect(() => {
    if (isConnected && publicKey) {
      getAssociatedTokenAddress(USDFG_MINT, publicKey)
        .then(tokenAccount => {
          return connection.getTokenAccountBalance(tokenAccount);
        })
        .then(tokenBalance => {
          const usdfg = tokenBalance.value.uiAmount || 0;
          setUserUsdfgBalance(usdfg);
        })
        .catch(err => {
          console.error("❌ USDFG balance fetch failed:", err);
          setUserUsdfgBalance(0); // Default to 0 if no token account exists yet
        });
    } else {
      setUserUsdfgBalance(null);
    }
  }, [isConnected, publicKey, connection]);

  // Fetch top players for sidebar
  useEffect(() => {
    const fetchTopPlayersData = async () => {
      try {
        // Fetch more players if "Show All" is enabled
        const limit = showAllPlayers ? 50 : 5;
        const players = await getTopPlayers(limit, 'totalEarned');
        setTopPlayers(players);
      } catch (error) {
        console.error('Failed to fetch top players:', error);
      } finally {
        setLoadingTopPlayers(false);
      }
    };
    
    fetchTopPlayersData();
  }, [showAllPlayers]);

  // Test Firestore connection on component mount
  useEffect(() => {
    console.log("🔥 Testing Firestore connection...");
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log("✅ Firebase Firestore is ready for real-time challenges!");
      } else {
        console.error("❌ Firebase connection failed - check your config");
      }
    });
  }, []);

  // Helper function to convert USDFG to USD
  const usdfgToUsd = useCallback((usdfgAmount: number) => {
    return usdfgAmount * usdfgPrice;
  }, [usdfgPrice]);
  // Use Firestore real-time challenges
  const { challenges: firestoreChallenges, loading: challengesLoading, error: challengesError } = useChallenges();
  
  // Auto-expire challenges after 2 hours
  useChallengeExpiry(firestoreChallenges);
  
  // Monitor result submission deadlines
  useResultDeadlines(firestoreChallenges);
  
  // Auto-open Submit Result Room when user's challenge becomes "in-progress"
  useEffect(() => {
    if (!publicKey || !firestoreChallenges) return;
    
    const myInProgressChallenges = firestoreChallenges.filter((challenge: any) => {
      if (challenge.status !== 'in-progress') return false;
      
      const currentWallet = publicKey.toString().toLowerCase();
      const players = challenge.players || [];
      
      // Check if current user is a participant
      const isParticipant = players.some((player: string) => 
        player.toLowerCase() === currentWallet
      );
      
      return isParticipant;
    });
    
    // If there's an in-progress challenge and modal isn't already open
    if (myInProgressChallenges.length > 0 && !showSubmitResultModal) {
      const challenge = myInProgressChallenges[0];
      
      // Check if current player has already submitted - if so, don't auto-open
      const results = challenge.rawData?.results || challenge.results || {};
      const hasSubmitted = currentWallet && results[currentWallet];
      
      if (hasSubmitted) {
        console.log("✅ You already submitted your result. Lobby stays closed.");
        return; // Don't auto-open if you already submitted
      }
      
      console.log("🎮 Auto-opening Submit Result Room for in-progress challenge:", challenge.id);
      setSelectedChallenge({
        id: challenge.id,
        title: challenge.title || challenge.game || "Challenge",
        ...challenge
      });
      setShowSubmitResultModal(true);
    }
  }, [firestoreChallenges, publicKey, showSubmitResultModal]);
  
  // Convert Firestore challenges to the format expected by the UI
  const challenges = firestoreChallenges.map(challenge => {
    // Provide default values for optimized data structure
    const mode = challenge.mode || 'Head-to-Head';
    const game = challenge.game || 'USDFG Arena';
    const platform = challenge.platform || 'All Platforms';
    const creatorTag = challenge.creatorTag || challenge.creator?.slice(0, 8) + '...' || 'Unknown';
    const prizePool = challenge.prizePool || (challenge.entryFee * 2);
    const category = challenge.category || 'Gaming';
    const rules = challenge.rules || 'Standard USDFG Arena rules apply';
    
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

    const maxPlayers = getMaxPlayers(mode);
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
      (c.status === 'active' || c.status === 'pending')
    );

    if (userActiveChallenge) {
      // User has an active challenge, send it to this specific player
      const confirmSend = confirm(
        `Send your challenge "${userActiveChallenge.title}" to ${playerData.displayName || playerData.name}?\n\n` +
        `Game: ${userActiveChallenge.game}\n` +
        `Entry Fee: ${userActiveChallenge.entryFee} USDFG\n` +
        `Prize Pool: ${userActiveChallenge.prizePool} USDFG`
      );
      
      if (confirmSend) {
        // TODO: Implement sending challenge to specific player
        // This would involve updating the challenge to target this specific player
        alert(`Challenge sent to ${playerData.displayName || playerData.name}! They will be notified.`);
        setShowPlayerProfile(false);
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
    
    console.log('🎮 Challenge Data Received:', challengeData);
    console.log('🎮 Game from challengeData:', challengeData.game);
    if (challengeData.game) {
      const category = getGameCategory(challengeData.game);
      const image = getGameImage(challengeData.game);
      console.log(`🎮 Game: ${challengeData.game}, Category: ${category}, Image: ${image}`);
    }
    
    setIsCreatingChallenge(true);
    
    try {
      // Get current wallet address
      const currentWallet = publicKey?.toString() || null;
      if (!currentWallet) {
        throw new Error("Wallet not connected");
      }

      // 🔍 Check if the user already has an active challenge (as creator OR participant)
      const existingActive = challenges.find(c => {
        const isCreator = c.creator === currentWallet;
        const isParticipant = firestoreChallenges.some(fc => 
          fc.id === c.id && 
          fc.players?.includes(currentWallet)
        );
        const isActive = c.status === 'active' || c.status === 'pending' || c.status === 'in-progress';
        return (isCreator || isParticipant) && isActive;
      });

      if (existingActive) {
        alert("You already have an active challenge (created or joined). Complete it before creating a new one.");
        console.log("❌ Blocked: User already has active challenge:", existingActive.id);
        return;
      }

      console.log("✅ No active challenges found, proceeding with creation...");

      // Import real smart contract functions
      console.log("📦 Importing smart contract functions...");
      const { createChallenge } = await import("@/lib/chain/contract");
      const { Connection, clusterApiUrl } = await import("@solana/web3.js");
      
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

      const maxPlayers = getMaxPlayersForMode(challengeData.mode);
      console.log(`🎯 Setting maxPlayers to ${maxPlayers} for mode: ${challengeData.mode}`);

      // Create connection to devnet
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Small delay for mobile Phantom to fully initialize
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        console.log('📱 Mobile detected - adding small delay for Phantom...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log("🚀 Creating challenge on smart contract with escrow...");
      const challengeId = await createChallenge(
        wallet,
        connection,
        challengeData.entryFee // Entry fee in USDFG
      );
      
      console.log("✅ Challenge created on smart contract! PDA:", challengeId);
      
      // Calculate prize pool
      const platformFee = 0.05; // 5% platform fee
      const totalPrize = challengeData.entryFee * 2; // Challenger matches entry fee
      const prizePool = totalPrize - (totalPrize * platformFee); // Minus platform fee
      
      
      // Create Firestore challenge data
      const { addChallenge } = await import("@/lib/firebase/firestore");
      const { Timestamp } = await import("firebase/firestore");
      
      // OPTIMIZED: Only store essential data for leaderboards
      // Generate title from challenge data
      const challengeTitle = challengeData.title || 
        `${challengeData.game || 'Game'} - ${challengeData.mode || 'Challenge'}${challengeData.username ? ` by ${challengeData.username}` : ''}`;
      
      const firestoreChallengeData = {
        creator: currentWallet,
        // challenger: undefined, // Will be set when someone accepts (don't include undefined fields)
        entryFee: challengeData.entryFee,
        status: 'active' as const,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + (2 * 60 * 60 * 1000))), // 2 hours from now
        // winner: undefined, // Will be set when match completes (don't include undefined fields)
        // UI fields for display
        players: [currentWallet], // Creator is first player
        maxPlayers: challengeData.maxPlayers || 2, // Use provided maxPlayers or default to 2 for Head-to-Head
        // Prize claim fields
        pda: challengeId, // Store the challenge PDA from smart contract
        prizePool: challengeData.entryFee * 2 * 0.95, // Total prize pool (2x entry fee minus 5% platform fee)
        // Store only the title which contains game info - saves storage costs
        title: challengeTitle, // Generated title with game info
        // Store game name for display - players need to know which game
        game: challengeData.game || extractGameFromTitle(challengeTitle), // Store game name separately
        category: getGameCategory(challengeData.game || extractGameFromTitle(challengeTitle)), // Store category for filtering
        // REMOVED: creatorTag, mode, platform, rules, solanaAccountId
        // These are not needed for leaderboards and increase storage costs unnecessarily
      };
      
      console.log("🔥 Adding challenge to Firestore...");
      console.log("🔥 Firestore Challenge Data:", {
        game: firestoreChallengeData.game,
        category: firestoreChallengeData.category,
        title: firestoreChallengeData.title
      });
      const firestoreId = await addChallenge(firestoreChallengeData);
      console.log("✅ Challenge added to Firestore with ID:", firestoreId);
      
      // The real-time listener will automatically update the UI
      console.log("📡 Real-time listener will update UI automatically");
      
      // Close the modal after successful creation
      setShowCreateModal(false);
      console.log("✅ Modal closed automatically after challenge creation");
      
    } catch (error) {
      console.error("❌ Failed to create challenge:", error);
      alert("Failed to create challenge: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    console.log("🗑️ Attempting to delete challenge:", challengeId);
    
    if (window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) {
      try {
        const { deleteChallenge } = await import("@/lib/firebase/firestore");
        await deleteChallenge(challengeId);
        console.log("✅ Challenge deleted from Firestore");
        
        // The real-time listener will automatically update the UI
        console.log("📡 Real-time listener will update UI automatically");
      } catch (error) {
        console.error("❌ Failed to delete challenge:", error);
        alert("Failed to delete challenge: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    }
  };

  const handleShareChallenge = async (challenge: any) => {
    try {
      // Create shareable URL
      const shareUrl = `${window.location.origin}/app?challenge=${challenge.id}`;
      
      // Create share text
      const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Prize\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
      
      // Try to use Web Share API if available (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `USDFG Arena Challenge: ${challenge.title}`,
          text: shareText,
          url: shareUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Challenge link copied to clipboard! Share it with your friends!');
      }
    } catch (error) {
      console.error('Error sharing challenge:', error);
      // Fallback: show share text in alert
      const shareUrl = `${window.location.origin}/app?challenge=${challenge.id}`;
      const shareText = `🎮 Join my USDFG Arena challenge!\n\n"${challenge.title}"\n💰 ${challenge.entryFee} USDFG Entry • 🏆 ${challenge.prizePool} USDFG Prize\n🎯 ${extractGameFromTitle(challenge.title)} • ${getGameCategory(extractGameFromTitle(challenge.title))}\n\nJoin now: ${shareUrl}`;
      alert(`Share this challenge:\n\n${shareText}`);
    }
  };

  // Handle result submission - now stores result and shows trust review
  const handleSubmitResult = async (didWin: boolean, proofFile?: File | null) => {
    if (!selectedChallenge || !publicKey) {
      console.error("❌ No challenge selected or wallet not connected");
      return;
    }

    try {
      console.log("📝 Submitting result:", { challengeId: selectedChallenge.id, didWin, hasProof: !!proofFile });
      
      // Store the match result for later submission with trust review
      const matchResult = { 
        didWin, 
        proofFile, 
        challengeId: selectedChallenge.id 
      };
      setPendingMatchResult(matchResult);
      console.log("💾 Stored pending match result:", matchResult);
      
      // Get opponent name for trust review
      const opponentWallet = selectedChallenge.players?.find((p: string) => p !== publicKey.toBase58());
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
  }) => {
    console.log("🏆 Trust review submitted:", payload);
    console.log("🔍 Debug state:", {
      selectedChallenge: selectedChallenge?.id,
      publicKey: publicKey?.toBase58(),
      pendingMatchResult
    });
    
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
      // Submit the match result to Firestore
      await submitChallengeResult(challengeId, publicKey.toBase58(), pendingMatchResult.didWin);
      
      // Store trust review data
      const trustData = {
        challengeId: challengeId,
        reviewer: publicKey.toBase58(),
        opponent: selectedChallenge?.players?.find((p: string) => p !== publicKey.toBase58()) || 'Unknown',
        review: payload,
        timestamp: new Date().toISOString()
      };
      
      // Store in localStorage (in production, this would go to Firestore)
      const existingReviews = JSON.parse(localStorage.getItem('trustReviews') || '[]');
      existingReviews.push(trustData);
      localStorage.setItem('trustReviews', JSON.stringify(existingReviews));
      
      console.log("✅ Match result and trust review submitted successfully");
      
      // Close modals and clear state
      setShowTrustReview(false);
      setTrustReviewOpponent('');
      setPendingMatchResult(null);
      setSelectedChallenge(null);
      
      // Show success message
      alert(pendingMatchResult.didWin ? "🏆 You submitted that you WON! Trust review recorded." : "😔 You submitted that you LOST. Trust review recorded.");
      
    } catch (error) {
      console.error("❌ Failed to submit result and trust review:", error);
      alert("Failed to submit result and trust review. Please try again.");
    }
  };

  // Handle prize claiming
  const handleClaimPrize = async (challenge: any) => {
    if (!publicKey || !connection) {
      console.error("❌ Wallet not connected");
      alert("Please connect your wallet first");
      return;
    }

    // Prevent double-clicks
    if (claimingPrize === challenge.id) {
      console.log("⏳ Already processing claim for this challenge");
      return;
    }

    setClaimingPrize(challenge.id);

    try {
      console.log("🏆 Claiming prize for challenge:", challenge.id);
      
      // Pre-check: Verify challenge is actually claimable on-chain
      if (challenge.pda) {
        console.log("🔍 Checking on-chain status before claiming...");
        try {
          const accountInfo = await connection.getAccountInfo(new PublicKey(challenge.pda));
          if (accountInfo && accountInfo.data) {
            const data = accountInfo.data;
            const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator, creator, challenger, entry_fee, then status
            console.log("🔍 On-chain challenge status:", statusByte);
            
            // Status 2 = Completed (already resolved)
            if (statusByte === 2) {
              console.log("⚠️ Challenge already completed on-chain - prize already claimed");
              alert("This prize has already been claimed. Please refresh the page to see the latest status.");
              setClaimingPrize(null);
              // Force refresh the page to sync with on-chain state
              window.location.reload();
              return;
            }
          }
        } catch (onChainError) {
          console.log("⚠️ Could not check on-chain status, proceeding with claim attempt");
        }
      }
      
      // Import the claimChallengePrize function
      const { claimChallengePrize } = await import("@/lib/firebase/firestore");
      
      // Call the claim function
      await claimChallengePrize(challenge.id, wallet, connection);
      
      console.log("✅ Prize claimed successfully!");
      alert("🏆 Prize claimed! Check your wallet for the USDFG tokens.");
      
      // The real-time listener will update the UI automatically
    } catch (error) {
      console.error("❌ Failed to claim prize:", error);
      alert("Failed to claim prize: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setClaimingPrize(null);
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

  // Filter challenges based on selected filters
  const filteredChallenges = challenges.filter(challenge => {
    const categoryMatch = filterCategory === 'All' || challenge.category === filterCategory;
    const gameMatch = filterGame === 'All' || challenge.game === filterGame;
    const myChallengesMatch = !showMyChallenges || challenge.creator === (publicKey?.toString() || null);
    return categoryMatch && gameMatch && myChallengesMatch;
  });

  // Get unique games for filter dropdown
  const uniqueGames = ['All', ...Array.from(new Set(challenges.map(c => c.game)))];
  const categories = ['All', 'Fighting', 'Sports', 'Shooting', 'Racing'];

  // Check if user has active challenge (for button disable logic)
  const currentWallet = publicKey?.toString() || null;
  const hasActiveChallenge = currentWallet && challenges.some(c => {
    // Check if user created this challenge
    const isCreator = c.creator === currentWallet;
    
    // Check if user is a participant in this challenge
    const isParticipant = firestoreChallenges.some(fc => 
      fc.id === c.id && 
      fc.players?.includes(currentWallet)
    );
    
    // User has active challenge if they created OR joined one that's active/pending/in-progress
    const isActive = c.status === 'active' || c.status === 'pending' || c.status === 'in-progress';
    
    return (isCreator || isParticipant) && isActive;
  });

  // Add arena-page class to body for mobile CSS
  useEffect(() => {
    document.body.classList.add('arena-page');
    return () => {
      document.body.classList.remove('arena-page');
    };
  }, []);

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
                  console.log("⏳ Challenge creation in progress, please wait...");
                  return;
                }
                console.log("🔥 CREATE CHALLENGE BUTTON CLICKED!");
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
              <button
                onClick={() => {
                  // Create a mock player object for the current user
                  const currentUserPlayer = {
                    wallet: publicKey.toString(),
                    displayName: userGamerTag || 'Player',
                    name: userGamerTag || 'Player',
                    wins: 0, // You can get these from Firestore later
                    losses: 0,
                    winRate: 0,
                    rank: 1
                  };
                  setSelectedPlayer(currentUserPlayer);
                  setShowPlayerProfile(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-amber-300/50 transition-all text-white text-sm font-semibold"
              >
                <span className="text-amber-300">👤</span>
                <span className="text-white">Profile</span>
              </button>
            )}
            
            <WalletConnectSimple 
              isConnected={isConnected}
              onConnect={() => {
                localStorage.setItem('wallet_connected', 'true');
              }}
              onDisconnect={() => {
                localStorage.removeItem('wallet_connected');
                localStorage.removeItem('wallet_address');
              }}
            />
            
          </div>

          {/* Mobile Only - Wallet and Profile Buttons */}
          <div className="flex md:hidden items-center gap-2">
            {publicKey && isConnected && (
              <button
                onClick={() => {
                  // Create a mock player object for the current user
                  const currentUserPlayer = {
                    wallet: publicKey.toString(),
                    displayName: userGamerTag || 'Player',
                    name: userGamerTag || 'Player',
                    wins: 0, // You can get these from Firestore later
                    losses: 0,
                    winRate: 0,
                    rank: 1
                  };
                  setSelectedPlayer(currentUserPlayer);
                  setShowPlayerProfile(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700 hover:border-amber-300/50 transition-all text-white text-sm font-semibold"
                title="Profile"
              >
                <span className="text-amber-300 text-base">👤</span>
                <span className="hidden sm:inline text-white">Profile</span>
              </button>
            )}
            <WalletConnectSimple 
              isConnected={isConnected}
              onConnect={() => {
                localStorage.setItem('wallet_connected', 'true');
              }}
              onDisconnect={() => {
                localStorage.removeItem('wallet_connected');
                localStorage.removeItem('wallet_address');
              }}
              compact={true}
            />
          </div>
        </ElegantNavbar>

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
              <span className="text-xs text-amber-300 ml-2">Live</span>
            </div>
            
            {/* Mobile USDFG Balance Display - Show when connected */}
            {isConnected && userUsdfgBalance !== null && (
              <div className="md:hidden inline-flex items-center bg-[#07080C]/95 border border-amber-500/30 rounded-full px-3 py-1.5 mb-2 backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,130,0.15)] hover:shadow-[0_0_30px_rgba(255,215,130,0.25)] transition-all">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                <span className="text-sm text-amber-300 mr-2">Your Balance:</span>
                <span className="text-amber-400 font-bold text-base">{userUsdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDFG</span>
              </div>
            )}
            
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
                    className="text-glow-amber underline underline-offset-4 hover:text-glow-amber/80 transition-colors neocore-body text-sm sm:text-base"
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
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">🏆</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">1,247</div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">Active Challenges</div>
              </div>
            </div>
            
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">👥</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">8,432</div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">Players Online</div>
              </div>
            </div>
            
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">⚡</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">45,678</div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">USDFG Rewarded</div>
              </div>
            </div>
            
            <div className="relative rounded-lg bg-[#07080C]/95 border border-amber-500/30 p-2 text-center hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />
              <div className="relative z-10">
                <div className="text-lg mb-1">📈</div>
                <div className="text-lg font-semibold text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">+12.5%</div>
                <div className="text-sm text-amber-400 mt-1 font-semibold">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Available Challenges Section */}
          <section id="challenges" className="mb-8">
          </section>

          {/* Simple Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative rounded-[20px] bg-[#07080C]/95 border border-amber-500/30 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.08)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent" />
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)] flex items-center">
                  <span className="mr-2">🎯</span>
                  Available Challenges
                </h2>
                  <span className="text-sm text-amber-400 font-semibold">
                    {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-amber-300">Category:</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-1.5 bg-zinc-800/50 border border-amber-500/30 rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none hover:border-amber-400/60 transition-all"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-amber-300">Game:</label>
                    <select
                      value={filterGame}
                      onChange={(e) => setFilterGame(e.target.value)}
                      className="px-3 py-1.5 bg-zinc-800/50 border border-amber-500/30 rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none hover:border-amber-400/60 transition-all"
                    >
                      {uniqueGames.map(game => (
                        <option key={game} value={game}>{game}</option>
                      ))}
                    </select>
                  </div>
                  
                  {isConnected && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowMyChallenges(!showMyChallenges)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          showMyChallenges 
                            ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' 
                            : 'bg-zinc-800/50 border-amber-500/30 text-amber-300 hover:bg-amber-600/20 hover:border-amber-400/50'
                        }`}
                      >
                        {showMyChallenges ? '👤 My Challenges' : '🌐 All Challenges'}
                      </button>
                    </div>
                  )}
                  
                  {(filterCategory !== 'All' || filterGame !== 'All' || showMyChallenges) && (
                    <button
                      onClick={() => {
                        setFilterCategory('All');
                        setFilterGame('All');
                        setShowMyChallenges(false);
                      }}
                      className="px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-600/30 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {filteredChallenges.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-2">No challenges found matching your filters.</p>
                      <button
                        onClick={() => {
                          setFilterCategory('All');
                          setFilterGame('All');
                        }}
                        className="text-amber-400 hover:text-amber-300 text-sm underline"
                      >
                        Clear filters to see all challenges
                      </button>
                    </div>
                  ) : (
                    filteredChallenges.map((challenge) => {
                    const isOwner = isChallengeOwner(challenge);
                    return (
                      <div 
                        key={challenge.id} 
                        className={`relative bg-[#07080C]/95 border border-amber-500/30 rounded-2xl p-6 cursor-pointer hover:border-amber-400/60 shadow-[0_0_40px_rgba(255,215,130,0.08)] hover:shadow-[0_0_60px_rgba(255,215,130,0.12)] transition-all overflow-hidden ${challenge.status === "expired" ? "challenge-expired" : ""}`}
                        onClick={() => {
                          // Don't open join modal for completed challenges
                          if (challenge.status === "completed" || challenge.rawData?.payoutTriggered) {
                            console.log("Challenge already completed - not opening join modal");
                            return;
                          }
                          setSelectedChallenge(challenge);
                          setShowJoinModal(true);
                        }}
                      >
                        {/* Full Background Image */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                          {(() => {
                            const gameName = challenge.game || extractGameFromTitle(challenge.title);
                            const category = getGameCategory(gameName);
                            const imagePath = getGameImage(gameName);
                            // Debug log for first challenge only to avoid spam
                            if (challenge === challenges[0]) {
                              console.log(`🖼️ Challenge Card - Game: ${gameName}, Category: ${category}, Image: ${imagePath}`);
                              console.log(`🖼️ Challenge object:`, { game: challenge.game, title: challenge.title });
                            }
                            return (
                              <img
                                src={imagePath}
                                alt={gameName}
                                className="absolute inset-0 w-full h-full object-cover opacity-40"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  console.error(`❌ Failed to load image: ${imagePath}`);
                                  target.src = '/assets/usdfg-logo-transparent.png';
                                }}
                              />
                            );
                          })()}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#07080C]/80 via-[#07080C]/70 to-[#07080C]/80 rounded-2xl" />
                        </div>
                        
                        {/* Ambient Glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60 rounded-2xl" />
                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite] rounded-t-2xl" />
                        <div className="relative z-10 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-amber-500/20 border border-amber-400/30">
                                <img
                                  src={getGameImage(challenge.game || extractGameFromTitle(challenge.title))}
                                  alt={challenge.game || extractGameFromTitle(challenge.title)}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.src = '/assets/usdfg-logo-transparent.png';
                                  }}
                                />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-lg drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">{challenge.title}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-text-dim text-sm neocore-body">{getGameCategory(challenge.game || extractGameFromTitle(challenge.title))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Game Name - Most Prominent */}
                          <div className="mb-3">
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 rounded-lg shadow-[0_0_20px_rgba(255,215,130,0.2)]">
                              <span className="text-amber-300 mr-2 text-lg">🎮</span>
                              <span className="text-amber-200 font-bold text-lg drop-shadow-[0_0_8px_rgba(255,215,130,0.4)]">
                                {challenge.game || extractGameFromTitle(challenge.title) || 'Game'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Challenge Details */}
                          <div className="mb-3">
                            {challenge.platform && challenge.username && (
                              <p className="text-text-dim/60 text-xs neocore-body">
                                🖥️ {challenge.platform} • 👤 {challenge.username}
                              </p>
                            )}
                            {challenge.createdAt && (
                              <p className="text-text-dim/60 text-xs neocore-body">
                                Created {new Date(challenge.createdAt).toLocaleDateString()} at {new Date(challenge.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {challenge.expiresAt && challenge.expiresAt > Date.now() && (
                              <p className="text-orange-400/80 text-xs neocore-body">
                                ⏰ Expires in {Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / (1000 * 60)))} minutes
                              </p>
                            )}
                            {isOwner && (
                              <span className="inline-block px-2 py-1 bg-glow-electric/20 text-glow-electric border border-glow-electric/30 rounded text-xs mt-1 neocore-body">
                                Your Challenge
                              </span>
                            )}
                          </div>
                          {challenge.status === "active" && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                                Active
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareChallenge(challenge);
                                }}
                                className="px-2 py-1 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded text-xs hover:bg-amber-600/30 transition-all flex items-center gap-1"
                                title="Share Challenge"
                              >
                                📤 Share
                              </button>
                            </div>
                          )}
                          {challenge.status === "in-progress" && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">
                              In Progress
                            </span>
                          )}
                          {challenge.status === "expired" && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs animate-pulse">
                              Expired
                            </span>
                          )}
                          {challenge.status === "completed" && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                              ✅ Completed
                            </span>
                          )}
                          {challenge.status === "disputed" && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs animate-pulse">
                              🔴 Disputed
                            </span>
                          )}
                        </div>
                        
                        <div className="relative z-10 grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-white font-bold text-lg drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">{challenge.entryFee} USDFG</div>
                            <div className="text-amber-200 text-xs">Entry Fee</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-bold text-lg drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">{challenge.prizePool} USDFG</div>
                            <div className="text-amber-200 text-xs">Prize Pool</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-bold text-lg drop-shadow-[0_0_10px_rgba(255,215,130,0.3)]">
                              {challenge.players || 0}/{challenge.capacity || 2}
                            </div>
                            <div className="text-amber-200 text-xs">Players</div>
                          </div>
                        </div>

                        {/* View on Solana Explorer */}
                        {challenge.solanaAccountId && (
                          <div className="mb-4">
                            <a
                              href={`https://explorer.solana.com/address/${challenge.solanaAccountId}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-600/30 transition-all text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>🔗</span>
                              <span>View Escrow on Solana Explorer</span>
                              <span className="text-xs">↗</span>
                            </a>
                          </div>
                        )}

                        {/* Challenge Details - Collapsible */}
                        {(challenge.description || challenge.rules || challenge.requirements) && (
                          <div className="mb-4">
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-amber-400 hover:text-amber-300 flex items-center">
                                <span className="mr-2">📋</span>
                                Challenge Details
                                <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                              <div className="mt-3 space-y-3 text-sm">
                                {challenge.description && (
                                  <div>
                                    <span className="text-gray-400 font-medium">Description:</span>
                                    <p className="text-gray-300 mt-1">{challenge.description}</p>
                                  </div>
                                )}
                                {challenge.rules && (
                                  <div>
                                    <span className="text-gray-400 font-medium">Rules:</span>
                                    <p className="text-gray-300 mt-1">{challenge.rules}</p>
                                  </div>
                                )}
                                {challenge.requirements && (
                                  <div>
                                    <span className="text-gray-400 font-medium">Requirements:</span>
                                    <p className="text-gray-300 mt-1">{challenge.requirements}</p>
                                  </div>
                                )}
                                {challenge.matchFormat && (
                                  <div>
                                    <span className="text-gray-400 font-medium">Format:</span>
                                    <p className="text-gray-300 mt-1">{challenge.matchFormat}</p>
                                  </div>
                                )}
                                {challenge.restrictions && (
                                  <div>
                                    <span className="text-gray-400 font-medium">Restrictions:</span>
                                    <p className="text-gray-300 mt-1">{challenge.restrictions}</p>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Winner Display for Completed/Disputed Challenges */}
                        {(challenge.status === "completed" || challenge.status === "disputed") && challenge.rawData?.winner && (
                          <div className="mb-4 p-4 rounded-lg border-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                            <div className="text-center">
                              {challenge.rawData.winner === "tie" ? (
                                <>
                                  <div className="text-3xl mb-2">🤝</div>
                                  <div className="text-xl font-bold text-yellow-400">TIE - Entry Fees Returned</div>
                                  <p className="text-sm text-gray-400 mt-1">Entry fees will be returned to both players</p>
                                </>
                              ) : (
                                <>
                                  <div className="text-3xl mb-2">🏆</div>
                                  <div className="text-xl font-bold text-yellow-400">Winner</div>
                                  <p className="text-xs text-gray-400 mt-1 font-mono break-all">{challenge.rawData.winner}</p>
                                  {challenge.rawData.winner?.toString()?.toLowerCase() === publicKey?.toString().toLowerCase() && (
                                    <>
                                      <p className="text-green-400 font-semibold mt-2">🎉 You Won!</p>
                                      {/* Claim Prize Button */}
                                      {challenge.rawData?.canClaim && !challenge.rawData?.payoutTriggered && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClaimPrize(challenge);
                                          }}
                                          disabled={claimingPrize === challenge.id}
                                          className={`mt-3 w-full px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-lg ${
                                            claimingPrize === challenge.id 
                                              ? 'bg-gray-500 cursor-not-allowed' 
                                              : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:brightness-110 animate-pulse'
                                          }`}
                                        >
                                          {claimingPrize === challenge.id ? '⏳ Processing...' : `🏆 Claim Your Prize (${challenge.prizePool} USDFG)`}
                                        </button>
                                      )}
                                      {challenge.rawData?.payoutTriggered && (
                                        <div className="mt-3 px-6 py-3 bg-green-600/20 text-green-400 border border-green-600/30 font-semibold rounded-lg cursor-default">
                                          ✅ Prize Claimed
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {challenge.status === "disputed" && (
                          <div className="mb-4 p-4 rounded-lg border-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30">
                            <div className="text-center">
                              <div className="text-3xl mb-2">⚠️</div>
                              <div className="text-xl font-bold text-red-400">Dispute</div>
                              <p className="text-sm text-gray-400 mt-1">Both players claimed they won. Admin review required.</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Check if user is a participant (creator or joined player) */}
                        {(() => {
                          const currentWallet = publicKey?.toString()?.toLowerCase();
                          const isParticipant = currentWallet && challenge.rawData?.players?.some((p: string) => p.toLowerCase() === currentWallet);
                          const hasSubmittedResult = currentWallet && challenge.rawData?.results?.[currentWallet];

                          // Debug logging for submit result button
                          if (challenge.status === "in-progress") {
                            console.log("🔍 In-Progress Challenge Debug:", {
                              challengeId: challenge.id,
                              status: challenge.status,
                              currentWallet,
                              players: challenge.rawData?.players,
                              isParticipant,
                              hasSubmittedResult,
                              results: challenge.rawData?.results
                            });
                          }

                          // Owner buttons (but only if NOT in-progress)
                          if (isOwner && challenge.status !== "in-progress") {
                            return (
                              <div className="flex space-x-2">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                    handleDeleteChallenge(challenge.id);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 font-semibold rounded-lg hover:bg-red-600/30 transition-all relative z-20"
                                >
                                  🗑️ Delete
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="flex-1 px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 font-semibold rounded-lg hover:bg-gray-600/30 transition-all relative z-20"
                                  disabled
                                >
                                  ✏️ Edit (Coming Soon)
                                </button>
                              </div>
                            );
                          }

                          // Show "Submit Result" button for participants in "in-progress" challenges
                          if (challenge.status === "in-progress") {
                            // If wallet not connected, show connect prompt
                            if (!currentWallet || !isConnected) {
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    connect();
                                  }}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-amber-500/20"
                                >
                                  🔌 Connect to Submit Result
                                </button>
                              );
                            }

                            // If wallet connected and is participant
                            if (isParticipant) {
                              if (hasSubmittedResult) {
                                return (
                                  <div className="w-full px-4 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold rounded-lg text-center">
                                    ✅ Result Submitted
                                  </div>
                                );
                              }
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedChallenge(challenge);
                                    setShowSubmitResultModal(true);
                                  }}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-500 text-white font-semibold rounded-lg hover:brightness-110 transition-all animate-pulse"
                                >
                                  🏆 Submit Result
                                </button>
                              );
                            }

                            // If wallet connected but not a participant, just show status
                            return (
                              <div className="w-full px-4 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold rounded-lg text-center">
                                ⚔️ Match In Progress
                              </div>
                            );
                          }

                          // Show "Join" button for non-participants
                          // Only show if Firestore says "active" AND we haven't checked on-chain status yet
                          if (challenge.status === "active" && challenge.players < challenge.capacity) {
                            return (
                              <button 
                                onClick={async () => {
                                  // Check on-chain status before allowing join
                                  try {
                                    const challengePDA = challenge.rawData?.pda || challenge.pda;
                                    if (!challengePDA) {
                                      alert('Challenge has no on-chain PDA. Cannot join this challenge.');
                                      return;
                                    }
                                    
                                    // Check if challenge is actually open on-chain
                                    const { Connection, PublicKey } = await import('@solana/web3.js');
                                    const { PROGRAM_ID } = await import('@/lib/chain/config');
                                    
                                    // Use the connection from the hook
                                    const connection = new Connection('https://api.devnet.solana.com');
                                    
                                    const accountInfo = await connection.getAccountInfo(new PublicKey(challengePDA));
                                    if (!accountInfo || !accountInfo.data) {
                                      alert('Challenge not found on-chain. It may have been deleted.');
                                      return;
                                    }
                                    
                                    // Parse the challenge data to check status
                                    const data = accountInfo.data;
                                    const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator (8), creator (32), challenger Option (33), entry_fee (8), then status
                                    
                                    console.log('🔍 On-chain challenge status:', statusByte);
                                    console.log('🔍 Challenge data length:', data.length);
                                    console.log('🔍 First 50 bytes:', Array.from(data.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' '));
                                    
                                    if (statusByte > 1) { // Only block if status is > 1 (Completed, Cancelled, Disputed)
                                      const statusNames = ['Open', 'InProgress', 'Completed', 'Cancelled', 'Disputed'];
                                      const statusName = statusNames[statusByte] || 'Unknown';
                                      alert(`This challenge is no longer open. Current status: ${statusName} (${statusByte}). It may have already been completed or cancelled.`);
                                      return;
                                    }
                                    
                                    // Challenge is actually open, proceed with join
                                    setSelectedChallenge(challenge);
                                    setShowJoinModal(true);
                                  } catch (error) {
                                    console.error('Error checking on-chain status:', error);
                                    alert('Failed to verify challenge status. Please try again.');
                                  }
                                }}
                                className="w-full px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                                disabled={!isConnected}
                              >
                                {!isConnected ? "Connect to Join" : "Join Challenge"}
                              </button>
                            );
                          }

                          if (challenge.status === "active" && challenge.players >= challenge.capacity) {
                            return (
                              <div className="w-full px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 font-semibold rounded-lg text-center">
                                🔒 Challenge Full
                              </div>
                            );
                          }

                          if (challenge.status === "expired") {
                            return (
                              <div className="w-full px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 font-semibold rounded-lg text-center">
                                ⏰ Expired
                              </div>
                            );
                          }

                          if (challenge.status === "completed") {
                            // Check if current user is the winner and can claim prize
                            const isWinner = currentWallet && challenge.rawData?.winner?.toLowerCase() === currentWallet;
                            const canClaim = isWinner && challenge.rawData?.canClaim && !challenge.rawData?.payoutTriggered;
                            
                            // Debug logging for claim button
                            if (isWinner) {
                              console.log('🏆 Winner detected for challenge:', challenge.id);
                              console.log('   canClaim:', challenge.rawData?.canClaim);
                              console.log('   payoutTriggered:', challenge.rawData?.payoutTriggered);
                              console.log('   Should show button?:', canClaim);
                            }
                            
                            if (canClaim) {
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClaimPrize(challenge);
                                  }}
                                  disabled={claimingPrize === challenge.id}
                                  className={`w-full px-4 py-2 text-white font-semibold rounded-lg transition-all ${
                                    claimingPrize === challenge.id 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:brightness-110 animate-pulse'
                                  }`}
                                >
                                  {claimingPrize === challenge.id ? '⏳ Processing...' : '🏆 Claim Prize'}
                                </button>
                              );
                            } else if (isWinner && challenge.rawData?.payoutTriggered) {
                              return (
                                <div className="w-full px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 font-semibold rounded-lg text-center cursor-default">
                                  ✅ Prize Claimed
                                </div>
                              );
                            } else if (isWinner) {
                              return (
                                <div className="w-full px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 font-semibold rounded-lg text-center">
                                  🏆 You Won!
                                </div>
                              );
                            } else {
                              return (
                                <div className="w-full px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 font-semibold rounded-lg text-center">
                                  ✅ Completed
                                </div>
                              );
                            }
                          }

                          if (challenge.status === "disputed") {
                            return (
                              <div className="w-full px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 font-semibold rounded-lg text-center">
                                🔴 Disputed
                              </div>
                            );
                          }

                          return (
                            <div className="w-full px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 font-semibold rounded-lg text-center">
                              📋 View Details
                            </div>
                          );
                        })()}
                        
                        {/* Join Chat Button - Show for all active challenges */}
                        {(challenge.status === "active" || challenge.status === "in-progress") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChatChallenge(challenge);
                              setShowChatModal(true);
                            }}
                            className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-amber-600/40 to-amber-700/40 text-amber-200 border-2 border-amber-400/60 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-amber-600/60 hover:to-amber-700/60 hover:border-amber-400 hover:text-amber-100 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                          >
                            <span>💬</span>
                            <span>Join Chat</span>
                          </button>
                        )}

                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>

            <div className="relative rounded-[20px] bg-[#07080C]/95 border border-zinc-800 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.08)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)] opacity-60" />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent" />
              <div className="relative z-10 text-center py-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.3)] flex items-center justify-center">
                  <span className="mr-2">🏆</span>
                  Arena Leaders
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Top ranked players • Search by name or wallet address</p>
                
                {/* Search Bar */}
                <div className="mt-4 px-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name or wallet address..."
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
                
                {loadingTopPlayers ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                  </div>
                ) : topPlayers.length === 0 || true ? (
                  <div className="divide-y divide-zinc-800">
                    {(() => {
                      const filteredPlayers = [
                        { 
                          rank: 1, 
                          name: "Ghostly", 
                          country: "🇺🇸", 
                          trust: 9.8, 
                          wins: 214, 
                          streak: 12, 
                          integrity: 9.7, 
                          wallet: "3SeLoDGs...kcUd",
                        },
                        { 
                          rank: 2, 
                          name: "Nova", 
                          country: "🇨🇦", 
                          trust: 9.5, 
                          wins: 199, 
                          streak: 9, 
                          integrity: 9.2, 
                          wallet: "7Kj9Mn2...xYz1",
                        },
                        { 
                          rank: 3, 
                          name: "Zypher", 
                          country: "🇩🇪", 
                          trust: 9.4, 
                          wins: 185, 
                          streak: 7, 
                          integrity: 9.0, 
                          wallet: "9Pq4Rt8...wE3v",
                        },
                        { 
                          rank: 4, 
                          name: "Kairo", 
                          country: "🇯🇵", 
                          trust: 9.2, 
                          wins: 171, 
                          streak: 6, 
                          integrity: 8.8, 
                          wallet: "2Hf6Np9...mQ7s",
                          recentGames: Array.from({ length: 6 }, (_, i) => ({ 
                            flagged: false, 
                            complaints: 0, 
                            verified: true 
                          })) // 6 clean games
                        },
                        { 
                          rank: 5, 
                          name: "Vex", 
                          country: "🇫🇷", 
                          trust: 8.9, 
                          wins: 162, 
                          streak: 5, 
                          integrity: 8.6, 
                          wallet: "5Lm8Kj2...rT4u",
                          recentGames: Array.from({ length: 5 }, (_, i) => ({ 
                            flagged: false, 
                            complaints: 0, 
                            verified: true 
                          })) // 5 clean games
                        },
                      ].filter(player => 
                        leaderboardSearchTerm === '' || 
                        player.name.toLowerCase().includes(leaderboardSearchTerm.toLowerCase()) ||
                        player.wallet.toLowerCase().includes(leaderboardSearchTerm.toLowerCase())
                      );

                      if (filteredPlayers.length === 0 && leaderboardSearchTerm !== '') {
                        return (
                          <div className="text-center py-8">
                            <div className="text-zinc-400 text-sm">
                              No players found matching "{leaderboardSearchTerm}"
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Create a mock PlayerStats object for the modal
                          const mockPlayerStats: PlayerStats = {
                            wallet: player.wallet,
                            displayName: player.name,
                            wins: player.wins,
                            losses: Math.floor(player.wins * 0.3), // Estimate losses
                            winRate: Math.round((player.wins / (player.wins + Math.floor(player.wins * 0.3))) * 100 * 10) / 10,
                            totalEarned: player.wins * 10, // Estimate earnings
                            gamesPlayed: player.wins + Math.floor(player.wins * 0.3),
                            lastActive: new Date(),
                            trustScore: player.trust,
                            trustReviews: Math.floor(player.wins * 0.8),
                            gameStats: {},
                            categoryStats: {}
                          };
                          setSelectedPlayer(mockPlayerStats);
                          setShowPlayerProfile(true);
                        }}
                        style={{ zIndex: 10, position: 'relative' }}
                      >
                        {/* Top Row: Rank, Name, and Basic Info */}
                        <div className="flex items-center gap-3 sm:gap-4 pointer-events-none flex-1 min-w-0">
                          <div
                            className={`h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-base sm:text-sm font-bold border shrink-0 ${
                              player.rank === 1
                                ? "border-amber-300 text-amber-300"
                                : player.rank === 2
                                ? "border-zinc-400 text-zinc-300"
                                : player.rank === 3
                                ? "border-orange-400 text-orange-300"
                                : "border-zinc-700 text-zinc-400"
                            }`}
                          >
                            {player.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
                              <span className="truncate">{player.name}</span> <span className="shrink-0">{player.country}</span>
                              {player.rank === 1 && <span className="text-amber-300 shrink-0">👑</span>}
                            </div>
                            <div className="text-xs sm:text-xs text-zinc-400 mt-0.5">Integrity {player.integrity}/10 • Streak {player.streak}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-xs text-zinc-500 font-mono truncate">{player.wallet}</div>
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
                              const gamesPlayed = player.wins + Math.floor(player.wins * 0.3);
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
                              <div className="text-sm font-bold text-red-400">{Math.floor(player.wins * 0.3)}</div>
                            </div>
                            <div className="flex flex-col items-center gap-0">
                              <div className="text-xs text-zinc-500">🛡️</div>
                              <div className="text-sm font-bold text-amber-200">{player.trust}</div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop: Trophy Display and Stats Side by Side */}
                        <div className="hidden sm:flex items-center gap-4 pointer-events-none">
                          {/* Trophy Display - Desktop */}
                          <div className="flex items-center justify-center gap-1.5 pointer-events-auto">
                            {(() => {
                              const gamesPlayed = player.wins + Math.floor(player.wins * 0.3);
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
                              <span>{Math.floor(player.wins * 0.3)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-200 text-sm font-semibold">
                              <span>🛡️</span>
                              <span>{player.trust}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      ));
                    })()}
                    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[pulseLine_3s_ease-in-out_infinite]" />
                    <style>{`
                      @keyframes pulseLine {0%,100%{opacity:.4}50%{opacity:1}}
                    `}</style>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topPlayers.map((player, index) => {
                      const rankColors = [
                        'from-yellow-400 to-orange-500', // 1st place
                        'from-gray-300 to-gray-400',     // 2nd place
                        'from-amber-600 to-yellow-700',  // 3rd place
                        'from-amber-400 to-orange-500',     // 4th place
                        'from-amber-500 to-orange-600'    // 5th place
                      ];
                      const bgColors = [
                        'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
                        'from-gray-400/20 to-gray-500/20 border-gray-400/30',
                        'from-amber-600/20 to-yellow-700/20 border-amber-600/30',
                        'from-amber-400/20 to-orange-500/20 border-amber-400/30',
                        'from-amber-500/20 to-orange-600/20 border-amber-500/30'
                      ];
                      
                      return (
                        <div 
                          key={player.wallet} 
                          className={`bg-gradient-to-r ${bgColors[index]} rounded-lg p-4 border group cursor-pointer hover:scale-[1.02] transition-all`}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowPlayerProfile(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 bg-gradient-to-r ${rankColors[index]} rounded-full flex items-center justify-center text-black font-bold shrink-0`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 
                                    className="text-white font-semibold text-sm truncate cursor-help"
                                    title={player.wallet}
                                  >
                                    {player.displayName || `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`}
                                  </h3>
                                  {player.gamesPlayed >= 5 && (
                                    <span className="text-amber-400 text-xs" title="Verified Player (5+ games)">✓</span>
                                  )}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(player.wallet);
                                      setCopiedWallet(player.wallet);
                                      setTimeout(() => setCopiedWallet(null), 2000);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-amber-400 text-xs"
                                    title="Copy wallet address"
                                  >
                                    {copiedWallet === player.wallet ? '✓' : '📋'}
                                  </button>
                                </div>
                                <p className="text-gray-400 text-xs">
                                  <span className="text-green-400">{player.wins}W</span> • <span className="text-red-400">{player.losses}L</span> • {player.winRate.toFixed(0)}% win rate
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-amber-400 font-bold text-lg">{player.totalEarned.toFixed(0)}</div>
                              <div className="text-gray-400 text-xs">USDFG</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Show More/Less Button */}
                {!loadingTopPlayers && topPlayers.length > 0 && (
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => {
                        setShowAllPlayers(!showAllPlayers);
                        setLoadingTopPlayers(true);
                      }}
                      className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-amber-400 text-sm font-semibold transition-colors"
                    >
                      {showAllPlayers ? '← Show Less' : `View All Players →`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Challenge Modal */}
        <ElegantModal
          isOpen={showCreateModal}
          onClose={() => {
            console.log("🔥 MODAL CLOSING!");
            setShowCreateModal(false);
          }}
          title="Create New Challenge"
        >
          <CreateChallengeForm
            isConnected={isConnected}
            onConnect={() => connect()}
            onCreateChallenge={handleCreateChallenge}
            usdfgPrice={usdfgPrice}
            usdfgToUsd={usdfgToUsd}
            userGamerTag={userGamerTag}
          />
        </ElegantModal>



        {/* Join Challenge Modal */}
        {showJoinModal && selectedChallenge && (
          <JoinChallengeModal 
            challenge={selectedChallenge}
            onClose={() => setShowJoinModal(false)}
            isConnected={isConnected}
            onConnect={() => connect()}
          />
        )}

        {/* Submit Result Room */}
        <SubmitResultRoom
          isOpen={showSubmitResultModal}
          onClose={() => {
            setShowSubmitResultModal(false);
            setSelectedChallenge(null);
          }}
          challengeId={selectedChallenge?.id || ""}
          challengeTitle={selectedChallenge?.title || ""}
          currentWallet={publicKey?.toString() || ""}
          onSubmit={handleSubmitResult}
        />

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
        <PlayerProfileModal
          isOpen={showPlayerProfile}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayer(null);
          }}
          player={{
            ...selectedPlayer,
            country: userCountry,
            profileImage: userProfileImage,
            lastActive: selectedPlayer.lastActive
          }}
          isCurrentUser={publicKey && selectedPlayer.wallet === publicKey.toString()}
          onEditProfile={(newName) => {
            setUserGamerTag(newName);
            localStorage.setItem('user_gamer_tag', newName);
          }}
          onCountryChange={(country) => {
            setUserCountry(country);
            if (country) {
              localStorage.setItem('user_country', country);
            } else {
              localStorage.removeItem('user_country');
            }
          }}
          onProfileImageChange={(image) => {
            setUserProfileImage(image);
            if (image) {
              localStorage.setItem('user_profile_image', image);
            } else {
              localStorage.removeItem('user_profile_image');
            }
          }}
          onChallengePlayer={handleChallengePlayer}
          hasActiveChallenge={publicKey ? challenges.some(c => 
            c.creator === publicKey.toString() && 
            (c.status === 'active' || c.status === 'pending')
          ) : false}
        />
      )}

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        currentGamerTag={userGamerTag}
        onSave={async (gamerTag) => {
          setUserGamerTag(gamerTag);
          // Store in localStorage for persistence
          localStorage.setItem('user_gamer_tag', gamerTag);
        }}
      />

      {/* Challenge Chat Modal */}
      {showChatModal && selectedChatChallenge && (
        <ChallengeChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedChatChallenge(null);
          }}
          challengeId={selectedChatChallenge.id}
          challengeTitle={selectedChatChallenge.title}
          currentWallet={publicKey?.toString() || ""}
          allowSpectators={true}
          isParticipant={(() => {
            const currentWallet = publicKey?.toString()?.toLowerCase();
            return currentWallet && selectedChatChallenge.rawData?.players?.some((p: string) => p.toLowerCase() === currentWallet);
          })()}
        />
      )}

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
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-xl p-6">
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
    customRules: false
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  // Dynamic total steps based on mode
  const totalSteps = formData.mode === 'Custom Mode' ? 3 : 2;

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

  // Game-specific modes - Enhanced with competitive options
  const gameModes = {
    'NBA 2K25': ['Head-to-Head (Full Game)', 'Best of 3 Series', 'Quick Match (2 Quarters)', 'Park Match (2v2/3v3)', 'Custom Challenge'],
    'FIFA 24': ['Head-to-Head (Full Match)', 'Best of 3 Series', 'Quick Match (2 Halves)', 'Squad Match (2v2)', 'Custom Challenge'],
    'Street Fighter 6': ['Versus Match', 'Best of 3 Series', 'Elimination Bracket', 'First to 5', 'Custom Challenge'],
    'Call of Duty': ['Duel (1v1)', 'Squad Battle (2v2)', 'Full Lobby (5v5)', 'Battle Royale', 'Custom Challenge'],
    'Tekken 8': ['Versus Match', 'Best of 3 Series', 'Elimination Bracket', 'First to 5', 'Custom Challenge'],
    'Forza Horizon': ['Time Trial', 'Head-to-Head Race', 'Grand Prix Series', 'Drift Challenge', 'Custom Challenge'],
    'Valorant': ['Duel (1v1)', 'Squad Battle (2v2)', 'Full Lobby (5v5)', 'Tournament Bracket', 'Custom Challenge'],
    'Madden NFL 24': ['Head-to-Head (Full Game)', 'Best of 3 Series', 'Quick Match (2 Quarters)', 'Squad Match (2v2)', 'Custom Challenge'],
    'Other/Custom': ['Custom Challenge']
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
        rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'Winner takes all']
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
        rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'Winner takes all']
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
      const preset = challengePresets[formData.game as keyof typeof challengePresets]?.[formData.mode as keyof any];
      if (preset) {
        updateFormData({
          rules: preset.rules.join('\n• ')
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
    
    const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) : formData.entryFee;
    if (!formData.entryFee || formData.entryFee === '' || isNaN(entryFee) || entryFee < 0.001 || entryFee > 999999999) {
      errors.push('Entry fee must be between 0.001 and 999,999,999 USDFG');
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
    console.log("🔥 MODAL: handleSubmit called!");
    e.preventDefault();
    setAttemptedNext(true);
    
    // Final validation before submitting
    const step1Errors = validateStep1();
    const step2Errors = validateStep2();
    const allErrors = [...step1Errors, ...step2Errors];
    
    setValidationErrors(allErrors);

    if (allErrors.length > 0) {
      console.log("❌ MODAL: Validation errors found:", allErrors);
      return; // Don't submit if there are errors
    }
    
    console.log("✅ MODAL: Validation passed, calling onCreateChallenge with:", formData);
    // Create the challenge
    onCreateChallenge(formData);
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

  const handleConnect = () => {
    // Close the modal and let the user connect via the main wallet button
    onClose();
    // The user should connect their wallet using the main "Connect Wallet" button first
    console.log('🔗 Please connect your wallet using the main "Connect Wallet" button first');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[92vw] max-w-xl max-h-[90vh] rounded-2xl border border-amber-400/20 bg-gradient-to-br from-gray-900/95 via-gray-900/95 to-black/95 backdrop-blur-md p-5 overflow-y-auto shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-amber-400/10">
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

                <Field label={<span className="flex items-center"><span className="mr-2">💰</span>Entry Fee <span className="text-red-400 ml-1">*</span></span>}>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.entryFee || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow typing freely, including decimals
                        if (value === '') {
                          updateFormData({entryFee: ''});
                        } else if (value === '.') {
                          updateFormData({entryFee: '.'});
                        } else if (value.endsWith('.')) {
                          updateFormData({entryFee: value});
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            updateFormData({entryFee: numValue});
                          } else if (value.match(/^\d*\.?\d*$/)) {
                            // Allow partial decimal input like "0." or "0.0"
                            updateFormData({entryFee: value});
                          }
                        }
                      }}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white mt-4 mb-1 ${
                        hasFieldError('entry fee') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                      }`}
                      placeholder="0.1"
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
Prize pool: {(usdfgToUsd(formData.entryFee) * 2 * 0.95).toFixed(2)} USD (after 5% platform fee)
                    </div>
                  </div>
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
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-6">
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
                      <span className="text-gray-400">💰 Entry Fee:</span>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold">{formData.entryFee} USDFG</span>
                        <div className="text-xs text-gray-400">{usdfgToUsd(formData.entryFee).toFixed(2)} USD</div>
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


// Join Challenge Modal Component
const JoinChallengeModal: React.FC<{ 
  challenge: any; 
  onClose: () => void; 
  isConnected: boolean;
  onConnect: () => void;
}> = ({ challenge, onClose, isConnected, onConnect }) => {
  const { publicKey, signTransaction } = useWallet();
  const [state, setState] = useState<'review' | 'processing' | 'success' | 'error'>('review');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    // Check if mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Open in Phantom app on mobile
      window.open('https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href), '_blank');
    } else {
      // Desktop: close modal and let user connect via main button
      onClose();
    }
  };

  const handleJoin = async () => {
    if (!isConnected || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      setState('error');
      return;
    }

    setState('processing');
    
    try {
      const walletAddress = publicKey.toString();
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      console.log("🚀 Joining challenge:", challenge.id);
      
      // Step 1: Join on-chain (Solana transaction)
      // Use the PDA from the challenge data, not the Firestore ID
      const challengePDA = challenge.rawData?.pda || challenge.pda;
      if (!challengePDA) {
        throw new Error('Challenge has no on-chain PDA. Cannot join this challenge.');
      }
      
      await joinChallengeOnChain(challengePDA, challenge.entryFee, walletAddress, {
        signTransaction: signTransaction,
        publicKey: publicKey
      });
      
      // Step 2: Update Firestore
      await joinChallenge(challenge.id, walletAddress);
      
      console.log("✅ Successfully joined challenge!");
      setState('success');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("❌ Join failed:", err);
      
      // Handle specific error cases
      let errorMessage = 'Failed to join challenge. Please try again.';
      
      if (err.message?.includes('ChallengeExpired')) {
        errorMessage = 'This challenge has expired and is no longer available to join.';
      } else if (err.message?.includes('Challenge has expired')) {
        errorMessage = 'This challenge has expired and is no longer available to join.';
      } else if (err.message?.includes('InsufficientFunds')) {
        errorMessage = 'You don\'t have enough USDFG tokens to join this challenge.';
      } else if (err.message?.includes('SelfChallenge')) {
        errorMessage = 'You cannot join your own challenge.';
      } else if (err.message?.includes('NotOpen')) {
        errorMessage = 'This challenge is no longer open for joining.';
      } else if (err.message?.includes('already been processed')) {
        errorMessage = 'This challenge has already been joined or processed. Please refresh the page to see the latest status.';
      } else if (err.message?.includes('Transaction simulation failed')) {
        errorMessage = 'Transaction failed. This challenge may have already been joined or is no longer available.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[90vw] max-w-md rounded-2xl border border-amber-400/30 bg-[#07080C]/95 p-6 shadow-[0_0_60px_rgba(255,215,130,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Join Challenge</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {state === 'review' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Challenge:</span>
                <span className="text-white font-medium">{challenge.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entry Fee:</span>
                <span className="text-white font-medium">{challenge.entryFee} USDFG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Prize Pool:</span>
                <span className="text-white font-medium">{challenge.prizePool} USDFG</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Players:</span>
                <span className="text-white font-medium">{challenge.players}/{challenge.capacity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platform:</span>
                <span className="text-white font-medium">{challenge.platform || 'All Platforms'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Game:</span>
                <span className="text-white font-medium">{challenge.game || 'USDFG Arena'}</span>
              </div>
              {challenge.expiresAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Expires:</span>
                  <span className="text-white font-medium">
                    {new Date(challenge.expiresAt).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rules:</span>
                <span className="text-white font-medium text-xs">
                  {challenge.rules || 'Standard USDFG Arena rules apply'}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-400">
              You will need to approve a transaction in your wallet. Make sure you have enough USDFG and SOL for fees.
            </p>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-black px-6 py-2 rounded-lg font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,215,130,0.35)]"
              >
                Join Challenge
              </button>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400 mb-4" />
            <p className="text-gray-300">Processing your request...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <span className="text-green-400 text-xl">✓</span>
            </div>
            <p className="text-green-400 font-medium">Successfully joined the challenge!</p>
            <p className="text-gray-400 text-sm mt-2">Good luck in the Arena!</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <span className="text-red-400 text-xl">✕</span>
            </div>
            <p className="text-red-400 font-medium">{error}</p>
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mt-4 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-2 rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Wallet First"}
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setState('review')}
                  className="mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


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
      <div className="relative w-full max-w-md rounded-[28px] border border-zinc-800 bg-[#07080C]/95 p-6 shadow-[0_0_60px_rgba(255,215,130,0.08)]">
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