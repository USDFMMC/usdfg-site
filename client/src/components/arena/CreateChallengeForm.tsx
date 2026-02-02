import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Info } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import ElegantButton from '@/components/ui/ElegantButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ADMIN_WALLET } from '@/lib/chain/config';
import { getWalletScopedValue, PROFILE_STORAGE_KEYS } from '@/lib/storage/profile';

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
  const { connected: walletConnected, publicKey, wallets } = useWallet();
  
  // Check adapter state directly for more reliable connection detection
  const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
  const adapterConnected = phantomWallet?.adapter?.connected || false;
  const adapterPublicKey = phantomWallet?.adapter?.publicKey || null;
  
  // Use the most reliable connection state (adapter > hook > prop)
  const isConnected = adapterConnected || walletConnected || propIsConnected || !!adapterPublicKey;
  
  // Game-specific modes - MUST be defined before getFirstPresetMode
  const gameModes = {
    'EA UFC 6': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'FC 26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Madden 26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'NBA 2K26': ['Full Match', 'Quick Match (No halftime)', '2v2 Challenge', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'F1 2023': ['Best Lap Time', '1v1 Race to Finish', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Mario Kart': ['Best Lap Time', '1v1 Race to Finish', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Gran Turismo 7': ['Best Lap Time', '1v1 Race to Finish', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Forza Horizon 5': ['Time Trial', 'Head-to-Head Race', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Forza Horizon': ['Time Trial', 'Head-to-Head Race', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Forza Motorsport': ['Time Trial', 'Head-to-Head Race', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Mortal Kombat 1': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Street Fighter 6': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Tekken 8': ['Best of 3', 'Mirror Match', '2v2 Team Fight', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'COD MW3': ['Search and Destroy', 'Run the Fade', '10 and Done', 'Snipers Only', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Fortnite': ['Search and Destroy', 'Run the Fade', '10 and Done', 'Snipers Only', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Valorant': ['Search and Destroy', 'Run the Fade', '10 and Done', 'Snipers Only', 'Tournament (Bracket Mode)', 'Custom Challenge'],
    'Custom': ['Custom Challenge', 'Tournament (Bracket Mode)']
  };
  
  // Get first preset mode for the default game
  const getFirstPresetMode = (game: string) => {
    const modes = gameModes[game as keyof typeof gameModes];
    if (modes && modes.length > 0) {
      // Filter out 'Tournament (Bracket Mode)' and 'Custom Challenge', return first preset
      const presetModes = modes.filter(mode => mode !== 'Tournament (Bracket Mode)' && mode !== 'Custom Challenge');
      return presetModes[0] || 'Full Match';
    }
    return 'Full Match';
  };

  // Initialize form data with first preset mode
  const [formData, setFormData] = useState(() => {
    const defaultGame = 'NBA 2K26';
    const defaultMode = gameModes[defaultGame as keyof typeof gameModes]?.[0] || 'Full Match';
    return {
      game: defaultGame,
    platform: 'PS5',
    username: userGamerTag || '',
    entryFee: 50,
    founderChallengeCount: 1,
    founderParticipantReward: 0,
    founderWinnerBonus: 0,
      mode: defaultMode, // Use first preset mode (Full Match) instead of 'Head-to-Head'
    customMode: '',
    customGame: '', // Custom game name when "Custom" is selected
    customPlatform: '', // Custom platform name when "Other/Custom" is selected
    rules: '',
    customRules: false,
    challengeType: 'solo' as 'solo' | 'team' | 'tournament', // Toggle between solo, team, and tournament challenge
    teamOnly: false, // For team challenges: true = only teams can accept, false = open to anyone
    tournamentMaxPlayers: 8 as 4 | 8 | 16,
    };
  });

  const tournamentPlayerOptions: Array<4 | 8 | 16> = [4, 8, 16];

  const isTournamentMode = useMemo(() => {
    return formData.challengeType === 'tournament';
  }, [formData.challengeType]);

  // Update username when userGamerTag changes (e.g., when wallet switches)
  useEffect(() => {
    if (userGamerTag) {
      setFormData(prev => ({
        ...prev,
        username: userGamerTag
      }));
    }
  }, [userGamerTag]);
    
    // Update username immediately when wallet connects (check localStorage directly)
    useEffect(() => {
      if (isConnected && publicKey) {
        const walletKey = publicKey.toString();
        const savedGamerTag = getWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey);
        
        if (savedGamerTag && savedGamerTag !== formData.username) {
          setFormData(prev => ({
            ...prev,
            username: savedGamerTag
          }));
        }
        
        const timeoutId = setTimeout(() => {
          const updatedGamerTag = getWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey);
          if (updatedGamerTag && updatedGamerTag !== formData.username) {
            setFormData(prev => ({
              ...prev,
              username: updatedGamerTag
            }));
          }
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }, [isConnected, publicKey, formData.username]);
  
  // Force re-render when connection state changes
  useEffect(() => {
    // This effect ensures the component re-renders when wallet connects/disconnects
    // The dependency on walletConnected, adapterConnected, and publicKey will trigger a re-render
  }, [walletConnected, adapterConnected, publicKey, adapterPublicKey]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [connecting, setConnecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Game categories and options - Simple, clean list for UI
  // Note: Image mapping logic in index.tsx handles all game variations automatically
  const gameCategories = {
    Sports: ["FC 26", "NBA 2K26"],
    Racing: ["Gran Turismo 7", "Forza Horizon 5", "Mario Kart"],
    Fighting: ["Mortal Kombat 1", "Street Fighter 6", "Tekken 8"],
    Shooting: ["COD MW3", "Fortnite", "Valorant"]
  };

  // Available games for selection (flattened + single Custom option)
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
      { label: "Search and Destroy" },
      { label: "Run the Fade" },
      { label: "10 and Done" },
      { label: "Snipers Only" },
      { label: "Custom Challenge", tooltip: "Manual review required. Use only when standard modes don't apply." }
    ]
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
      'Time Trial': 'Race against the clock to set the fastest lap time. Precision and speed matter most.',
      'Head-to-Head Race': 'Direct head-to-head racing competition. First player to cross the finish line wins. No shortcuts or exploits allowed.',
      
      // Fighting modes
      'Best of 3': 'Tournament-style series where first to win 2 games advances. High stakes, high rewards.',
      'Mirror Match': 'Both players use the same character. Pure skill vs skill with no character advantages.',
      '2v2 Team Fight': 'Team coordination required. Communication and strategy are crucial for team victory.',
      
      // Shooting modes
      'Search and Destroy': 'Attack or defend. One life per round, plant or defuse the bomb. First to 6 rounds wins.',
      'Run the Fade': 'Intense 1v1 combat. No teammates, no excuses - just pure skill and reflexes.',
      '10 and Done': 'First to 10 kills wins. Fast-paced action with clear victory conditions.',
      'Snipers Only': 'Sniper rifles only. Precision and patience are key to victory.',
      
      // Custom
      'Custom Challenge': 'Create your own rules and format. Maximum flexibility for unique challenges.',
      'Tournament (Bracket Mode)': 'Run a mini bracket with 4, 8, or 16 players. Winners advance until a champion is crowned.'
    };
    return explanations[mode] || 'Custom challenge format with your own rules.';
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When game changes, update mode to first preset mode for that game
      if (field === 'game') {
        updated.mode = getFirstPresetMode(value);
      }
      
      return updated;
    });
    if (attemptedNext) {
      setValidationErrors([]);
    }
  };

  const handleAutoRules = () => {
    const mode = formData.mode;
    let rules = '';
    
    if (mode === 'Full Match') {
      rules = '• Full game duration\n• Standard game settings\n• No substitutions\n• The winner claims the challenge reward';
    } else if (mode === 'Quick Match (No halftime)') {
      rules = '• Shortened duration\n• No halftime breaks\n• Fast-paced action\n• The winner claims the challenge reward';
    } else if (mode === '2v2 Challenge') {
      rules = '• Team coordination required\n• Communication essential\n• No solo play\n• Team victory';
    } else if (mode === 'Best Lap Time') {
      rules = '• Race against clock\n• Best time wins\n• No collisions\n• Precision required';
    } else if (mode === '1v1 Race to Finish') {
      rules = '• Direct head-to-head racing\n• No assists\n• Pure speed and skill\n• The winner claims the challenge reward';
    } else if (mode === 'Time Trial') {
      rules = '• Race against clock\n• Best time wins\n• No collisions\n• Precision required';
    } else if (mode === 'Head-to-Head Race') {
      rules = '• Direct head-to-head racing\n• First to cross the finish line wins\n• No shortcuts, exploits, or glitches\n• Standard race settings only\n• The winner claims the challenge reward';
    } else if (mode === 'Best of 3') {
      rules = '• First to win 2 games\n• No breaks between games\n• Standard settings\n• Winner advances';
    } else if (mode === 'Mirror Match') {
      rules = '• Same character for both players\n• Pure skill competition\n• No character advantages\n• The winner claims the challenge reward';
    } else if (mode === '2v2 Team Fight') {
      rules = '• Team coordination required\n• Communication essential\n• Team strategy\n• Team victory';
    } else if (mode === 'Search and Destroy') {
      rules = '• First to 6 rounds (attack/defend)\n• One life per round\n• Plant or defuse the bomb\n• Standard SnD maps\n• The winner claims the challenge reward';
    } else if (mode === 'Run the Fade') {
      rules = '• 1v1 combat\n• No teammates\n• Pure skill and reflexes\n• The winner claims the challenge reward';
    } else if (mode === '10 and Done') {
      rules = '• First to 10 kills wins\n• Fast-paced action\n• Clear victory conditions\n• The winner claims the challenge reward';
    } else if (mode === 'Snipers Only') {
      rules = '• Sniper rifles only\n• Precision and patience\n• No other weapons\n• The winner claims the challenge reward';
    } else if (mode === 'Tournament (Bracket Mode)') {
      rules = '• Single elimination bracket\n• Winners advance automatically\n• Challenge amounts locked for all participants\n• Submit results with proof after each match\n• Disconnects = round loss unless opponents agree to rematch';
    } else {
      rules = '• Custom rules\n• Flexible format\n• Your own challenge\n• The winner claims the challenge reward';
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
      // Only require mode for non-tournament challenges
      if (!isTournamentMode && !formData.mode) {
        errors.push('Please select a challenge mode');
      }
      const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) : formData.entryFee;
      
      // Check if user is admin (allow 0 entry fee for Founder Challenges)
      const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
      
      if (isNaN(entryFee)) {
        errors.push('Challenge amount must be a valid number');
      } else if (!isAdmin && (entryFee < 0.000000001 || entryFee === 0)) {
        errors.push('Minimum challenge amount is 0.000000001 USDFG (1 lamport - smallest unit)');
      } else if (isAdmin && entryFee < 0) {
        errors.push('Challenge amount cannot be negative');
      } else if (entryFee > 1000) {
        errors.push('Maximum challenge amount is 1000 USDFG');
      }
      
      // Allow 0 challenge amount for admin (Founder Challenges)
      if (isAdmin && entryFee === 0) {
        // Valid - no error for Founder Challenges
      }

      const challengeCount = Number(formData.founderChallengeCount || 1);
      if (!Number.isFinite(challengeCount) || challengeCount < 1) {
        errors.push('Number of challenges must be at least 1');
      } else if (challengeCount > 25) {
        errors.push('Number of challenges cannot exceed 25');
      }

      if (isAdmin && entryFee === 0 && isTournamentMode) {
        const participantReward = Number(formData.founderParticipantReward ?? 0);
        const winnerBonus = Number(formData.founderWinnerBonus ?? 0);
        if (!Number.isFinite(participantReward) || participantReward < 0) {
          errors.push('Participant reward must be 0 or more');
        }
        if (!Number.isFinite(winnerBonus) || winnerBonus < 0) {
          errors.push('Winner bonus must be 0 or more');
        }
        if (participantReward <= 0 && winnerBonus <= 0) {
          errors.push('Set a participant reward or winner bonus for Founder Tournaments');
        }
      }

      // Validate tournament bracket size
      if (isTournamentMode) {
        const maxPlayers = Number(formData.tournamentMaxPlayers);
        if (!tournamentPlayerOptions.includes(maxPlayers as 4 | 8 | 16)) {
          errors.push('Select a valid tournament size (4, 8, or 16 players).');
        }
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
      
      const selectedMode = formData.mode || '';
      const isTournamentSelected = formData.challengeType === 'tournament';
      const defaultMaxPlayers = selectedMode.includes('2v2')
        ? 2
        : selectedMode.includes('3v3')
        ? 3
        : selectedMode.includes('5v5')
        ? 5
        : 2;

      const resolvedMaxPlayers = isTournamentSelected ? formData.tournamentMaxPlayers : defaultMaxPlayers;

      const challengeData = {
        ...formData,
        game: gameName, // Use custom game name or selected game
        platform: platformName, // Use custom platform name or selected platform
        mode: isTournamentSelected ? 'Tournament (Bracket Mode)' : formData.mode, // Set mode for tournaments
        maxPlayers: resolvedMaxPlayers,
        format: isTournamentSelected ? 'tournament' : 'standard',
        founderChallengeCount: Math.min(25, Math.max(1, Number(formData.founderChallengeCount) || 1)),
        tournament: isTournamentSelected
          ? {
              format: 'tournament',
              maxPlayers: formData.tournamentMaxPlayers,
              currentRound: 1,
              stage: 'waiting_for_players',
              bracket: []
            }
          : undefined,
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
      
      // Wait for state to update, especially on mobile
      // Check adapter state directly for more reliable detection
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
        const isActuallyConnected = phantomWallet?.adapter?.connected || phantomWallet?.adapter?.publicKey !== null;
        if (isActuallyConnected && phantomWallet) {
          // Once connected, immediately check localStorage for username
            const walletKey = phantomWallet.adapter.publicKey?.toString();
            if (walletKey) {
              const savedGamerTag = getWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey);
              if (savedGamerTag) {
              setFormData(prev => ({
                ...prev,
                username: savedGamerTag
              }));
            }
          }
          break;
        }
        attempts++;
      }
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
          {/* Challenge Type Toggle - Solo, Team, or Tournament */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-300 mb-2">Challenge Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange('challengeType', 'solo')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-300 text-sm font-semibold ${
                  formData.challengeType === 'solo'
                    ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_10px_rgba(255,215,130,0.15)]'
                    : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30'
                }`}
              >
                👤 Solo
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('challengeType', 'team')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-300 text-sm font-semibold ${
                  formData.challengeType === 'team'
                    ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_10px_rgba(255,215,130,0.15)]'
                    : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30'
                }`}
              >
                👥 Team
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('challengeType', 'tournament')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-all duration-300 text-sm font-semibold ${
                  formData.challengeType === 'tournament'
                    ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_10px_rgba(255,215,130,0.15)]'
                    : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30'
                }`}
              >
                🏆 Tournament
              </button>
            </div>
            {formData.challengeType === 'team' && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-amber-400/70">Team key holder creates challenge for the team</p>
                
                {/* Team Challenge Accept Toggle */}
                <div className="mt-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <label className="block text-xs font-medium text-gray-300 mb-2">Who Can Accept Challenge?</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('teamOnly', false)}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-300 text-xs font-semibold ${
                        !formData.teamOnly
                          ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_8px_rgba(255,215,130,0.15)]'
                          : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30'
                      }`}
                    >
                      🌐 Open to Any
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('teamOnly', true)}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-300 text-xs font-semibold ${
                        formData.teamOnly
                          ? 'border-amber-400/50 bg-amber-300/10 text-amber-300 shadow-[0_0_8px_rgba(255,215,130,0.15)]'
                          : 'border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-amber-300/30'
                      }`}
                    >
                      👥 Teams Only
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    {formData.teamOnly 
                      ? 'Only teams can accept this challenge' 
                      : 'Anyone (solo players or teams) can accept this challenge'}
                  </p>
                </div>
              </div>
            )}
            {formData.challengeType === 'tournament' && (
              <div className="mt-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <label className="block text-xs font-medium text-gray-300 mb-2">Bracket Size</label>
                <select
                  value={formData.tournamentMaxPlayers}
                  onChange={(e) =>
                    handleInputChange(
                      'tournamentMaxPlayers',
                      Number(e.target.value) as 4 | 8 | 16
                    )
                  }
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white hover:border-amber-300/30 focus:border-amber-400/50 focus:outline-none transition-all"
                >
                  {tournamentPlayerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} Players
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400 mt-2">
                  Single-elimination bracket. Challenge reward = challenge amount × number of players. Winners advance automatically.
                </p>
              </div>
            )}
          </div>
          
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
            
            {!isTournamentMode && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Challenge Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => handleInputChange('mode', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white focus:border-amber-400/50 focus:outline-none transition-all"
                >
                  {gameModes[formData.game as keyof typeof gameModes]?.filter(mode => mode !== 'Tournament (Bracket Mode)').map(mode => (
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
                    variant="warning"
                    size="sm"
                    className="text-xs px-3 py-1.5 font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl hover:brightness-110"
                  >
                    ✨ Auto-Generate Rules
                  </ElegantButton>
                </div>
              </div>
            </div>
            )}
            
            {isTournamentMode && (
              <div className="mb-3 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg">
                <p className="text-xs text-amber-300 font-semibold mb-1">🏆 Tournament Mode</p>
                <p className="text-xs text-gray-300">
                  Single-elimination bracket with {formData.tournamentMaxPlayers} players. Winners advance automatically to the next round until a champion is crowned.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Challenge Amount (USDFG)
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
                  placeholder={currentWallet ? (() => {
                    const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    return isAdmin ? '0 for Founder Challenge' : '';
                  })() : undefined}
                  className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none transition-all"
                />
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>
                    ≈ {usdfgToUsd(typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0).toFixed(2)} USDC (conversion estimate)
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white/80 border border-white/15 cursor-help hover:bg-white/15 transition">
                          <Info className="w-3.5 h-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        sideOffset={6}
                        avoidCollisions={true}
                        collisionPadding={8}
                        className="bg-black/90 border border-amber-400/40 text-amber-100 text-xs leading-snug whitespace-normal text-center px-3 py-2 rounded-md shadow-lg z-[99999]"
                      >
                        <TooltipPrimitive.Arrow className="fill-black/90" />
                        <p>Displayed values are estimates based on current market value.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="mt-1.5 text-xs text-gray-400">
                {(() => {
                  const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                  const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0;
                  if (isAdmin && entryFee === 0) {
                    if (isTournamentMode) {
                      return <span className="text-purple-300">🏆 Founder Tournament - Set participant reward and winner bonus below</span>;
                    }
                    return <span className="text-purple-300">🏆 Founder Challenge - Set challenge reward manually when transferring USDFG</span>;
                  }
                  if (isTournamentMode) {
                    return <>Challenge Reward: {entryFee * formData.tournamentMaxPlayers} USDFG (challenge amount × {formData.tournamentMaxPlayers} players)</>;
                  }
                  return <>Challenge Reward: {entryFee * 2} USDFG (2x challenge amount)</>;
                })()}
              </div>

              {/* Number of challenges - shown for all users (Founder label for admin + 0 entry) */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  {(() => {
                    const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0;
                    return isAdmin && entryFee === 0 ? 'Number of Founder Challenges' : 'Number of challenges';
                  })()}
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  placeholder="1"
                  value={typeof formData.founderChallengeCount === 'string' ? formData.founderChallengeCount : String(formData.founderChallengeCount ?? 1)}
                  onChange={(e) => handleInputChange('founderChallengeCount', e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const n = v === '' ? 1 : Math.floor(Number(v));
                    const clamped = Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : 1;
                    if (String(clamped) !== v) handleInputChange('founderChallengeCount', clamped);
                  }}
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {(() => {
                    const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0;
                    return isAdmin && entryFee === 0
                      ? 'Creates multiple identical Founder Challenges at once.'
                      : 'Creates multiple identical challenges at once (1–25).';
                  })()}
                </p>
              </div>

              {(() => {
                const isAdmin = currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                const entryFee = typeof formData.entryFee === 'string' ? parseFloat(formData.entryFee) || 0 : formData.entryFee || 0;
                if (!isAdmin || entryFee !== 0 || !isTournamentMode) {
                  return null;
                }
                const participantReward = Number(formData.founderParticipantReward || 0);
                const winnerBonus = Number(formData.founderWinnerBonus || 0);
                const totalEstimate = (participantReward * (formData.tournamentMaxPlayers || 0)) + winnerBonus;
                return (
                  <div className="mt-3 p-3 border border-purple-400/30 rounded-lg bg-purple-500/10">
                    <div className="text-xs font-semibold text-purple-300 mb-2">Founder Tournament Payouts</div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Participant Reward (USDFG)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.000000001"
                      value={formData.founderParticipantReward ?? 0}
                      onChange={(e) => handleInputChange('founderParticipantReward', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none transition-all"
                    />
                    <label className="block text-xs font-medium text-gray-300 mt-2 mb-1.5">
                      Winner Bonus (USDFG)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.000000001"
                      value={formData.founderWinnerBonus ?? 0}
                      onChange={(e) => handleInputChange('founderWinnerBonus', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none transition-all"
                    />
                    <p className="text-xs text-purple-200/80 mt-2">
                      Estimated total payout: {totalEstimate} USDFG ({formData.tournamentMaxPlayers} players + winner bonus)
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Rules */}
      {currentStep === 3 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-3">Optional Rules</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Rules (optional)
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                placeholder="Optional · Add clarifying rules if needed"
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
          <div className="text-red-400 font-medium mb-1.5 text-xs">Missing details to enter the arena</div>
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
          Back
        </ElegantButton>

        <div className="flex space-x-2">
          {currentStep < totalSteps ? (
            <ElegantButton
              onClick={handleNext}
              variant="primary"
              className="text-sm px-3 py-1.5"
            >
              Continue
            </ElegantButton>
          ) : (
            <ElegantButton
              onClick={handleSubmit}
              variant="success"
              disabled={!isConnected}
              className="text-sm px-3 py-1.5"
            >
              Start Match
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