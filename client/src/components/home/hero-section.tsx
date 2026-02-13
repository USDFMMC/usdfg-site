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
  const brandRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(bgRef.current, { scale: 1.08, opacity: 0 });
      gsap.set([brandRef.current, headlineRef.current, subRef.current, buttonsRef.current, statsRef.current], {
        opacity: 0,
        y: 24,
      });

      gsap
        .timeline({ delay: 0.3 })
        .to(bgRef.current, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out" })
        .to(brandRef.current, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=1.0")
        .to(headlineRef.current, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out" }, "-=0.6")
        .to(subRef.current, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, "-=0.35")
        .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(statsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2");

      // Subtle parallax (kept restrained)
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
        y: 30,
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
      {/* Background (no mascot / no arcade hallway image) */}
      <div ref={bgRef} className="absolute inset-0 z-[1]" style={{ willChange: "transform" }}>
        <div className="absolute inset-0 bg-void" />
        <div className="absolute inset-0 bg-gradient-to-b from-void via-void-light to-void opacity-80" />
        <div className="absolute inset-0 bg-gradient-radial-kimi opacity-60" />
      </div>

      {/* Subtle grid overlay (kept restrained) */}
      <div className="absolute inset-0 z-[2] opacity-10">
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

      {/* Content (premium, mobile-first) */}
      <div ref={contentRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20 pt-20" style={{ willChange: "transform" }}>
        <div className="w-full">
          <div className="flex flex-col items-start text-left max-w-3xl">
            {/* Branding hierarchy:
                [ USDFG Emblem ]
                USDFG
                Skill-Based Competition Platform
            */}
            <div ref={brandRef} className="flex flex-col items-start text-left mb-8">
              <img
                src="/assets/usdfgToken2.png"
                alt="USDFG emblem"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                loading="eager"
                decoding="async"
              />
              <div className="mt-4 font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                USDFG
              </div>
              <div className="mt-1 font-body text-sm sm:text-base text-white/60">
                Skill-Based Competition Platform
              </div>
            </div>

            <h1 ref={headlineRef} className="font-display mb-5 text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-white">
              GAME. EARN. CONQUER.
            </h1>

            <p ref={subRef} className="font-body mb-8 max-w-2xl text-lg sm:text-xl text-white/70 leading-relaxed">
              Commit challenge assets on-chain, compete, and settle with verified outcomes.
              Earn performance-based rewards through a wallet-native, non-custodial structure.
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row justify-start gap-4">
              <button
                onClick={onExploreClick}
                className="relative font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group rounded-lg transition-all"
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
                <button className="font-semibold text-base px-8 py-6 border-2 border-purple/50 text-white hover:bg-white/5 hover:border-purple/50 rounded-lg transition-all flex items-center gap-2">
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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[5]" />
    </section>
  );
};

export default HeroSection;