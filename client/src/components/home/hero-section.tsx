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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(bgRef.current, { scale: 1.2, opacity: 0 });
      gsap.set([badgeRef.current, brandRef.current, headlineRef.current, subRef.current, buttonsRef.current], {
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
        .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3");

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

  return (
    <section ref={sectionRef} className="hero relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-transparent">
      {/* Background Image - Hero (static like Kimi; no reveal animation) */}
      <div ref={bgRef} className="absolute inset-0 z-[1]" style={{ willChange: "transform" }}>
        <img
          src="/hero-bg.jpg"
          alt="Esports Arena"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-kimi-purple-tint-10" />
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

            <div
              ref={brandRef}
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-white"
              style={{ textShadow: "0 0 20px rgba(255, 255, 255, 0.3)" }}
            >
              USDFG
            </div>

            <h1 ref={headlineRef} className="neocore-h1 mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight">
              <span className="block">
                <span className="text-white">GAME. </span>
                <span
                  className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent"
                  style={{
                    textShadow: "0 0 20px rgba(74, 222, 128, 0.4)",
                    filter: "drop-shadow(0 0 8px rgba(74, 222, 128, 0.3))",
                  }}
                >
                  EARN.
                </span>
              </span>
              <span
                className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
                style={{
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
                }}
              >
                CONQUER.
              </span>
            </h1>

            <p ref={subRef} className="neocore-body mb-4 max-w-2xl text-lg sm:text-xl text-white/70 leading-relaxed">
              Join the world's premier esports crypto ecosystem. Challenge
              players, manage tournaments, and turn your skill into rewards. The
              arena awaits your arrival.
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row justify-start gap-4">
              <button
                onClick={onExploreClick}
                className="relative font-semibold text-base px-8 py-6 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-white border-0 overflow-hidden group rounded-lg transition-all"
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
                <button className="font-semibold text-base px-8 py-6 border-2 border-purple-500/50 text-white hover:bg-purple-500/20 hover:border-purple-500 rounded-lg transition-all flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[5]" />

      {/* Floating Orbs - Kimi Exact */}
      <div
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] animate-pulse-glow-kimi"
        style={{ background: "var(--kimi-purple)", opacity: 0.25 }}
      />
      <div
        className="absolute bottom-1/3 right-1/3 w-48 h-48 rounded-full blur-[80px] animate-pulse-glow-kimi"
        style={{
          background: "var(--kimi-orange)",
          opacity: 0.15,
          animationDelay: "1s",
        }}
      />
    </section>
  );
};

export default HeroSection;