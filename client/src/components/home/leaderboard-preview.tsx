import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Copy, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { getTopPlayers, PlayerStats, getTopTeams, TeamStats } from "@/lib/firebase/firestore";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

interface TeamLeaderboardEntry {
  rank: number;
  teamName: string;
  teamKey: string;
  wins: number;
  losses: number;
  winRate: string;
  members: number;
  gains: number;
  trustScore: number;
  trustReviews: number;
}

interface Tab {
  id: string;
  label: string;
}

const tierColors: Record<string, string> = {
  Bronze: "bg-gradient-to-r from-yellow-700 to-yellow-400 text-yellow-100 border-yellow-400",
  Silver: "bg-gradient-to-r from-gray-400 to-white text-gray-900 border-gray-300",
  Gold: "bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400",
  Platinum: "bg-gradient-to-r from-amber-300 to-yellow-500 text-yellow-900 border-amber-400",
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
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState("total-gains");
  const [leaderboardType, setLeaderboardType] = useState<'solo' | 'team'>('solo');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const tabs: Tab[] = [
    { id: "most-wins", label: "Most Wins" },
    { id: "total-gains", label: "Total Skill Rewards" },
  ];
  const tableColumnCount = leaderboardType === 'solo' ? 8 : 7;
  
  useEffect(() => {
    setCopiedIdx(null);
  }, [leaderboardType]);

  // Fetch real player/team data from Firestore
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let sortBy: 'wins' | 'winRate' | 'totalEarned' = activeTab === 'most-wins' ? 'wins' : 'totalEarned';

        if (leaderboardType === 'team') {
          const limit = isExpanded ? 50 : 5;
          const topTeams = await getTopTeams(limit, sortBy);
          const transformedTeams: TeamLeaderboardEntry[] = topTeams.map((team: TeamStats, index: number) => {
            const winRateValue = Number.isFinite(team.winRate) ? team.winRate : 0;
            return {
              rank: index + 1,
              teamName: team.teamName?.trim()
                ? team.teamName
                : `Team ${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`,
              teamKey: team.teamKey,
              wins: team.wins,
              losses: team.losses,
              winRate: `${winRateValue.toFixed(1)}%`,
              members: Array.isArray(team.members) ? team.members.length : 0,
              gains: team.totalEarned,
              trustScore: typeof team.trustScore === 'number' ? team.trustScore : 0,
              trustReviews: team.trustReviews || 0
            };
          });

          setTeams(transformedTeams);
          setPlayers([]);
        } else {
          const limit = isExpanded ? 50 : 5;
          const topPlayers = await getTopPlayers(limit, sortBy);

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
          setTeams([]);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Keep empty array on error
        setPlayers([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [activeTab, leaderboardType, isExpanded]);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(headingRef.current, { opacity: 0, y: 30 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 20 });
      gsap.set(tableRef.current, { opacity: 0, y: 40 });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(headingRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .to(
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .to(
          tableRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.4'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);
  
  return (
    <section ref={sectionRef} className="py-12 lg:py-16 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="text-center mb-8 lg:mb-12">
          <h2
            ref={headingRef}
            className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-3"
            style={{
              textShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
            }}
          >
            USDFG{' '}
            <span
              className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
              }}
            >
              LEADERBOARD
            </span>
          </h2>
          {/* Neon-glow underline/divider */}
          <div
            className="mx-auto mb-4 h-0.5 w-40 rounded-full bg-gradient-to-r from-amber-400/80 via-orange-500/80 to-amber-400/80 animate-pulse"
            style={{
              boxShadow: "0 0 20px rgba(251,191,36,0.4)",
            }}
          />
          <p
            ref={subtitleRef}
            className="text-white/80 max-w-2xl mx-auto text-base md:text-lg font-semibold mb-2 leading-relaxed"
          >
            No usernames. No profiles. Just your wallet, your skill, your record.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1.5 cursor-pointer text-amber-400" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))" }}>ⓘ</span>
                </TooltipTrigger>
                <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                  Your wallet is your identity. No personal data, no registration, no tracking.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
          <p className="text-white/70 max-w-2xl mx-auto text-sm md:text-base font-medium">
            Only skill matters. No bots. No aliases. Every win is on-chain.
          </p>
        </div>

        <div ref={tableRef} className="max-w-5xl mx-auto relative">
          {/* Solo / Team Toggle */}
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant={leaderboardType === 'solo' ? "default" : "ghost"}
              className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                leaderboardType === 'solo'
                  ? "bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/50 hover:from-purple-500 hover:to-amber-400"
                  : "text-white/70 hover:text-white border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
              }`}
              onClick={() => setLeaderboardType('solo')}
            >
              Solo
            </Button>
            <Button
              variant={leaderboardType === 'team' ? "default" : "ghost"}
              className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                leaderboardType === 'team'
                  ? "bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/50 hover:from-purple-500 hover:to-amber-400"
                  : "text-white/70 hover:text-white border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
              }`}
              onClick={() => setLeaderboardType('team')}
            >
              Teams
            </Button>
          </div>

          {/* Leaderboard Tabs */}
          <div className="flex flex-wrap justify-center mb-4 border-b border-purple-500/30">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={`rounded-none rounded-t-md font-bold tracking-wide px-4 py-1.5 text-sm transition-all ${
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/50 hover:from-purple-500 hover:to-amber-400" 
                    : "text-white/70 hover:text-white border border-transparent hover:border-purple-500/30"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Leaderboard Table */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-2 lg:p-4 relative overflow-x-auto hover:shadow-[0_0_40px_rgba(147,51,234,0.2)] hover:border-purple-500/50 transition-all duration-300">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center text-sm">Rank</TableHead>
                  {leaderboardType === 'solo' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <TableHead className="text-left text-sm">Team</TableHead>
                      <TableHead className="text-center text-sm">Members</TableHead>
                      <TableHead className="text-center text-sm">Wins</TableHead>
                      <TableHead className="text-center text-sm">Losses</TableHead>
                      <TableHead className="text-center text-sm">Win Rate</TableHead>
                      <TableHead className="w-36 text-center text-sm" style={{ overflow: 'visible', position: 'relative' }}>
                        <div className="flex items-center justify-center gap-1 relative">
                          Skill Rewards (USDFG)
                        </div>
                      </TableHead>
                      <TableHead className="w-28 text-center text-sm">Trust</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={tableColumnCount} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                        <p className="text-amber-300 text-sm">Loading leaderboard...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leaderboardType === 'solo' ? (
                  players.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tableColumnCount} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Trophy className="w-12 h-12 text-amber-400/50" />
                          <p className="text-amber-300 text-sm font-semibold">No players yet!</p>
                          <p className="text-gray-400 text-xs">Be the first to complete a challenge and claim the top spot.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    players.map((player, i) => {
                      const masked = `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`;
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
                                  <Copy className="w-4 h-4 cursor-pointer hover:text-amber-400" onClick={() => {navigator.clipboard.writeText(player.wallet); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
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
                                      : "bg-gradient-to-r from-amber-400/90 to-yellow-600/90 border-amber-400/50"
                                  } animate-fade-in-up`}
                                  >
                                    {player.rankTitle === "Gold" && <Crown className="w-4 h-4 text-yellow-300 animate-bounce" style={{ filter: 'drop-shadow(0 0 6px rgba(253, 224, 71, 0.6))' }} />}
                                    {player.rankTitle === "Silver" && <Crown className="w-4 h-4 text-gray-200 animate-bounce" style={{ filter: 'drop-shadow(0 0 6px rgba(229, 231, 235, 0.6))' }} />}
                                    {player.rankTitle === "Bronze" && <Crown className="w-4 h-4 text-amber-400 animate-bounce" style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))' }} />}
                                    {player.rankTitle === "Platinum" && <Crown className="w-4 h-4 text-amber-200 animate-bounce" style={{ filter: 'drop-shadow(0 0 6px rgba(253, 230, 138, 0.6))' }} />}
                                    {player.rankTitle === "Ghostly" && <Crown className="w-4 h-4 text-purple-400 animate-bounce" style={{ filter: 'drop-shadow(0 0 6px #a78bfa) drop-shadow(0 0 12px rgba(255,255,255,0.3))' }} />}
                                    <span className="ml-1">{player.rankTitle}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span className="text-sm">{tierTooltip}</span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )
                ) : teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColumnCount} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Trophy className="w-12 h-12 text-amber-400/50" />
                        <p className="text-amber-300 text-sm font-semibold">No teams yet!</p>
                        <p className="text-gray-400 text-xs">Create a team to climb the leaderboard.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team, i) => {
                    const masked = `${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`;
                    return (
                      <TableRow
                        key={team.teamKey}
                        className={`relative group transition-transform duration-200 ${i < 3 ? "z-10 animate-glow-row" : ""}`}
                      >
                        <TableCell className="text-center font-bold text-base">{team.rank}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-sm md:text-base">{team.teamName}</span>
                            <div className="flex items-center gap-2 text-xs text-amber-200 mt-1">
                              <span className="font-mono text-amber-300">{masked}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Copy className="w-4 h-4 cursor-pointer hover:text-amber-400" onClick={() => {navigator.clipboard.writeText(team.teamKey); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                                    {copiedIdx === i ? "Copied!" : "Copy team key"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{team.members}</TableCell>
                        <TableCell className="text-center text-sm">{team.wins}</TableCell>
                        <TableCell className="text-center text-sm">{team.losses}</TableCell>
                        <TableCell className="text-center text-sm">{team.winRate}</TableCell>
                        <TableCell className="text-center font-bold text-amber-300 text-sm">{formatUSDFG(team.gains)}</TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="text-amber-200 font-semibold">{team.trustScore.toFixed(1)}/10</span>
                          {team.trustReviews > 0 && (
                            <span className="block text-xs text-zinc-400 mt-0.5">{team.trustReviews} review{team.trustReviews === 1 ? '' : 's'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Expand/Collapse Button */}
          {!loading && ((leaderboardType === 'solo' && players.length > 0) || (leaderboardType === 'team' && teams.length > 0)) && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/50 hover:from-purple-500 hover:to-amber-400 transition-all"
              >
                {isExpanded ? '▼ Show Less' : '▲ Show More'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default LeaderboardPreview;
