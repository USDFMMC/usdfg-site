import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Trophy, Gamepad2, Gem, Award, ChevronLeft, ChevronRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface Game {
  image: string;
  title: string;
  challenges: string;
  alt: string;
  icon: string;
  metric: string;
  iconComponent: typeof Trophy;
  color: string;
}

const GameCategories: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const games: Game[] = [
    {
      image: "/assets/usdfg-sports-game-competition.png",
      title: "Sports Game Challenge",
      challenges: "Compete across major sports genres. Outplay the competition. Only the best walk away.",
      alt: "USDFG sports game competition - dominate head-to-head matches",
      icon: "🏀",
      metric: "50K+",
      iconComponent: Trophy,
      color: "from-yellow-400 to-amber-600",
    },
    {
      image: "/assets/usdfg-fighting-game-tournament.png",
      title: "Fighting Game Challenge",
      challenges: "Every move counts. No gimmicks, no RNG — just pure skill.",
      alt: "USDFG fighting game tournament - master combos and counters",
      icon: "🥋",
      metric: "10K+",
      iconComponent: Gamepad2,
      color: "from-purple-500 to-purple-600",
    },
    {
      image: "/assets/usdfg-racing-game-challenge.png",
      title: "Racing Game Challenge",
      challenges: "Time is your enemy. Every millisecond earned, not given.",
      alt: "USDFG racing game challenge - test your precision and speed",
      icon: "🏎️",
      metric: "1M+",
      iconComponent: Gem,
      color: "from-pink-400 to-rose-600",
    },
    {
      image: "/assets/usdfg-shooting-game-battle.png",
      title: "Shooter Game Challenge",
      challenges: "Clutch moments. Custom chaos. Only your aim decides the outcome.",
      alt: "USDFG shooting game battle - prove your aim and reflexes",
      icon: "🔫",
      metric: "100+",
      iconComponent: Award,
      color: "from-cyan-400 to-blue-600",
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation - Kimi Exact
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

      // Cards animation - Kimi Exact
      const cards = carouselRef.current?.querySelectorAll('.prize-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 60, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: carouselRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

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
      ref={sectionRef}
      id="supported-games"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      {/* Background - Kimi Exact */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />

      <div className="relative z-10">
        {/* Section Header - Kimi Exact Structure */}
        <div ref={titleRef} className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mb-12 lg:mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 kimi-font-body text-sm text-amber-400 uppercase tracking-[0.3em] mb-4">
                <Gem className="w-4 h-4" />
                Supported Genres
              </span>
              <h2 className="kimi-font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white">
                SUPPORTED <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">GAMES</span>
              </h2>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center gap-3">
              <button
                onClick={() => scroll('left')}
                className="w-12 h-12 flex items-center justify-center kimi-glass border border-purple-500/30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-12 h-12 flex items-center justify-center kimi-glass border border-purple-500/30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel - Kimi Exact Structure */}
        <div ref={carouselRef} className="relative">
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
                  className="prize-card flex-shrink-0 w-80 sm:w-96 group"
                >
                  <div className="relative h-full kimi-glass border border-purple-500/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
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
                      <div className="absolute top-4 right-4 px-4 py-2 kimi-glass rounded-full">
                        <span className="kimi-font-display font-bold text-sm bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                          {game.metric}
                        </span>
                      </div>
                    </div>

                    {/* Content - Kimi Exact */}
                    <div className="p-6">
                      <h3 className="kimi-font-display font-bold text-xl text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-orange-400 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                        {game.title}
                      </h3>
                      <p className="kimi-font-body text-white/60 text-sm leading-relaxed">
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

        {/* Stats Bar - Kimi Exact Structure */}
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mt-16">
          <div className="kimi-glass border border-purple-500/20 rounded-2xl p-6 lg:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                { label: 'Active Competitors', value: '50K+' },
                { label: 'Challenges Completed', value: '1M+' },
                { label: 'Skill-Based Rewards', value: '100%' },
                { label: 'Player-Hosted Events', value: '10K+' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="kimi-font-display font-bold text-2xl lg:text-3xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="kimi-font-body text-sm text-white/50">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameCategories;
