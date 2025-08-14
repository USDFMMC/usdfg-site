import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Copy, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  rank: number;
  wallet: string;
  wins: number;
  losses: number;
  winRate: string;
  winStreak: number;
  gains: number;
  rankTitle: string;
}

interface Tab {
  id: string;
  label: string;
}

const tierColors: Record<string, string> = {
  Bronze: "bg-gradient-to-r from-yellow-700 to-yellow-400 text-yellow-100 border-yellow-400",
  Silver: "bg-gradient-to-r from-gray-400 to-white text-gray-900 border-gray-300",
  Gold: "bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400",
  Platinum: "bg-gradient-to-r from-cyan-300 to-blue-500 text-blue-900 border-cyan-400",
  Ghostly: "bg-gradient-to-r from-purple-400 to-indigo-900 text-white border-purple-400",
};
const tierTooltips: Record<string, string> = {
  Bronze: "Bronze: New competitor, keep climbing!",
  Silver: "Silver: Solid competitor, rising star!",
  Gold: "Gold: Elite performer, top 10%!",
  Platinum: "Platinum: Legendary, the best of the best!",
  Ghostly: "Ghostly: Transcendent, the rarest and most mysterious tier!",
};

// Utility to format USDFG values with 2-6 decimals
function formatUSDFG(amount: number): string {
  if (amount >= 1) return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (amount >= 0.01) return amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

const LeaderboardPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState("most-wins");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  
  const tabs: Tab[] = [
    { id: "most-wins", label: "Most Wins" },
    { id: "win-streak", label: "Win Streak" },
    { id: "total-gains", label: "Total Skill Rewards" },
    { id: "highest-rank", label: "Highest Rank" }
  ];
  
  const players: Player[] = [
    {
      rank: 1,
      wallet: "0xA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9F8E",
      wins: 156,
      losses: 12,
      winRate: "92.9%",
      winStreak: 24,
      gains: 1250.0,
      rankTitle: "Ghostly"
    },
    {
      rank: 2,
      wallet: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9F8E1A",
      wins: 142,
      losses: 18,
      winRate: "88.8%",
      winStreak: 18,
      gains: 3.2456,
      rankTitle: "Platinum"
    },
    {
      rank: 3,
      wallet: "0xC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9F8E1AB2",
      wins: 128,
      losses: 22,
      winRate: "85.3%",
      winStreak: 15,
      gains: 0.000034,
      rankTitle: "Gold"
    },
    {
      rank: 4,
      wallet: "0xD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9F8E1AB2C3",
      wins: 98,
      losses: 32,
      winRate: "75.4%",
      winStreak: 12,
      gains: 12.5,
      rankTitle: "Silver"
    },
    {
      rank: 5,
      wallet: "0xE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9F8E1AB2C3D4",
      wins: 85,
      losses: 45,
      winRate: "65.4%",
      winStreak: 8,
      gains: 0.015678,
      rankTitle: "Bronze"
    }
  ];
  
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Leaderboard Visual Glow - Add if/when you have a main image */}
        {/* <div className="flex justify-center mb-12">
          <div className="relative fade-in-up" id="leaderboard-visual">
            <div className="glow-behind pulse-glow"></div>
            <img
              src="/assets/your-leaderboard-image.png"
              alt="USDFG leaderboard - top players and winners"
              className="w-full max-w-2xl rounded-xl relative z-10"
            />
          </div>
        </div> */}
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 drop-shadow-glow">
            $USDFG <span className="text-primary">LEADERBOARD</span>
          </h2>
          {/* Neon-glow underline/divider */}
          <div className="mx-auto mb-4 h-1 w-40 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 animate-pulse shadow-[0_0_32px_#22d3ee99] shimmer-underline" />
          <p className="text-cyan-200 max-w-2xl mx-auto text-lg font-semibold mb-2">
            No usernames. No profiles. Just your wallet, your skill, your record.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 cursor-pointer text-cyan-400">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent className="bg-black/80 text-cyan-100 border-cyan-400/40">
                  Your wallet is your identity. No personal data, no registration, no tracking.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="text-cyan-400 max-w-2xl mx-auto text-base font-medium">
            Only skill matters. No bots. No aliases. Every win is on-chain.
          </p>
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Glass reflection overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/30 to-transparent opacity-30 animate-glass-reflection" />
          </div>
          {/* Leaderboard Tabs */}
          <div className="flex flex-wrap justify-center mb-6 border-b border-cyan-800/60">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={`rounded-none rounded-t-md font-bold tracking-wide px-6 py-2 text-lg ${
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-[0_0_16px_#22d3ee99]" 
                    : "text-cyan-300 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto rounded-2xl bg-gradient-to-br from-white/10 to-[#00ffff22] border-2 border-cyan-400/40 shadow-2xl backdrop-blur-md p-2 relative neon-outline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Rank</TableHead>
                  <TableHead className="text-left">Wallet</TableHead>
                  <TableHead className="text-center">Wins</TableHead>
                  <TableHead className="text-center">Losses</TableHead>
                  <TableHead className="text-center">Win Rate</TableHead>
                  <TableHead className="text-center">Streak</TableHead>
                  <TableHead className="w-36 text-center" style={{ overflow: 'visible', position: 'relative' }}>
                    <div className="flex items-center justify-center gap-1 relative">
                      Skill Rewards ($USDFG)
                    </div>
                  </TableHead>
                  <TableHead className="w-24 text-center">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, i) => {
                  const masked = `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`;
                  const tierColor = tierColors[player.rankTitle] || "bg-gray-700 text-white border-gray-500";
                  const tierTooltip = tierTooltips[player.rankTitle] || player.rankTitle;
                  return (
                    <TableRow
                      key={player.wallet}
                      className={`relative group transition-transform duration-200 ${i < 3 ? "z-10 animate-glow-row" : ""}`}
                      style={i < 3 ? { boxShadow: "0 0 32px 8px var(--tier-glow-" + player.rankTitle.toLowerCase() + ")" } : {}}
                    >
                      <TableCell className="text-center font-bold text-lg">{player.rank}</TableCell>
                      <TableCell className="font-mono text-sm flex items-center gap-2">
                        <span>{masked}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Copy className="w-4 h-4 cursor-pointer hover:text-cyan-400" onClick={() => {navigator.clipboard.writeText(player.wallet); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1200);}} />
                            </TooltipTrigger>
                            <TooltipContent className="bg-black/80 text-cyan-100 border-cyan-400/40">
                              {copiedIdx === i ? "Copied!" : "Copy wallet address"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">{player.wins}</TableCell>
                      <TableCell className="text-center">{player.losses}</TableCell>
                      <TableCell className="text-center">{player.winRate}</TableCell>
                      <TableCell className="text-center">{player.winStreak}</TableCell>
                      <TableCell className="text-center font-bold text-cyan-300">{formatUSDFG(player.gains)}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold text-white shadow-md border-2 ${
                                player.rankTitle === "Gold"
                                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-400"
                                  : player.rankTitle === "Silver"
                                  ? "bg-gradient-to-r from-gray-300 to-gray-500 border-gray-300"
                                  : player.rankTitle === "Bronze"
                                  ? "bg-gradient-to-r from-amber-700 to-yellow-500 border-amber-700"
                                  : "bg-gradient-to-r from-cyan-400 to-blue-600 border-cyan-400"
                              } animate-fade-in-up`}
                              >
                                {/* Crown/medal icon */}
                                {player.rankTitle === "Gold" && <Crown className="w-5 h-5 text-yellow-300 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Silver" && <Crown className="w-5 h-5 text-gray-200 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Bronze" && <Crown className="w-5 h-5 text-amber-400 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Platinum" && <Crown className="w-5 h-5 text-cyan-200 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Ghostly" && <Crown className="w-5 h-5 text-purple-400 drop-shadow-glow animate-bounce" style={{ filter: 'drop-shadow(0 0 8px #a78bfa) drop-shadow(0 0 16px #fff)' }} />}
                                <span className="ml-1">{player.rankTitle}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <span>
                                {player.rankTitle} Tier: {player.rankTitle === "Gold"
                                  ? "Top 1% - Legendary performance"
                                  : player.rankTitle === "Silver"
                                  ? "Top 10% - Elite competitor"
                                  : player.rankTitle === "Bronze"
                                  ? "Top 25% - Proven winner"
                                  : "Platinum - Consistent excellence"}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <span className="w-8 h-8 flex items-center justify-center bg-primary text-background rounded-md">1</span>
              <span className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer">2</span>
              <span className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer">3</span>
              <span className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer">Next ›</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPreview;
