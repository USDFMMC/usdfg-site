import React, { useEffect, useRef, useState } from 'react';
import { Clock, Eye, ChevronRight } from 'lucide-react';
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

// Real matches come from your data source; no mock data.
const matches: Match[] = [];

const gameColors: Record<string, string> = {
  'League of Legends': 'from-blue-500 to-purple-500',
  'Valorant': 'from-red-500 to-orange-500',
  'CS2': 'from-yellow-500 to-orange-500',
  'Dota 2': 'from-red-600 to-red-800',
  'Rocket League': 'from-cyan-500 to-blue-500',
};

const LiveBattles: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Kimi LiveMatches: title trigger + list trigger with stagger
      gsap.fromTo(
        titleRef.current,
        { y: 50 },
        {
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );

      const items = listRef.current?.querySelectorAll(".match-item");
      if (items) {
        gsap.fromTo(
          items,
          { x: 40 },
          {
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: listRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
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

  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <section
      ref={sectionRef}
      id="matches"
      className="relative py-24 lg:py-32 w-full"
    >
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6">
        {/* Section Header - reference: single row, green dot + "X Live Now", "View All" + chevron */}
        <div
          ref={titleRef}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            <span className="font-body text-sm font-medium text-white">
              {liveCount} Live Now
            </span>
          </div>
          <button
            type="button"
            className="font-body text-sm text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Matches List - uniform card height, consistent padding */}
        <div ref={listRef} className="space-y-3">
          {matches.length === 0 ? (
            <div className="flex items-center justify-center py-10 px-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <p className="font-body text-sm text-white/50">No live matches right now. Check back soon or create a challenge.</p>
            </div>
          ) : null}
          {matches.map((match) => (
            <div
              key={match.id}
              className="match-item group"
              onClick={() =>
                setExpandedId(expandedId === match.id ? null : match.id)
              }
            >
              <div
                className={`relative flex items-center min-h-[56px] px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                  match.status === 'live'
                    ? 'border-orange-500/60 bg-orange-500/5 hover:border-orange-400/70'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}
              >
                {/* Status: LIVE pill or clock + time */}
                <div className="flex-shrink-0 w-[72px] sm:w-20 flex items-center gap-1.5">
                  {match.status === 'live' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/90 text-white text-[10px] font-bold uppercase tracking-wide">
                      LIVE
                    </span>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-white/50 flex-shrink-0" />
                      <span className="font-body text-sm text-white/90">
                        {match.time}
                      </span>
                    </>
                  )}
                </div>

                {/* Teams: truncated with ellipsis */}
                <div className="flex-1 min-w-0 flex items-center justify-center gap-2 sm:gap-3 px-2">
                  <span className="font-display font-semibold text-sm text-white truncate max-w-[28%] sm:max-w-[120px]">
                    {match.team1}
                  </span>
                  <span className="flex-shrink-0 font-body text-[10px] sm:text-xs text-white/50">
                    VS
                  </span>
                  <span className="font-display font-semibold text-sm text-white truncate max-w-[28%] sm:max-w-[120px]">
                    {match.team2}
                  </span>
                </div>

                {/* Colored dot + chevron */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      match.status === 'live'
                        ? 'bg-blue-400'
                        : 'bg-gradient-to-r ' + (gameColors[match.game] || 'from-purple to-orange')
                    }`}
                  />
                  <ChevronRight
                    className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform duration-300 ${
                      expandedId === match.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded row (optional detail) */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedId === match.id ? 'max-h-28' : 'max-h-0'
                }`}
              >
                <div className="px-4 py-3 border border-t-0 border-white/10 rounded-b-xl bg-white/[0.02]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-white/60 text-xs">
                      {match.viewers != null && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {formatViewers(match.viewers)} watching
                        </span>
                      )}
                      <span>{match.game}</span>
                      <span>{match.format}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 text-xs rounded-lg hover:bg-purple-500/30"
                      >
                        Watch
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-orange-500/20 text-orange-300 text-xs rounded-lg hover:bg-orange-500/30"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Matches - reference: full-width, rounded, dark, white text + chevron */}
        <div className="mt-6">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-body text-sm font-medium text-white bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all"
          >
            View All Matches
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveBattles;
