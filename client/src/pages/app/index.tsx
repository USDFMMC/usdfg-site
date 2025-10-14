import React, { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import WalletConnectSimple from "@/components/arena/WalletConnectSimple";
import { useWallet } from '@solana/wallet-adapter-react';
// Removed legacy wallet import - using MWA hooks instead
import { fetchActiveChallenges, fetchOpenChallenges, joinChallengeOnChain } from "@/lib/chain/events";
import { useChallenges } from "@/hooks/useChallenges";
import { useChallengeExpiry } from "@/hooks/useChallengeExpiry";
import { useResultDeadlines } from "@/hooks/useResultDeadlines";
import { ChallengeData, joinChallenge, submitChallengeResult, startResultSubmissionPhase, getTopPlayers, PlayerStats } from "@/lib/firebase/firestore";
import { testFirestoreConnection } from "@/lib/firebase/firestore";
import ElegantButton from "@/components/ui/ElegantButton";
import ElegantModal from "@/components/ui/ElegantModal";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";
import ElegantNavbar from "@/components/layout/ElegantNavbar";
import { SubmitResultRoom } from "@/components/arena/SubmitResultRoom";

const ArenaHome: React.FC = () => {
  const { connected, signTransaction, publicKey, connect } = useWallet();
  // Use MWA connection state
  const isConnected = connected;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSubmitResultModal, setShowSubmitResultModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterGame, setFilterGame] = useState<string>('All');
  const [showMyChallenges, setShowMyChallenges] = useState<boolean>(false);
  const [usdfgPrice, setUsdfgPrice] = useState<number>(0.15); // Mock price: $0.15 per USDFG
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState<boolean>(true);
  const [lastLocalChallenge, setLastLocalChallenge] = useState<number>(0);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState<boolean>(false);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [loadingTopPlayers, setLoadingTopPlayers] = useState<boolean>(true);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
  
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

  // Update price every 30 seconds
  useEffect(() => {
    fetchUsdfgPrice();
    const priceInterval = setInterval(fetchUsdfgPrice, 30000);
    return () => clearInterval(priceInterval);
  }, [fetchUsdfgPrice]);

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
    // Determine max players based on mode
    const getMaxPlayers = (mode: string) => {
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
          return challenge.maxPlayers || 2; // Fallback to stored value or default
      }
    };

    const maxPlayers = getMaxPlayers(challenge.mode);
    const currentPlayers = challenge.players?.length || 1; // Creator is always 1st player

    return {
      id: challenge.id,
      clientId: challenge.id,
      title: `${challenge.game} ${challenge.mode}`,
      game: challenge.game,
      mode: challenge.mode,
      platform: challenge.platform,
      username: challenge.creatorTag,
      entryFee: challenge.entryFee,
      prizePool: challenge.prizePool,
      players: currentPlayers,
      capacity: maxPlayers,
      category: challenge.category,
      creator: challenge.creator,
      rules: challenge.rules,
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

  const handleCreateChallenge = async (challengeData: any) => {
    // Prevent double-clicks
    if (isCreatingChallenge) {
      return;
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

      console.log("📦 Importing createChallengeOnChain function...");
      const { createChallengeOnChain } = await import("@/lib/chain/events");
      
      // Determine max players based on mode
      const getMaxPlayersForMode = (mode: string) => {
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
            return 2; // Default to 1v1
        }
      };

      const maxPlayers = getMaxPlayersForMode(challengeData.mode);
      console.log(`🎯 Setting maxPlayers to ${maxPlayers} for mode: ${challengeData.mode}`);

      console.log("🚀 Calling createChallengeOnChain...");
      const challengeId = await createChallengeOnChain({
        game: challengeData.game,
        entryFee: challengeData.entryFee,
        maxPlayers: maxPlayers,
        rules: challengeData.rules || ""
      }, {
        signTransaction: signTransaction,
        publicKey: publicKey!
      });
      
      console.log("✅ Challenge created successfully:", challengeId);
      
      // Calculate prize pool
      const platformFee = 0.05; // 5% platform fee
      const totalPrize = challengeData.entryFee * 2; // Challenger matches entry fee
      const prizePool = totalPrize - (totalPrize * platformFee); // Minus platform fee
      
      // Determine category based on game
      const getGameCategory = (game: string) => {
        if (['NBA 2K25', 'FIFA 24', 'Madden NFL 24'].includes(game)) return 'Sports';
        if (['Street Fighter 6', 'Tekken 8'].includes(game)) return 'Fighting';
        if (['Call of Duty', 'Valorant'].includes(game)) return 'Shooting';
        if (['Forza Horizon'].includes(game)) return 'Racing';
        return 'Other';
      };
      
      // Create Firestore challenge data
      const { addChallenge } = await import("@/lib/firebase/firestore");
      const { Timestamp } = await import("firebase/firestore");
      
      const firestoreChallengeData = {
        creator: currentWallet,
        creatorTag: challengeData.username,
        game: challengeData.game,
        mode: challengeData.mode === 'Custom Mode' ? challengeData.customMode : challengeData.mode,
        platform: challengeData.platform,
        entryFee: challengeData.entryFee,
        maxPlayers: maxPlayers, // Use the dynamic maxPlayers we calculated
        rules: challengeData.rules || "",
        status: 'active' as const,
        players: [currentWallet],
        expiresAt: Timestamp.fromDate(new Date(Date.now() + (2 * 60 * 60 * 1000))), // 2 hours from now
        solanaAccountId: challengeId,
        category: getGameCategory(challengeData.game),
        prizePool: Math.round(prizePool)
      };
      
      console.log("🔥 Adding challenge to Firestore...");
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

  // Handle result submission
  const handleSubmitResult = async (didWin: boolean, proofFile?: File | null) => {
    if (!selectedChallenge || !publicKey) {
      console.error("❌ No challenge selected or wallet not connected");
      return;
    }

    try {
      console.log("📝 Submitting result:", { challengeId: selectedChallenge.id, didWin, hasProof: !!proofFile });
      
      // TODO: Upload proof image to Firebase Storage if provided
      // For now, we'll just submit the result without the proof URL
      await submitChallengeResult(selectedChallenge.id, publicKey.toBase58(), didWin);
      
      console.log("✅ Result submitted successfully");
      setShowSubmitResultModal(false);
      setSelectedChallenge(null);
      
      // Show success message
      alert(didWin ? "🏆 You submitted that you WON! Waiting for opponent..." : "😔 You submitted that you LOST. Waiting for opponent...");
    } catch (error) {
      console.error("❌ Failed to submit result:", error);
      throw error; // Let modal handle the error
    }
  };

  const isChallengeOwner = (challenge: any) => {
    const currentWallet = publicKey?.toString()?.toLowerCase() || null;
    const challengeCreator = challenge.creator?.toLowerCase() || null;
    
    // Must have both wallet addresses to compare
    if (!currentWallet || !challengeCreator) {
      console.log("🔍 Ownership check: Missing wallet data", {
        hasCurrentWallet: !!currentWallet,
        hasChallengeCreator: !!challengeCreator
      });
      return false;
    }
    
    const isOwner = currentWallet === challengeCreator;
    console.log("🔍 Ownership check:", {
      currentWallet: currentWallet.slice(0, 8) + "...",
      challengeCreator: challengeCreator.slice(0, 8) + "...",
      isOwner
    });
    return isOwner;
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

      <div className="min-h-screen bg-background-1 relative w-full overflow-x-hidden">
        <div className="parallax-glow"></div>
        {/* Header */}
        <ElegantNavbar>
          {/* Desktop Only Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ElegantButton
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
              variant="cyan"
              disabled={hasActiveChallenge || isCreatingChallenge}
              title={hasActiveChallenge ? "You have an active challenge (created or joined)" : isCreatingChallenge ? "Creating challenge..." : "Create a new challenge"}
            >
              {hasActiveChallenge ? "In Challenge" : isCreatingChallenge ? "Creating..." : "Create Challenge"}
            </ElegantButton>
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

          {/* Mobile Only - Wallet Button */}
          <div className="flex md:hidden items-center">
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
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full">
          {/* Hero Section */}
          <div className="text-center neocore-section">
            {/* USDFG Price Ticker */}
            <div className="inline-flex items-center bg-background-2/60 border border-glow/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm glow-soft">
              <div className="w-2 h-2 bg-glow-cyan rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-text-dim mr-2 neocore-body">USDFG Price:</span>
              <span className="text-glow-cyan font-semibold neocore-body">{usdfgPrice.toFixed(4)} USDFG</span>
              <span className="text-xs text-text-dim ml-2 neocore-body">Live</span>
            </div>
            
            <h1 className="neocore-h1 text-2xl sm:text-4xl lg:text-5xl">
              Welcome to the <span className="bg-gradient-to-r from-glow-cyan to-glow-electric bg-clip-text text-transparent">Arena</span>
            </h1>
            <p className="text-base sm:text-xl max-w-2xl mx-auto neocore-body mb-6 sm:mb-8 px-4">
              Compete in skill-based challenges, earn USDFG, and prove your gaming prowess against players worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="elite-btn neocore-button px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto text-sm sm:text-base"
              >
                Create Challenge
              </button>
              <Link 
                to="#challenges"
                className="text-glow-cyan underline underline-offset-4 hover:text-glow-cyan/80 transition-colors neocore-body text-sm sm:text-base"
              >
                Browse Challenges
              </Link>
            </div>
            
            {!isConnected && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-yellow-400 text-sm">
                  Connect your wallet to start competing and earning rewards!
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-black/20 border border-gray-800 rounded-lg p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-2xl font-bold text-white">1,247</div>
              <div className="text-gray-400 text-sm">Active Challenges</div>
            </div>
            
            <div className="bg-black/20 border border-gray-800 rounded-lg p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-2xl font-bold text-white">8,432</div>
              <div className="text-gray-400 text-sm">Players Online</div>
            </div>
            
            <div className="bg-black/20 border border-gray-800 rounded-lg p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-white">45,678</div>
              <div className="text-gray-400 text-sm">USDFG Rewarded</div>
            </div>
            
            <div className="bg-black/20 border border-gray-800 rounded-lg p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-2xl font-bold text-white">+12.5%</div>
              <div className="text-gray-400 text-sm">Win Rate</div>
            </div>
          </div>

          {/* Available Challenges Section */}
          <section id="challenges" className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Available Challenges</h2>
              <div className="hidden md:flex">
                <ElegantButton
                  onClick={() => setShowCreateModal(true)}
                  variant="cyan"
                  size="md"
                  className="px-6 py-3"
                >
                  Create Challenge
                </ElegantButton>
              </div>
            </div>
          </section>

          {/* Simple Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/20 border border-gray-800 rounded-lg backdrop-blur-sm">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🎯</span>
                  Available Challenges
                </h2>
                  <span className="text-sm text-gray-400">
                    {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-400">Category:</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-cyan-400 focus:outline-none"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-400">Game:</label>
                    <select
                      value={filterGame}
                      onChange={(e) => setFilterGame(e.target.value)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-cyan-400 focus:outline-none"
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
                            ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                            : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
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
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {filteredChallenges.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-2">No challenges found matching your filters.</p>
                      <button
                        onClick={() => {
                          setFilterCategory('All');
                          setFilterGame('All');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm underline"
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
                        className={`challenge-card p-4 cursor-pointer hover:bg-background-2/40 transition-colors ${challenge.status === "expired" ? "challenge-expired" : ""}`}
                        onClick={() => {
                          setSelectedChallenge(challenge);
                          setShowDetailsModal(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-glow-pink to-glow-electric rounded-lg flex items-center justify-center">
                              <span className="text-white">🥊</span>
                            </div>
                            <div>
                              <h3 className="text-text-primary font-semibold neocore-body">{challenge.title}</h3>
                              <p className="text-text-dim text-sm neocore-body">{challenge.category} • {challenge.game}</p>
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
                          </div>
                          {challenge.status === "active" && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                              Active
                            </span>
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
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-white font-semibold">{challenge.entryFee} USDFG</div>
                            <div className="text-gray-400 text-xs">Entry Fee</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">{challenge.prizePool} USDFG</div>
                            <div className="text-gray-400 text-xs">Prize Pool</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">
                              {challenge.players || 0}/{challenge.capacity || 2}
                            </div>
                            <div className="text-gray-400 text-xs">Players</div>
                          </div>
                        </div>

                        {/* Challenge Details - Collapsible */}
                        {(challenge.description || challenge.rules || challenge.requirements) && (
                          <div className="mb-4">
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300 flex items-center">
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
                                  {challenge.rawData.winner.toLowerCase() === publicKey?.toString().toLowerCase() && (
                                    <p className="text-green-400 font-semibold mt-2">🎉 You Won!</p>
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
                                    e.stopPropagation();
                                    handleDeleteChallenge(challenge.id);
                                  }}
                                  className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 font-semibold rounded-lg hover:bg-red-600/30 transition-all"
                                >
                                  🗑️ Delete
                                </button>
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 font-semibold rounded-lg hover:bg-gray-600/30 transition-all"
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
                                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-semibold rounded-lg hover:brightness-110 transition-all"
                                >
                                  🔌 Connect to Submit Result
                                </button>
                              );
                            }

                            // If wallet connected and is participant
                            if (isParticipant) {
                              if (hasSubmittedResult) {
                                return (
                                  <div className="w-full px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 font-semibold rounded-lg text-center">
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
                              <div className="w-full px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-600/30 font-semibold rounded-lg text-center">
                                ⚔️ Match In Progress
                              </div>
                            );
                          }

                          // Show "Join" button for non-participants
                          if (challenge.status === "active" && challenge.players < challenge.capacity) {
                            return (
                              <button 
                                onClick={() => {
                                  setSelectedChallenge(challenge);
                                  setShowJoinModal(true);
                                }}
                                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
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
                            return (
                              <div className="w-full px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 font-semibold rounded-lg text-center">
                                ✅ Completed
                              </div>
                            );
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
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>

            <div className="bg-black/20 border border-gray-800 rounded-lg backdrop-blur-sm">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🏆</span>
                  Top Players
                </h2>
              </div>
              <div className="p-6">
                {loadingTopPlayers ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  </div>
                ) : topPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No players yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topPlayers.map((player, index) => {
                      const rankColors = [
                        'from-yellow-400 to-orange-500', // 1st place
                        'from-gray-300 to-gray-400',     // 2nd place
                        'from-amber-600 to-yellow-700',  // 3rd place
                        'from-cyan-400 to-blue-500',     // 4th place
                        'from-purple-400 to-pink-500'    // 5th place
                      ];
                      const bgColors = [
                        'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
                        'from-gray-400/20 to-gray-500/20 border-gray-400/30',
                        'from-amber-600/20 to-yellow-700/20 border-amber-600/30',
                        'from-cyan-400/20 to-blue-500/20 border-cyan-400/30',
                        'from-purple-400/20 to-pink-500/20 border-purple-400/30'
                      ];
                      
                      return (
                        <div key={player.wallet} className={`bg-gradient-to-r ${bgColors[index]} rounded-lg p-4 border group`}>
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
                                    <span className="text-cyan-400 text-xs" title="Verified Player (5+ games)">✓</span>
                                  )}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(player.wallet);
                                      setCopiedWallet(player.wallet);
                                      setTimeout(() => setCopiedWallet(null), 2000);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-cyan-400 text-xs"
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
                              <div className="text-cyan-400 font-bold text-lg">{player.totalEarned.toFixed(0)}</div>
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
                      className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 text-sm font-semibold transition-colors"
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

        {/* Challenge Details Modal */}
        {showDetailsModal && selectedChallenge && (
          <ChallengeDetailsModal 
            challenge={selectedChallenge}
            onClose={() => setShowDetailsModal(false)}
            onJoin={() => {
              setShowDetailsModal(false);
              setShowJoinModal(true);
            }}
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

        {/* Mobile FAB - Create Challenge */}
        <button
          onClick={() => {
            if (hasActiveChallenge) {
              alert("You already have an active challenge (created or joined). Complete it before creating a new one.");
              return;
            }
            setShowCreateModal(true);
          }}
          disabled={hasActiveChallenge || isCreatingChallenge}
          className={`fixed bottom-20 right-6 md:hidden ${
            hasActiveChallenge || isCreatingChallenge 
              ? 'bg-gray-600/50 cursor-not-allowed' 
              : 'bg-gradient-to-r from-cyan-400 to-purple-500 hover:brightness-110'
          } text-white p-4 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all z-40 flex items-center justify-center`}
          title={hasActiveChallenge ? "You have an active challenge" : "Create Challenge"}
        >
          <span className="text-2xl font-bold">+</span>
        </button>
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
    className={`inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
    
    if (!formData.entryFee || formData.entryFee < 10 || formData.entryFee > 10000) {
      errors.push('Entry fee must be between 10 and 10,000 USDFG');
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
      <div className="relative w-[92vw] max-w-xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#11051E] p-5 overflow-y-auto">
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
                  i + 1 <= currentStep ? 'bg-cyan-400' : 'bg-white/10'
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
                      type="number"
                      value={formData.entryFee}
                      onChange={(e) => updateFormData({entryFee: Number(e.target.value)})}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white mt-4 mb-1 ${
                        hasFieldError('entry fee') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'
                      }`}
                      min="10"
                      max="10000"
                      placeholder="50"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-2">
                      <span className="text-gray-400 text-sm">USDFG</span>
                    </div>
                  </div>
                  
                  {/* USD Conversion Display */}
                  <div className="mt-2 mb-4 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-400 text-sm">💵 USD Equivalent:</span>
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
                    <PrimaryButton onClick={nextStep} className="min-h-[44px] px-6 py-3 text-base touch-manipulation bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400">
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
                    <span className="text-cyan-400">🎮 {formData.game}</span> • 
                    <span className="text-purple-400 ml-1">🎯 {formData.mode === 'Custom Mode' ? formData.customMode : formData.mode}</span> • 
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
                        className="mr-2 rounded border-gray-600 bg-gray-700 text-cyan-400 focus:ring-cyan-400"
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
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center text-blue-400 text-sm mb-1">
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
                    <PrimaryButton type="submit" className="min-h-[44px] px-6 py-3 text-base touch-manipulation bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400">
                      Create Challenge
                    </PrimaryButton>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-6">
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
                        <span className="text-cyan-400 font-bold">{formData.entryFee} USDFG</span>
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
                  <PrimaryButton type="submit" className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400">
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
      await joinChallengeOnChain(challenge.id, challenge.entryFee, walletAddress, {
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
      setError(err.message || 'Failed to join challenge. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[90vw] max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
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
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:brightness-110 transition-all"
              >
                Join Challenge
              </button>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-gray-600 border-t-cyan-400 mb-4" />
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
                className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-black px-4 py-2 rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Wallet First"}
              </button>
            ) : (
              <button
                onClick={() => setState('review')}
                className="mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Challenge Details Modal Component
const ChallengeDetailsModal: React.FC<{ 
  challenge: any; 
  onClose: () => void; 
  onJoin: () => void;
  isConnected: boolean;
  onConnect: () => void;
}> = ({ challenge, onClose, onJoin, isConnected, onConnect }) => {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    // Close the modal and let the user connect via the main wallet button
    onClose();
    console.log('🔗 Please connect your wallet using the main "Connect Wallet" button first');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-2/95 border border-glow/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-sm glow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary neocore-h2">
            Challenge Details
          </h2>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Challenge Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-glow-pink to-glow-electric rounded-xl flex items-center justify-center">
              <span className="text-2xl">🥊</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-text-primary neocore-body">
                {challenge.title}
              </h3>
              <p className="text-text-dim neocore-body">
                {challenge.category} • {challenge.game}
              </p>
            </div>
          </div>

          {/* Challenge Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-sm text-text-dim mb-1">Entry Fee</div>
              <div className="text-lg font-semibold text-text-primary">
                {challenge.entryFee} USDFG
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-sm text-text-dim mb-1">Prize Pool</div>
              <div className="text-lg font-semibold text-text-primary">
                {challenge.prizePool} USDFG
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-sm text-text-dim mb-1">Players</div>
              <div className="text-lg font-semibold text-text-primary">
                {challenge.players}/{challenge.capacity}
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-sm text-text-dim mb-1">Platform</div>
              <div className="text-lg font-semibold text-text-primary">
                {challenge.platform}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div>
            <h4 className="text-lg font-semibold text-text-primary mb-3 neocore-body">
              Rules & Requirements
            </h4>
            <div className="bg-background/50 rounded-lg p-4">
              <pre className="text-text-primary whitespace-pre-wrap neocore-body">
                {challenge.rules}
              </pre>
            </div>
          </div>

          {/* Creator Info */}
          <div>
            <h4 className="text-lg font-semibold text-text-primary mb-3 neocore-body">
              Challenge Creator
            </h4>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {challenge.username?.charAt(0) || '👤'}
                  </span>
                </div>
                <div>
                  <div className="text-text-primary font-semibold neocore-body">
                    {challenge.username || 'Anonymous Player'}
                  </div>
                  <div className="text-text-dim text-sm neocore-body">
                    Created {new Date(challenge.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {isConnected ? (
              <button
                onClick={onJoin}
                className="flex-1 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold py-3 px-6 rounded-lg hover:brightness-110 transition-all neocore-button"
              >
                Join Challenge
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold py-3 px-6 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 neocore-button"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet to Join'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-600 text-text-primary rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaHome;