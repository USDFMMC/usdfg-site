import React, { useEffect, useRef } from "react";
import { Medal, Swords, Car, Target, Gem, ChevronLeft, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Kimi Prizes: title trigger + carousel trigger with stagger
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

      const cards = carouselRef.current?.querySelectorAll(".prize-card");
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 60, scale: 0.9 },
          {
            y: 0,
            scale: 1,
            stagger: 0.15,
            ease: "none",
            scrollTrigger: {
              trigger: carouselRef.current,
              start: "top 85%",
              end: "top 35%",
              scrub: 1,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -400 : 400,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="prizes"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      <div className="relative z-10">
        {/* Section Header - Kimi Exact Structure */}
        <div ref={titleRef} className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mb-12 lg:mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 kimi-font-body text-sm text-[var(--kimi-orange)] uppercase tracking-[0.3em] mb-4">
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
                className="w-12 h-12 flex items-center justify-center kimi-glass border border-kimi-purple-30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-12 h-12 flex items-center justify-center kimi-glass border border-kimi-purple-30 rounded-full hover:border-purple-500/60 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div ref={carouselRef} className="relative">
          <div
            ref={scrollContainerRef}
            className="kimi-card-scroll scrollbar-hide px-4 sm:px-6 lg:px-12 xl:px-20 pb-4"
          >
            {games.map((game, index) => {
              const IconComponent = game.iconComponent;
              return (
                <div
                  key={index}
                  className="prize-card kimi-card group"
                >
                  <div className="relative h-full kimi-card-inner">
                    <div className="kimi-card-image relative overflow-hidden">
                      <img
                        src={game.image.replace('.png', '.webp')}
                        alt={game.alt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      {/* Kimi Features.tsx:126 - gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                      
                      {/* Shine Effect - Kimi Exact */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>

                      <div className="absolute top-4 left-4 kimi-card-icon">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>

                      <div className="absolute top-4 right-4 kimi-card-metric font-display font-bold text-base text-gradient">
                        {game.metric}
                      </div>
                    </div>

                    <div className="kimi-card-content">
                      <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-gradient transition-all">
                        {game.title}
                      </h3>
                      <p className="kimi-font-body text-white/60 text-sm leading-relaxed">
                        {game.challenges}
                      </p>
                    </div>

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
