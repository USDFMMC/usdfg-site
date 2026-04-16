import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Car, Trophy, Swords, Target, Gem, ChevronLeft, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const supportedGames = [
  {
    icon: Car,
    title: 'Racing Game Challenge',
    description: 'Time is your enemy. Every millisecond earned, not given.',
    color: 'from-green-400 to-emerald-600',
    image: '/prize-cash.jpg',
  },
  {
    icon: Trophy,
    title: 'Sports Game Challenge',
    description: 'Compete across major sports genres. Outplay the competition. Only the best walk away.',
    color: 'from-purple to-purple-600',
    image: '/prize-gaming-rigs.jpg',
  },
  {
    icon: Swords,
    title: 'Fighting Game Challenge',
    description: 'Every move counts. No gimmicks, no RNG — just pure skill.',
    color: 'from-pink-400 to-rose-600',
    image: '/prize-exclusive-skins.jpg',
  },
  {
    icon: Target,
    title: 'Shooter Game Challenge',
    description: 'Clutch moments. Custom chaos. Only your aim decides the outcome.',
    color: 'from-yellow-400 to-amber-600',
    image: '/prize-legendary-trophies.jpg',
  },
];

const SupportedGames = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

      // Cards animation
      const cards = carouselRef.current?.querySelectorAll('.game-card');
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
      id="games"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-void via-void-light to-void" />

      <div className="relative z-10">
        {/* Section Header */}
        <div ref={titleRef} className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mb-12 lg:mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 font-body text-sm text-gold uppercase tracking-[0.3em] mb-4">
                <Gem className="w-4 h-4" />
                Supported Genres
              </span>
              <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white">
                SUPPORTED <span className="text-gradient-gold">GAMES</span>
              </h2>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center gap-3">
              <button
                onClick={() => scroll('left')}
                className="w-12 h-12 flex items-center justify-center glass border border-purple/30 rounded-full hover:border-purple/60 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-12 h-12 flex items-center justify-center glass border border-purple/30 rounded-full hover:border-purple/60 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div ref={carouselRef} className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-12 xl:px-20 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {supportedGames.map((game, index) => (
              <div
                key={index}
                className="game-card flex-shrink-0 w-80 sm:w-96 group"
              >
                <div className="relative h-full glass border border-purple/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple/50 hover:shadow-glow">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    {/* Icon Badge */}
                    <div
                      className={`absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-gradient-to-br ${game.color} rounded-xl shadow-lg`}
                    >
                      <game.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-gradient transition-colors">
                      {game.title}
                    </h3>
                    <p className="font-body text-white/60 text-sm leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  {/* Bottom Gradient */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 mt-16">
          <div className="glass border border-purple/20 rounded-2xl p-6 lg:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                { label: 'Fixed Supply', value: '21M' },
                { label: 'On-Chain Verification', value: '100%' },
                { label: 'Inflation Mechanics', value: '0' },
                { label: 'Competitive Identity', value: 'Wallet-Based' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="font-display font-bold text-2xl lg:text-3xl text-gradient mb-1">
                    {stat.value}
                  </div>
                  <div className="font-body text-sm text-white/50">
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

export default SupportedGames;
