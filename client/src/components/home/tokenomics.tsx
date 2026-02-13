import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Tokenomics: React.FC = () => {
  // Count-up states
  const [val1, setVal1] = useState(0);
  const [val2, setVal2] = useState(0);
  const [val3, setVal3] = useState(0);
  const [val4, setVal4] = useState(0);
  const animRefs = useRef<(number | null)[]>([null, null, null, null]);
  const hasAnimated = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Count-up animation function
  const animateCount = (target: number, setter: (v: number) => void, duration = 1000, idx?: number) => {
    let startTime: number | undefined;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setter(Math.floor(progress * target));
      if (progress < 1) {
        if (typeof idx === 'number') animRefs.current[idx] = requestAnimationFrame(animate);
      } else {
        setter(target);
      }
    };
    return animate;
  };

  // Scroll-in animation (only once) - for count-up
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          requestAnimationFrame(animateCount(65, setVal1, 1000, 0));
          requestAnimationFrame(animateCount(15, setVal2, 1000, 1));
          requestAnimationFrame(animateCount(10, setVal3, 1000, 2));
          requestAnimationFrame(animateCount(10, setVal4, 1000, 3));
        }
      });
    };
    const observer = new window.IntersectionObserver(handleIntersect, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // GSAP section choreography (Kimi preset)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll(".token-card");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      // 1) Section wrapper
      tl.fromTo(
        wrapperRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      // 2) Heading
      tl.fromTo(
        headingRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      );

      // 3) Subheading / paragraph
      tl.fromTo(
        subRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        ">-0.72"
      );

      // 4) Grid with stagger (after heading completes)
      if (cards && cards.length) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 80, rotateX: 15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.15,
          },
          ">"
        );
      }

      // Info card after grid
      tl.fromTo(
        infoRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        ">-0.72"
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Hover handlers
  const handleHover = (target: number, setter: (v: number) => void, idx: number) => {
    return () => {
      // Only animate if we're not already at the target value
      if (animRefs.current[idx]) cancelAnimationFrame(animRefs.current[idx] as number);
      requestAnimationFrame(animateCount(target, setter, 1000, idx));
    };
  };

  // Mouse leave handler - keep the final value instead of resetting to 0
  const handleMouseLeave = () => {
    // No need to reset values on mouse leave
  };

  return (
    <section
      ref={sectionRef}
      id="tokenomics"
      className="py-12 lg:py-16 text-center relative overflow-hidden"
    >

      <div ref={wrapperRef} className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <h2 ref={headingRef} className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
          <span className="text-gradient">TOKEN UTILITY &amp; ALLOCATION</span>
        </h2>
        <p ref={subRef} className="font-body text-base md:text-lg text-white/70 mb-8 lg:mb-12 max-w-xl mx-auto leading-relaxed">
          USDFG token allocation for platform access, challenge creation, and participation utility.
        </p>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto mb-8 lg:mb-12">
          <div
            className="token-card relative glass border border-purple/30 rounded-2xl p-4 lg:p-6 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.18)] kimi-bottom-neon"
            style={
              {
                "--neon-color": "rgba(126, 67, 255, 0.25)",
                "--neon-hover-color": "rgba(126, 67, 255, 0.45)",
                animationDelay: "0.05s",
              } as React.CSSProperties
            }
            onMouseEnter={handleHover(65, setVal1, 0)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gradient glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10">
              <p
                className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 text-gradient"
              >
                {val1}%
              </p>
              <p className="font-body text-base lg:text-lg font-bold text-white/90">Public Trading</p>
            </div>
          </div>
          <div
            className="token-card relative glass border border-purple/30 rounded-2xl p-4 lg:p-6 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.18)] kimi-bottom-neon"
            style={
              {
                "--neon-color": "rgba(126, 67, 255, 0.25)",
                "--neon-hover-color": "rgba(126, 67, 255, 0.45)",
                animationDelay: "0.1s",
              } as React.CSSProperties
            }
            onMouseEnter={handleHover(15, setVal2, 1)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10">
              <p
                className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 text-gradient"
              >
                {val2}%
              </p>
              <p className="font-body text-base lg:text-lg font-bold text-white/90">Core Reserve</p>
            </div>
          </div>
          <div
            className="token-card relative glass border border-purple/30 rounded-2xl p-4 lg:p-6 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.18)] kimi-bottom-neon"
            style={
              {
                "--neon-color": "rgba(126, 67, 255, 0.25)",
                "--neon-hover-color": "rgba(126, 67, 255, 0.45)",
                animationDelay: "0.15s",
              } as React.CSSProperties
            }
            onMouseEnter={handleHover(10, setVal3, 2)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10">
              <p
                className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 text-gradient"
              >
                {val3}%
              </p>
              <p className="font-body text-base lg:text-lg font-bold text-white/90">Development &amp; Operations</p>
            </div>
          </div>
          <div
            className="token-card relative glass border border-purple/30 rounded-2xl p-4 lg:p-6 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(126,67,255,0.18)] kimi-bottom-neon"
            style={
              {
                "--neon-color": "rgba(126, 67, 255, 0.25)",
                "--neon-hover-color": "rgba(126, 67, 255, 0.45)",
                animationDelay: "0.2s",
              } as React.CSSProperties
            }
            onMouseEnter={handleHover(10, setVal4, 3)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10">
              <p
                className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 text-gradient"
              >
                {val4}%
              </p>
              <p className="font-body text-base lg:text-lg font-bold text-white/90">Player Rewards &amp; Challenges</p>
            </div>
          </div>
        </div>
        <div
          ref={infoRef}
          className="text-center mt-6 lg:mt-8 max-w-2xl mx-auto glass border border-purple/30 rounded-2xl p-5 lg:p-6"
          style={{ animationDelay: "0.25s" }}
        >
          <h3
            className="font-display text-lg lg:text-xl font-bold mb-3 text-gradient"
          >
            Token Utility and Supply
          </h3>
          <p className="font-body text-white/70 text-sm md:text-base leading-relaxed">USDFG has a fixed supply of 21,000,000 tokens. No inflation. No dilution. No burning.</p>
          <p className="font-body text-white/70 text-sm md:text-base mt-2 leading-relaxed">USDFG is used for platform access, challenge creation, and participation in skill-based competition. Emphasize access and participation—avoid financial return language.</p>
          <p className="font-body text-white/70 text-sm md:text-base mt-2 leading-relaxed">USDFG is not a gambling product. No randomness. No house. No custodial accounts. Just your wallet and your verified results.</p>
          <p className="font-body text-white/70 text-sm md:text-base mt-2 leading-relaxed">No income, interest, or financial benefit is promised or implied. This is not financial advice.</p>
        </div>
      </div>
    </section>
  );
};

export default Tokenomics;
