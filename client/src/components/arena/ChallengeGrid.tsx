import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ChallengeData } from '@/hooks/useChallenges';

export interface ChallengeGridProps {
  challenges: ChallengeData[];
  onChallengeClick?: (challenge: ChallengeData) => void;
  onDeleteChallenge?: (challengeId: string) => void;
  isChallengeOwner?: (challenge: ChallengeData) => boolean;
  className?: string;
  radius?: number;
  damping?: number;
  fadeOut?: number;
  ease?: string;
}

type SetterFn = (v: number | string) => void;

const ChallengeGrid: React.FC<ChallengeGridProps> = ({
  challenges,
  onChallengeClick,
  onDeleteChallenge,
  isChallengeOwner,
  className = '',
  radius = 300,
  damping = 0.45,
  fadeOut = 0.6,
  ease = 'power3.out'
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const setX = useRef<SetterFn | null>(null);
  const setY = useRef<SetterFn | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setX.current = gsap.quickSetter(el, '--x', 'px') as SetterFn;
    setY.current = gsap.quickSetter(el, '--y', 'px') as SetterFn;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, {
      opacity: 1,
      duration: fadeOut,
      overwrite: true
    });
  };

  const handleChallengeClick = (challenge: ChallengeData) => {
    if (onChallengeClick) {
      onChallengeClick(challenge);
    }
  };

  const handleCardMove: React.MouseEventHandler<HTMLElement> = e => {
    const c = e.currentTarget as HTMLElement;
    const rect = c.getBoundingClientRect();
    c.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    c.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  // Get challenge colors based on game type
  const getChallengeColors = (game: string, index: number) => {
    const colors = [
      { border: '#3B82F6', gradient: 'linear-gradient(145deg, #3B82F6, #000)' },
      { border: '#10B981', gradient: 'linear-gradient(180deg, #10B981, #000)' },
      { border: '#F59E0B', gradient: 'linear-gradient(165deg, #F59E0B, #000)' },
      { border: '#EF4444', gradient: 'linear-gradient(195deg, #EF4444, #000)' },
      { border: '#8B5CF6', gradient: 'linear-gradient(225deg, #8B5CF6, #000)' },
      { border: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #000)' }
    ];
    return colors[index % colors.length];
  };

  // Get game emoji
  const getGameEmoji = (game: string) => {
    const emojis: { [key: string]: string } = {
      'NBA 2K': '🏀',
      'FIFA': '⚽',
      'Call of Duty': '🔫',
      'Rocket League': '🚗',
      'Street Fighter': '👊',
      'Tekken': '🥊',
      'Mortal Kombat': '⚔️',
      'Fortnite': '🏗️',
      'Apex Legends': '🎯',
      'Valorant': '🎮'
    };
    return emojis[game] || '🎮';
  };

  if (challenges.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
          <p className="text-sm">Be the first to create a challenge!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative w-full h-full flex flex-wrap justify-center items-start gap-3 ${className}`}
      style={
        {
          '--r': `${radius}px`,
          '--x': '50%',
          '--y': '50%'
        } as React.CSSProperties
      }
    >
      {challenges.map((challenge, i) => {
        const colors = getChallengeColors(challenge.game, i);
        
        // Debug: Log challenge data
        console.log('🎮 Grid Challenge Data:', {
          id: challenge.id,
          players: challenge.players,
          capacity: challenge.capacity,
          maxPlayers: challenge.maxPlayers,
          playersArray: challenge.players?.length,
          fullObject: challenge
        });
        
        return (
          <article
            key={challenge.id}
            onMouseMove={handleCardMove}
            onClick={() => handleChallengeClick(challenge)}
            className="group relative flex flex-col w-[300px] rounded-[20px] overflow-hidden border-2 border-transparent transition-colors duration-300 cursor-pointer hover:border-white/20"
            style={
              {
                '--card-border': colors.border,
                background: colors.gradient,
                '--spotlight-color': 'rgba(255,255,255,0.3)'
              } as React.CSSProperties
            }
          >
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 opacity-0 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)'
              }}
            />
            
            {/* Challenge Image/Icon */}
            <div className="relative z-10 flex-1 p-[10px] box-border">
              <div className="w-full h-32 bg-black/20 rounded-[10px] flex items-center justify-center">
                <div className="text-6xl">{getGameEmoji(challenge.game)}</div>
              </div>
            </div>
            
            {/* Challenge Info */}
            <footer className="relative z-10 p-3 text-white font-sans">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold m-0">{challenge.game}</h3>
                <div className="flex gap-1">
                  {challenge.status === "active" && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                      Active
                    </span>
                  )}
                  {challenge.status === "in-progress" && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">
                      In Progress
                    </span>
                  )}
                  {challenge.status === "completed" && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">
                      Completed
                    </span>
                  )}
                  {challenge.players >= challenge.capacity && challenge.status === "active" && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">
                      Full
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="opacity-80">Entry Fee:</span>
                  <div className="font-semibold">{challenge.entryFee} USDFG</div>
                </div>
                <div>
                  <span className="opacity-80">Players:</span>
                  <div className="font-semibold">{challenge.players || 0}/{challenge.capacity || 2}</div>
                </div>
              </div>
              
              <div className="mt-2 text-xs opacity-85">
                <div>Mode: {challenge.mode}</div>
                <div>Platform: {challenge.platform}</div>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <div>Created by: {challenge.creatorTag || challenge.creator.slice(0, 8)}...</div>
                {(() => {
                  const isOwner = isChallengeOwner ? isChallengeOwner(challenge) : false;
                  console.log('🔍 Grid - Challenge:', challenge.id, 'isOwner:', isOwner, 'hasDeleteFn:', !!onDeleteChallenge);
                  return isOwner && onDeleteChallenge ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🗑️ Grid Delete clicked for:', challenge.id);
                        onDeleteChallenge(challenge.id);
                      }}
                      className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/30 transition-colors z-50"
                      title="Delete Challenge"
                    >
                      🗑️ Delete
                    </button>
                  ) : null;
                })()}
              </div>
            </footer>
          </article>
        );
      })}
      
      {/* Spotlight Effect */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          backdropFilter: 'grayscale(1) brightness(0.78)',
          WebkitBackdropFilter: 'grayscale(1) brightness(0.78)',
          background: 'rgba(0,0,0,0.001)',
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22)45%,rgba(0,0,0,0.35)60%,rgba(0,0,0,0.50)75%,rgba(0,0,0,0.68)88%,white 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22)45%,rgba(0,0,0,0.35)60%,rgba(0,0,0,0.50)75%,rgba(0,0,0,0.68)88%,white 100%)'
        }}
      />
      <div
        ref={fadeRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-[250ms] z-40"
        style={{
          backdropFilter: 'grayscale(1) brightness(0.78)',
          WebkitBackdropFilter: 'grayscale(1) brightness(0.78)',
          background: 'rgba(0,0,0,0.001)',
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90)30%,rgba(255,255,255,0.78)45%,rgba(255,255,255,0.65)60%,rgba(255,255,255,0.50)75%,rgba(255,255,255,0.32)88%,transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90)30%,rgba(255,255,255,0.78)45%,rgba(255,255,255,0.65)60%,rgba(255,255,255,0.50)75%,rgba(255,255,255,0.32)88%,transparent 100%)',
          opacity: 1
        }}
      />
    </div>
  );
};

export default ChallengeGrid;
