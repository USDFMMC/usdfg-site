import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Radio, Clock, Users, Eye, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

gsap.registerPlugin(ScrollTrigger);

interface Match {
  id: number;
  team1: string;
  team2: string;
  game: string;
  status: 'live' | 'upcoming' | 'finished';
  time?: string;
  viewers?: number;
  prize: string;
}

const matches: Match[] = [
  {
    id: 1,
    team1: 'Shadow Stalkers',
    team2: 'Neon Vipers',
    game: 'FC 26',
    status: 'live',
    viewers: 45200,
    prize: '1,756 USDFG',
  },
  {
    id: 2,
    team1: 'Cyber Wolves',
    team2: 'Phantom Squad',
    game: 'Valorant',
    status: 'upcoming',
    time: '5 min',
    prize: '878 USDFG',
  },
  {
    id: 3,
    team1: 'Digital Dragons',
    team2: 'Matrix Marines',
    game: 'CS2',
    status: 'upcoming',
    time: '20 min',
    prize: '1,229 USDFG',
  },
  {
    id: 4,
    team1: 'Quantum Queens',
    team2: 'Titan Force',
    game: '2K26',
    status: 'upcoming',
    time: '45 min',
    prize: '2,634 USDFG',
  },
  {
    id: 5,
    team1: 'Storm Bringers',
    team2: 'Void Walkers',
    game: 'Call of Duty',
    status: 'upcoming',
    time: '1h 15m',
    prize: '527 USDFG',
  },
];

const gameColors: Record<string, string> = {
  'FC 26': 'from-blue-500 to-purple-500',
  'Valorant': 'from-red-500 to-orange-500',
  'CS2': 'from-yellow-500 to-orange-500',
  '2K26': 'from-red-600 to-red-800',
  'Call of Duty': 'from-cyan-500 to-blue-500',
};

const LiveMatches = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

      // List items animation
      const items = listRef.current?.querySelectorAll('.match-item');
      if (items) {
        gsap.fromTo(
          items,
          { opacity: 0, x: 100 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: listRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const formatViewers = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <section
      ref={sectionRef}
      id="matches"
      className="relative py-24 lg:py-32 w-full"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-void-light" />
      <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div ref={titleRef} className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12 lg:mb-16">
          <div>
            <span className="inline-flex items-center gap-2 font-body text-sm text-orange uppercase tracking-[0.3em] mb-4">
              <Radio className="w-4 h-4 animate-live-pulse" />
              Real Time
            </span>
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white">
              LIVE <span className="text-gradient">BATTLES</span>
            </h2>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-live-pulse" />
              <span className="font-body text-sm text-white/70">
                {matches.filter((m) => m.status === 'live').length} Live Now
              </span>
            </div>
            <button className="font-body text-sm text-purple hover:text-orange transition-colors flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Matches List */}
        <div ref={listRef} className="space-y-4">
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
                    ? 'border-orange/50'
                    : 'border-purple/20 hover:border-purple/50'
                } rounded-xl overflow-hidden transition-all duration-300 cursor-pointer`}
              >
                {/* Main Row */}
                <div className="flex items-center p-4 sm:p-6">
                  {/* Status Indicator */}
                  <div className="flex-shrink-0 w-16 sm:w-24">
                    {match.status === 'live' ? (
                      <Badge className="bg-orange/20 text-orange border-orange/50 animate-live-pulse">
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

                  {/* Game & Prize */}
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                          gameColors[match.game] || 'from-purple to-orange'
                        }`}
                      />
                      <span className="font-body text-sm text-white/60">
                        {match.game}
                      </span>
                    </div>
                    <div className="font-display font-semibold text-sm text-gradient">
                      {match.prize}
                    </div>
                  </div>

                  {/* Mobile: Game only */}
                  <div className="flex-shrink-0 sm:hidden">
                    <div
                      className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                        gameColors[match.game] || 'from-purple to-orange'
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
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 border-t border-purple/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                      <div className="flex items-center gap-6">
                        {match.viewers && (
                          <div className="flex items-center gap-2 text-white/60">
                            <Eye className="w-4 h-4" />
                            <span className="font-body text-sm">
                              {formatViewers(match.viewers)} watching
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-white/60">
                          <Users className="w-4 h-4" />
                          <span className="font-body text-sm">
                            5v5 Ranked
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-purple/20 hover:bg-purple/30 text-purple font-body text-sm rounded-lg transition-colors">
                          Watch Stream
                        </button>
                        <button className="px-4 py-2 bg-orange/20 hover:bg-orange/30 text-orange font-body text-sm rounded-lg transition-colors">
                          View Stats
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple/5 to-orange/5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 px-6 py-3 glass border border-purple/30 rounded-full font-body text-white/70 hover:text-white hover:border-purple/60 transition-all">
            View All Matches
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveMatches;
