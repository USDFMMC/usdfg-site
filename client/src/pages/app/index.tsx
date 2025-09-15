import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import WalletConnect from "@/components/arena/WalletConnect";
import { connectPhantom, hasPhantomInstalled } from "@/lib/wallet/solana";

const ArenaHome: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [challenges, setChallenges] = useState([
    {
      id: "ch_01",
      title: "Street Fighter Tournament",
      game: "Street Fighter",
      mode: "1v1",
      entryFee: 50,
      prizePool: 95, // 50 * 2 - 5% platform fee = 100 - 5 = 95
      players: 2,
      capacity: 8,
      category: "Fighting"
    }
  ]);

  const handleCreateChallenge = (challengeData: any) => {
    const platformFee = 0.05; // 5% platform fee
    const totalPrize = challengeData.entryFee * 2; // Challenger matches entry fee
    const prizePool = totalPrize - (totalPrize * platformFee); // Minus platform fee
    
    const newChallenge = {
      id: `ch_${Date.now()}`,
      title: `${challengeData.game} ${challengeData.mode}`,
      game: challengeData.game,
      mode: challengeData.mode,
      entryFee: challengeData.entryFee,
      prizePool: Math.round(prizePool), // Round to whole number
      players: 1,
      capacity: 8,
      category: challengeData.category
    };
    setChallenges(prev => [newChallenge, ...prev]);
  };

  return (
    <>
      <Helmet>
        <title>USDFG Arena - Gaming Platform | USDFGAMING</title>
        <meta name="description" content="Enter the USDFG Arena - Compete in skill-based challenges, earn $USDFG, and prove your gaming prowess." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        {/* Header */}
        <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold">🎮</span>
                  </div>
                  <span className="text-xl font-bold text-white">USDFG Arena</span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black px-4 py-2 rounded-full font-semibold hover:brightness-110 transition-all"
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
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Welcome to the <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Arena</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Compete in skill-based challenges, earn $USDFG, and prove your gaming prowess against players worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black px-6 py-3 rounded-full font-semibold hover:brightness-110 transition-all"
              >
                Create Challenge
              </button>
              <Link 
                to="#challenges"
                className="text-cyan-400 underline underline-offset-4 hover:text-cyan-300 transition-colors"
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
              <div className="text-gray-400 text-sm">$USDFG Rewarded</div>
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
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🎯</span>
                  Available Challenges
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {challenges.map((challenge) => (
                    <div key={challenge.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-white">🥊</span>
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{challenge.title}</h3>
                            <p className="text-gray-400 text-sm">{challenge.category} • {challenge.game}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                          Active
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-white font-semibold">{challenge.entryFee} $USDFG</div>
                          <div className="text-gray-400 text-xs">Entry Fee</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">{challenge.prizePool} $USDFG</div>
                          <div className="text-gray-400 text-xs">Prize Pool</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">{challenge.players}/{challenge.capacity}</div>
                          <div className="text-gray-400 text-xs">Players</div>
                        </div>
                      </div>
                      
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
                    </div>
                  ))}
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
                          <p className="text-gray-400 text-sm">2,847 $USDFG earned</p>
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

// Create Challenge Modal Component
const CreateChallengeModal: React.FC<{ onClose: () => void; isConnected: boolean; onConnect: () => void; onCreateChallenge: (data: any) => void }> = ({ onClose, isConnected, onConnect, onCreateChallenge }) => {
  const [formData, setFormData] = useState({
    category: 'Fighting',
    game: 'Street Fighter',
    mode: '1v1',
    entryFee: 50,
    prizePool: 150
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [connecting, setConnecting] = useState(false);

  const categories = {
    'Shooting': ['Call of Duty', 'Fortnite', 'Apex Legends', 'Valorant'],
    'Racing': ['Need for Speed', 'Forza', 'Gran Turismo', 'Mario Kart'],
    'Fighting': ['Street Fighter', 'Tekken', 'Mortal Kombat', 'Super Smash Bros'],
    'Sports': ['FIFA', 'NBA 2K', 'Madden NFL', 'Rocket League']
  };

  const modes = {
    'Shooting': ['1v1', '2v2', 'Free-for-all', 'Tournament'],
    'Racing': ['1v1', '2v2', 'Time Trial', 'Tournament'],
    'Fighting': ['1v1', '2v2', 'Best of 3', 'Tournament'],
    'Sports': ['1v1', '2v2', 'Team vs Team', 'Tournament']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create the challenge
    onCreateChallenge(formData);
    onClose();
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block text-sm">
      <span className="mb-1 block opacity-80 text-gray-300">{label}</span>
      {children}
    </label>
  );

  const PrimaryButton = ({ children, onClick, disabled, className = "" }: { 
    children: any; 
    onClick?: () => void; 
    disabled?: boolean; 
    className?: string; 
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );

  const TertiaryButton = ({ children, onClick, className = "" }: { 
    children: any; 
    onClick?: () => void; 
    className?: string; 
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium opacity-90 hover:opacity-100 border border-white/10 bg-white/5 ${className}`}
    >
      {children}
    </button>
  );

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
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Step 1: Category */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Field label="Category">
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value, game: categories[e.target.value as keyof typeof categories][0]})}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                  >
                    {Object.keys(categories).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex justify-end">
                  <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
                </div>
              </div>
            )}

            {/* Step 2: Game */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Field label="Game">
                  <select 
                    value={formData.game}
                    onChange={(e) => setFormData({...formData, game: e.target.value})}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                  >
                    {categories[formData.category as keyof typeof categories].map(game => (
                      <option key={game} value={game}>{game}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex justify-between">
                  <TertiaryButton onClick={prevStep}>Back</TertiaryButton>
                  <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
                </div>
              </div>
            )}

            {/* Step 3: Mode */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Field label="Mode">
                  <select 
                    value={formData.mode}
                    onChange={(e) => setFormData({...formData, mode: e.target.value})}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                  >
                    {modes[formData.category as keyof typeof modes].map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex justify-between">
                  <TertiaryButton onClick={prevStep}>Back</TertiaryButton>
                  <PrimaryButton onClick={nextStep}>Next</PrimaryButton>
                </div>
              </div>
            )}

            {/* Step 4: Entry & Prize */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Entry (USDFG)">
                    <input
                      type="number"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({...formData, entryFee: Number(e.target.value)})}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                      placeholder="50"
                    />
                  </Field>
                  <Field label="Prize Pool (USDFG)">
                    <input
                      type="number"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({...formData, prizePool: Number(e.target.value)})}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                      placeholder="150"
                    />
                  </Field>
                </div>

                {/* Review Summary */}
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-2">Challenge Summary</h4>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="text-white">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Game:</span>
                      <span className="text-white">{formData.game}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span className="text-white">{formData.mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry Fee:</span>
                      <span className="text-cyan-400">{formData.entryFee} USDFG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prize Pool:</span>
                      <span className="text-cyan-400">{formData.prizePool} USDFG</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <TertiaryButton onClick={prevStep}>Back</TertiaryButton>
                  <PrimaryButton type="submit">Publish Challenge</PrimaryButton>
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