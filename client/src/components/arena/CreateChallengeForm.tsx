import React, { useState } from 'react';
import ElegantButton from '@/components/ui/ElegantButton';

interface CreateChallengeFormProps {
  isConnected: boolean;
  onConnect: () => void;
  onCreateChallenge: (data: any) => void;
  usdfgPrice: number;
  usdfgToUsd: (amount: number) => number;
}

const CreateChallengeForm: React.FC<CreateChallengeFormProps> = ({
  isConnected,
  onConnect,
  onCreateChallenge,
  usdfgPrice,
  usdfgToUsd
}) => {
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
  const platforms = ['PS5', 'Xbox', 'PC', 'Switch', 'Other/Custom'];

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
      if (!formData.platform) errors.push('Please select a platform');
      if (!formData.username.trim()) errors.push('Username is required');
    }
    
    if (step === 2) {
      if (!formData.mode) errors.push('Please select a challenge mode');
      if (formData.entryFee < 10) errors.push('Minimum entry fee is 10 USDFG');
      if (formData.entryFee > 1000) errors.push('Maximum entry fee is 1000 USDFG');
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

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      const challengeData = {
        ...formData,
        maxPlayers: formData.mode.includes('2v2') ? 2 : formData.mode.includes('3v3') ? 3 : formData.mode.includes('5v5') ? 5 : 2,
        prizePool: formData.entryFee * 2, // 2x entry fee as prize pool
        category: formData.game,
        creatorTag: formData.username,
        platform: formData.platform
      };
      
      onCreateChallenge(challengeData);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      onConnect();
      setConnecting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              i + 1 <= currentStep 
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black' 
                : 'bg-gray-700 text-gray-400'
            }`}>
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-8 h-0.5 ${
                i + 1 < currentStep ? 'bg-gradient-to-r from-cyan-400 to-purple-500' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Game Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Choose Your Game</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {availableGames.map((game) => (
                <button
                  key={game}
                  onClick={() => handleInputChange('game', game)}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                    formData.game === game
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your gaming username"
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>
      )}

      {/* Step 2: Challenge Setup */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Challenge Configuration</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => handleInputChange('mode', e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                {gameModes[formData.game as keyof typeof gameModes]?.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
              
              {/* Mode explanation */}
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-300 whitespace-pre-line">
                  {getModeExplanation(formData.mode)}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <ElegantButton
                    onClick={handleAutoRules}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    Auto-Generate Rules
                  </ElegantButton>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Fee (USDFG)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.entryFee}
                  onChange={(e) => handleInputChange('entryFee', parseInt(e.target.value) || 0)}
                  className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <div className="text-sm text-gray-400">
                  ≈ ${usdfgToUsd(formData.entryFee).toFixed(2)} USD
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Prize Pool: {formData.entryFee * 2} USDFG (2x entry fee)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Rules */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Challenge Rules</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rules & Conditions
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                placeholder="Enter detailed rules for your challenge..."
                rows={6}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
              />
              <div className="mt-2 text-sm text-gray-400">
                Be specific about game settings, time limits, and winning conditions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-red-400 font-medium mb-2">Please fix the following errors:</div>
          <ul className="text-red-300 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-700">
        <ElegantButton
          onClick={handlePrev}
          variant="secondary"
          disabled={currentStep === 1}
        >
          Previous
        </ElegantButton>

        <div className="flex space-x-3">
          {currentStep < totalSteps ? (
            <ElegantButton
              onClick={handleNext}
              variant="primary"
            >
              Next
            </ElegantButton>
          ) : (
            <ElegantButton
              onClick={handleSubmit}
              variant="success"
              disabled={!isConnected}
            >
              Create Challenge
            </ElegantButton>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm mb-3">
            Connect your wallet to create challenges and compete for rewards!
          </p>
          <ElegantButton
            onClick={handleConnect}
            variant="warning"
            disabled={connecting}
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </ElegantButton>
        </div>
      )}
    </div>
  );
};

export default CreateChallengeForm;