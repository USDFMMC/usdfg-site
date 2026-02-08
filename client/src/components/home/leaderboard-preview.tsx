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
  profileImage?: string; // User profile image URL
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
  const cardsRef = useRef<HTMLDivElement>(null);
  const top3SectionRef = useRef<HTMLDivElement>(null);
  const player1Ref = useRef<HTMLDivElement>(null);
  const player2Ref = useRef<HTMLDivElement>(null);
  const player3Ref = useRef<HTMLDivElement>(null);
  const eliteRankingsRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
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
    // Reset card refs when data changes
    cardRefs.current = [];
  }, [leaderboardType, activeTab, players, teams]);

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
            profileImage: p.profileImage // Include profile image
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

  // GSAP Animations - Keep existing animations, will be enhanced later
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states for top 3 section
      if (top3SectionRef.current) {
        gsap.set(eliteRankingsRef.current, { opacity: 0, y: -12 });
        gsap.set(headingRef.current, { opacity: 0, y: 12, scale: 0.98 });
        gsap.set(subtitleRef.current, { opacity: 0, y: 8 });
        gsap.set(player2Ref.current, { opacity: 0, x: -100, scale: 0.8 });
        gsap.set(player1Ref.current, { opacity: 0, y: -50, scale: 0.8 });
        gsap.set(player3Ref.current, { opacity: 0, x: 100, scale: 0.8 });
      }

      // Initial states for table section (desktop)
      gsap.set(tableRef.current, { opacity: 0, y: 16 });
      
      // Initial states for mobile cards - Kimi exact: translateY 6-10px, opacity fade, no scale
      cardRefs.current.forEach((cardRef) => {
        if (cardRef) {
          gsap.set(cardRef, { opacity: 0, y: 8 });
        }
      });

      // Top 3 Players Animation Timeline
      if (top3SectionRef.current && players.length >= 3 && leaderboardType === 'solo' && activeTab === 'total-gains') {
        const top3Tl = gsap.timeline({
          scrollTrigger: {
            trigger: top3SectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        top3Tl
          .to(eliteRankingsRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
          })
          .to(headingRef.current, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.2)',
          }, '-=0.3')
          .to(subtitleRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
          }, '-=0.4')
          .to(player2Ref.current, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.4)',
          }, '-=0.2')
          .to(player1Ref.current, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'back.out(1.2)',
          }, '-=0.6')
          .to(player3Ref.current, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.4)',
          }, '-=0.8');

        // Animate progress bars
        setTimeout(() => {
          const progressBars = top3SectionRef.current?.querySelectorAll('.progress-bar-fill');
          progressBars?.forEach((bar, index) => {
            const progressBar = bar as HTMLElement;
            const targetWidth = progressBar.getAttribute('data-width') || '0%';
            gsap.set(progressBar, { width: '0%' });
            gsap.to(progressBar, {
              width: targetWidth,
              duration: 1.5,
              delay: 1.2 + index * 0.15,
              ease: 'power2.out',
            });
          });
        }, 100);
      }

      // Table Animation Timeline
      const tableTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tableTl.to(tableRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
      
      // Mobile cards animation - Kimi exact: small translateY (6-10px), opacity fade, no scale
      if (cardsRef.current) {
        const cardsTl = gsap.timeline({
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
        
        cardRefs.current.forEach((cardRef, index) => {
          if (cardRef) {
            cardsTl.to(cardRef, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
            }, index * 0.05);
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [players, teams, leaderboardType, activeTab]);
  
  return (
    <section ref={sectionRef} className="py-12 lg:py-16 relative overflow-hidden">
      {/* No background resets - inherits global Kimi background */}

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">

        {/* Kimi Top 3 Players Section - EXACT KIMI CODE */}
        {!loading && leaderboardType === 'solo' && activeTab === 'total-gains' && players.length >= 3 && (
          <div ref={top3SectionRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 mb-16">
            {/* Elite Rankings Label - Kimi Exact */}
            <div ref={eliteRankingsRef} className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-amber-400" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))" }} />
                <span className="kimi-font-body text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Elite Rankings</span>
              </div>
              <h3 
                ref={headingRef}
                className="kimi-font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 leading-[1.1]"
              >
                <span className="text-white">LEGENDS</span>{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent" style={{ 
                  textShadow: "0 0 30px rgba(251, 191, 36, 0.5)",
                  filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.4))"
                }}>BOARD</span>
              </h3>
              <p 
                ref={subtitleRef}
                className="kimi-font-body text-white/70 text-base md:text-lg max-w-2xl mx-auto mb-4 leading-relaxed"
              >
                Compete to claim your place among the legends.
              </p>
              <p className="kimi-font-body text-white/80 text-sm md:text-base max-w-2xl mx-auto font-semibold mb-3 leading-relaxed">
                No usernames. No profiles. Just your wallet, your skill, your record.
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1.5 cursor-pointer text-amber-400 inline-block" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))" }}>ⓘ</span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                      Your wallet is your identity. No personal data, no registration, no tracking.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="kimi-font-body text-white/70 text-sm md:text-base max-w-2xl mx-auto font-medium">
                Only your skill matters. Every win is recorded on-chain.
              </p>
            </div>

            {/* Top 3 Players - Kimi Exact Layout */}
            <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-8 lg:gap-12 mt-12 max-w-6xl mx-auto">
              {/* 2nd Place (Left) - Kimi Exact */}
              {players[1] && (
                <div ref={player2Ref} className="flex flex-col items-center order-2 sm:order-1 group">
                  <div className="relative mb-5">
                    {/* Rank Badge - Kimi Exact Position */}
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center border-2 border-gray-400 z-20 shadow-lg">
                      <span className="kimi-font-body font-black text-white text-base">2</span>
                    </div>
                    {/* Circular Avatar - Kimi Exact Size */}
                    <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-gray-600/40 to-gray-800/40 border-[3px] border-gray-500/60 overflow-hidden relative shadow-[0_0_30px_rgba(107,114,128,0.3)]">
                      {players[1].profileImage ? (
                        <img 
                          src={players[1].profileImage} 
                          alt={`${players[1].wallet.slice(0, 6)}...${players[1].wallet.slice(-4)}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('avatar-2.png')) {
                              target.src = "/_kimi/avatar-2.png";
                            }
                          }}
                        />
                      ) : (
                        <img 
                          src="/_kimi/avatar-2.png" 
                          alt="Player 2"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-500/30 via-transparent to-transparent" />
                    </div>
                  </div>
                  <div className="text-center w-full">
                    <p className="kimi-font-body font-bold text-white text-base sm:text-lg mb-2 tracking-wide">
                      {players[1].wallet.slice(0, 6)}...{players[1].wallet.slice(-4)}
                    </p>
                    <p className="kimi-font-body font-black text-purple-400 text-xl sm:text-2xl mb-1">
                      {formatUSDFG(players[1].gains)}
                    </p>
                    <p className="kimi-font-body text-white/50 text-xs mb-4 uppercase tracking-wider">PTS</p>
                    {/* Progress Bar - Kimi Exact */}
                    <div className="w-40 sm:w-44 h-3 bg-gray-900/60 rounded-full overflow-hidden border border-gray-700/50">
                      <div 
                        className="progress-bar-fill h-full bg-gradient-to-r from-gray-500 to-gray-600 rounded-full"
                        data-width={`${Math.min((players[1].gains / players[0].gains) * 100, 100)}%`}
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Center) - Kimi Exact */}
              {players[0] && (
                <div ref={player1Ref} className="flex flex-col items-center order-1 sm:order-2 group">
                  <div className="relative mb-5">
                    {/* Crown Icon - Kimi Exact Position */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-30">
                      <Crown className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-amber-400 animate-pulse" style={{ filter: "drop-shadow(0 0 15px rgba(251, 191, 36, 0.9))" }} />
                    </div>
                    {/* Rank Badge - Kimi Exact Position */}
                    <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-[3px] border-amber-300 z-20 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                      <span className="kimi-font-body font-black text-white text-lg">1</span>
                    </div>
                    {/* Circular Avatar - Kimi Exact Larger Size */}
                    <div className="w-40 h-40 sm:w-44 sm:h-44 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-amber-500/40 to-yellow-600/40 border-[3px] border-amber-400/70 overflow-hidden relative shadow-[0_0_40px_rgba(251,191,36,0.4)]">
                      {players[0].profileImage ? (
                        <img 
                          src={players[0].profileImage} 
                          alt={`${players[0].wallet.slice(0, 6)}...${players[0].wallet.slice(-4)}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('avatar-1.png')) {
                              target.src = "/_kimi/avatar-1.png";
                            }
                          }}
                        />
                      ) : (
                        <img 
                          src="/_kimi/avatar-1.png" 
                          alt="Player 1"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-transparent to-transparent" />
                    </div>
                  </div>
                  <div className="text-center w-full">
                    <p className="kimi-font-body font-black text-white text-lg sm:text-xl mb-2 tracking-wide">
                      {players[0].wallet.slice(0, 6)}...{players[0].wallet.slice(-4)}
                    </p>
                    <p className="kimi-font-body font-black text-purple-400 text-2xl sm:text-3xl mb-1">
                      {formatUSDFG(players[0].gains)}
                    </p>
                    <p className="kimi-font-body text-white/50 text-xs mb-4 uppercase tracking-wider">PTS</p>
                    {/* Progress Bar - Kimi Exact Full */}
                    <div className="w-48 sm:w-52 h-3 bg-gray-900/60 rounded-full overflow-hidden border border-amber-700/50">
                      <div 
                        className="progress-bar-fill h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                        data-width="100%"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place (Right) - Kimi Exact */}
              {players[2] && (
                <div ref={player3Ref} className="flex flex-col items-center order-3 sm:order-3 group">
                  <div className="relative mb-5">
                    {/* Rank Badge - Kimi Exact Position */}
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-br from-amber-700 to-yellow-700 rounded-full flex items-center justify-center border-2 border-amber-600 z-20 shadow-lg">
                      <span className="kimi-font-body font-black text-white text-base">3</span>
                    </div>
                    {/* Circular Avatar - Kimi Exact Size */}
                    <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-amber-700/40 to-yellow-700/40 border-[3px] border-amber-600/60 overflow-hidden relative shadow-[0_0_30px_rgba(217,119,6,0.3)]">
                      {players[2].profileImage ? (
                        <img 
                          src={players[2].profileImage} 
                          alt={`${players[2].wallet.slice(0, 6)}...${players[2].wallet.slice(-4)}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('avatar-3.png')) {
                              target.src = "/_kimi/avatar-3.png";
                            }
                          }}
                        />
                      ) : (
                        <img 
                          src="/_kimi/avatar-3.png" 
                          alt="Player 3"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-transparent to-transparent" />
                    </div>
                  </div>
                  <div className="text-center w-full">
                    <p className="kimi-font-body font-bold text-white text-base sm:text-lg mb-2 tracking-wide">
                      {players[2].wallet.slice(0, 6)}...{players[2].wallet.slice(-4)}
                    </p>
                    <p className="kimi-font-body font-black text-purple-400 text-xl sm:text-2xl mb-1">
                      {formatUSDFG(players[2].gains)}
                    </p>
                    <p className="kimi-font-body text-white/50 text-xs mb-4 uppercase tracking-wider">PTS</p>
                    {/* Progress Bar - Kimi Exact */}
                    <div className="w-40 sm:w-44 h-3 bg-gray-900/60 rounded-full overflow-hidden border border-amber-800/50">
                      <div 
                        className="progress-bar-fill h-full bg-gradient-to-r from-amber-700 to-yellow-600 rounded-full"
                        data-width={`${Math.min((players[2].gains / players[0].gains) * 100, 100)}%`}
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={tableRef} className="max-w-5xl mx-auto relative">
          {/* Solo / Team Toggle - Kimi Style */}
          <div className="flex justify-center gap-2 mb-4">
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

          {/* Leaderboard Tabs - Kimi Style */}
          <div className="flex flex-wrap justify-center mb-4 border-b border-purple-500/30">
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

          {/* Mobile Cards - Kimi Exact Structure: Single-column, full-width, bottom-emissive neon */}
          <div ref={cardsRef} className="lg:hidden space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                <p className="text-amber-300 text-sm mt-4">Loading leaderboard...</p>
              </div>
            ) : leaderboardType === 'solo' ? (
              players.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Trophy className="w-12 h-12 text-amber-400/50" />
                  <p className="text-amber-300 text-sm font-semibold mt-4">No players yet!</p>
                  <p className="text-gray-400 text-xs mt-2">Be the first to complete a challenge and claim the top spot.</p>
                </div>
              ) : (
                players.map((player, i) => {
                  const masked = `${player.wallet.slice(0, 6)}...${player.wallet.slice(-4)}`;
                  const tierTooltip = tierTooltips[player.rankTitle] || player.rankTitle;
                  return (
                    <div
                      key={player.wallet}
                      ref={(el) => { 
                        if (el) cardRefs.current[i] = el;
                      }}
                      className="kimi-glass rounded-xl p-5 relative kimi-bottom-neon"
                      style={{ 
                        '--neon-color': 'rgba(168, 85, 247, 0.3)',
                        '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
                        background: 'linear-gradient(to bottom, rgba(20, 5, 33, 0.8), rgba(10, 2, 20, 0.9))',
                      } as React.CSSProperties}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-purple-800/40 flex items-center justify-center border border-purple-500/30">
                            <span className="kimi-font-body font-black text-white text-lg">{player.rank}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="kimi-font-body font-semibold text-white text-base">{masked}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Copy className="w-4 h-4 cursor-pointer text-white/60 hover:text-amber-400 transition-colors" onClick={() => {navigator.clipboard.writeText(player.wallet); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                                    {copiedIdx === i ? "Copied!" : "Copy wallet address"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mt-1 ${
                                    player.rankTitle === "Gold"
                                      ? "bg-gradient-to-r from-yellow-400/90 to-yellow-600/90 text-yellow-900"
                                      : player.rankTitle === "Silver"
                                      ? "bg-gradient-to-r from-gray-300/90 to-gray-500/90 text-gray-900"
                                      : player.rankTitle === "Bronze"
                                      ? "bg-gradient-to-r from-amber-700/90 to-yellow-500/90 text-yellow-100"
                                      : "bg-gradient-to-r from-amber-400/90 to-yellow-600/90 text-yellow-900"
                                  }`}>
                                    {player.rankTitle}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span className="text-sm">{tierTooltip}</span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="kimi-font-body font-black text-amber-300 text-lg">{formatUSDFG(player.gains)}</p>
                          <p className="kimi-font-body text-white/50 text-xs uppercase tracking-wider">USDFG</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="kimi-font-body text-white/60 text-xs mb-1">Wins</p>
                          <p className="kimi-font-body text-white font-semibold">{player.wins}</p>
                        </div>
                        <div>
                          <p className="kimi-font-body text-white/60 text-xs mb-1">Losses</p>
                          <p className="kimi-font-body text-white font-semibold">{player.losses}</p>
                        </div>
                        <div>
                          <p className="kimi-font-body text-white/60 text-xs mb-1">Win Rate</p>
                          <p className="kimi-font-body text-white font-semibold">{player.winRate}</p>
                        </div>
                        <div>
                          <p className="kimi-font-body text-white/60 text-xs mb-1">Streak</p>
                          <p className="kimi-font-body text-white font-semibold">{player.winStreak}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Trophy className="w-12 h-12 text-amber-400/50" />
                <p className="text-amber-300 text-sm font-semibold mt-4">No teams yet!</p>
                <p className="text-gray-400 text-xs mt-2">Create a team to climb the leaderboard.</p>
              </div>
            ) : (
              teams.map((team, i) => {
                const masked = `${team.teamKey.slice(0, 6)}...${team.teamKey.slice(-4)}`;
                return (
                  <div
                    key={team.teamKey}
                    ref={(el) => { 
                      if (el) cardRefs.current[i] = el;
                    }}
                    className="kimi-glass rounded-xl p-5 relative kimi-bottom-neon"
                    style={{ 
                      '--neon-color': 'rgba(168, 85, 247, 0.3)',
                      '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
                      background: 'linear-gradient(to bottom, rgba(20, 5, 33, 0.8), rgba(10, 2, 20, 0.9))',
                    } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-purple-800/40 flex items-center justify-center border border-purple-500/30">
                          <span className="kimi-font-body font-black text-white text-lg">{team.rank}</span>
                        </div>
                        <div>
                          <p className="kimi-font-body font-semibold text-white text-base">{team.teamName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="kimi-font-body text-white/60 text-xs font-mono">{masked}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Copy className="w-3 h-3 cursor-pointer text-white/60 hover:text-amber-400 transition-colors" onClick={() => {navigator.clipboard.writeText(team.teamKey); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1200);}} />
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/80 text-amber-100 border-amber-400/40">
                                  {copiedIdx === i ? "Copied!" : "Copy team key"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="kimi-font-body font-black text-amber-300 text-lg">{formatUSDFG(team.gains)}</p>
                        <p className="kimi-font-body text-white/50 text-xs uppercase tracking-wider">USDFG</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="kimi-font-body text-white/60 text-xs mb-1">Members</p>
                        <p className="kimi-font-body text-white font-semibold">{team.members}</p>
                      </div>
                      <div>
                        <p className="kimi-font-body text-white/60 text-xs mb-1">Win Rate</p>
                        <p className="kimi-font-body text-white font-semibold">{team.winRate}</p>
                      </div>
                      <div>
                        <p className="kimi-font-body text-white/60 text-xs mb-1">Wins</p>
                        <p className="kimi-font-body text-white font-semibold">{team.wins}</p>
                      </div>
                      <div>
                        <p className="kimi-font-body text-white/60 text-xs mb-1">Trust</p>
                        <p className="kimi-font-body text-white font-semibold">{team.trustScore.toFixed(1)}/10</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table - Bottom Emissive Neon */}
          <div className="hidden lg:block kimi-glass rounded-xl p-4 lg:p-6 relative overflow-x-auto transition-all duration-300 kimi-bottom-neon" style={{ 
            '--neon-color': 'rgba(168, 85, 247, 0.3)',
            '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
          } as React.CSSProperties}>
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20">
                  <TableHead className="w-12 text-center text-sm kimi-font-body text-white/80 font-semibold">Rank</TableHead>
                  {leaderboardType === 'solo' ? (
                    <>
                      <TableHead className="text-left text-sm kimi-font-body text-white/80 font-semibold">Wallet</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Wins</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Losses</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Win Rate</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Streak</TableHead>
                      <TableHead className="w-36 text-center text-sm kimi-font-body text-white/80 font-semibold" style={{ overflow: 'visible', position: 'relative' }}>
                        <div className="flex items-center justify-center gap-1 relative">
                          Skill Rewards (USDFG)
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-center text-sm kimi-font-body text-white/80 font-semibold">Tier</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-left text-sm kimi-font-body text-white/80 font-semibold">Team</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Members</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Wins</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Losses</TableHead>
                      <TableHead className="text-center text-sm kimi-font-body text-white/80 font-semibold">Win Rate</TableHead>
                      <TableHead className="w-36 text-center text-sm kimi-font-body text-white/80 font-semibold" style={{ overflow: 'visible', position: 'relative' }}>
                        <div className="flex items-center justify-center gap-1 relative">
                          Skill Rewards (USDFG)
                        </div>
                      </TableHead>
                      <TableHead className="w-28 text-center text-sm kimi-font-body text-white/80 font-semibold">Trust</TableHead>
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
                          className={`relative group transition-all duration-200 border-b border-purple-500/10 hover:bg-purple-500/5 ${i < 3 ? "z-10 animate-glow-row" : ""}`}
                          style={i < 3 ? { boxShadow: "0 0 32px 8px var(--tier-glow-" + player.rankTitle.toLowerCase() + ")" } : {}}
                        >
                          <TableCell className="text-center font-bold text-base kimi-font-body text-white">{player.rank}</TableCell>
                          <TableCell className="font-mono text-sm kimi-font-body text-white/90 flex items-center gap-2">
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
                          <TableCell className="text-center text-sm kimi-font-body text-white/80">{player.wins}</TableCell>
                          <TableCell className="text-center text-sm kimi-font-body text-white/80">{player.losses}</TableCell>
                          <TableCell className="text-center text-sm kimi-font-body text-white/80">{player.winRate}</TableCell>
                          <TableCell className="text-center text-sm kimi-font-body text-white/80">{player.winStreak}</TableCell>
                          <TableCell className="text-center font-bold text-amber-300 text-sm kimi-font-body">{formatUSDFG(player.gains)}</TableCell>
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
                        className={`relative group transition-all duration-200 border-b border-purple-500/10 hover:bg-purple-500/5 ${i < 3 ? "z-10 animate-glow-row" : ""}`}
                      >
                        <TableCell className="text-center font-bold text-base kimi-font-body text-white">{team.rank}</TableCell>
                        <TableCell className="text-sm kimi-font-body">
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
                        <TableCell className="text-center text-sm kimi-font-body text-white/80">{team.members}</TableCell>
                        <TableCell className="text-center text-sm kimi-font-body text-white/80">{team.wins}</TableCell>
                        <TableCell className="text-center text-sm kimi-font-body text-white/80">{team.losses}</TableCell>
                        <TableCell className="text-center text-sm kimi-font-body text-white/80">{team.winRate}</TableCell>
                        <TableCell className="text-center font-bold text-amber-300 text-sm kimi-font-body">{formatUSDFG(team.gains)}</TableCell>
                        <TableCell className="text-center text-sm kimi-font-body">
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

          {/* Expand/Collapse Button - Kimi Style */}
          {!loading && ((leaderboardType === 'solo' && players.length > 0) || (leaderboardType === 'team' && teams.length > 0)) && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                className="kimi-font-body px-6 py-2 bg-gradient-to-r from-purple-500 to-orange-500 text-white font-semibold uppercase tracking-wide border-0 shadow-[0_0_15px_rgba(126,67,255,0.3)] hover:from-purple-400 hover:to-orange-400 transition-all rounded-lg"
              >
                {isExpanded ? '▼ Show Less' : '▲ Show More'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPreview;
