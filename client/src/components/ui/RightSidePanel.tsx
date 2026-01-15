import React, { useEffect, useRef, useState, Suspense } from 'react';
import { X, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
  // Voice chat props - keep active even when minimized
  voiceChatChallengeId?: string;
  voiceChatCurrentWallet?: string;
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
  voiceChatChallengeId,
  voiceChatCurrentWallet,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [playerData, setPlayerData] = useState<Record<string, { displayName?: string; profileImage?: string }>>({});
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  // Auto-minimize on mobile when panel opens (shows pill immediately)
  useEffect(() => {
    if (isOpen && isMobile) {
      // On mobile, show minimized pill immediately when panel opens
      setIsMinimized(true);
    } else if (!isOpen) {
      // Reset when panel closes
      setIsMinimized(false);
    }
  }, [isOpen, isMobile]);

  const handleExpand = () => {
    setIsMinimized(false);
    if (onExpand) onExpand();
  };

  const handlePillClick = () => {
    // When pill is clicked, expand to full lobby (same as original behavior)
    handleExpand();
  };

  // Don't prevent body scroll - allow browsing while lobby is open (X Spaces style)
  // Removed body scroll lock so users can browse the main page

  if (!isOpen) return null;

  // Get player names for display
  const getPlayerDisplayName = (player: PlayerInfo) => {
    const stats = playerData[player.wallet.toLowerCase()] || {};
    return stats.displayName || player.displayName || player.wallet.slice(0, 4);
  };

  const getStatusText = () => {
    if (safePlayers.length >= 2) {
      const p1Name = getPlayerDisplayName(safePlayers[0]);
      const p2Name = getPlayerDisplayName(safePlayers[1]);
      return `${p1Name} vs ${p2Name}`;
    } else if (safePlayers.length === 1) {
      const p1Name = getPlayerDisplayName(safePlayers[0]);
      return `${p1Name} • Waiting for opponent`;
    }
    return 'Waiting for opponent';
  };

  // Minimized view (mobile only) - new purple pill design
  // When clicked, expands to full lobby (same behavior as original)
  if (isOpen && isMobile && isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-4 pt-2 pb-2 md:hidden"
      >
        <div
          className="relative w-full h-[72px] px-6 flex items-center justify-between rounded-full
            bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500
            shadow-[0_0_22px_rgba(122,92,255,.6),0_0_44px_rgba(77,163,255,.35)]"
          onClick={handlePillClick}
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          {/* LEFT: avatars + text */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center -space-x-2">
              {safePlayers.slice(0, 2).map((player, idx) => {
                const stats = playerData[player.wallet.toLowerCase()] || {};
                const displayName = stats.displayName || player.displayName || player.wallet.slice(0, 4);
                const profileImage = stats.profileImage || player.profileImage;
                return (
                  <div
                    key={player.wallet}
                    className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/15 flex items-center justify-center overflow-hidden"
                    style={{ zIndex: 2 - idx }}
                  >
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt={displayName} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="font-bold text-white text-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Show placeholder for second player if only 1 player */}
              {safePlayers.length === 1 && (
                <div className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center">
                  <span className="text-white/70 text-sm">+</span>
                </div>
              )}
            </div>

            <div className="flex flex-col leading-tight text-white min-w-0">
              <span className="text-[16px] font-bold truncate">{gameName || 'Challenge'}</span>
              <span className="text-[13px] opacity-85 truncate">{getStatusText()}</span>
            </div>
          </div>

          {/* RIGHT: signal bars */}
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  className="w-[3px] bg-white/90 rounded"
                  initial={false}
                  animate={{ height: [8, 18, 8], opacity: [0.55, 1, 0.55] }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay
                  }}
                  style={{ height: 8 }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Subtle backdrop - doesn't close on click, allows main page interaction */}
      <div
        className="fixed inset-0 bg-black/10 z-40 pointer-events-none"
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Right Side Panel - slides up from bottom right like X Spaces, swipe down to minimize to pill */}
      <motion.div
        ref={panelRef}
        className={`fixed right-0 bottom-0 z-50 w-full max-w-md bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-t border-l border-amber-400/20 shadow-[0_-4px_40px_rgba(0,0,0,0.8)] rounded-t-2xl ${className}`}
        style={{
          maxHeight: '90vh',
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDrag={(event, info) => {
          // Only allow dragging down (positive Y)
          if (info.offset.y > 0) {
            setDragY(info.offset.y);
            setIsDragging(true);
          }
        }}
        onDragEnd={(event, info) => {
          setIsDragging(false);
          // If dragged down more than 100px, minimize back to pill (not close)
          if (info.offset.y > 100) {
            setIsMinimized(true);
          }
          setDragY(0);
        }}
        animate={{
          y: isOpen ? (isDragging ? dragY : 0) : '100%',
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300,
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
                {/* Minimize button (mobile only) - allows users to minimize to nav bar to scroll site */}
                {isMobile && (
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300 md:hidden"
                    aria-label="Minimize lobby to nav bar"
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
