import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * USDFG Live Pill Preview (X-style)
 * - Expanded state shows: avatars, game title, status, moving signal bars, and controls.
 * - Collapsed state shows a compact pill; tap to expand.
 *
 * To view: Import this component in any page and render it
 */
export default function PurplePillPreview() {
  const [expanded, setExpanded] = useState(true);

  // Mock player data
  const players = [
    { wallet: "ABC123", displayName: "Player1", profileImage: null },
    { wallet: "XYZ789", displayName: "Player2", profileImage: null },
  ];

  const gameName = "FC 26";
  const statusText = "HAT · Waiting for opponent";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e17] p-6">
      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-[860px] h-[72px] px-6 flex items-center justify-between rounded-full
              bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500
              shadow-[0_0_22px_rgba(122,92,255,.6),0_0_44px_rgba(77,163,255,.35)]"
          >
            {/* LEFT: avatars + text */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center -space-x-2">
                {players.slice(0, 2).map((player, idx) => (
                  <div
                    key={player.wallet}
                    className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/15 flex items-center justify-center font-bold text-white"
                    style={{ zIndex: 2 - idx }}
                  >
                    {player.profileImage ? (
                      <img 
                        src={player.profileImage} 
                        alt={player.displayName} 
                        className="w-full h-full object-cover rounded-full" 
                      />
                    ) : (
                      player.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {players.length === 1 && (
                  <div className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center text-white/70">
                    +
                  </div>
                )}
              </div>

              <div className="flex flex-col leading-tight text-white min-w-0">
                <span className="text-[16px] font-bold truncate">{gameName}</span>
                <span className="text-[13px] opacity-85 truncate">{statusText}</span>
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

              {/* CONTROLS */}
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="w-10 h-10 rounded-2xl bg-black/20 hover:bg-black/35 text-white/95 flex items-center justify-center transition"
                aria-label="Close live pill"
                title="Close"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => setExpanded(true)}
            className="flex items-center gap-3 px-5 h-[56px] rounded-full
              bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500
              text-white shadow-[0_0_18px_rgba(122,92,255,.6)]"
            aria-label="Expand live pill"
            title="Expand"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold">Live Challenge</span>
            <span className="text-xs opacity-80">Tap to expand</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
