import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Info, User, Users, Trophy, Globe, Sparkles } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Button } from '@/components/ui/button';
import ElegantButton from '@/components/ui/ElegantButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ADMIN_WALLET } from '@/lib/chain/config';
import { getGameImage } from '@/lib/gameAssets';
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
        /** Persisted so list/detail art uses custom.png instead of defaulting unknown titles to Sports/basketball. */
        isCustomGame: formData.game === 'Custom',
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

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg text-sm font-body bg-void-light/70 border border-white/10 text-white placeholder:text-white/35 transition-all hover:border-white/15 focus:border-purple/45 focus:outline-none focus:ring-1 focus:ring-purple/25';
  const labelClass = 'block font-body text-sm font-medium text-white/80 mb-2';
  const helperClass = 'text-xs text-white/45 mt-1.5 font-body';
  const segmentActive =
    'border-purple/45 bg-purple/[0.12] text-white ring-1 ring-purple/25';
  const segmentInactive =
    'border-white/10 bg-void-light/40 text-white/70 hover:border-white/18 hover:bg-white/[0.04]';

  return (
    <div className="font-body space-y-8 text-white/90">
      {/* Progress */}
      <div>
        <p className="font-display text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">
          Step {currentStep} of {totalSteps}
        </p>
        <div className="flex w-full items-center">
          {Array.from({ length: totalSteps }, (_, i) => (
            <React.Fragment key={i}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-display font-bold transition-colors ${
                  i + 1 <= currentStep
                    ? 'bg-gradient-to-br from-purple to-orange text-white'
                    : 'border border-white/12 bg-void-light/50 text-white/35'
                }`}
              >
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`mx-2 h-0.5 min-w-[1rem] flex-1 rounded-full ${
                    i + 1 < currentStep ? 'bg-gradient-to-r from-purple/90 to-orange/70' : 'bg-white/10'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Game Selection */}
      {currentStep === 1 && (
        <div className="space-y-8">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight mb-1">
                Challenge type
              </h3>
              <p className="text-sm text-white/50 font-body mb-4">
                Solo, team, or bracket tournament — same flow, different match structure.
              </p>
              <label className={labelClass}>Format</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('challengeType', 'solo')}
                  className={`flex flex-1 min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    formData.challengeType === 'solo' ? segmentActive : segmentInactive
                  }`}
                >
                  <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Solo
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('challengeType', 'team')}
                  className={`flex flex-1 min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    formData.challengeType === 'team' ? segmentActive : segmentInactive
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Team
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('challengeType', 'tournament')}
                  className={`flex flex-1 min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    formData.challengeType === 'tournament' ? segmentActive : segmentInactive
                  }`}
                >
                  <Trophy className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Tournament
                </button>
              </div>
            </div>
            {formData.challengeType === 'team' && (
              <div className="space-y-4 pt-1 border-t border-white/10">
                <p className="text-sm text-white/55">
                  Team key holder creates this challenge on behalf of the team.
                </p>
                <div className="rounded-lg border border-white/10 bg-void-light/30 p-4 space-y-3">
                  <label className={labelClass}>Who can accept?</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('teamOnly', false)}
                      className={`flex flex-1 min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                        !formData.teamOnly ? segmentActive : segmentInactive
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Open to anyone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('teamOnly', true)}
                      className={`flex flex-1 min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                        formData.teamOnly ? segmentActive : segmentInactive
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Teams only
                    </button>
                  </div>
                  <p className={`${helperClass} !mt-0`}>
                    {formData.teamOnly
                      ? 'Only teams can accept this challenge.'
                      : 'Solo players or teams can accept.'}
                  </p>
                </div>
              </div>
            )}
            {formData.challengeType === 'tournament' && (
              <div className="rounded-lg border border-white/10 bg-void-light/25 p-4 space-y-2">
                <label className={labelClass}>Bracket size</label>
                <select
                  value={formData.tournamentMaxPlayers}
                  onChange={(e) =>
                    handleInputChange(
                      'tournamentMaxPlayers',
                      Number(e.target.value) as 4 | 8 | 16
                    )
                  }
                  className={inputClass}
                >
                  {tournamentPlayerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} players
                    </option>
                  ))}
                </select>
                <p className={helperClass}>
                  Single elimination. Reward pool scales with player count; winners advance automatically.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight mb-1">
                Game & platform
              </h3>
              <p className="text-sm text-white/50 font-body">Pick a title and where you play.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {availableGames.map((game) => {
                const coverSrc = getGameImage(game);
                return (
                  <button
                    key={game}
                    type="button"
                    onClick={() => {
                      handleInputChange('game', game);
                      if (game !== 'Custom') {
                        handleInputChange('customGame', '');
                      }
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-body font-semibold leading-tight transition-all duration-200 ${
                      formData.game === game ? segmentActive : segmentInactive
                    }`}
                  >
                    {coverSrc ? (
                      <span className="relative h-14 w-full max-w-[5.5rem] overflow-hidden rounded-lg border border-white/10 bg-black/25">
                        <img
                          src={coverSrc}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </span>
                    ) : (
                      <span className="flex h-14 w-full max-w-[5.5rem] items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] text-[10px] text-white/45">
                        Custom title
                      </span>
                    )}
                    <span className="line-clamp-2 w-full px-0.5">{game}</span>
                  </button>
                );
              })}
            </div>

            {formData.game === 'Custom' && (
              <div>
                <label className={labelClass}>Custom game name</label>
                <input
                  type="text"
                  value={formData.customGame}
                  onChange={(e) => handleInputChange('customGame', e.target.value)}
                  placeholder="Enter game title"
                  className={inputClass}
                />
                <p className={helperClass}>Use the exact name players will recognize.</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-5">
            <div>
              <label className={labelClass}>Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => {
                  handleInputChange('platform', e.target.value);
                  if (e.target.value !== 'Other/Custom') {
                    handleInputChange('customPlatform', '');
                  }
                }}
                className={inputClass}
              >
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            {formData.platform === 'Other/Custom' && (
              <div>
                <label className={labelClass}>Custom platform</label>
                <input
                  type="text"
                  value={formData.customPlatform}
                  onChange={(e) => handleInputChange('customPlatform', e.target.value)}
                  placeholder="e.g. GeForce Now, remote play"
                  className={inputClass}
                />
                <p className={helperClass}>Helps opponents find you on the right system.</p>
              </div>
            )}

            <div>
              <label className={labelClass}>Your username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="In-game or platform handle"
                className={inputClass}
              />
            </div>
          </section>
        </div>
      )}

      {/* Step 2: Challenge Setup */}
      {currentStep === 2 && (
        <div className="space-y-8">
          <div>
            <h3 className="font-display text-lg font-semibold text-white tracking-tight mb-1">
              Stakes & format
            </h3>
            <p className="text-sm text-white/50 font-body mb-6">
              Match mode, entry amount, and how many identical challenges to post.
            </p>

            {!isTournamentMode && (
              <div className="mb-6 space-y-3">
                <label className={labelClass}>Challenge mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => handleInputChange('mode', e.target.value)}
                  className={inputClass}
                >
                  {gameModes[formData.game as keyof typeof gameModes]
                    ?.filter((mode) => mode !== 'Tournament (Bracket Mode)')
                    .map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                </select>

                <div className="rounded-lg border border-white/10 bg-void-light/25 p-4 space-y-3">
                  <p className="text-sm text-white/70 whitespace-pre-line font-body leading-relaxed">
                    {getModeExplanation(formData.mode)}
                  </p>
                  <div className="pt-3 border-t border-white/10">
                    <ElegantButton
                      onClick={handleAutoRules}
                      variant="purple"
                      size="sm"
                      className="text-xs px-4 py-2 font-semibold inline-flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Auto-generate rules
                    </ElegantButton>
                  </div>
                </div>
              </div>
            )}

            {isTournamentMode && (
              <div className="mb-6 rounded-xl border border-purple/25 bg-purple/[0.08] p-4 space-y-2">
                <p className="font-display text-sm font-semibold text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-orange shrink-0" aria-hidden />
                  Tournament bracket
                </p>
                <p className="text-sm text-white/65 font-body leading-relaxed">
                  Single-elimination bracket with {formData.tournamentMaxPlayers} players. Winners advance
                  automatically until a champion is crowned.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-5">
              <div>
                <label className={labelClass}>
                  Challenge amount (USDFG)
                  {currentWallet &&
                    (() => {
                      const isAdmin =
                        currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                      return isAdmin ? (
                        <span className="ml-2 text-purple-300/90 text-xs font-body font-normal">
                          (Founder: enter 0 for free entry)
                        </span>
                      ) : null;
                    })()}
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="text"
                    value={formData.entryFee || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('entryFee', value);
                    }}
                    placeholder={
                      currentWallet
                        ? (() => {
                            const isAdmin =
                              currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                            return isAdmin ? '0 for Founder Challenge' : '';
                          })()
                        : undefined
                    }
                    className={`${inputClass} sm:flex-1`}
                  />
                  <div className="flex items-center gap-2 text-xs text-white/45 font-body shrink-0">
                    <span>
                      ≈{' '}
                      {usdfgToUsd(
                        typeof formData.entryFee === 'string'
                          ? parseFloat(formData.entryFee) || 0
                          : formData.entryFee || 0
                      ).toFixed(2)}{' '}
                      USDC <span className="text-white/35">(estimate)</span>
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 cursor-help hover:bg-white/10 transition">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="center"
                          sideOffset={6}
                          avoidCollisions={true}
                          collisionPadding={8}
                          className="bg-void border border-purple/30 text-white/90 text-xs leading-snug whitespace-normal text-center px-3 py-2 rounded-lg shadow-lg z-[99999] max-w-[220px]"
                        >
                          <TooltipPrimitive.Arrow className="fill-void" />
                          <p>Displayed values are estimates based on current market value.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className={`${helperClass} text-white/50`}>
                  {(() => {
                    const isAdmin =
                      currentWallet &&
                      currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    const entryFee =
                      typeof formData.entryFee === 'string'
                        ? parseFloat(formData.entryFee) || 0
                        : formData.entryFee || 0;
                    if (isAdmin && entryFee === 0) {
                      if (isTournamentMode) {
                        return (
                          <span className="text-purple-200/90">
                            Founder tournament — set participant reward and winner bonus below.
                          </span>
                        );
                      }
                      return (
                        <span className="text-purple-200/90">
                          Founder challenge — set reward when transferring USDFG.
                        </span>
                      );
                    }
                    if (isTournamentMode) {
                      return (
                        <>
                          Challenge reward: {entryFee * formData.tournamentMaxPlayers} USDFG (amount ×{' '}
                          {formData.tournamentMaxPlayers} players)
                        </>
                      );
                    }
                    return <>Challenge reward: {entryFee * 2} USDFG (2× challenge amount)</>;
                  })()}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {(() => {
                    const isAdmin =
                      currentWallet &&
                      currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    const entryFee =
                      typeof formData.entryFee === 'string'
                        ? parseFloat(formData.entryFee) || 0
                        : formData.entryFee || 0;
                    return isAdmin && entryFee === 0
                      ? 'Number of Founder challenges'
                      : 'Number of challenges';
                  })()}
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  placeholder="1"
                  value={
                    typeof formData.founderChallengeCount === 'string'
                      ? formData.founderChallengeCount
                      : String(formData.founderChallengeCount ?? 1)
                  }
                  onChange={(e) => handleInputChange('founderChallengeCount', e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const n = v === '' ? 1 : Math.floor(Number(v));
                    const clamped = Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : 1;
                    if (String(clamped) !== v) handleInputChange('founderChallengeCount', clamped);
                  }}
                  className={inputClass}
                />
                <p className={helperClass}>
                  {(() => {
                    const isAdmin =
                      currentWallet &&
                      currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                    const entryFee =
                      typeof formData.entryFee === 'string'
                        ? parseFloat(formData.entryFee) || 0
                        : formData.entryFee || 0;
                    return isAdmin && entryFee === 0
                      ? 'Creates multiple identical Founder challenges at once.'
                      : 'Creates multiple identical challenges at once (1–25).';
                  })()}
                </p>
              </div>

              {(() => {
                const isAdmin =
                  currentWallet && currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
                const entryFee =
                  typeof formData.entryFee === 'string'
                    ? parseFloat(formData.entryFee) || 0
                    : formData.entryFee || 0;
                if (!isAdmin || entryFee !== 0 || !isTournamentMode) {
                  return null;
                }
                const participantReward = Number(formData.founderParticipantReward || 0);
                const winnerBonus = Number(formData.founderWinnerBonus || 0);
                const totalEstimate =
                  participantReward * (formData.tournamentMaxPlayers || 0) + winnerBonus;
                return (
                  <div className="rounded-lg border border-purple/30 bg-purple/[0.07] p-4 space-y-3">
                    <div className="font-display text-sm font-semibold text-purple-200">
                      Founder tournament payouts
                    </div>
                    <label className={labelClass}>Participant reward (USDFG)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.000000001"
                      value={formData.founderParticipantReward ?? 0}
                      onChange={(e) => handleInputChange('founderParticipantReward', e.target.value)}
                      className={inputClass}
                    />
                    <label className={labelClass}>Winner bonus (USDFG)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.000000001"
                      value={formData.founderWinnerBonus ?? 0}
                      onChange={(e) => handleInputChange('founderWinnerBonus', e.target.value)}
                      className={inputClass}
                    />
                    <p className="text-xs text-purple-200/85 font-body">
                      Estimated total payout: {totalEstimate} USDFG ({formData.tournamentMaxPlayers}{' '}
                      players + winner bonus)
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
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-white tracking-tight mb-1">
              Rules
            </h3>
            <p className="text-sm text-white/50 font-body mb-4">
              Spell out settings, timing, and win conditions so disputes are easy to resolve.
            </p>

            <label className={labelClass}>Match rules</label>
            <textarea
              value={formData.rules}
              onChange={(e) => handleInputChange('rules', e.target.value)}
              placeholder="Settings, time limits, win conditions, proof requirements…"
              rows={6}
              className={`${inputClass} resize-none min-h-[140px]`}
            />
            <p className={helperClass}>
              Include game settings, time limits, and what counts as a win.
            </p>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/35 bg-red-500/[0.07] p-4">
          <div className="font-display text-sm font-semibold text-red-300/95 mb-2">
            Complete the following
          </div>
          <ul className="text-red-200/90 text-sm font-body space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-red-400/80 shrink-0">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-white/10">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="font-display font-semibold border-purple/40 text-white/90 hover:bg-purple/15 hover:text-white disabled:opacity-40"
        >
          Back
        </Button>

        <div className="flex justify-end">
          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              size="lg"
              className="font-display font-semibold px-8 py-6 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 shadow-none"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isConnected}
              size="lg"
              className="font-display font-semibold px-8 py-6 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 disabled:opacity-45"
            >
              Start match
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="rounded-xl border border-orange/25 bg-orange/[0.06] p-4 space-y-3">
          <p className="text-sm text-white/80 font-body leading-relaxed">
            Connect your wallet to publish challenges and receive on-chain rewards.
          </p>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            size="lg"
            className="font-display font-semibold bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 w-full sm:w-auto"
          >
            {connecting ? 'Connecting…' : 'Connect wallet'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreateChallengeForm;