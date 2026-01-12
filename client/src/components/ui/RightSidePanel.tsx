import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp } from 'lucide-react';
import { getPlayerStats } from '@/lib/firebase/firestore';

interface PlayerInfo {
  wallet: string;
  displayName?: string;
  profileImage?: string;
}

interface RightSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  // Minimized view props (mobile only)
  players?: PlayerInfo[];
  gameName?: string;
  onExpand?: () => void;
}

const RightSidePanel: React.FC<RightSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  players = [],
  gameName,
  onExpand,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [playerData, setPlayerData] = useState<Record<string, { displayName?: string; profileImage?: string }>>({});

  // Ensure players is always an array
  const safePlayers = Array.isArray(players) ? players : [];

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch player stats for minimized view
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!safePlayers || safePlayers.length === 0) return;
      
      const data: Record<string, { displayName?: string; profileImage?: string }> = {};
      for (const player of safePlayers) {
        if (player.wallet) {
          try {
            const stats = await getPlayerStats(player.wallet);
            if (stats) {
              data[player.wallet.toLowerCase()] = {
                displayName: stats.displayName,
                profileImage: stats.profileImage,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch stats for ${player.wallet}:`, error);
          }
        }
      }
      setPlayerData(data);
    };
    
    // Show minimized view as soon as challenge is created (1+ players)
    if (isMinimized && isMobile && safePlayers && safePlayers.length >= 1) {
      fetchPlayerData();
    }
  }, [isMinimized, isMobile, safePlayers]);

  // Auto-minimize on mobile when panel opens (as soon as challenge is created)
  // Show minimized view immediately for better UX (like X/Twitter)
  useEffect(() => {
    if (isOpen && isMobile && safePlayers.length >= 1) {
      // Show minimized view immediately (no delay) for consistent visibility
      setIsMinimized(true);
    } else if (!isOpen || !isMobile || safePlayers.length < 1) {
      setIsMinimized(false);
    }
  }, [isOpen, isMobile, safePlayers.length]);

  const handleExpand = () => {
    setIsMinimized(false);
    if (onExpand) onExpand();
  };

  // Don't prevent body scroll - allow browsing while lobby is open (X Spaces style)
  // Removed body scroll lock so users can browse the main page

  if (!isOpen) return null;

  // Minimized view (mobile only) - shows at top like X's minimized player
  // Show when minimized and challenge is created (1+ players) on mobile
  if (isOpen && isMobile && safePlayers.length >= 1 && isMinimized) {
    return (
      <>
        {/* Minimized bar at top - like X's minimized player */}
        {/* Tap anywhere on the bar to expand */}
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600/95 to-purple-600/95 backdrop-blur-md border-b border-blue-400/30 shadow-lg md:hidden touch-manipulation active:opacity-90"
          onClick={handleExpand}
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Player avatars - show creator, and joiner if available */}
            <div className="flex -space-x-2">
              {safePlayers.slice(0, 2).map((player, idx) => {
                const stats = playerData[player.wallet.toLowerCase()] || {};
                const displayName = stats.displayName || player.displayName || `${player.wallet.slice(0, 4)}...${player.wallet.slice(-4)}`;
                const profileImage = stats.profileImage || player.profileImage;
                return (
                  <div
                    key={player.wallet}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 border-2 border-white/30 flex items-center justify-center overflow-hidden"
                    style={{ zIndex: 2 - idx }}
                  >
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt={displayName} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Show placeholder for second player if only 1 player */}
              {safePlayers.length === 1 && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 border-2 border-white/30 border-dashed flex items-center justify-center">
                  <span className="text-white/50 text-xs">+</span>
                </div>
              )}
            </div>

            {/* Game info */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">
                {gameName || 'Challenge'}
              </div>
              <div className="text-blue-100 text-xs truncate">
                {safePlayers.length === 2 
                  ? (() => {
                      const p1Stats = playerData[safePlayers[0]?.wallet.toLowerCase()] || {};
                      const p2Stats = playerData[safePlayers[1]?.wallet.toLowerCase()] || {};
                      const p1Name = p1Stats.displayName || safePlayers[0]?.displayName || safePlayers[0]?.wallet.slice(0, 6);
                      const p2Name = p2Stats.displayName || safePlayers[1]?.displayName || safePlayers[1]?.wallet.slice(0, 6);
                      return `${p1Name} vs ${p2Name}`;
                    })()
                  : safePlayers.length === 1
                  ? (() => {
                      const p1Stats = playerData[safePlayers[0]?.wallet.toLowerCase()] || {};
                      const p1Name = p1Stats.displayName || safePlayers[0]?.displayName || safePlayers[0]?.wallet.slice(0, 6);
                      return `${p1Name} • Waiting for opponent`;
                    })()
                  : `${safePlayers.length} players`
                }
              </div>
            </div>

            {/* Expand button - tap to expand */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              aria-label="Expand lobby"
            >
              <ChevronUp className="w-5 h-5 text-white" />
            </button>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              aria-label="Close lobby"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Subtle backdrop - doesn't close on click, allows main page interaction */}
      <div
        className="fixed inset-0 bg-black/10 z-40 pointer-events-none"
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Right Side Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-l border-amber-400/20 shadow-[-4px_0_40px_rgba(0,0,0,0.8)] ${className}`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with minimize button on mobile */}
        {title && (
          <div className="px-4 py-3 border-b border-amber-400/20 sticky top-0 bg-gray-900/98 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {/* Minimize button (mobile only, when challenge is created) */}
                {isMobile && safePlayers.length >= 1 && (
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300 md:hidden"
                    aria-label="Minimize lobby"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-400 rotate-180" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-full" style={{ height: `calc(100vh - ${title ? '60px' : '0px'})` }}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default RightSidePanel;
