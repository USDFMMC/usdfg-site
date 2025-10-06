import React, { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import WalletConnect from "@/components/arena/WalletConnect";
import { connectPhantom, hasPhantomInstalled, getWalletPublicKey } from "@/lib/wallet/solana";

const ArenaHome: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterGame, setFilterGame] = useState<string>('All');
  const [usdfgPrice, setUsdfgPrice] = useState<number>(0.15); // Mock price: $0.15 per USDFG
  
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

  // Helper function to convert USDFG to USD
  const usdfgToUsd = useCallback((usdfgAmount: number) => {
    return usdfgAmount * usdfgPrice;
  }, [usdfgPrice]);
  const [challenges, setChallenges] = useState([
    {
      id: "ch_01",
      title: "Street Fighter 6 Versus Match",
      game: "Street Fighter 6",
      mode: "Versus Match",
      platform: "PS5",
      username: "FighterPro_89",
      entryFee: 50,
      prizePool: 95,
      players: 2,
      capacity: 8,
      category: "Fighting",
      creator: "system",
      rules: "• Best of 3 rounds per match\n• Standard character roster\n• No duplicate characters\n• Tournament legal stages only\n• Rage quit = forfeit\n• Standard round timer (99 seconds)",
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: "ch_02", 
      title: "FIFA 24 Head-to-Head",
      game: "FIFA 24",
      mode: "Head-to-Head",
      platform: "Xbox",
      username: "SoccerKing24",
      entryFee: 25,
      prizePool: 47,
      players: 1,
      capacity: 2,
      category: "Sports",
      creator: "system",
      rules: "• Match length: 6-minute halves\n• Difficulty: World Class\n• No duplicate teams\n• Draw = penalties\n• Disconnect = forfeit unless agreed to rematch\n• Standard FIFA rules apply",
      createdAt: new Date(Date.now() - 1800000).toISOString() // 30 min ago
    },
    {
      id: "ch_03",
      title: "Call of Duty Duel",
      game: "Call of Duty",
      mode: "Duel",
      platform: "PC", 
      username: "GunSlinger_X",
      entryFee: 75,
      prizePool: 142,
      players: 1,
      capacity: 2,
      category: "Shooting",
      creator: "system",
      rules: "• First to 6 rounds wins\n• Random weapon rotation\n• No killstreaks\n• Standard gunfight maps\n• Connection issues require rematch\n• No camping allowed",
      createdAt: new Date(Date.now() - 900000).toISOString() // 15 min ago
    },
    {
      id: "ch_04",
      title: "NBA 2K25 Head-to-Head",
      game: "NBA 2K25",
      mode: "Head-to-Head",
      platform: "PS5",
      username: "HoopMaster22",
      entryFee: 60,
      prizePool: 114,
      players: 1,
      capacity: 2,
      category: "Sports",
      creator: "system",
      rules: "• Game length: 4x6 minute quarters\n• Difficulty: All-Star\n• No duplicate teams\n• Standard NBA rules\n• Pause abuse = forfeit\n• Disconnect = forfeit unless agreed to rematch",
      createdAt: new Date(Date.now() - 2700000).toISOString() // 45 min ago
    },
    {
      id: "ch_05",
      title: "Valorant Squad Battle",
      game: "Valorant",
      mode: "Squad Battle",
      platform: "PC",
      username: "TacShooter_Pro",
      entryFee: 40,
      prizePool: 76,
      players: 2,
      capacity: 10,
      category: "Shooting",
      creator: "system",
      rules: "• 5v5 competitive format\n• Standard map pool\n• Agent restrictions by team agreement\n• Communication allowed\n• Standard economy rules\n• Overtime rules apply",
      createdAt: new Date(Date.now() - 600000).toISOString() // 10 min ago
    }
  ]);

  const handleCreateChallenge = (challengeData: any) => {
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
    
    const newChallenge = {
      id: `ch_${Date.now()}`,
      title: `${challengeData.game} ${challengeData.mode === 'Custom Mode' ? challengeData.customMode : challengeData.mode}`,
      game: challengeData.game,
      mode: challengeData.mode === 'Custom Mode' ? challengeData.customMode : challengeData.mode,
      platform: challengeData.platform,
      username: challengeData.username,
      entryFee: challengeData.entryFee,
      prizePool: Math.round(prizePool), // Round to whole number
      players: 1,
      capacity: 8,
      category: getGameCategory(challengeData.game),
      creator: getWalletPublicKey() || "unknown", // Track who created the challenge
      rules: challengeData.rules || "",
      createdAt: new Date().toISOString()
    };
    setChallenges(prev => [newChallenge, ...prev]);
  };

  const handleDeleteChallenge = (challengeId: string) => {
    if (window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) {
      setChallenges(prev => prev.filter(challenge => challenge.id !== challengeId));
    }
  };

  const isChallengeOwner = (challenge: any) => {
    const currentWallet = getWalletPublicKey();
    return currentWallet && challenge.creator === currentWallet;
  };

  // Filter challenges based on selected filters
  const filteredChallenges = challenges.filter(challenge => {
    const categoryMatch = filterCategory === 'All' || challenge.category === filterCategory;
    const gameMatch = filterGame === 'All' || challenge.game === filterGame;
    return categoryMatch && gameMatch;
  });

  // Get unique games for filter dropdown
  const uniqueGames = ['All', ...Array.from(new Set(challenges.map(c => c.game)))];
  const categories = ['All', 'Fighting', 'Sports', 'Shooting', 'Racing'];

  return (
    <>
      <Helmet>
        <title>USDFG Arena - Gaming Platform | USDFGAMING</title>
        <meta name="description" content="Enter the USDFG Arena - Compete in skill-based challenges, earn USDFG, and prove your gaming prowess." />
      </Helmet>

      <div className="min-h-screen bg-background-1 relative">
        <div className="parallax-glow"></div>
        {/* Header */}
        <div className="border-b border-soft bg-background-2/80 backdrop-blur-sm neocore-panel">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-glow-cyan to-glow-electric rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold">🎮</span>
                  </div>
                  <span className="neocore-h2 text-text-primary">USDFG Arena</span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="elite-btn neocore-button"
                >
                  Create Challenge
                </button>
                <WalletConnect 
                  isConnected={isConnected}
                  onConnect={() => setIsConnected(true)}
                  onDisconnect={() => setIsConnected(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center neocore-section">
            {/* USDFG Price Ticker */}
            <div className="inline-flex items-center bg-background-2/60 border border-glow/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm glow-soft">
              <div className="w-2 h-2 bg-glow-cyan rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-text-dim mr-2 neocore-body">USDFG Price:</span>
              <span className="text-glow-cyan font-semibold neocore-body">${usdfgPrice.toFixed(4)}</span>
              <span className="text-xs text-text-dim ml-2 neocore-body">Live</span>
            </div>
            
            <h1 className="neocore-h1">
              Welcome to the <span className="bg-gradient-to-r from-glow-cyan to-glow-electric bg-clip-text text-transparent">Arena</span>
            </h1>
            <p className="text-xl max-w-2xl mx-auto neocore-body mb-8">
              Compete in skill-based challenges, earn USDFG, and prove your gaming prowess against players worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="elite-btn neocore-button px-6 py-3"
              >
                Create Challenge
              </button>
              <Link 
                to="#challenges"
                className="text-glow-cyan underline underline-offset-4 hover:text-glow-cyan/80 transition-colors neocore-body"
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
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black px-4 py-2 rounded-full font-semibold hover:brightness-110 transition-all"
              >
                Create Challenge
              </button>
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
                  
                  {(filterCategory !== 'All' || filterGame !== 'All') && (
                    <button
                      onClick={() => {
                        setFilterCategory('All');
                        setFilterGame('All');
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
                      <div key={challenge.id} className="challenge-card p-4">
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
                              {isOwner && (
                                <span className="inline-block px-2 py-1 bg-glow-electric/20 text-glow-electric border border-glow-electric/30 rounded text-xs mt-1 neocore-body">
                                  Your Challenge
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                            Active
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-white font-semibold">{challenge.entryFee} USDFG</div>
                            <div className="text-gray-400 text-xs">Entry Fee</div>
                            <div className="text-gray-500 text-xs">${usdfgToUsd(challenge.entryFee).toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">{challenge.prizePool} USDFG</div>
                            <div className="text-gray-400 text-xs">Prize Pool</div>
                            <div className="text-gray-500 text-xs">${usdfgToUsd(challenge.prizePool).toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">{challenge.players}/{challenge.capacity}</div>
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
                        
                        {isOwner ? (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 font-semibold rounded-lg hover:bg-red-600/30 transition-all"
                            >
                              🗑️ Delete
                            </button>
                            <button 
                              className="flex-1 px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 font-semibold rounded-lg hover:bg-gray-600/30 transition-all"
                              disabled
                            >
                              ✏️ Edit (Coming Soon)
                            </button>
                          </div>
                        ) : (
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
                        )}
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
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                          1
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">CryptoGamer_Pro</h3>
                          <p className="text-gray-400 text-sm">2,847 USDFG earned</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">94.2%</div>
                        <div className="text-gray-400 text-sm">Win Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Challenge Modal */}
        {showCreateModal && (
          <CreateChallengeModal 
            onClose={() => setShowCreateModal(false)} 
            isConnected={isConnected}
            onConnect={() => setIsConnected(true)}
            onCreateChallenge={handleCreateChallenge}
            usdfgPrice={usdfgPrice}
            usdfgToUsd={usdfgToUsd}
          />
        )}

        {/* Join Challenge Modal */}
        {showJoinModal && selectedChallenge && (
          <JoinChallengeModal 
            challenge={selectedChallenge}
            onClose={() => setShowJoinModal(false)}
            isConnected={isConnected}
            onConnect={() => setIsConnected(true)}
          />
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 sm:hidden bg-gradient-to-r from-cyan-400 to-purple-500 text-black p-4 rounded-full shadow-lg hover:brightness-110 transition-all z-40"
        >
          <span className="text-xl">+</span>
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
  const totalSteps = 3;
  const [connecting, setConnecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedNext, setAttemptedNext] = useState(false);

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

  // Game-specific modes
  const gameModes = {
    'NBA 2K25': ['Head-to-Head', 'Squad Match', 'Full Team Play', 'Custom Mode'],
    'FIFA 24': ['Head-to-Head', 'Squad Match', 'Full Team Play', 'Custom Mode'],
    'Street Fighter 6': ['Versus Match', 'Best-of-Series', 'Elimination Bracket', 'Custom Mode'],
    'Call of Duty': ['Duel', 'Squad Battle', 'Full Lobby', 'Battle Royale', 'Custom Mode'],
    'Tekken 8': ['Versus Match', 'Best-of-Series', 'Elimination Bracket', 'Custom Mode'],
    'Forza Horizon': ['Time Trial', 'Head-to-Head Race', 'Grand Prix', 'Custom Mode'],
    'Valorant': ['Duel', 'Squad Battle', 'Full Lobby', 'Custom Mode'],
    'Madden NFL 24': ['Head-to-Head', 'Squad Match', 'Full Team Play', 'Custom Mode'],
    'Other/Custom': ['Custom Mode']
  };

  // Comprehensive preset JSON for game + mode combinations
  const challengePresets = {
    'NBA 2K25': {
      'Head-to-Head': {
        rules: ['Game length: 4x6 minute quarters', 'Difficulty: All-Star', 'No duplicate teams', 'Standard NBA rules', 'Pause abuse = forfeit', 'Disconnect = forfeit unless agreed to rematch']
      },
      'Squad Match': {
        rules: ['Game length: 4x6 minute quarters', 'Difficulty: All-Star', 'Each player picks different teams', 'Communication allowed', 'Standard timeout rules', 'Both players must agree to restart']
      },
      'Full Team Play': {
        rules: ['Game length: 4x6 minute quarters', 'Difficulty: All-Star', 'Full 5v5 teams', 'Team captains handle disputes', 'No rage quitting', 'Standard NBA roster rules']
      }
    },
    'FIFA 24': {
      'Head-to-Head': {
        rules: ['Match length: 6-minute halves', 'Difficulty: World Class', 'No duplicate teams', 'Draw = penalties', 'Disconnect = forfeit unless agreed to rematch', 'Standard FIFA rules apply']
      },
      'Squad Match': {
        rules: ['Match length: 6-minute halves', 'Difficulty: World Class', 'Teams must be different', 'Voice chat allowed', 'Both players must agree to restart', '2v2 or 3v3 format allowed']
      },
      'Full Team Play': {
        rules: ['Match length: 6-minute halves', 'Difficulty: World Class', 'Full 11v11 teams', 'Team captains handle disputes', 'No duplicate players', 'Standard formation rules']
      }
    },
    'Street Fighter 6': {
      'Versus Match': {
        rules: ['Best of 3 rounds per match', 'Standard character roster', 'No duplicate characters', 'Tournament legal stages only', 'Rage quit = forfeit', 'Standard round timer (99 seconds)']
      },
      'Best-of-Series': {
        rules: ['Best of 5 matches', 'Winner keeps character', 'Loser can switch', 'Tournament legal stages', 'Standard round timer', 'No pause abuse']
      },
      'Elimination Bracket': {
        rules: ['Single elimination format', 'Best of 3 per match', 'Character lock per match', 'Tournament legal stages', 'Winner advances', 'Loser eliminated']
      }
    },
    'Call of Duty': {
      'Duel': {
        rules: ['First to 6 rounds wins', 'Random weapon rotation', 'No killstreaks', 'Standard gunfight maps', 'Connection issues require rematch', 'No camping allowed']
      },
      'Squad Battle': {
        rules: ['First to 6 rounds', 'Standard loadouts only', 'Communication allowed', 'No scorestreaks', 'Team must stay together', '2v2 or 3v3 format']
      },
      'Full Lobby': {
        rules: ['Team vs team format', '5v5 or 6v6 matches', 'Standard game modes', 'Communication allowed', 'No cheating/exploits', 'Best of 3 maps']
      },
      'Battle Royale': {
        rules: ['Last player/team standing', 'Solo or squad entry allowed', 'No teaming in solos', 'Standard BR rules', 'No stream sniping', 'Connection issues = rematch if early']
      }
    },
    'Tekken 8': {
      'Versus Match': {
        rules: ['Best of 3 rounds per match', 'All characters allowed', 'Tournament legal stages', 'No rage quitting', 'Standard round timer', 'No pause abuse']
      },
      'Best-of-Series': {
        rules: ['Best of 5 matches', 'Character switching allowed', 'Tournament legal stages', 'Winner keeps character option', 'Standard combo rules', 'No infinite combos']
      },
      'Elimination Bracket': {
        rules: ['Single elimination tournament', 'Best of 3 per match', 'Character lock per set', 'Tournament stages only', 'Winner advances', 'Standard Tekken rules']
      }
    },
    'Forza Horizon': {
      'Time Trial': {
        rules: ['Best single lap time wins', 'Stock vehicle restrictions', 'No collision detection', 'Track boundaries enforced', '3 attempts maximum', 'Weather conditions: clear']
      },
      'Head-to-Head Race': {
        rules: ['1v1 or small group races', 'Clean racing required', 'No ramming/griefing', 'Stock or tuned vehicles allowed', 'Best of 3 races', 'Track vote system']
      },
      'Grand Prix': {
        rules: ['Multi-track championship', 'Points system: 25-18-15-12-10-8-6-4-2-1', 'Clean racing enforced', 'Vehicle restrictions by class', 'Weather randomization', '5-7 race series']
      }
    },
    'Valorant': {
      'Duel': {
        rules: ['First to 13 rounds wins', 'Standard competitive rules', 'No coaching mid-game', 'Agent selection standard', 'Connection issues = pause/rematch', 'Anti-cheat required']
      },
      'Squad Battle': {
        rules: ['5v5 competitive format', 'Standard map pool', 'Agent restrictions by team agreement', 'Communication allowed', 'Standard economy rules', 'Overtime rules apply']
      },
      'Full Lobby': {
        rules: ['Full team vs team', 'Tournament format', 'Map bans/picks allowed', 'Professional ruleset', 'Coaching allowed between maps', 'Best of 3 maps']
      }
    },
    'Madden NFL 24': {
      'Head-to-Head': {
        rules: ['4x6 minute quarters', 'All-Pro difficulty', 'No duplicate teams', 'Standard NFL rules', 'No pause abuse', 'Disconnect = forfeit unless technical issue']
      },
      'Squad Match': {
        rules: ['2v2 or 3v3 format', 'Each player controls specific positions', 'Communication required', 'Team coordination essential', 'Standard game length', 'No AI assistance']
      },
      'Full Team Play': {
        rules: ['Full team vs full team', 'Position assignments required', 'Real-time communication', 'Standard NFL rules', 'Coaching decisions by captain', 'Realistic gameplay settings']
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

  const handleConnect = async () => {
    if (!hasPhantomInstalled()) {
      window.open('https://phantom.app/download', '_blank');
      return;
    }

    setConnecting(true);
    try {
      await connectPhantom();
      onConnect();
      // Close modal after successful connection
      onClose();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[92vw] max-w-xl rounded-2xl border border-white/10 bg-[#11051E] p-5">
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
            <p className="text-xs text-gray-400 mt-2">Step 1 of 3 — Game Setup</p>
          )}
          {currentStep === 2 && (
            <p className="text-xs text-gray-400 mt-2">Step 2 of 3 — Rules & Customization</p>
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
                {connecting ? "Connecting..." : "Connect Phantom"}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-4">
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
                          ${usdfgToUsd(formData.entryFee).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        1 USDFG = ${usdfgPrice.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Prize pool: ${(usdfgToUsd(formData.entryFee) * 2 * 0.95).toFixed(2)} USD (after 5% platform fee)
                    </div>
                  </div>
                </Field>

                <div className="flex justify-end">
                  <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
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

                <div className="flex justify-between">
                  <TertiaryButton onClick={prevStep}>Back</TertiaryButton>
                  <PrimaryButton onClick={nextStep}>Review & Create</PrimaryButton>
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
                        <div className="text-xs text-gray-400">${usdfgToUsd(formData.entryFee).toFixed(2)} USD</div>
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
                  <PrimaryButton onClick={handleSubmit} className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400">
                    Create Challenge
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
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
  const [state, setState] = useState<'review' | 'processing' | 'success' | 'error'>('review');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!hasPhantomInstalled()) {
      window.open('https://phantom.app/download', '_blank');
      return;
    }

    setConnecting(true);
    try {
      await connectPhantom();
      onConnect();
      setState('review'); // Go back to review state after connection
    } catch (error) {
      console.error('Connection failed:', error);
      setError('Failed to connect wallet');
      setState('error');
    } finally {
      setConnecting(false);
    }
  };

  const handleJoin = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      setState('error');
      return;
    }

    setState('processing');
    
    try {
      // TODO: Implement actual join logic with wallet checks
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setState('success');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to join challenge. Please try again.');
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
                {connecting ? "Connecting..." : "Connect Phantom"}
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

export default ArenaHome;