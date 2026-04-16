import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Swords, Trophy, BarChart3, ArrowUpRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Swords,
    title: 'Create Challenges',
    description:
      'Get USDFG into your wallet, then choose your game, define the rules, and launch a challenge. No accounts, just player-owned flow. Lock challenge assets, compete, and verify results directly.',
    image: '/feature-challenge.jpg',
    stats: 'Player-Created',
  },
  {
    icon: Trophy,
    title: 'Verified Results',
    description:
      'Results are confirmed by players. When both sides agree, rewards release automatically and are finalized on-chain. No randomness. No house. Just your skill and verified outcomes.',
    image: '/feature-tournament.jpg',
    stats: 'On-Chain',
  },
  {
    icon: BarChart3,
    title: 'Wallet-Based Records',
    description:
      'View verified wins, match history, and progression tied directly to your wallet identity. Your record is your reputation. Every win is recorded on-chain. Only your skill matters.',
    image: '/feature-warroom.jpg',
    stats: 'Skill-Based',
  },
];

const Features = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

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
      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        gsap.fromTo(
          card,
          { opacity: 0, y: 80, rotateX: 15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.8,
            delay: index * 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-24 lg:py-32 w-full"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span className="inline-block font-body text-sm text-purple uppercase tracking-[0.3em] mb-4">
            The Platform
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            THE ARENA <span className="text-gradient">AWAITS</span>
          </h2>
          <p className="font-body text-lg text-white/60 max-w-2xl mx-auto">
            USDFG is a skill-based competition platform where players create
            challenges, compete on-chain, and earn verified rewards through
            performance. Wallet-driven. Non-custodial.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 perspective-1000">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="group relative preserve-3d"
            >
              <div className="relative h-full glass border border-purple/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple/50 hover:shadow-glow">
                {/* Image */}
                <div className="relative h-48 sm:h-56 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                  
                  {/* Scanline Effect on Hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple/20 to-transparent h-4 animate-scanline" />
                  </div>

                  {/* Icon Badge */}
                  <div className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-purple/80 backdrop-blur-sm rounded-xl">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Stats Badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 glass rounded-full">
                    <span className="font-body text-xs text-white/80">
                      {feature.stats}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-gradient transition-colors">
                    {feature.title}
                  </h3>
                  <p className="font-body text-white/60 text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  
                  {/* Learn More Link */}
                  <button className="inline-flex items-center gap-2 font-body text-sm text-purple hover:text-orange transition-colors group/link">
                    Explore Feature
                    <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                  </button>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple/10 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="font-body text-white/50 mb-4">
            Ready to experience the future of competitive gaming?
          </p>
          <button className="inline-flex items-center gap-2 font-display font-semibold text-purple hover:text-orange transition-colors">
            View All Features
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Features;
