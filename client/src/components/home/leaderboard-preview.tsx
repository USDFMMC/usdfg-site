import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Copy, Crown, TrendingUp, Medal, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  profileImage?: string;
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
  const titleRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
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
            rankTitle: getTier(p.winRate, p.gamesPlayed),
            profileImage: p.profileImage
          }));

          setPlayers(transformedPlayers);
          setTeams([]);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setPlayers([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [activeTab, leaderboardType, isExpanded]);

  // GSAP Animations - Kimi Exact Code
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Podium animation
      const podiumCards = podiumRef.current?.querySelectorAll('.podium-card');
      if (podiumCards) {
        gsap.fromTo(
          podiumCards,
          { opacity: 0, y: 100 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: podiumRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // List animation
      const listItems = listRef.current?.querySelectorAll('.list-item');
      if (listItems) {
        gsap.fromTo(
          listItems,
          { opacity: 0, x: -50 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: listRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [players, teams, leaderboardType, activeTab]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-300 via-gray-400 to-gray-500';
      case 3:
        return 'from-amber-600 via-amber-700 to-amber-800';
      default:
        return 'from-purple-500 to-orange-500';
    }
  };

  const getRankHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return 'h-80 lg:h-96';
      case 2:
        return 'h-64 lg:h-80';
      case 3:
        return 'h-64 lg:h-80';
      default:
        return 'h-48';
    }
  };

  // Get top 3 players for podium
  const top3Players = players.slice(0, 3);
  const otherPlayers = players.slice(3);
  const top3Teams = teams.slice(0, 3);
  const otherTeams = teams.slice(3);

  return (
    <section
      ref={sectionRef}
      id="leaderboard"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      {/* Background Effects - Kimi Exact */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Wireframe Sphere (Decorative) - Kimi Exact */}
      <div className="absolute top-1/4 right-0 w-96 h-96 opacity-10">
        <div className="w-full h-full border border-purple-500/30 rounded-full animate-spin-slow" />
        <div className="absolute inset-8 border border-purple-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute inset-16 border border-purple-500/10 rounded-full animate-spin-slow" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Solo / Team Toggle */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={leaderboardType === 'solo' ? "default" : "ghost"}
            className={`kimi-font-body px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all ${
              leaderboardType === 'solo'
                ? "bg-gradient-to-r from-purple-500 to-orange-500 text-white border-0 shadow-[0_0_15px_rgba(126,67,255,0.3)] hover:from-purple-400 hover:to-orange-400"
                : "text-white/70 hover:text-white border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10 bg-transparent"
            }`}
            onClick={() => setLeaderboardType('solo')}
          >
            Solo
          </Button>
          <Button
            variant={leaderboardType === 'team' ? "default" : "ghost"}
            className={`kimi-font-body px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all ${
              leaderboardType === 'team'
                ? "bg-gradient-to-r from-purple-500 to-orange-500 text-white border-0 shadow-[0_0_15px_rgba(126,67,255,0.3)] hover:from-purple-400 hover:to-orange-400"
                : "text-white/70 hover:text-white border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10 bg-transparent"
            }`}
            onClick={() => setLeaderboardType('team')}
          >
            Teams
          </Button>
        </div>

        {/* Leaderboard Tabs */}
        <div className="flex flex-wrap justify-center mb-8 border-b border-purple-500/30">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`kimi-font-body rounded-none rounded-t-md font-semibold uppercase tracking-wide px-4 py-2 text-sm transition-all ${
                activeTab === tab.id 
                  ? "bg-gradient-to-r from-purple-500 to-orange-500 text-white border-0 shadow-[0_0_15px_rgba(126,67,255,0.3)] hover:from-purple-400 hover:to-orange-400" 
                  : "text-white/70 hover:text-white border border-transparent hover:border-purple-500/30 bg-transparent"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Section Header - Kimi Exact */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span className="inline-flex items-center gap-2 kimi-font-body text-sm text-amber-400 uppercase tracking-[0.3em] mb-4">
            <Crown className="w-4 h-4" />
            Elite Rankings
          </span>
          <h2 className="kimi-font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            LEGENDS <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">BOARD</span>
          </h2>
          <p className="kimi-font-body text-lg text-white/60 max-w-2xl mx-auto">
            Compete to claim your place among the legends. No usernames. No profiles. Just your wallet, your skill, your record.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            <p className="text-amber-300 text-sm mt-4">Loading leaderboard...</p>
          </div>
        ) : leaderboardType === 'solo' && players.length > 0 ? (
          <>
            {/* Podium - Top 3 - Kimi Exact Structure */}
            {top3Players.length >= 3 && (
              <div
                ref={podiumRef}
                className="flex justify-center items-end gap-4 lg:gap-8 mb-16 lg:mb-20"
              >
                {[2, 1, 3].map((rank) => {
                  const player = top3Players.find((p) => p.rank === rank);
                  if (!player) return null;

                  return (
                    <div
                      key={rank}
                      className={`podium-card relative ${
                        rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'
                      }`}
                    >
                      <div
                        className={`relative ${getRankHeight(
                          rank
                        )} w-28 sm:w-36 lg:w-48 flex flex-col`}
                      >
                        {/* Avatar - Kimi Exact */}
                        <div className="relative flex-shrink-0 mx-auto mb-4">
                          <div
                            className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-br ${getRankColor(
                              rank
                            )}`}
                          >
                            <div className="w-full h-full rounded-full overflow-hidden bg-black">
                              {player.profileImage ? (
                                <img
                                  src={player.profileImage}
                                  alt={`${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes(`avatar-${rank}.png`)) {
                                      target.src = `/_kimi/avatar-${rank}.png`;
                                    }
                                  }}
                                />
                              ) : (
                                <img
                                  src={`/_kimi/avatar-${rank}.png`}
                                  alt={`Player ${rank}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          </div>
                          {/* Rank Badge - Kimi Exact */}
                          <div
                            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(
                              rank
                            )}`}
                          >
                            <span className="kimi-font-display font-bold text-sm lg:text-lg text-white">
                              {rank}
                            </span>
                          </div>
                          {/* Crown for #1 - Kimi Exact */}
                          {rank === 1 && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                              <Crown className="w-8 h-8 text-amber-400 animate-pulse" />
                            </div>
                          )}
                        </div>

                        {/* Info - Kimi Exact */}
                        <div className="text-center mb-4">
                          <h3 className="kimi-font-display font-bold text-sm sm:text-lg text-white mb-1">
                            {player.wallet.slice(0, 6)}...{player.wallet.slice(-4)}
                          </h3>
                          <p className="kimi-font-display font-bold text-xl sm:text-2xl lg:text-3xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                            {formatUSDFG(player.gains)}
                          </p>
                          <p className="kimi-font-body text-xs text-white/50">USDFG</p>
                        </div>

                        {/* Podium Base - Kimi Exact */}
                        <div className="flex-1 flex items-end">
                          <div
                            className={`w-full bg-gradient-to-t ${getRankColor(
                              rank
                            )} rounded-t-lg opacity-20`}
                            style={{
                              height: rank === 1 ? '100%' : rank === 2 ? '75%' : '75%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Players List - Kimi Exact Structure */}
            {otherPlayers.length > 0 && (
              <div ref={listRef} className="max-w-4xl mx-auto">
                <div className="kimi-glass border border-purple-500/20 rounded-2xl overflow-hidden">
                  {/* Header - Kimi Exact */}
                  <div className="flex items-center px-4 sm:px-6 py-4 border-b border-purple-500/10 bg-purple-600/5">
                    <div className="w-12 sm:w-16 kimi-font-body text-xs text-white/50 uppercase">
                      Rank
                    </div>
                    <div className="flex-1 kimi-font-body text-xs text-white/50 uppercase">
                      Wallet
                    </div>
                    <div className="hidden sm:block w-24 text-right kimi-font-body text-xs text-white/50 uppercase">
                      Win Rate
                    </div>
                    <div className="hidden sm:block w-24 text-right kimi-font-body text-xs text-white/50 uppercase">
                      Wins
                    </div>
                    <div className="w-24 text-right kimi-font-body text-xs text-white/50 uppercase">
                      USDFG
                    </div>
                  </div>

                  {/* List - Kimi Exact */}
                  <div className="divide-y divide-purple-500/10">
                    {otherPlayers.map((player) => {
                      const masked = `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`;
                      return (
                        <div
                          key={player.wallet}
                          className="list-item group flex items-center px-4 sm:px-6 py-4 hover:bg-purple-600/5 transition-colors cursor-pointer"
                        >
                          <div className="w-12 sm:w-16 flex items-center gap-2">
                            <span className="kimi-font-display font-bold text-lg text-white/60">
                              #{player.rank}
                            </span>
                            {player.rank <= 5 && (
                              <Medal className="w-4 h-4 text-purple-400 hidden sm:block" />
                            )}
                          </div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-orange-500/30 flex items-center justify-center">
                              <span className="kimi-font-display font-bold text-xs sm:text-sm text-white">
                                {masked[0]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="kimi-font-body font-medium text-sm sm:text-base text-white truncate font-mono">
                                {masked}
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Copy className="w-3 h-3 cursor-pointer text-white/60 hover:text-amber-400 transition-colors" onClick={() => {navigator.clipboard.writeText(player.wallet); setCopiedIdx(player.rank); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                                    {copiedIdx === player.rank ? "Copied!" : "Copy wallet address"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <div className="hidden sm:block w-24 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                              <span className="kimi-font-body text-sm text-white/70">
                                {player.winRate}
                              </span>
                            </div>
                          </div>
                          <div className="hidden sm:block w-24 text-right">
                            <span className="kimi-font-body text-sm text-white/70">
                              {player.wins}
                            </span>
                          </div>
                          <div className="w-24 text-right">
                            <span className="kimi-font-display font-semibold text-sm sm:text-base bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                              {formatUSDFG(player.gains)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* View Full Leaderboard - Kimi Exact */}
                {!isExpanded && players.length > 3 && (
                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="inline-flex items-center gap-2 kimi-font-body text-purple-400 hover:text-orange-400 transition-colors"
                    >
                      View Full Rankings
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {players.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Trophy className="w-12 h-12 text-amber-400/50" />
                <p className="text-amber-300 text-sm font-semibold mt-4">No players yet!</p>
                <p className="text-gray-400 text-xs mt-2">Be the first to complete a challenge and claim the top spot.</p>
              </div>
            )}
          </>
        ) : leaderboardType === 'team' && teams.length > 0 ? (
          <>
            {/* Teams Podium - Similar structure */}
            {top3Teams.length >= 3 && (
              <div
                ref={podiumRef}
                className="flex justify-center items-end gap-4 lg:gap-8 mb-16 lg:mb-20"
              >
                {[2, 1, 3].map((rank) => {
                  const team = top3Teams.find((t) => t.rank === rank);
                  if (!team) return null;

                  return (
                    <div
                      key={rank}
                      className={`podium-card relative ${
                        rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'
                      }`}
                    >
                      <div
                        className={`relative ${getRankHeight(
                          rank
                        )} w-28 sm:w-36 lg:w-48 flex flex-col`}
                      >
                        <div className="relative flex-shrink-0 mx-auto mb-4">
                          <div
                            className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-br ${getRankColor(
                              rank
                            )}`}
                          >
                            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
                              <span className="kimi-font-display font-bold text-2xl text-white">
                                {team.teamName[0]}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(
                              rank
                            )}`}
                          >
                            <span className="kimi-font-display font-bold text-sm lg:text-lg text-white">
                              {rank}
                            </span>
                          </div>
                          {rank === 1 && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                              <Crown className="w-8 h-8 text-amber-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <div className="text-center mb-4">
                          <h3 className="kimi-font-display font-bold text-sm sm:text-lg text-white mb-1">
                            {team.teamName}
                          </h3>
                          <p className="kimi-font-display font-bold text-xl sm:text-2xl lg:text-3xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                            {formatUSDFG(team.gains)}
                          </p>
                          <p className="kimi-font-body text-xs text-white/50">USDFG</p>
                        </div>
                        <div className="flex-1 flex items-end">
                          <div
                            className={`w-full bg-gradient-to-t ${getRankColor(
                              rank
                            )} rounded-t-lg opacity-20`}
                            style={{
                              height: rank === 1 ? '100%' : rank === 2 ? '75%' : '75%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Teams List */}
            {otherTeams.length > 0 && (
              <div ref={listRef} className="max-w-4xl mx-auto">
                <div className="kimi-glass border border-purple-500/20 rounded-2xl overflow-hidden">
                  <div className="flex items-center px-4 sm:px-6 py-4 border-b border-purple-500/10 bg-purple-600/5">
                    <div className="w-12 sm:w-16 kimi-font-body text-xs text-white/50 uppercase">Rank</div>
                    <div className="flex-1 kimi-font-body text-xs text-white/50 uppercase">Team</div>
                    <div className="hidden sm:block w-24 text-right kimi-font-body text-xs text-white/50 uppercase">Win Rate</div>
                    <div className="hidden sm:block w-24 text-right kimi-font-body text-xs text-white/50 uppercase">Members</div>
                    <div className="w-24 text-right kimi-font-body text-xs text-white/50 uppercase">USDFG</div>
                  </div>
                  <div className="divide-y divide-purple-500/10">
                    {otherTeams.map((team) => {
                      const masked = `${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`;
                      return (
                        <div
                          key={team.teamKey}
                          className="list-item group flex items-center px-4 sm:px-6 py-4 hover:bg-purple-600/5 transition-colors cursor-pointer"
                        >
                          <div className="w-12 sm:w-16 flex items-center gap-2">
                            <span className="kimi-font-display font-bold text-lg text-white/60">#{team.rank}</span>
                            {team.rank <= 5 && <Medal className="w-4 h-4 text-purple-400 hidden sm:block" />}
                          </div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-orange-500/30 flex items-center justify-center">
                              <span className="kimi-font-display font-bold text-xs sm:text-sm text-white">{team.teamName[0]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="kimi-font-body font-medium text-sm sm:text-base text-white truncate">{team.teamName}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Copy className="w-3 h-3 cursor-pointer text-white/60 hover:text-amber-400 transition-colors" onClick={() => {navigator.clipboard.writeText(team.teamKey); setCopiedIdx(team.rank); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                                    {copiedIdx === team.rank ? "Copied!" : "Copy team key"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <div className="hidden sm:block w-24 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                              <span className="kimi-font-body text-sm text-white/70">{team.winRate}</span>
                            </div>
                          </div>
                          <div className="hidden sm:block w-24 text-right">
                            <span className="kimi-font-body text-sm text-white/70">{team.members}</span>
                          </div>
                          <div className="w-24 text-right">
                            <span className="kimi-font-display font-semibold text-sm sm:text-base bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">{formatUSDFG(team.gains)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!isExpanded && teams.length > 3 && (
                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="inline-flex items-center gap-2 kimi-font-body text-purple-400 hover:text-orange-400 transition-colors"
                    >
                      View Full Rankings
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {teams.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Trophy className="w-12 h-12 text-amber-400/50" />
                <p className="text-amber-300 text-sm font-semibold mt-4">No teams yet!</p>
                <p className="text-gray-400 text-xs mt-2">Create a team to climb the leaderboard.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-12 h-12 text-amber-400/50" />
            <p className="text-amber-300 text-sm font-semibold mt-4">No data available</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LeaderboardPreview;
