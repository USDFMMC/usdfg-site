import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ElegantButton from '@/components/ui/ElegantButton';
import { ADMIN_WALLET } from '@/lib/chain/config';

interface CreateChallengeFormProps {
  isConnected: boolean;
  onConnect: () => Promise<void> | void;
  onCreateChallenge: (data: any) => void;
  usdfgPrice: number;
  usdfgToUsd: (amount: number) => number;
  userGamerTag: string;
  currentWallet?: string | null; // Add wallet prop to check if admin
}

const CreateChallengeForm: React.FC<CreateChallengeFormProps> = ({
  isConnected: propIsConnected,
  onConnect,
  onCreateChallenge,
  usdfgPrice,
  usdfgToUsd,
  userGamerTag,
  currentWallet
}) => {
  // Also check wallet state directly to ensure UI updates immediately
  const { connected: walletConnected, publicKey } = useWallet();
  const isConnected = propIsConnected || walletConnected;
  
  const [formData, setFormData] = useState({
    game: 'NBA 2K25',
    platform: 'PS5',
    username: userGamerTag || '',
    entryFee: 50,
    mode: 'Head-to-Head',
    customMode: '',
    customGame: '', // Custom game name when "Custom" is selected
    customPlatform: '', // Custom platform name when "Other/Custom" is selected
    rules: '',
    customRules: false
  });

  // Update username when userGamerTag changes (e.g., when wallet switches)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      username: userGamerTag || ''
    }));
  }, [userGamerTag]);
  
  // Force re-render when connection state changes
  useEffect(() => {
    // This effect ensures the component re-renders when wallet connects/disconnects
    // The dependency on walletConnected will trigger a re-render
  }, [walletConnected, publicKey]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [connecting, setConnecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Game categories and options
  const gameCategories = {
    Sports: ["EA UFC 6", "FC 26", "Madden 26", "NBA 2K26"],
    Racing: ["F1 2023", "Mario Kart", "Gran Turismo 7"],
    Fighting: ["Mortal Kombat 1", "Street Fighter 6", "Tekken 8"],
    Shooting: ["COD MW3", "Fortnite", "Valorant"]
  };

  // Available games for selection (flattened + Custom)
  const availableGames = [...Object.values(gameCategories).flat(), "Custom"];

  // Platform options
  const platforms = ['PS5', 'Xbox', 'PC', 'Switch', 'Mobile', 'Other/Custom'];

  // Challenge modes by category
  const challengeModes = {
    Sports: [
      { label: "Full Match" },
      { label: "Quick Match (No halftime)" },
      { label: "2v2 Challenge" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." }
    ],
    Racing: [
      { label: "Best Lap Time" },
      { label: "1v1 Race to Finish" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." }
    ],
    Fighting: [
      { label: "Best of 3" },
      { label: "Mirror Match" },
      { label: "2v2 Team Fight" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." }
    ],
    Shooting: [
      { label: "Run the Fade" },
      { label: "10 and Done" },
      { label: "Snipers Only" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." }
    ]
  };

  // Game-specific modes - Enhanced with competitive options
  const gameModes = {
    'EA UFC 6': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Custom Challenge'],
    'FC 26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Custom Challenge'],
    'Madden 26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Custom Challenge'],
    'NBA 2K26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Custom Challenge'],
    'F1 2023': ['Best Lap Time', '1v1 Race to Finish', 'Custom Challenge'],
    'Mario Kart': ['Best Lap Time', '1v1 Race to Finish', 'Custom Challenge'],
    'Gran Turismo 7': ['Best Lap Time', '1v1 Race to Finish', 'Custom Challenge'],
    'Mortal Kombat 1': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Custom Challenge'],
    'Street Fighter 6': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Custom Challenge'],
    'Tekken 8': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Custom Challenge'],
    'COD MW3': ['Run the Fade', '10 and Done', 'Snipers Only', 'Custom Challenge'],
    'Fortnite': ['Run the Fade', '10 and Done', 'Snipers Only', 'Custom Challenge'],
    'Valorant': ['Run the Fade', '10 and Done', 'Snipers Only', 'Custom Challenge'],
    'Custom': ['Custom Challenge']
  };

  const getModeExplanation = (mode: string) => {
    const explanations: { [key: string]: string } = {
      // Sports modes
      'Full Match': 'Complete game duration with full regulation time. Best for competitive players who want the complete experience.',
      'Quick Match (No halftime)': 'Fast-paced shortened matches without halftime breaks. Perfect for quick sessions and rapid-fire competition.',
      '2v2 Challenge': 'Team-based action requiring coordination with teammates. Communication and teamwork are essential for victory.',
      
      // Racing modes
      'Best Lap Time': 'Race against the clock to set the fastest lap time. Precision and speed matter most.',
      '1v1 Race to Finish': 'Direct head-to-head racing competition. Pure speed and skill determine the winner.',
      
      // Fighting modes
      'Best of 3': 'Tournament-style series where first to win 2 games advances. High stakes, high rewards.',
      'Mirror Match': 'Both players use the same character. Pure skill vs skill with no character advantages.',
      '2v2 Team Fight': 'Team coordination required. Communication and strategy are crucial for team victory.',
      
      // Shooting modes
      'Run the Fade': 'Intense 1v1 combat. No teammates, no excuses - just pure skill and reflexes.',
      '10 and Done': 'First to 10 kills wins. Fast-paced action with clear victory conditions.',
      'Snipers Only': 'Sniper rifles only. Precision and patience are key to victory.',
      
      // Custom
      'Custom Challenge': 'Create your own rules and format. Maximum flexibility for unique challenges.'
    };
    return explanations[mode] || 'Custom challenge format with your own rules.';
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (attemptedNext) {
      setValidationErrors([]);
    }
  };

  const handleAutoRules = () => {
    const mode = formData.mode;
    let rules = '';
    
    if (mode === 'Full Match') {
      rules = '• Full game duration\n• Standard game settings\n• No substitutions\n• Winner takes all';
    } else if (mode === 'Quick Match (No halftime)') {
      rules = '• Shortened duration\n• No halftime breaks\n• Fast-paced action\n• Winner takes all';
    } else if (mode === '2v2 Challenge') {
      rules = '• Team coordination required\n• Communication essential\n• No solo play\n• Team victory';
    } else if (mode === 'Best Lap Time') {
      rules = '• Race against clock\n• Best time wins\n• No collisions\n• Precision required';
    } else if (mode === '1v1 Race to Finish') {
      rules = '• Direct head-to-head racing\n• No assists\n• Pure speed and skill\n• Winner takes all';
    } else if (mode === 'Best of 3') {
      rules = '• First to win 2 games\n• No breaks between games\n• Standard settings\n• Winner advances';
    } else if (mode === 'Mirror Match') {
      rules = '• Same character for both players\n• Pure skill competition\n• No character advantages\n• Winner takes all';
    } else if (mode === '2v2 Team Fight') {
      rules = '• Team coordination required\n• Communication essential\n• Team strategy\n• Team victory';
    } else if (mode === 'Run the Fade') {
      rules = '• 1v1 combat\n• No teammates\n• Pure skill and reflexes\n• Winner takes all';
    } else if (mode === '10 and Done') {
      rules = '• First to 10 kills wins\n• Fast-paced action\n• Clear victory conditions\n• Winner takes all';
    } else if (mode === 'Snipers Only') {
      rules = '• Sniper rifles only\n• Precision and patience\n• No other weapons\n• Winner takes all';
    } else {
      rules = '• Custom rules\n• Flexible format\n• Your own challenge\n• Winner takes all';
    }
    
    handleInputChange('rules', rules);
  };

  const validateStep = (step: number) => {
    const errors: string[] = [];
    
    if (step === 1) {
      if (!formData.game) errors.push('Please select a game');
      if (formData.game === 'Custom' && !formData.customGame?.trim()) {
        errors.push('Please enter a custom game name');
      }
      if (!formData.platform) errors.push('Please select a platform');
      if (formData.platform === 'Other/Custom' && !formData.customPlatform?.trim()) {
        errors.push('Please enter a custom platform name');
      }
      if (!formData.username.trim()) errors.push('Username is required');
    }
    
    if (step === 2) {
      if (!formData.mode) errors.push('Please select a challenge mode');
      const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) : formData.entryFee;
      
      // Check if user is admin (allow 0 entry fee for Founder Challenges)
      const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
      
      if (isNaN(entryFee)) {
        errors.push('Entry fee must be a valid number');
      } else if (!isAdmin && (entryFee < 0.000000001 || entryFee === 0)) {
        errors.push('Minimum entry fee is 0.000000001 USDFG (1 lamport - smallest unit)');
      } else if (isAdmin && entryFee < 0) {
        errors.push('Entry fee cannot be negative');
      } else if (entryFee > 1000) {
        errors.push('Maximum entry fee is 1000 USDFG');
      }
      
      // Allow 0 entry fee for admin (Founder Challenges)
      if (isAdmin && entryFee === 0) {
        // Valid - no error for Founder Challenges
      }
    }
    
    if (step === 3) {
      if (!formData.rules.trim()) errors.push('Please provide challenge rules');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    setAttemptedNext(true);
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Helper function to get game category
  const getGameCategory = (game: string) => {
    if (!game) return 'Sports';
    
    const lowerGame = game.toLowerCase();
    if (lowerGame.includes('street fighter') || lowerGame.includes('tekken') || lowerGame.includes('mortal kombat') || lowerGame.includes('guilty gear') || lowerGame.includes('fighting')) return 'Fighting';
    if (lowerGame.includes('forza') || lowerGame.includes('gran turismo') || lowerGame.includes('f1') || lowerGame.includes('mario kart') || lowerGame.includes('racing')) return 'Racing';
    if (lowerGame.includes('call of duty') || lowerGame.includes('cod') || lowerGame.includes('valorant') || lowerGame.includes('shooting')) return 'Shooting';
    if (lowerGame.includes('nba') || lowerGame.includes('fifa') || lowerGame.includes('madden') || lowerGame.includes('sports') || lowerGame.includes('ufc')) return 'Sports';
    
    return 'Sports'; // Default fallback
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      // Use custom game name if "Custom" is selected, otherwise use the selected game
      const gameName = formData.game === 'Custom' ? formData.customGame : formData.game;
      // Use custom platform name if "Other/Custom" is selected, otherwise use the selected platform
      const platformName = formData.platform === 'Other/Custom' ? formData.customPlatform : formData.platform;
      
      const challengeData = {
        ...formData,
        game: gameName, // Use custom game name or selected game
        platform: platformName, // Use custom platform name or selected platform
        maxPlayers: formData.mode.includes('2v2') ? 2 : formData.mode.includes('3v3') ? 3 : formData.mode.includes('5v5') ? 5 : 2,
        // Don't set prizePool here - it will be calculated in handleCreateChallenge
        // prizePool: formData.entryFee * 2, // REMOVED - calculated in handleCreateChallenge with platform fee
        category: getGameCategory(gameName), // Get category from game name
        creatorTag: formData.username
      };
      
      onCreateChallenge(challengeData);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex items-center space-x-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              i + 1 <= currentStep 
                ? 'bg-gradient-to-r from-amber-300/90 to-yellow-200/90 text-zinc-900 shadow-[0_0_8px_rgba(255,215,130,0.2)] border border-amber-400/30' 
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50'
            }`}>
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-6 h-0.5 ${
                i + 1 < currentStep ? 'bg-gradient-to-r from-amber-300/90 to-yellow-200/90 shadow-[0_0_4px_rgba(255,215,130,0.2)]' : 'bg-zinc-800/60'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Game Selection */}
      {currentStep === 1 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-3">Choose Your Game</h3>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {availableGames.map((game) => (
                <button
                  key={game}
                  onClick={() => {
                    handleInputChange('game', game);
                    // Clear custom game name if not selecting Custom
                    if (game !== 'Custom') {
                      handleInputChange('customGame', '');
                    }
                  }}
                  className={`px-3 py-2 rounded-lg border transition-all duration-300 text-sm ${
                    formData.game === game
                      ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_10px_rgba(255,215,130,0.15)]'
                      : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30 hover:shadow-[0_0_6px_rgba(255,215,130,0.08)]'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>
            
            {/* Custom Game Name Input - Show only when Custom is selected */}
            {formData.game === 'Custom' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Custom Game Name</label>
                <input
                  type="text"
                  value={formData.customGame}
                  onChange={(e) => handleInputChange('customGame', e.target.value)}
                  placeholder="Enter your custom game name"
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 hover:border-amber-300/30 focus:border-amber-400/50 focus:outline-none transition-all"
                />
                <p className="text-xs text-zinc-500 mt-1">Please enter the name of your custom game</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => {
                handleInputChange('platform', e.target.value);
                // Clear custom platform name if not selecting Other/Custom
                if (e.target.value !== 'Other/Custom') {
                  handleInputChange('customPlatform', '');
                }
              }}
              className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white hover:border-amber-300/30 focus:border-amber-400/50 focus:outline-none transition-all"
            >
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
            
            {/* Custom Platform Name Input - Show only when Other/Custom is selected */}
            {formData.platform === 'Other/Custom' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Custom Platform Name</label>
                <input
                  type="text"
                  value={formData.customPlatform}
                  onChange={(e) => handleInputChange('customPlatform', e.target.value)}
                  placeholder="Enter your custom platform name"
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 hover:border-amber-300/30 focus:border-amber-400/50 focus:outline-none transition-all"
                />
                <p className="text-xs text-zinc-500 mt-1">Please enter the name of your custom platform</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Your Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your gaming username"
              className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 hover:border-amber-300/30 focus:border-amber-400/50 focus:outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Step 2: Challenge Setup */}
      {currentStep === 2 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-3">Challenge Configuration</h3>
            
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Challenge Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => handleInputChange('mode', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white focus:border-amber-400/50 focus:outline-none transition-all"
              >
                {gameModes[formData.game as keyof typeof gameModes]?.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
              
              {/* Mode explanation */}
              <div className="mt-2 p-2 bg-zinc-800/40 rounded-lg border border-zinc-700/50">
                <p className="text-xs text-gray-300 whitespace-pre-line">
                  {getModeExplanation(formData.mode)}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-zinc-700/50">
                  <ElegantButton
                    onClick={handleAutoRules}
                    variant="secondary"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    Auto-Generate Rules
                  </ElegantButton>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Entry Fee (USDFG)
                {currentWallet && (() => {
                  const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                  return isAdmin ? <span className="text-purple-400 ml-1.5 text-xs">🏆 (Founder: Enter 0 for free entry)</span> : null;
                })()}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.entryFee || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Always store as string to preserve decimal input
                    handleInputChange('entryFee', value);
                  }}
                  placeholder={currentWallet && (() => {
                    const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    return isAdmin ? '0 for Founder Challenge' : '';
                  })()}
                  className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none transition-all"
                />
                <div className="text-xs text-gray-400">
                  ≈ ${usdfgToUsd(typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0).toFixed(2)} USD
                </div>
              </div>
              <div className="mt-1.5 text-xs text-gray-400">
                {(() => {
                  const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                  const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0;
                  if (isAdmin && entryFee === 0) {
                    return <span className="text-purple-300">🏆 Founder Challenge - Set prize pool manually when transferring USDFG</span>;
                  }
                  return <>Prize Pool: {(typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0) * 2} USDFG (2x entry fee)</>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Rules */}
      {currentStep === 3 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-3">Challenge Rules</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Rules & Conditions
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                placeholder="Enter detailed rules for your challenge..."
                rows={5}
                className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none resize-none transition-all"
              />
              <div className="mt-1.5 text-xs text-gray-400">
                Be specific about game settings, time limits, and winning conditions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-red-400 font-medium mb-1.5 text-xs">Please fix the following errors:</div>
          <ul className="text-red-300 text-xs space-y-0.5">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-3 border-t border-zinc-700/50">
        <ElegantButton
          onClick={handlePrev}
          variant="secondary"
          disabled={currentStep === 1}
          className="text-sm px-3 py-1.5"
        >
          Previous
        </ElegantButton>

        <div className="flex space-x-2">
          {currentStep < totalSteps ? (
            <ElegantButton
              onClick={handleNext}
              variant="primary"
              className="text-sm px-3 py-1.5"
            >
              Next
            </ElegantButton>
          ) : (
            <ElegantButton
              onClick={handleSubmit}
              variant="success"
              disabled={!isConnected}
              className="text-sm px-3 py-1.5"
            >
              Create Challenge
            </ElegantButton>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs mb-2">
            Connect your wallet to create challenges and compete for rewards!
          </p>
          <ElegantButton
            onClick={handleConnect}
            variant="warning"
            disabled={connecting}
            className="text-xs px-3 py-1.5"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </ElegantButton>
        </div>
      )}
    </div>
  );
};

export default CreateChallengeForm;