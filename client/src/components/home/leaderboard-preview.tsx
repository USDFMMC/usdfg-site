import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Copy, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { getTopPlayers, PlayerStats } from "@/lib/firebase/firestore";

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

// Helper function to determine tier based on win rate and games played
function getTier(winRate: number, gamesPlayed: number): string {
  if (gamesPlayed < 3) return "Bronze";
  if (winRate >= 90) return "Ghostly";
  if (winRate >= 80) return "Platinum";
  if (winRate >= 70) return "Gold";
  if (winRate >= 60) return "Silver";
  return "Bronze";
}

const LeaderboardPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState("total-gains");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const tabs: Tab[] = [
    { id: "most-wins", label: "Most Wins" },
    { id: "total-gains", label: "Total Skill Rewards" },
  ];
  
  // Fetch real player data from Firestore
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned';
        
        if (activeTab === 'most-wins') {
          sortBy = 'wins';
        } else if (activeTab === 'total-gains') {
          sortBy = 'totalEarned';
        }
        
        const topPlayers = await getTopPlayers(10, sortBy);
        
        // Transform Firestore data to Player interface
        const transformedPlayers: Player[] = topPlayers.map((p: PlayerStats, index: number) => ({
          rank: index + 1,
          wallet: p.wallet,
          wins: p.wins,
          losses: p.losses,
          winRate: `${p.winRate.toFixed(1)}%`,
          winStreak: 0, // TODO: Add streak tracking
          gains: p.totalEarned,
          rankTitle: getTier(p.winRate, p.gamesPlayed)
        }));
        
        setPlayers(transformedPlayers);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Keep empty array on error
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [activeTab]);
  
  return (
    <section className="py-12 bg-[#07080C]">
      <div className="container mx-auto px-3">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3 drop-shadow-glow">
            USDFG <span className="text-primary">LEADERBOARD</span>
          </h2>
          {/* Neon-glow underline/divider */}
          <div className="mx-auto mb-4 h-0.5 w-40 rounded-full bg-gradient-to-r from-cyan-400/80 via-purple-500/80 to-cyan-400/80 animate-pulse shadow-[0_0_20px_#22d3ee66] shimmer-underline" />
          <p className="text-cyan-200 max-w-2xl mx-auto text-base md:text-lg font-semibold mb-2">
            No usernames. No profiles. Just your wallet, your skill, your record.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1.5 cursor-pointer text-cyan-400">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent className="bg-black/80 text-cyan-100 border-cyan-400/40">
                  Your wallet is your identity. No personal data, no registration, no tracking.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="text-cyan-400 max-w-2xl mx-auto text-sm md:text-base font-medium">
            Only skill matters. No bots. No aliases. Every win is on-chain.
          </p>
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Leaderboard Tabs */}
          <div className="flex flex-wrap justify-center mb-4 border-b border-amber-800/40">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={`rounded-none rounded-t-md font-bold tracking-wide px-4 py-1.5 text-sm ${
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-amber-400/90 to-orange-500/90 text-black shadow-[0_0_12px_rgba(255,215,130,0.2)] border border-amber-400/30" 
                    : "text-amber-300 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto rounded-lg bg-[#07080C]/98 border border-amber-400/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-md p-2 relative neon-outline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center text-sm">Rank</TableHead>
                  <TableHead className="text-left text-sm">Wallet</TableHead>
                  <TableHead className="text-center text-sm">Wins</TableHead>
                  <TableHead className="text-center text-sm">Losses</TableHead>
                  <TableHead className="text-center text-sm">Win Rate</TableHead>
                  <TableHead className="text-center text-sm">Streak</TableHead>
                  <TableHead className="w-36 text-center text-sm" style={{ overflow: 'visible', position: 'relative' }}>
                    <div className="flex items-center justify-center gap-1 relative">
                      Skill Rewards (USDFG)
                    </div>
                  </TableHead>
                  <TableHead className="w-24 text-center text-sm">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                        <p className="text-cyan-300 text-sm">Loading leaderboard...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Trophy className="w-12 h-12 text-cyan-400/50" />
                        <p className="text-cyan-300 text-sm font-semibold">No players yet!</p>
                        <p className="text-gray-400 text-xs">Be the first to complete a challenge and claim the top spot.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : players.map((player, i) => {
                  const masked = `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`;
                  const tierColor = tierColors[player.rankTitle] || "bg-gray-700 text-white border-gray-500";
                  const tierTooltip = tierTooltips[player.rankTitle] || player.rankTitle;
                  return (
                    <TableRow
                      key={player.wallet}
                      className={`relative group transition-transform duration-200 ${i < 3 ? "z-10 animate-glow-row" : ""}`}
                      style={i < 3 ? { boxShadow: "0 0 32px 8px var(--tier-glow-" + player.rankTitle.toLowerCase() + ")" } : {}}
                    >
                      <TableCell className="text-center font-bold text-base">{player.rank}</TableCell>
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
                      <TableCell className="text-center text-sm">{player.wins}</TableCell>
                      <TableCell className="text-center text-sm">{player.losses}</TableCell>
                      <TableCell className="text-center text-sm">{player.winRate}</TableCell>
                      <TableCell className="text-center text-sm">{player.winStreak}</TableCell>
                      <TableCell className="text-center font-bold text-amber-300 text-sm">{formatUSDFG(player.gains)}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-white shadow-[0_0_6px_rgba(255,215,130,0.12)] border text-sm ${
                                player.rankTitle === "Gold"
                                  ? "bg-gradient-to-r from-yellow-400/90 to-yellow-600/90 border-yellow-400/50"
                                  : player.rankTitle === "Silver"
                                  ? "bg-gradient-to-r from-gray-300/90 to-gray-500/90 border-gray-300/50"
                                  : player.rankTitle === "Bronze"
                                  ? "bg-gradient-to-r from-amber-700/90 to-yellow-500/90 border-amber-700/50"
                                  : "bg-gradient-to-r from-cyan-400/90 to-blue-600/90 border-cyan-400/50"
                              } animate-fade-in-up`}
                              >
                                {/* Crown/medal icon */}
                                {player.rankTitle === "Gold" && <Crown className="w-4 h-4 text-yellow-300 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Silver" && <Crown className="w-4 h-4 text-gray-200 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Bronze" && <Crown className="w-4 h-4 text-amber-400 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Platinum" && <Crown className="w-4 h-4 text-cyan-200 drop-shadow-glow animate-bounce" />}
                                {player.rankTitle === "Ghostly" && <Crown className="w-4 h-4 text-purple-400 drop-shadow-glow animate-bounce" style={{ filter: 'drop-shadow(0 0 6px #a78bfa) drop-shadow(0 0 12px #fff)' }} />}
                                <span className="ml-1">{player.rankTitle}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <span className="text-sm">
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
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1.5">
              <span className="w-6 h-6 flex items-center justify-center bg-primary text-background rounded-md text-xs">1</span>
              <span className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer text-xs">2</span>
              <span className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer text-xs">3</span>
              <span className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-md cursor-pointer text-xs">Next ›</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPreview;
