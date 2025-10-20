import React from "react";
import { motion } from "framer-motion";
import { Trophy, Gamepad2, Swords, Flame, Shield, Crown, X } from "lucide-react";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    name: string;
    address: string;
    totalEarned: number;
    winRate: number;
    wins: number;
    losses: number;
    rank?: number;
  };
}

export default function PlayerProfileModal({ isOpen, onClose, player }: PlayerProfileModalProps) {
  if (!isOpen) return null;

  // Calculate additional stats
  const totalGames = player.wins + player.losses;
  const streak = Math.floor(Math.random() * 10) + 1; // Mock streak for now
  const integrity = (9.0 + Math.random()).toFixed(1); // Mock integrity rating
  const favoriteGame = "Valorant"; // Mock favorite game
  const rank = player.rank || 1;
  const rankTitle = rank === 1 ? "Mythic Prime" : rank <= 3 ? "Diamond Elite" : rank <= 10 ? "Platinum Pro" : "Gold Warrior";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-5xl rounded-[28px] bg-[#07080C]/95 border border-zinc-800 overflow-hidden shadow-[0_0_60px_rgba(255,215,130,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <X className="h-5 w-5 text-zinc-400" />
        </button>

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />

        {/* Header / Avatar */}
        <div className="relative z-10 flex flex-col items-center gap-3 pt-10">
          <div className="relative h-28 w-28 rounded-full bg-zinc-900 grid place-items-center ring-2 ring-amber-300/60 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.25)]">
            <Gamepad2 className="h-10 w-10 text-amber-300" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,235,170,.2),transparent_70%)]" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.25)] uppercase">
            {player.name}
          </h1>
          <p className="text-sm text-zinc-400">{player.address.slice(0, 8)}...{player.address.slice(-4)} • {rankTitle}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-300">
            <Crown className="h-4 w-4" /> Rank #{rank}
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative z-10 mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-8">
          {[{
            icon: Trophy,
            label: "Wins",
            value: player.wins
          }, {
            icon: Swords,
            label: "Losses",
            value: player.losses
          }, {
            icon: Flame,
            label: "Streak",
            value: `${streak} Wins`
          }, {
            icon: Shield,
            label: "Integrity Rating",
            value: `${integrity} / 10`
          }, {
            icon: Gamepad2,
            label: "Fav Game",
            value: favoriteGame
          }, {
            icon: Crown,
            label: "Win Rate",
            value: `${player.winRate}%`
          }].map((s, i) => (
            <div key={i} className="border border-zinc-800 bg-[#0B0C12]/90 hover:border-amber-300/50 transition rounded-2xl overflow-hidden text-center shadow-[0_0_20px_rgba(255,215,130,0.03)]">
              <div className="p-5 flex flex-col items-center gap-2">
                {React.createElement(s.icon, { className: "h-6 w-6 text-amber-300" })}
                <div className="text-xs text-zinc-400">{s.label}</div>
                <div className="text-lg font-semibold text-zinc-50 tracking-tight">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Challenge CTA */}
        <div className="relative z-10 flex flex-col items-center gap-4 mt-12 pb-12">
          <button className="bg-gradient-to-r from-amber-300 to-yellow-200 text-zinc-900 text-sm hover:opacity-90 px-10 py-3 rounded-full shadow-[0_0_30px_rgba(255,215,130,0.25)] transition-all">
            Challenge Player
          </button>
          <p className="text-[11px] text-zinc-500 tracking-wide uppercase">Non-custodial • Skill-Based • Competitive Mode</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
