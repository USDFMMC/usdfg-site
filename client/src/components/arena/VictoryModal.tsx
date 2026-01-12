import React, { useEffect, useRef } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimReward?: () => void;
  autoWon?: boolean;
  opponentName?: string;
}

const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  onClaimReward,
  autoWon = false,
  opponentName
}) => {
  // Track if confetti has been fired for this win instance to prevent re-triggering on re-renders
  const confettiFiredRef = useRef(false);
  const winInstanceIdRef = useRef<string | null>(null);

  // Detect mobile devices and reduced motion preferences for performance
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
  );
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (isOpen && !confettiFiredRef.current) {
      // Generate unique ID for this win instance
      const currentWinId = `${Date.now()}-${Math.random()}`;
      winInstanceIdRef.current = currentWinId;
      confettiFiredRef.current = true;

      // Skip confetti if user prefers reduced motion
      if (prefersReducedMotion) {
        return;
      }

      // Trigger esports-style confetti burst on modal appearance
      // One-time burst from center, gold/amber colors, premium feel, 1-1.5 seconds duration
      const colors = ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fde047', '#facc15']; // USDFG gold/amber palette
      
      // Adjust particle count for mobile/performance
      const mainParticleCount = isMobile ? 50 : 100;
      const secondaryParticleCount = isMobile ? 25 : 50;
      
      // Main burst from center - esports victory style
      confetti({
        particleCount: mainParticleCount,
        spread: 70,
        origin: { x: 0.5, y: 0.5 }, // Center of screen
        colors: colors,
        startVelocity: isMobile ? 25 : 30,
        decay: 0.92,
        gravity: 1,
        ticks: 200,
        zIndex: 110, // Behind modal (z-111) but above backdrop (z-110) and other overlays
        shapes: ['circle'], // Clean circles, not emoji
      });

      // Secondary smaller bursts for depth (only on desktop for performance)
      if (!isMobile) {
        setTimeout(() => {
          confetti({
            particleCount: secondaryParticleCount,
            spread: 50,
            origin: { x: 0.5, y: 0.5 },
            colors: colors,
            startVelocity: 25,
            decay: 0.92,
            gravity: 1,
            ticks: 200,
            zIndex: 100,
            shapes: ['circle'],
          });
        }, 200);
      }
    }

    // Reset when modal closes to allow confetti on next win
    if (!isOpen) {
      confettiFiredRef.current = false;
      winInstanceIdRef.current = null;
    }
  }, [isOpen, isMobile, prefersReducedMotion]);

  const handleClaimReward = () => {
    if (onClaimReward) {
      onClaimReward();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-[111] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-lg border border-amber-400/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-[0_0_40px_rgba(255,215,0,0.12)]">
              {/* Gold glow effect around edges */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-amber-500/10 via-transparent to-amber-500/10" />
              
              {/* Content - Compact mobile sizing to match claim prize box */}
              <div className="relative p-2.5 text-center">
                {/* Trophy Icon - Compact size to match claim prize box */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.1, 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 15 
                  }}
                  className="mb-1.5 flex justify-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl"
                    />
                    <Trophy className="relative h-6 w-6 text-amber-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
                  </div>
                </motion.div>

                {/* Header - Compact text to match claim prize box */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-1 text-sm font-bold text-white"
                >
                  You Won!
                </motion.h2>

                {/* Body Copy - Compact spacing to match claim prize box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-2 text-zinc-300"
                >
                  {autoWon ? (
                    <p className="text-xs text-zinc-300">
                      Your opponent submitted a loss. Trust review recorded automatically.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-300">
                      You won the match! Trust review recorded.
                    </p>
                  )}
                </motion.div>

                {/* CTA Button - Compact to match claim prize box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={handleClaimReward}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold py-2 text-xs shadow-[0_0_20px_rgba(255,215,0,0.25)] hover:from-amber-400 hover:to-amber-500 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all duration-300"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Claim Reward
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VictoryModal;

