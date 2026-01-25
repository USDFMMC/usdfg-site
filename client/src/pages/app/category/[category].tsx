import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChallenges } from '@/hooks/useChallenges';
import { getGameCategory, getGameImage, resolveGameName } from '@/lib/gameAssets';

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
      const gameName = resolveGameName(challenge.game, challenge.title);
      const challengeCategory = challenge.category?.toUpperCase() || '';
      const gameCategory = getGameCategory(gameName);
      
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
  
  const challenges = filteredChallenges;
  
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
            const gameName = resolveGameName(challenge.game, challenge.title);
            const entryFee = challenge.entryFee || 0;
            const status = challenge.status || 'Open';
            const mode = challenge.mode || challenge.challengeMode || 'Standard';
            const creator = challenge.creator || challenge.opponent || 'Unknown';
            const imagePath = getGameImage(gameName);
            const imageUrl = `${imagePath}?v=2&game=${encodeURIComponent(gameName)}`;
            
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
                  src={imageUrl}
                  alt={gameName}
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
                    {gameName}
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
      
    </div>
  );
};

export default CategoryDetailPage;

