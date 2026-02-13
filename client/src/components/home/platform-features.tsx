import React, { useEffect, useRef } from "react";
import { Swords, Trophy, BarChart3, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Swords,
    title: "Create Challenges",
    description: "Get USDFG into your wallet, then choose your game, define the rules, and launch a challenge. No accounts, just player-owned flow. Lock challenge assets, compete, and verify results directly.",
    image: "/_kimi/feature-challenge.jpg",
    metric: "Player-Created",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Trophy,
    title: "Verified Results",
    description: "Results are confirmed by players. When both sides agree, rewards release automatically and are finalized on-chain. No randomness. No house. Just your skill and verified outcomes.",
    image: "/_kimi/feature-tournament.jpg",
    metric: "On-Chain",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: BarChart3,
    title: "Wallet-Based Records",
    description: "View verified wins, match history, and progression tied directly to your wallet identity. Your record is your reputation. Every win is recorded on-chain. Only your skill matters.",
    image: "/_kimi/feature-warroom.jpg",
    metric: "Skill-Based",
    color: "from-blue-500 to-blue-600",
  },
];

const PlatformFeatures: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      // 1) Section wrapper: subtle opacity + translateY
      tl.fromTo(
        wrapperRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      // 2) Heading: separate reveal, slightly earlier (overlap wrapper)
      tl.fromTo(
        kickerRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      );
      tl.fromTo(
        headingRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "<"
      );

      // 3) Subheading / paragraph: small delay after heading (0.05–0.1)
      tl.fromTo(
        subRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        ">-0.72"
      );

      // 4) Card grid: separate reveal with stagger, starts after heading completes
      if (cards.length) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 80, rotateX: 15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.2,
          },
          ">"
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="relative py-24 lg:py-32 w-full"
    >
      <div className="absolute inset-0 bg-gradient-radial-kimi opacity-50" />
      
      <div ref={wrapperRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header - Kimi Exact */}
        <div className="text-center mb-16 lg:mb-20">
          <span ref={kickerRef} className="inline-block font-body text-sm text-purple-500 uppercase tracking-[0.3em] mb-4">
            THE PLATFORM
          </span>
          <h2 ref={headingRef} className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
            <span className="block text-white">
              THE{" "}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                BITCOIN
              </span>
            </span>
            <span className="block">
              <span className="text-white">OF </span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                GAMING
              </span>
            </span>
          </h2>
          <p ref={subRef} className="font-body text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            USDFG is a skill-based competition platform where players challenge each other directly, lock challenge assets on-chain, compete, and earn verified rewards through performance. Wallet-driven, non-custodial, and built for skill.
          </p>
        </div>

        {/* Feature Cards - Kimi Exact Structure with Images */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 perspective-1000">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              className="group relative preserve-3d"
            >
              <div className="relative h-full glass border border-purple/20 rounded-2xl overflow-hidden transition-all duration-500 hover:border-purple/50 hover:shadow-glow">
                {/* Image - Kimi Exact */}
                <div className="relative h-48 sm:h-56 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  
                  {/* Shine Effect - Kimi Exact */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  {/* Icon Badge - Kimi Exact */}
                  <div className={`absolute top-4 left-4 w-12 h-12 flex items-center justify-center bg-gradient-to-br ${feature.color} rounded-xl shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Metric Badge - Kimi Exact */}
                  <div className="absolute top-4 right-4 px-4 py-2 glass rounded-full">
                    <span className="font-display font-bold text-sm text-gradient">
                      {feature.metric}
                    </span>
                  </div>
                </div>

                {/* Content - Kimi Exact */}
                <div className="p-6">
                  <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-gradient transition-all">
                    {feature.title}
                  </h3>
                  <p className="font-body text-white/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Gradient - Kimi Exact */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color}`} />

                {/* Hover Glow - Kimi Exact */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
