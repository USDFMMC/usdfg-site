import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface CategoryCard {
  key: string;
  label: string;
  icon: string; // Icon path or emoji
  liveCount: number;
}

interface LiveChallengesGridProps {
  challenges?: any[]; // Array of challenge data to count live challenges per category
}

// Define the 6 categories (removed CASUAL, OPEN, FEATURED)
const CATEGORIES: CategoryCard[] = [
  { key: 'FPS', label: 'FPS', icon: '🎯' },
  { key: 'SPORTS', label: 'SPORTS', icon: '⚽' },
  { key: 'FIGHTING', label: 'FIGHTING', icon: '🥊' },
  { key: 'RACING', label: 'RACING', icon: '🏎️' },
  { key: 'STRATEGY', label: 'STRATEGY', icon: '♟️' },
  { key: 'TOURNAMENTS', label: 'TOURNAMENTS', icon: '🏆' },
];

const LiveChallengesGrid: React.FC<LiveChallengesGridProps> = ({ challenges = [] }) => {
  const navigate = useNavigate();

  // Count live challenges per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      counts[cat.key] = 0;
    });

    challenges.forEach(challenge => {
      // Map challenge categories to our grid categories
      const challengeCategory = challenge.category?.toUpperCase() || '';
      const status = challenge.status?.toLowerCase() || '';
      
      // Only count active/pending challenges
      if (status === 'active' || status === 'pending_waiting_for_opponent' || 
          status === 'creator_confirmation_required' || status === 'creator_funded') {
        
        // Map to grid categories
        if (challengeCategory.includes('SHOOTING') || challengeCategory.includes('FPS')) {
          counts['FPS']++;
        } else if (challengeCategory.includes('SPORTS') || challengeCategory.includes('BASKETBALL') || 
                   challengeCategory.includes('SOCCER') || challengeCategory.includes('FOOTBALL')) {
          counts['SPORTS']++;
        } else if (challengeCategory.includes('FIGHTING') || challengeCategory.includes('UFC') || 
                   challengeCategory.includes('BOXING')) {
          counts['FIGHTING']++;
        } else if (challengeCategory.includes('RACING')) {
          counts['RACING']++;
        } else if (challengeCategory.includes('STRATEGY') || challengeCategory.includes('BOARDGAMES')) {
          counts['STRATEGY']++;
        }
      }
    });

    // Tournaments need special handling
    challenges.forEach(challenge => {
      const status = challenge.status?.toLowerCase() || '';
      if (status === 'active' || status === 'pending_waiting_for_opponent') {
        if (challenge.format === 'tournament' || challenge.tournament) {
          counts['TOURNAMENTS']++;
        }
      }
    });

    return counts;
  }, [challenges]);

  const handleCategoryTap = (categoryKey: string) => {
    // Navigate to category detail screen
    navigate(`/app/category/${categoryKey.toLowerCase()}`);
  };

  return (
    <div 
      className="w-full max-w-[390px] md:max-w-none mx-auto px-[14px] md:px-0"
      style={{
        paddingLeft: 'max(14px, env(safe-area-inset-left, 0))',
        paddingRight: 'max(14px, env(safe-area-inset-right, 0))',
      }}
    >
      <div className="pt-3 pb-2 md:pt-0 md:pb-3">
        <h1 className="text-white text-xl md:text-lg font-bold tracking-wide uppercase">
          BROWSE BY CATEGORY
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Find your battleground</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 pb-4">
        {CATEGORIES.map((category) => {
          const liveCount = categoryCounts[category.key] || 0;
          const isActive = liveCount > 0;

          return (
            <button
              key={category.key}
              onClick={() => handleCategoryTap(category.key)}
              className={`
                relative w-full rounded-lg border transition-all duration-300 overflow-hidden
                active:scale-[0.98] hover:border-amber-400/40
                aspect-[176/122] min-h-[100px] md:min-h-[110px]
                ${isActive 
                  ? 'border-amber-400/60 shadow-[0_0_8px_rgba(255,215,130,0.3)]' 
                  : 'border-gray-600/40'
                }
              `}
              style={{
                backgroundColor: '#0B0E13',
                backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.02), transparent 60%)',
              }}
            >
              {liveCount > 0 && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <div 
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'}`}
                    style={{
                      boxShadow: isActive ? '0 0 6px rgba(74, 222, 128, 0.8)' : 'none',
                      animation: isActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                    }}
                  />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pt-2 pb-8">
                <span className="text-3xl md:text-4xl lg:text-5xl leading-none">{category.icon}</span>
              </div>
              <div className="absolute bottom-2 left-2">
                <span 
                  className={`text-[10px] md:text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-amber-300' : 'text-gray-400'}`}
                  style={{ letterSpacing: '0.5px' }}
                >
                  {category.label}
                </span>
              </div>
              {isActive && (
                <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ boxShadow: 'inset 0 0 20px rgba(255,215,130,0.1)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiveChallengesGrid;

