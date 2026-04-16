import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Crown, TrendingUp, Medal, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface Player {
  rank: number;
  name: string;
  points: number;
  avatar: string;
  winRate: number;
  tournaments: number;
}

const topPlayers: Player[] = [
  {
    rank: 1,
    name: 'PhantomStriker',
    points: 12450,
    avatar: '/avatar-1.png',
    winRate: 78,
    tournaments: 156,
  },
  {
    rank: 2,
    name: 'CyberNinja',
    points: 11890,
    avatar: '/avatar-2.png',
    winRate: 72,
    tournaments: 142,
  },
  {
    rank: 3,
    name: 'ShadowHunter',
    points: 11230,
    avatar: '/avatar-3.png',
    winRate: 69,
    tournaments: 138,
  },
];

const otherPlayers: Player[] = [
  { rank: 4, name: 'NeonViper', points: 10890, avatar: '', winRate: 65, tournaments: 120 },
  { rank: 5, name: 'QuantumQueen', points: 10540, avatar: '', winRate: 63, tournaments: 115 },
  { rank: 6, name: 'TitanForce', points: 10200, avatar: '', winRate: 61, tournaments: 110 },
  { rank: 7, name: 'VoidWalker', points: 9870, avatar: '', winRate: 59, tournaments: 105 },
  { rank: 8, name: 'StormBringer', points: 9540, avatar: '', winRate: 57, tournaments: 98 },
];

const Leaderboard = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-300 via-gray-400 to-gray-500';
      case 3:
        return 'from-amber-600 via-amber-700 to-amber-800';
      default:
        return 'from-purple to-orange';
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

  return (
    <section
      ref={sectionRef}
      id="leaderboard"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/5 rounded-full blur-[150px]" />
      </div>

      {/* Wireframe Sphere (Decorative) */}
      <div className="absolute top-1/4 right-0 w-96 h-96 opacity-10">
        <div className="w-full h-full border border-purple/30 rounded-full animate-spin-slow" />
        <div className="absolute inset-8 border border-purple/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute inset-16 border border-purple/10 rounded-full animate-spin-slow" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span className="inline-flex items-center gap-2 font-body text-sm text-gold uppercase tracking-[0.3em] mb-4">
            <Crown className="w-4 h-4" />
            Elite Rankings
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            HALL OF <span className="text-gradient-gold">LEGENDS</span>
          </h2>
          <p className="font-body text-lg text-white/60 max-w-2xl mx-auto">
            Your wallet. Your skill. Your legacy.
            A permanent on-chain record of performance.
          </p>
        </div>

        {/* Podium - Top 3 */}
        <div
          ref={podiumRef}
          className="flex justify-center items-end gap-4 lg:gap-8 mb-16 lg:mb-20"
        >
          {[2, 1, 3].map((rank) => {
            const player = topPlayers.find((p) => p.rank === rank);
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
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mx-auto mb-4">
                    <div
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-br ${getRankColor(
                        rank
                      )}`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-void">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-full h-full object-cover animate-float"
                        />
                      </div>
                    </div>
                    {/* Rank Badge */}
                    <div
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(
                        rank
                      )}`}
                    >
                      <span className="font-display font-bold text-sm lg:text-lg text-white">
                        {rank}
                      </span>
                    </div>
                    {/* Crown for #1 */}
                    {rank === 1 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Crown className="w-8 h-8 text-gold animate-float" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="text-center mb-4">
                    <h3 className="font-display font-bold text-sm sm:text-lg text-white mb-1">
                      {player.name}
                    </h3>
                    <p className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-gradient">
                      {player.points.toLocaleString()}
                    </p>
                    <p className="font-body text-xs text-white/50">USDFG</p>
                  </div>

                  {/* Podium Base */}
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

        {/* Other Players List */}
        <div ref={listRef} className="max-w-4xl mx-auto">
          <div className="glass border border-purple/20 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-4 sm:px-6 py-4 border-b border-purple/10 bg-purple/5">
              <div className="w-12 sm:w-16 font-body text-xs text-white/50 uppercase">
                Rank
              </div>
              <div className="flex-1 font-body text-xs text-white/50 uppercase">
                Player
              </div>
              <div className="hidden sm:block w-24 text-right font-body text-xs text-white/50 uppercase">
                Win Rate
              </div>
              <div className="hidden sm:block w-24 text-right font-body text-xs text-white/50 uppercase">
                Tournaments
              </div>
              <div className="w-24 text-right font-body text-xs text-white/50 uppercase">
                USDFG
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-purple/10">
              {otherPlayers.map((player) => (
                <div
                  key={player.rank}
                  className="list-item group flex items-center px-4 sm:px-6 py-4 hover:bg-purple/5 transition-colors cursor-pointer"
                >
                  <div className="w-12 sm:w-16 flex items-center gap-2">
                    <span className="font-display font-bold text-lg text-white/60">
                      #{player.rank}
                    </span>
                    {player.rank <= 5 && (
                      <Medal className="w-4 h-4 text-purple hidden sm:block" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple/30 to-orange/30 flex items-center justify-center">
                      <span className="font-display font-bold text-xs sm:text-sm text-white">
                        {player.name[0]}
                      </span>
                    </div>
                    <span className="font-body font-medium text-sm sm:text-base text-white truncate">
                      {player.name}
                    </span>
                  </div>
                  <div className="hidden sm:block w-24 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="font-body text-sm text-white/70">
                        {player.winRate}%
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:block w-24 text-right">
                    <span className="font-body text-sm text-white/70">
                      {player.tournaments}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="font-display font-semibold text-sm sm:text-base text-gradient">
                      {player.points.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View Full Leaderboard */}
          <div className="mt-6 text-center">
            <button className="inline-flex items-center gap-2 font-body text-purple hover:text-orange transition-colors">
              View Full Leaderboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
