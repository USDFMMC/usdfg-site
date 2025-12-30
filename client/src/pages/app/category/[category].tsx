import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChallenges } from '@/hooks/useChallenges';

// Helper function to determine game category (matches logic from index.tsx)
const getGameCategory = (game: string): string => {
  if (!game || game === 'Gaming' || game === 'Other/Custom') {
    return 'Sports'; // Default to Sports for unknown games
  }
  
  const normalizedGame = game.trim();
  const lowerGame = normalizedGame.toLowerCase();
  
  // Check for UFC games
  if (['EA Sports UFC 6', 'EA Sports UFC 5', 'EA Sports UFC 4', 'EA Sports UFC 3', 'EA UFC 6', 'EA UFC 5', 'EA UFC 4', 'EA UFC 3'].includes(normalizedGame)) return 'UFC';
  if (lowerGame.includes('ufc') || lowerGame.includes('ea sports ufc')) return 'UFC';
  
  // Check for Football games (American football)
  if (['Madden NFL 26', 'Madden NFL 24', 'Madden NFL 23', 'Madden NFL 22', 'NFL Blitz', 'Mutant Football League', 'Retro Bowl', 'Axis Football'].includes(normalizedGame)) return 'Football';
  if (lowerGame.includes('madden') || lowerGame.includes('nfl') || lowerGame.includes('retro bowl') || lowerGame.includes('axis football') || lowerGame.includes('mutant football')) return 'Football';
  
  // Check for Board Games
  if (['Chess.com', 'Lichess', 'Chess Ultra', '8 Ball Pool', 'Pool Hall', 'PBA Bowling Challenge', 'Brunswick Pro Bowling', 'Checkers', 'Backgammon', 'Monopoly Plus', 'Uno', 'Scrabble'].includes(normalizedGame)) return 'BoardGames';
  if (lowerGame.includes('chess') || lowerGame.includes('pool') || lowerGame.includes('bowling') || lowerGame.includes('checkers') || lowerGame.includes('backgammon') || lowerGame.includes('monopoly') || lowerGame.includes('uno') || lowerGame.includes('scrabble')) return 'BoardGames';
  
  // Fighting games
  if (['Street Fighter 6', 'Tekken 8', 'Mortal Kombat', 'Mortal Kombat 1', 'Mortal Kombat 11'].includes(normalizedGame)) return 'Fighting';
  if (lowerGame.includes('street fighter') || lowerGame.includes('tekken') || lowerGame.includes('mortal kombat') || lowerGame.includes('guilty gear') || lowerGame.includes('fighting')) return 'Fighting';
  
  // Shooting/FPS games
  if (['Call of Duty', 'Valorant'].includes(normalizedGame)) return 'Shooting';
  if (lowerGame.includes('call of duty') || lowerGame.includes('cod') || lowerGame.includes('valorant') || lowerGame.includes('cs:go') || lowerGame.includes('counter-strike') || lowerGame.includes('apex') || lowerGame.includes('overwatch') || lowerGame.includes('rainbow six') || lowerGame.includes('fps') || lowerGame.includes('shooting')) return 'Shooting';
  
  // Racing games
  if (['Forza Horizon', 'Gran Turismo 7', 'Forza Motorsport'].includes(normalizedGame)) return 'Racing';
  if (lowerGame.includes('forza') || lowerGame.includes('gran turismo') || lowerGame.includes('f1') || lowerGame.includes('racing')) return 'Racing';
  
  // Sports games
  if (['NBA 2K25', 'FIFA 24'].includes(normalizedGame)) return 'Sports';
  if (lowerGame.includes('nba') || lowerGame.includes('2k') || lowerGame.includes('fifa') || lowerGame.includes('fc ') || lowerGame.includes('ea sports fc') || lowerGame.includes('soccer') || lowerGame.includes('basketball') || lowerGame.includes('sports')) return 'Sports';
  
  return 'Sports'; // Default fallback
};

// Helper function to get game image (matches logic from index.tsx)
const getGameImage = (game: string): string => {
  if (!game || game === 'Gaming') {
    return '/assets/categories/basketball.png'; // Default fallback
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
  
  // Board games
  if (lowerGame.includes('chess') || lowerGame.includes('pool') || lowerGame.includes('bowling') || lowerGame.includes('checkers') || lowerGame.includes('backgammon') || lowerGame.includes('monopoly') || lowerGame.includes('uno') || lowerGame.includes('scrabble')) {
    return '/assets/categories/boardgames.png';
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
  
  // Get category and return appropriate image (fallback)
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
      return '/assets/categories/tekken.png'; // Fighting games category
    default:
      return '/assets/categories/basketball.png'; // Default to basketball category image
  }
};

// MOCK DATA - Remove when real data is integrated
// This generates 18 mock challenges for UI testing only
const generateMockChallenges = (category: string) => {
  const mockChallenges = [];
  const gameNames = [
    'COD MW3', 'Valorant', 'Fortnite', 'Battlefield 2042',
    'FC 26', 'NBA 2K26', 'Madden NFL 26',
    'Mortal Kombat 1', 'Street Fighter 6', 'Tekken 8',
    'Gran Turismo 7', 'Forza Horizon 5', 'F1 24',
    'Chess.com', '8 Ball Pool', 'Monopoly Plus',
    'Custom Game', 'Tournament Mode'
  ];
  
  const entryFees = [10, 25, 50, 75, 100, 150, 200, 250, 500];
  const usernames = [
    'ProGamer99', 'ElitePlayer', 'ChampionX', 'AceShooter',
    'MasterMind', 'QuickDraw', 'VictoryKing', 'SkillDemon',
    'TopPlayer', 'WinStreak', 'Unbeatable', 'Legendary',
    'RookieKiller', 'VeteranPro', 'NewChallenger', 'OldGuard',
    'SpeedRunner', 'TacticalMind'
  ];
  
  const statuses = ['Open', 'Waiting', 'Open', 'Open', 'Waiting', 'Open'];
  const modes = ['Head-to-Head', 'Best of 3', 'Quick Match', 'Full Match', 'Tournament', 'Custom'];
  
  // Generate mock challenges - DO NOT include image field
  // Images will be determined by getGameImage() function to ensure consistency
  for (let i = 0; i < 18; i++) {
    const gameIndex = i % gameNames.length;
    
    mockChallenges.push({
      id: `mock-${category}-${i}`,
      game: gameNames[gameIndex],
      entryFee: entryFees[i % entryFees.length],
      opponent: usernames[i % usernames.length],
      status: statuses[i % statuses.length],
      mode: modes[i % modes.length],
      // DO NOT include image field - let getGameImage() determine it
      isMock: true, // Clearly marked as mock data
    });
  }
  
  return mockChallenges;
};

const CategoryDetailPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { challenges: allChallenges, loading: challengesLoading } = useChallenges();
  
  const categoryLabel = category?.toUpperCase() || 'CATEGORY';
  
  // Filter real challenges by category
  const filteredChallenges = useMemo(() => {
    if (!category || !allChallenges) return [];
    
    const categoryUpper = category.toUpperCase();
    
    return allChallenges.filter((challenge: any) => {
      const game = challenge.game || challenge.title || '';
      const challengeCategory = challenge.category?.toUpperCase() || '';
      const gameCategory = getGameCategory(game);
      
      // Map category parameter to our category system
      if (categoryUpper === 'FPS') {
        return gameCategory === 'Shooting' || challengeCategory.includes('SHOOTING') || challengeCategory.includes('FPS');
      } else if (categoryUpper === 'SPORTS') {
        return gameCategory === 'Sports' || challengeCategory.includes('SPORTS') || challengeCategory.includes('BASKETBALL') || challengeCategory.includes('SOCCER') || challengeCategory.includes('FOOTBALL');
      } else if (categoryUpper === 'FIGHTING') {
        return gameCategory === 'Fighting' || challengeCategory.includes('FIGHTING');
      } else if (categoryUpper === 'RACING') {
        return gameCategory === 'Racing' || challengeCategory.includes('RACING');
      } else if (categoryUpper === 'STRATEGY') {
        return gameCategory === 'BoardGames' || challengeCategory.includes('STRATEGY') || challengeCategory.includes('BOARDGAMES');
      } else if (categoryUpper === 'TOURNAMENTS') {
        return challenge.format === 'tournament' || challenge.tournament === true;
      }
      
      return false;
    }).filter((challenge: any) => {
      // Only show active/pending challenges
      const status = challenge.status?.toLowerCase() || '';
      return status === 'active' || 
             status === 'pending_waiting_for_opponent' || 
             status === 'creator_confirmation_required' || 
             status === 'creator_funded';
    });
  }, [category, allChallenges]);
  
  // Use real challenges if available, otherwise fall back to mock data for testing
  const challenges = filteredChallenges.length > 0 ? filteredChallenges : generateMockChallenges(category || '');
  
  const handleChallengeTap = (challengeId: string) => {
    // TODO: Navigate to challenge detail when implemented
    console.log(`Challenge tapped: ${challengeId}`);
    // For now, just navigate back or show challenge
    // navigate(`/app/challenge/${challengeId}`);
  };
  
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-[#0A0D14]/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold uppercase tracking-wide">
              {categoryLabel}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {challengesLoading ? 'Loading...' : `${challenges.length} challenge${challenges.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Challenge List - Vertical, Mobile-First */}
      <div className="px-4 py-4 space-y-3">
        {challengesLoading ? (
          <div className="text-center py-8 text-gray-400">Loading challenges...</div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No active challenges in this category</div>
        ) : (
          challenges.map((challenge: any) => {
            // Extract challenge data (handle both real and mock challenges)
            const challengeId = challenge.id || challenge.challengeId;
            const game = challenge.game || challenge.title || 'Unknown Game';
            const entryFee = challenge.entryFee || 0;
            const status = challenge.status || 'Open';
            const mode = challenge.mode || challenge.challengeMode || 'Standard';
            const creator = challenge.creator || challenge.opponent || 'Unknown';
            // Always use getGameImage to ensure consistent images (ignore stored challenge.image which may be old)
            const image = getGameImage(game);
            
            // Get opponent (for real challenges)
            const players = challenge.players || [];
            const opponent = players.length > 1 ? players.find((p: string) => p !== creator) || creator : creator;
            const opponentDisplay = typeof opponent === 'string' ? `${opponent.slice(0, 6)}...${opponent.slice(-4)}` : 'Unknown';
            
            return (
            <button
              key={challengeId}
              onClick={() => handleChallengeTap(challengeId)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-700/50 bg-[#0B0E13] hover:border-amber-400/30 hover:bg-[#0B0E13]/80 transition-all active:scale-[0.98]"
            >
              {/* Challenge Image (Left) */}
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-700/30">
                <img
                  src={image}
                  alt={game}
                  className="w-full h-full object-cover"
                  key={`${challengeId}-${image}`}
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = '/assets/categories/basketball.png';
                  }}
                />
              </div>
              
              {/* Challenge Info (Right) */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {game}
                  </h3>
                  <span className={`
                    text-xs font-semibold px-2 py-0.5 rounded
                    ${status === 'active' || status === 'Open'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }
                  `}>
                    {status === 'active' ? 'Open' : status === 'pending_waiting_for_opponent' ? 'Waiting' : status}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400 mb-1">
                  {mode}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {players.length > 1 ? `vs ${opponentDisplay}` : 'Waiting for opponent'}
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {entryFee} USDFG
                  </span>
                </div>
              </div>
            </button>
            );
          })
        )}
      </div>
      
      {/* Mock Data Indicator (Development Only) - Only show if using mock data */}
      {process.env.NODE_ENV === 'development' && filteredChallenges.length === 0 && challenges.length > 0 && (
        <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
          MOCK DATA - {challenges.length} challenges
        </div>
      )}
    </div>
  );
};

export default CategoryDetailPage;

