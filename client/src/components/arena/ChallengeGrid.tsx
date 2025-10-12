import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ChallengeData } from '@/hooks/useChallenges';

export interface ChallengeGridProps {
  challenges: ChallengeData[];
  onChallengeClick?: (challenge: ChallengeData) => void;
  onDeleteChallenge?: (challengeId: string) => void;
  onJoinChallenge?: (challenge: ChallengeData) => void;
  isChallengeOwner?: (challenge: ChallengeData) => boolean;
  isConnected?: boolean;
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
  onJoinChallenge,
  isChallengeOwner,
  isConnected = false,
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
      }
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    moveTo(rect.width / 2, rect.height / 2);
  };

  const handleCardMove = (e: React.MouseEvent) => {
    const card = e.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleChallengeClick = (challenge: ChallengeData) => {
    console.log('🎮 Grid challenge clicked:', challenge.id);
    onChallengeClick?.(challenge);
  };

  const getGameEmoji = (game: string) => {
    if (game.includes('UFC') || game.includes('Fighting')) return '🥊';
    if (game.includes('NBA') || game.includes('FIFA') || game.includes('FC') || game.includes('Madden')) return '🏀';
    if (game.includes('COD') || game.includes('Fortnite') || game.includes('Valorant')) return '🎯';
    if (game.includes('Racing') || game.includes('F1') || game.includes('Forza') || game.includes('Mario Kart')) return '🏎️';
    return '🎮';
  };

  const getChallengeColors = (game: string, index: number) => {
    const colorSchemes = [
      { gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)', border: 'rgba(168, 85, 247, 0.3)' },
      { gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(219, 39, 119, 0.1) 100%)', border: 'rgba(236, 72, 153, 0.3)' },
      { gradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)', border: 'rgba(34, 211, 238, 0.3)' },
      { gradient: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)', border: 'rgba(251, 146, 60, 0.3)' },
    ];
    return colorSchemes[index % colorSchemes.length];
  };

  const getTimeRemaining = (expiresAt: number) => {
    const minutes = Math.max(0, Math.floor((expiresAt - Date.now()) / (1000 * 60)));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

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
        const isOwner = isChallengeOwner ? isChallengeOwner(challenge) : false;
        const isFull = challenge.players >= challenge.capacity;
        const canJoin = challenge.status === "active" && !isFull && !isOwner && isConnected;
        
        return (
          <article
            key={challenge.id}
            onMouseMove={handleCardMove}
            onClick={() => handleChallengeClick(challenge)}
            className="group relative flex flex-col w-[320px] rounded-[20px] overflow-hidden border-2 border-transparent transition-colors duration-300 cursor-pointer hover:border-white/20"
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
            <footer className="relative z-10 p-4 text-white font-sans space-y-3">
              {/* Header with Title and Status */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold m-0 mb-1">{challenge.game}</h3>
                  <p className="text-sm opacity-70">{challenge.category} • {challenge.mode}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {challenge.status === "active" && !isFull && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs whitespace-nowrap">
                      Active
                    </span>
                  )}
                  {challenge.status === "in-progress" && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs whitespace-nowrap">
                      In Progress
                    </span>
                  )}
                  {challenge.status === "completed" && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs whitespace-nowrap">
                      Completed
                    </span>
                  )}
                  {isFull && challenge.status === "active" && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs whitespace-nowrap">
                      Full
                    </span>
                  )}
                  {isOwner && (
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-xs whitespace-nowrap">
                      Yours
                    </span>
                  )}
                </div>
              </div>

              {/* Platform and Creator */}
              {challenge.platform && challenge.username && (
                <div className="text-xs opacity-60 flex items-center gap-2">
                  <span>🖥️ {challenge.platform}</span>
                  <span>•</span>
                  <span>👤 {challenge.username}</span>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-1">
                {challenge.createdAt && (
                  <div className="text-xs opacity-60">
                    Created {new Date(challenge.createdAt).toLocaleDateString()} at {new Date(challenge.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {challenge.expiresAt && challenge.expiresAt > Date.now() && (
                  <div className="text-xs text-orange-400">
                    ⏰ Expires in {getTimeRemaining(challenge.expiresAt)}
                  </div>
                )}
                {challenge.expiresAt && challenge.expiresAt <= Date.now() && (
                  <div className="text-xs text-red-400 animate-pulse">
                    ⏰ Expired
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-sm text-center bg-black/20 rounded-lg p-2">
                <div>
                  <div className="font-bold">{challenge.entryFee} USDFG</div>
                  <div className="text-xs opacity-70">Entry</div>
                </div>
                <div>
                  <div className="font-bold">{challenge.prizePool} USDFG</div>
                  <div className="text-xs opacity-70">Prize</div>
                </div>
                <div>
                  <div className="font-bold">{challenge.players || 0}/{challenge.capacity || 2}</div>
                  <div className="text-xs opacity-70">Players</div>
                </div>
              </div>

              {/* Rules Preview */}
              {challenge.rules && (
                <details className="group/details">
                  <summary className="cursor-pointer text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
                    <span className="mr-1">📋</span>
                    Rules
                    <span className="ml-auto group-open/details:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 text-xs opacity-80 whitespace-pre-line bg-black/20 p-2 rounded">
                    {challenge.rules}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwner ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🗑️ Grid Delete clicked for:', challenge.id);
                        onDeleteChallenge?.(challenge.id);
                      }}
                      className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors"
                      title="Delete Challenge"
                    >
                      🗑️ Delete
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed"
                      disabled
                      title="Coming Soon"
                    >
                      ✏️ Edit
                    </button>
                  </>
                ) : canJoin ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🎮 Join challenge clicked:', challenge.id);
                      onJoinChallenge?.(challenge);
                    }}
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:brightness-110 transition-all"
                  >
                    ⚡ Join Challenge
                  </button>
                ) : isFull ? (
                  <button
                    className="w-full px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded-lg text-sm font-semibold cursor-not-allowed"
                    disabled
                  >
                    🔒 Challenge Full
                  </button>
                ) : !isConnected ? (
                  <button
                    className="w-full px-3 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-semibold cursor-not-allowed"
                    disabled
                  >
                    🔌 Connect Wallet to Join
                  </button>
                ) : (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded-lg text-sm font-semibold"
                  >
                    ℹ️ View Details
                  </button>
                )}
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
            'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90)30%,rgba(255,255,255,0.78)45%,rgba(255,255,255,0.65)60%,rgba(255,255,255,0.50)75%,rgba(255,255,255,0.32)88%,transparent 100%)'
        }}
      />
    </div>
  );
};

export default ChallengeGrid;
