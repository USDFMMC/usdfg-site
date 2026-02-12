import React, { useRef } from "react";
import { Medal, Swords, Car, Target, Gem, ChevronLeft, ChevronRight } from "lucide-react";

interface Game {
  image: string;
  title: string;
  challenges: string;
  alt: string;
  icon: string;
  metric: string;
  iconComponent: typeof Medal;
  color: string;
}

const GameCategories: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const games: Game[] = [
    {
      image: "/assets/usdfg-sports-game-competition.png",
      title: "Sports Game Challenge",
      challenges: "Compete across major sports genres. Outplay the competition. Only the best walk away.",
      alt: "USDFG sports game competition - dominate head-to-head matches",
      icon: "🏀",
      metric: "50K+",
      iconComponent: Medal,
      color: "from-yellow-400 to-amber-600",
    },
    {
      image: "/assets/usdfg-fighting-game-tournament.png",
      title: "Fighting Game Challenge",
      challenges: "Every move counts. No gimmicks, no RNG — just pure skill.",
      alt: "USDFG fighting game tournament - master combos and counters",
      icon: "🥋",
      metric: "10K+",
      iconComponent: Swords,
      color: "from-purple-500 to-purple-600",
    },
    {
      image: "/assets/usdfg-racing-game-challenge.png",
      title: "Racing Game Challenge",
      challenges: "Time is your enemy. Every millisecond earned, not given.",
      alt: "USDFG racing game challenge - test your precision and speed",
      icon: "🏎️",
      metric: "1M+",
      iconComponent: Car,
      color: "from-pink-400 to-rose-600",
    },
    {
      image: "/assets/usdfg-shooting-game-battle.png",
      title: "Shooter Game Challenge",
      challenges: "Clutch moments. Custom chaos. Only your aim decides the outcome.",
      alt: "USDFG shooting game battle - prove your aim and reflexes",
      icon: "🔫",
      metric: "100+",
      iconComponent: Target,
      color: "from-cyan-400 to-blue-600",
    }
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      id="supported-games"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      <div className="relative z-10">
        {/* Section Header - Kimi Exact Structure */}
        <div data-kimi-scroll className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mb-12 lg:mb-16 kimi-scroll">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 font-body text-sm text-orange uppercase tracking-[0.3em] mb-4">
                <Gem className="w-4 h-4" />
                Supported Genres
              </span>
              <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white">
                SUPPORTED <span className="text-gradient">GAMES</span>
              </h2>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center gap-3">
              <button
                onClick={() => scroll('left')}
                className="w-12 h-12 flex items-center justify-center glass border border-purple/30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-12 h-12 flex items-center justify-center glass border border-purple/30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel - Kimi sizes: card w-72/w-80, gap-6 (1.5rem), image h-48 (12rem), p-6, rounded-2xl; section py-24 lg:py-32, header mb-12 lg:mb-16 */}
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-12 xl:px-20 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {games.map((game, index) => {
              const IconComponent = game.iconComponent;
              return (
                <div
                  key={index}
                  data-kimi-scroll
                  className="prize-card flex-shrink-0 w-72 sm:w-80 group kimi-scroll"
                  style={{ animationDelay: `${0.12 + index * 0.14}s` }}
                >
                  <div className="relative h-full glass border border-purple-500/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.25)]">
                    {/* Image - Kimi Exact */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={game.image.replace('.png', '.webp')}
                        alt={game.alt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                      
                      {/* Shine Effect - Kimi Exact */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>

                      {/* Icon Badge - Kimi Exact */}
                      <div
                        className={`absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-gradient-to-br ${game.color} rounded-xl shadow-lg`}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>

                      {/* Value Badge - Kimi Exact */}
                      <div className="absolute top-4 right-4 px-4 py-2 glass rounded-full border border-purple/30">
                        <span className="font-display font-bold text-sm text-gradient">
                          {game.metric}
                        </span>
                      </div>
                    </div>

                    {/* Content - Kimi Exact */}
                    <div className="p-6">
                      <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-gradient transition-all">
                        {game.title}
                      </h3>
                      <p className="font-body text-white/60 text-sm leading-relaxed">
                        {game.challenges}
                      </p>
                    </div>

                    {/* Bottom Gradient - Kimi Exact */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default GameCategories;
