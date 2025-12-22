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

// Define the 9 categories (constant, outside component)
const CATEGORIES: CategoryCard[] = [
  { key: 'FPS', label: 'FPS', icon: '🎯' },
  { key: 'SPORTS', label: 'SPORTS', icon: '⚽' },
  { key: 'FIGHTING', label: 'FIGHTING', icon: '🥊' },
  { key: 'RACING', label: 'RACING', icon: '🏎️' },
  { key: 'STRATEGY', label: 'STRATEGY', icon: '♟️' },
  { key: 'CASUAL', label: 'CASUAL', icon: '🎮' },
  { key: 'OPEN', label: 'OPEN', icon: '🌐' },
  { key: 'TOURNAMENTS', label: 'TOURNAMENTS', icon: '🏆' },
  { key: 'FEATURED', label: 'FEATURED', icon: '⭐' },
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
        } else {
          counts['OPEN']++;
        }
      }
    });

    // Featured and Tournaments need special handling
    challenges.forEach(challenge => {
      const status = challenge.status?.toLowerCase() || '';
      if (status === 'active' || status === 'pending_waiting_for_opponent') {
        if (challenge.format === 'tournament' || challenge.tournament) {
          counts['TOURNAMENTS']++;
        }
        // Featured could be based on entry fee or other criteria
        if (challenge.entryFee >= 100) { // Example: high-value challenges
          counts['FEATURED']++;
        }
      }
    });

    return counts;
  }, [challenges]);

  const handleCategoryTap = (categoryKey: string) => {
    // Navigate to category detail screen
    navigate(`/app/category/${categoryKey.toLowerCase()}`);
  };

  // Calculate exact card dimensions for iPhone 13 Pro (390px width)
  // Screen width: 390px
  // Horizontal padding: 14px × 2 = 28px
  // Grid gap: 10px × 2 = 20px (between 3 columns)
  // Available width: 390 - 28 - 20 = 342px
  // Card width: 342 / 3 = 114px
  // Card height: 122px (slightly taller than wide)
  const cardWidth = 114;
  const cardHeight = 122;

  return (
    <div 
      className="w-full" 
      style={{ 
        maxWidth: '390px', 
        margin: '0 auto',
        // Respect safe areas on mobile
        paddingLeft: 'env(safe-area-inset-left, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
    >
      {/* Header */}
      <div className="px-[14px] pt-[12px] pb-2">
        <h1 className="text-white text-xl font-bold tracking-wide uppercase">
          LIVE CHALLENGES
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Pick a Battle</p>
      </div>

      {/* Grid Container */}
      <div 
        className="grid grid-cols-3 gap-[10px] px-[14px] pb-[12px]"
        style={{
          width: '100%',
          maxWidth: '390px',
          margin: '0 auto',
        }}
      >
        {CATEGORIES.map((category) => {
          const liveCount = categoryCounts[category.key] || 0;
          const isActive = liveCount > 0;

          return (
            <button
              key={category.key}
              onClick={() => handleCategoryTap(category.key)}
              className={`
                relative
                rounded-lg
                border
                transition-all
                duration-300
                overflow-hidden
                active:scale-[0.98]
                ${isActive 
                  ? 'border-amber-400/60 shadow-[0_0_8px_rgba(255,215,130,0.3)]' 
                  : 'border-gray-600/40'
                }
              `}
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                backgroundColor: '#0B0E13',
                // Subtle inner gradient/noise effect
                backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.02), transparent 60%)',
              }}
            >
              {/* Live Indicator - Small dot/pill in top-right */}
              {liveCount > 0 && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <div 
                    className={`
                      w-1.5 h-1.5 rounded-full
                      ${isActive ? 'bg-green-400' : 'bg-gray-500'}
                    `}
                    style={{
                      boxShadow: isActive ? '0 0 6px rgba(74, 222, 128, 0.8)' : 'none',
                      animation: isActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                    }}
                  />
                </div>
              )}

              {/* Icon Container (centered, ~55-60% of card height) */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  paddingTop: '8px',
                  paddingBottom: '28px', // Space for label
                }}
              >
                <div 
                  className="flex items-center justify-center"
                  style={{
                    fontSize: '48px',
                    lineHeight: '1',
                    height: `${Math.floor(cardHeight * 0.58)}px`, // ~58% of card height
                    width: '100%',
                  }}
                >
                  {category.icon}
                </div>
              </div>

              {/* Label (bottom-left aligned, uppercase, one word) */}
              <div className="absolute bottom-2 left-2">
                <span 
                  className={`
                    text-[10px] font-semibold uppercase tracking-wide
                    ${isActive ? 'text-amber-300' : 'text-gray-400'}
                  `}
                  style={{
                    letterSpacing: '0.5px',
                  }}
                >
                  {category.label}
                </span>
              </div>

              {/* Active Glow Overlay - subtle inner glow when active */}
              {isActive && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-lg"
                  style={{
                    boxShadow: 'inset 0 0 20px rgba(255,215,130,0.1)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiveChallengesGrid;

