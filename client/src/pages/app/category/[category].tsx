import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
  
  // Available category images
  const categoryImages = [
    '/assets/categories/cod.png',
    '/assets/categories/valorant.png',
    '/assets/categories/fortnite.png',
    '/assets/categories/battlefield.png',
    '/assets/categories/soccer.png',
    '/assets/categories/basketball.png',
    '/assets/categories/football.png',
    '/assets/categories/fighting.png',
    '/assets/categories/ufc.png',
    '/assets/categories/boxing.png',
    '/assets/categories/racing.png',
    '/assets/categories/boardgames.png',
    '/assets/categories/sports.png',
  ];
  
  for (let i = 0; i < 18; i++) {
    const gameIndex = i % gameNames.length;
    const imageIndex = i % categoryImages.length;
    
    mockChallenges.push({
      id: `mock-${category}-${i}`,
      game: gameNames[gameIndex],
      entryFee: entryFees[i % entryFees.length],
      opponent: usernames[i % usernames.length],
      status: statuses[i % statuses.length],
      mode: modes[i % modes.length],
      image: categoryImages[imageIndex],
      isMock: true, // Clearly marked as mock data
    });
  }
  
  return mockChallenges;
};

const CategoryDetailPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  
  const categoryLabel = category?.toUpperCase() || 'CATEGORY';
  
  // MOCK DATA - Generate 18 challenges for UI testing
  // TODO: Replace with real Firestore data later
  const mockChallenges = useMemo(() => {
    return generateMockChallenges(category || '');
  }, [category]);
  
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
              {mockChallenges.length} challenges
            </p>
          </div>
        </div>
      </div>
      
      {/* Challenge List - Vertical, Mobile-First */}
      <div className="px-4 py-4 space-y-3">
        {mockChallenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => handleChallengeTap(challenge.id)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-700/50 bg-[#0B0E13] hover:border-amber-400/30 hover:bg-[#0B0E13]/80 transition-all active:scale-[0.98]"
          >
            {/* Challenge Image (Left) */}
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-700/30">
              <img
                src={challenge.image}
                alt={challenge.game}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = '/assets/categories/sports.png';
                }}
              />
            </div>
            
            {/* Challenge Info (Right) */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-white truncate">
                  {challenge.game}
                </h3>
                <span className={`
                  text-xs font-semibold px-2 py-0.5 rounded
                  ${challenge.status === 'Open' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }
                `}>
                  {challenge.status}
                </span>
              </div>
              
              <p className="text-xs text-gray-400 mb-1">
                {challenge.mode}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  vs {challenge.opponent}
                </span>
                <span className="text-sm font-bold text-amber-400">
                  {challenge.entryFee} USDFG
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Mock Data Indicator (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
          MOCK DATA - {mockChallenges.length} challenges
        </div>
      )}
    </div>
  );
};

export default CategoryDetailPage;

