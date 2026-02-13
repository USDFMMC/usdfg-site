import React, { useState } from 'react';
import { Radio, Clock, Users, Eye, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Reveal from "@/components/Reveal";

interface Match {
  id: number;
  team1: string;
  team2: string;
  game: string;
  status: 'live' | 'upcoming' | 'finished';
  time?: string;
  viewers?: number;
  format: string;
}

const matches: Match[] = [
  {
    id: 1,
    team1: 'Shadow Stalkers',
    team2: 'Neon Vipers',
    game: 'League of Legends',
    status: 'live',
    viewers: 45200,
    format: 'Best of 3',
  },
  {
    id: 2,
    team1: 'Cyber Wolves',
    team2: 'Phantom Squad',
    game: 'Valorant',
    status: 'upcoming',
    time: '5 min',
    format: 'Best of 5',
  },
  {
    id: 3,
    team1: 'Digital Dragons',
    team2: 'Matrix Marines',
    game: 'CS2',
    status: 'upcoming',
    time: '20 min',
    format: 'First to 16',
  },
  {
    id: 4,
    team1: 'Quantum Queens',
    team2: 'Titan Force',
    game: 'Dota 2',
    status: 'upcoming',
    time: '45 min',
    format: 'Best of 3',
  },
  {
    id: 5,
    team1: 'Storm Bringers',
    team2: 'Void Walkers',
    game: 'Rocket League',
    status: 'upcoming',
    time: '1h 15m',
    format: 'Best of 5',
  },
];

const gameColors: Record<string, string> = {
  'League of Legends': 'from-blue-500 to-purple-500',
  'Valorant': 'from-red-500 to-orange-500',
  'CS2': 'from-yellow-500 to-orange-500',
  'Dota 2': 'from-red-600 to-red-800',
  'Rocket League': 'from-cyan-500 to-blue-500',
};

const LiveBattles: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatViewers = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <Reveal
      as="section"
      preset="section"
      id="live-battles"
      className="relative py-24 lg:py-32 w-full"
      selector="[data-live-reveal]"
    >
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div data-live-reveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12 lg:mb-16">
          <div>
            <span className="inline-flex items-center gap-2 font-body text-sm text-orange uppercase tracking-[0.3em] mb-4">
              <Radio className="w-4 h-4 animate-live-pulse" />
              Live Competition
            </span>
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white">
              ACTIVE <span className="text-gradient">CHALLENGES</span>
            </h2>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-full border border-purple/30">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-live-pulse" />
              <span className="font-body text-sm text-white/70">
                {matches.filter((m) => m.status === 'live').length} Live Now
              </span>
            </div>
            <button className="font-body text-sm text-white/70 hover:text-orange transition-colors flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Matches List */}
        <Reveal as="div" preset="liveList" className="space-y-4" selector=".match-item">
          {matches.map((match) => (
            <div
              key={match.id}
              className="match-item group"
              onClick={() =>
                setExpandedId(expandedId === match.id ? null : match.id)
              }
            >
              <div
                className={`relative glass border ${
                  match.status === 'live'
                    ? 'border-orange-500/50'
                    : 'border-purple-500/20 hover:border-purple-500/50'
                } rounded-xl overflow-hidden transition-all duration-300 cursor-pointer`}
              >
                {/* Main Row */}
                <div className="flex items-center p-4 sm:p-6">
                  {/* Status Indicator */}
                  <div className="flex-shrink-0 w-16 sm:w-24">
                    {match.status === 'live' ? (
                      <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/50 animate-live-pulse">
                        LIVE
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1 text-white/50">
                        <Clock className="w-4 h-4" />
                        <span className="font-body text-sm">{match.time}</span>
                      </div>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="flex-1 min-w-0 px-4">
                    <div className="flex items-center justify-center gap-3 sm:gap-6">
                      <span className="font-display font-semibold text-sm sm:text-lg text-white truncate">
                        {match.team1}
                      </span>
                      <span className="flex-shrink-0 font-display font-bold text-xs sm:text-sm text-white/40">
                        VS
                      </span>
                      <span className="font-display font-semibold text-sm sm:text-lg text-white truncate">
                        {match.team2}
                      </span>
                    </div>
                  </div>

                  {/* Game & Format */}
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                          gameColors[match.game] || 'from-purple-500 to-orange-500'
                        }`}
                      />
                      <span className="font-body text-sm text-white/60">
                        {match.game}
                      </span>
                    </div>
                    <div className="font-body text-sm text-white/40">
                      {match.format}
                    </div>
                  </div>

                  {/* Mobile: Game only */}
                  <div className="flex-shrink-0 sm:hidden">
                    <div
                      className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                        gameColors[match.game] || 'from-purple-500 to-orange-500'
                      }`}
                    />
                  </div>

                  {/* Expand Icon */}
                  <div className="flex-shrink-0 ml-4">
                    <ChevronRight
                      className={`w-5 h-5 text-white/40 transition-transform duration-300 ${
                        expandedId === match.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expandedId === match.id ? 'max-h-32' : 'max-h-0'
                  }`}
                >
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 border-t border-purple-500/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                      <div className="flex items-center gap-6">
                        {match.viewers && (
                          <div className="flex items-center gap-2 text-white/60">
                            <Eye className="w-4 h-4" />
                            <span className="kimi-font-body text-sm">
                              {formatViewers(match.viewers)} watching
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-white/60">
                          <Users className="w-4 h-4" />
                          <span className="kimi-font-body text-sm">
                            Skill-Based
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 kimi-font-body text-sm rounded-lg transition-colors">
                          Watch Stream
                        </button>
                        <button className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 kimi-font-body text-sm rounded-lg transition-colors">
                          View Results
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-orange-500/5" />
                </div>
              </div>
            </div>
          ))}
        </Reveal>

        {/* View All Button */}
        <div className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 px-6 py-3 kimi-glass border border-purple-500/30 rounded-full kimi-font-body text-white/70 hover:text-white hover:border-purple-500/60 transition-all">
            View All Challenges
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Reveal>
  );
};

export default LiveBattles;
