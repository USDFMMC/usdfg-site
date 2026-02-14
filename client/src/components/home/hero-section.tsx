import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onExploreClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(bgRef.current, { scale: 1.2, opacity: 0 });
      gsap.set([badgeRef.current, brandRef.current, headlineRef.current, subRef.current, buttonsRef.current, statsRef.current], {
        opacity: 0,
        y: 24,
      });

      gsap
        .timeline({ delay: 0.3 })
        .to(bgRef.current, { scale: 1, opacity: 1, duration: 1.8, ease: "power3.out" })
        .to(headlineRef.current, { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" }, "-=1.2")
        .to(brandRef.current, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
        .to(badgeRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "-=0.4")
        .to(subRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(statsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2");

      // Subtle parallax like Kimi
      gsap.to(contentRef.current, {
        y: -100,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
      gsap.to(bgRef.current, {
        y: 50,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { value: "25+", label: "Supported Game Categories" },
    { value: "50+", label: "Challenge Formats & Match Types" },
    { value: "100%", label: "Verified On-Chain Outcomes" },
  ];

  return (
    <section ref={sectionRef} className="hero relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-transparent">
      {/* Background Image - Hero (static like Kimi; no reveal animation) */}
      <div ref={bgRef} className="absolute inset-0 z-[1]" style={{ willChange: "transform" }}>
        <img
          src="/hero-bg.jpg"
          alt="Esports Arena"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.08) saturate(1.15) contrast(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/50" />
        <div className="absolute inset-0 bg-purple/10" />
        <div className="absolute inset-0 bg-gradient-radial-kimi opacity-70" />
      </div>

      {/* Animated Grid Overlay - Kimi Exact */}
      <div className="absolute inset-0 z-[2] opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(126, 67, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(126, 67, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content - Kimi structure: badge then headline (from HeroSection.kimi.tsx) */}
      <div ref={contentRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 pt-20" style={{ willChange: "transform" }}>
        <div className="w-full">
          <div className="flex flex-col items-start text-left max-w-4xl">
            {/* Badge – Kimi exact: glass, border-purple/30, w-4 h-4 icon, font-body text-sm text-white/80. Icon: Kimi SVG (trophy) in Kimi orange. */}
            <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 mb-6 kimi-glass rounded-full border border-kimi-purple-30">
              <img
                src="/_kimi/hero-badge-icon.svg"
                alt=""
                className="w-4 h-4 shrink-0 object-contain"
                width={16}
                height={16}
                aria-hidden
              />
              <span className="kimi-font-body text-sm text-white/80">
                World's Premier Esports Arena
              </span>
            </div>

            <div ref={brandRef} className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-2 text-white">
              USDFG
            </div>

            <h1
              ref={headlineRef}
              className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight mb-6"
            >
              <span className="block">
                <span className="text-white">GAME. </span>
                <span
                  className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent"
                  style={{
                    textShadow: "0 0 16px rgba(74, 222, 128, 0.28)",
                    filter: "drop-shadow(0 0 6px rgba(74, 222, 128, 0.22))",
                  }}
                >
                  EARN.
                </span>
              </span>
              <span
                className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{
                  textShadow: "0 0 16px rgba(251, 191, 36, 0.22)",
                  filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.18))",
                }}
              >
                CONQUER.
              </span>
            </h1>

            <p ref={subRef} className="font-body text-lg sm:text-xl text-white/70 max-w-2xl mb-8 leading-relaxed">
              Join the world's premier esports crypto ecosystem. Challenge players, manage tournaments, and turn your skill into rewards. The arena awaits your arrival.
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row justify-start gap-4">
              <button
                onClick={onExploreClick}
                className="relative font-display font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group rounded-lg transition-all"
              >
                <span className="relative z-10 flex items-center gap-2">
                  EXPLORE PLATFORM
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>

              <Link to="/whitepaper">
                <button className="font-display font-semibold text-base px-8 py-6 border-2 border-purple/50 text-white hover:bg-purple/20 hover:border-purple rounded-lg transition-all flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  WHITEPAPER
                </button>
              </Link>
            </div>

            {/* Kimi stat strip (exact structure; USDFG metrics only) */}
            <div
              ref={statsRef}
              className="flex flex-nowrap gap-6 sm:flex-wrap sm:gap-8 md:gap-12"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="w-1/3 min-w-0 text-left sm:w-auto">
                  <div className="font-display font-bold text-2xl sm:text-3xl text-gradient">{stat.value}</div>
                  <div className="font-body text-xs sm:text-sm text-white/50 uppercase tracking-wider leading-snug">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent z-[5]" />

      {/* Floating Orbs - Kimi Exact */}
      <div
        className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple/20 rounded-full blur-[100px] animate-pulse-glow"
      />
      <div
        className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-orange/10 rounded-full blur-[80px] animate-pulse-glow"
        style={{ animationDelay: "1s" }}
      />
    </section>
  );
};

export default HeroSection;