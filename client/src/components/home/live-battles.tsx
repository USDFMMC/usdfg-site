import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useChallenges } from '@/hooks/useChallenges';
import type { ChallengeData } from '@/lib/firebase/firestore';

gsap.registerPlugin(ScrollTrigger);

interface Match {
  id: string;
  team1: string;
  team2: string;
  game: string;
  status: 'live' | 'upcoming' | 'finished';
  time?: string;
  viewers?: number;
  format: string;
  challengeId?: string;
}

function shortWallet(w: string): string {
  if (!w || w.length < 12) return w;
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function challengeToMatch(c: ChallengeData & { id?: string }, index: number): Match | null {
  const status = c.status;
  const game = (c.game || c.category || 'Arena').replace(/\s*\|\s*.*$/, '').trim();
  const id = c.id ?? `ch-${index}`;

  if (status === 'active') {
    const creator = c.creator ? shortWallet(c.creator) : 'Player 1';
    const challenger = c.challenger ? shortWallet(c.challenger) : (c.players?.[1] ? shortWallet(c.players[1]) : 'Player 2');
    return {
      id,
      team1: creator,
      team2: challenger,
      game,
      status: 'live',
      format: c.format === 'tournament' ? 'Tournament' : '1v1',
      challengeId: c.id,
    };
  }
  if (status === 'creator_funded') {
    const creator = c.creator ? shortWallet(c.creator) : 'Creator';
    const opponent = c.pendingJoiner ? shortWallet(c.pendingJoiner) : 'Waiting…';
    return {
      id,
      team1: creator,
      team2: opponent,
      game,
      status: 'upcoming',
      time: 'Starting soon',
      format: c.format === 'tournament' ? 'Tournament' : '1v1',
      challengeId: c.id,
    };
  }
  if (status === 'pending_waiting_for_opponent') {
    const creator = c.creator ? shortWallet(c.creator) : 'Creator';
    return {
      id,
      team1: creator,
      team2: 'Open to join',
      game,
      status: 'upcoming',
      time: 'Join now',
      format: c.format === 'tournament' ? 'Tournament' : '1v1',
      challengeId: c.id,
    };
  }
  return null;
}

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
  const { challenges } = useChallenges();

  const matches: Match[] = challenges
    .map((c, i) => challengeToMatch(c as ChallengeData & { id?: string }, i))
    .filter((m): m is Match => m != null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Kimi LiveMatches: title trigger + list trigger with stagger
      gsap.fromTo(
        titleRef.current,
        { y: 50 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
            end: "top 35%",
            scrub: 1,
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
            stagger: 0.1,
            ease: "none",
            scrollTrigger: {
              trigger: listRef.current,
              start: "top 85%",
              end: "top 35%",
              scrub: 1,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [matches.length]);

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
          <Link
            to="/app"
            className="font-body text-sm text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Matches List - uniform card height, consistent padding */}
        <div ref={listRef} className="space-y-3">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-white/10 bg-white/[0.02] gap-3">
              <p className="font-body text-sm text-white/50">No live matches right now. Check back soon or create a challenge.</p>
              <Link
                to="/app"
                className="font-body text-sm text-purple-400 hover:text-purple-300 font-medium"
              >
                Go to Arena →
              </Link>
            </div>
          ) : null}
          {matches.map((match) => (
            <div
              key={match.id}
              className={`match-item relative flex items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
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
                    <span className="font-body text-sm text-white/90 whitespace-nowrap">
                      {match.time}
                    </span>
                  </>
                )}
              </div>
              {/* Teams: User vs Creator */}
              <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                <span className="font-display font-semibold text-sm text-white truncate">
                  {match.team1}
                </span>
                <span className="flex-shrink-0 font-body text-[10px] sm:text-xs text-white/50">VS</span>
                <span className="font-display font-semibold text-sm text-white truncate">
                  {match.team2}
                </span>
              </div>
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  match.status === 'live'
                    ? 'bg-blue-400'
                    : 'bg-gradient-to-r ' + (gameColors[match.game] || 'from-purple to-orange')
                }`}
              />
              {/* Game · format - same line */}
              <span className="font-body text-xs text-white/60 shrink-0 truncate max-w-[100px] sm:max-w-[140px]">
                {match.game} · {match.format}
              </span>
              {/* Watch + View - same line */}
              <div className="flex shrink-0 gap-2">
                <Link
                  to="/app"
                  className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-[11px] rounded-md hover:bg-purple-500/30 transition-colors"
                >
                  Watch
                </Link>
                <Link
                  to="/app"
                  className="px-2.5 py-1 bg-orange-500/20 text-orange-300 text-[11px] rounded-md hover:bg-orange-500/30 transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All Matches - reference: full-width, rounded, dark, white text + chevron */}
        <div className="mt-6">
          <Link
            to="/app"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-body text-sm font-medium text-white bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all"
          >
            View All Matches
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveBattles;
