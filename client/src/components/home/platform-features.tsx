import React, { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  },
  {
    icon: Trophy,
    title: "Verified Results",
    description: "Results are confirmed by players. When both sides agree, rewards release automatically and are finalized on-chain. No randomness. No house. Just your skill and verified outcomes.",
    image: "/_kimi/feature-tournament.jpg",
    metric: "On-Chain",
  },
  {
    icon: BarChart3,
    title: "Wallet-Based Records",
    description: "View verified wins, match history, and progression tied directly to your wallet identity. Your record is your reputation. Every win is recorded on-chain. Only your skill matters.",
    image: "/_kimi/feature-warroom.jpg",
    metric: "Skill-Based",
  },
];

const PlatformFeatures: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bitcoinRef = useRef<HTMLSpanElement>(null);
  const gamingRef = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      const cards = Array.from(
        root.querySelectorAll<HTMLElement>("[data-platform-feature-card]")
      );

      // Kimi-style: pre-state + single trigger with stagger so reverse feels right.
      // This section is mounted after an interaction (post-load), so we follow with refreshes.
      const titleEls: (Element | null)[] = [
        kickerRef.current,
        headingRef.current,
        bitcoinRef.current,
        gamingRef.current,
        descRef.current,
      ];
      gsap.set(titleEls.filter(Boolean), { opacity: 0, y: 24 });
      // Kimi Prizes card animation: y: 60, scale: 0.9 → y: 0, scale: 1, duration 0.6, stagger 0.15, start "top 80%"
      gsap.set(cards, { y: 60, scale: 0.9 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 80%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      });

      tl.to(kickerRef.current, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 0);
      tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }, 0.06);
      tl.to([bitcoinRef.current, gamingRef.current], { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08 }, 0.12);
      tl.to(descRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.18);
      tl.to(
        cards,
        { y: 0, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.15 },
        0.22
      );

      // This section is mounted after an interaction (post-load), and images can shift layout.
      // Force a refresh so card triggers don't get stuck at opacity: 0.
      gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="relative py-24 lg:py-32 w-full overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-radial-kimi opacity-50" />
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-24 max-w-[1600px] mx-auto">
        {/* Section Header - Kimi Exact (kimi-glass, kimi-purple/orange gradients) */}
        <div ref={titleRef} className="text-center mb-16 lg:mb-20">
          <span
            ref={kickerRef}
            className="inline-block font-body text-sm text-purple uppercase tracking-[0.3em] mb-4"
          >
            The Platform
          </span>
          <h2
            ref={headingRef}
            className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6"
          >
            THE{" "}
            <span
              ref={bitcoinRef}
              className="text-gradient-kimi-orange bg-clip-text text-transparent text-fill-transparent"
              style={{
                textShadow: "0 0 20px rgba(126, 67, 255, 0.4)",
                filter: "drop-shadow(0 0 8px rgba(126, 67, 255, 0.3))",
              }}
            >
              BITCOIN
            </span>{" "}
            OF{" "}
            <span
              ref={gamingRef}
              className="text-gradient-kimi-orange bg-clip-text text-transparent text-fill-transparent"
              style={{
                textShadow: "0 0 20px rgba(255, 126, 62, 0.4)",
                filter: "drop-shadow(0 0 8px rgba(255, 126, 62, 0.3))",
              }}
            >
              GAMING
            </span>
          </h2>
          <p
            ref={descRef}
            className="font-body text-lg text-white/60 max-w-2xl mx-auto"
          >
            USDFG is a skill-based competition platform where players challenge each other directly, lock challenge assets on-chain, compete, and earn verified rewards through performance. Wallet-driven, non-custodial, and built for skill.
          </p>
        </div>

        {/* Feature Cards - Kimi presets */}
        <div className="kimi-card-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              data-platform-feature-card
              className="kimi-card group relative"
            >
              <div className="kimi-card-inner">
                <div className="kimi-card-image relative overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onLoad={() => ScrollTrigger.refresh()}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />

                  <div className="absolute top-4 left-4 kimi-card-icon">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="absolute top-4 right-4 kimi-card-metric kimi-card-metric-stat">
                    {feature.metric}
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple/20 to-transparent h-4 animate-scanline" />
                  </div>
                </div>

                <div className="kimi-card-content">
                  <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-gradient transition-colors">
                    {feature.title}
                  </h3>
                  <p className="font-body text-white/60 text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-2 font-body text-sm text-purple hover:text-orange transition-colors group/link"
                  >
                    Explore Feature
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA - Kimi Arena: "View All Features" style */}
        <div className="mt-16 text-center">
          <p className="font-body text-white/50 mb-4">
            Ready to experience the future of competitive gaming?
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 font-display font-semibold text-purple hover:text-orange transition-colors"
          >
            View All Features
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
