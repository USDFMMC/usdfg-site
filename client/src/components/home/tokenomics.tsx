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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
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

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(headingRef.current, { opacity: 0, y: 30 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 20 });
      gsap.set(cardsRef.current, { opacity: 0, y: 40 });
      gsap.set(infoRef.current, { opacity: 0, y: 20 });

      // Entrance timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(headingRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .to(
          subtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .to(
          cardsRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
          },
          '-=0.4'
        )
        .to(
          infoRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
          },
          '-=0.6'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

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
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <h2
          ref={headingRef}
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white"
          style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}
        >
          <span
            className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
            style={{
              textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
              filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))",
            }}
          >
            TOKENOMICS
          </span>
        </h2>
        <p
          ref={subtitleRef}
          className="text-base md:text-lg text-white/70 mb-8 lg:mb-12 max-w-xl mx-auto leading-relaxed"
        >
          USDFG Token allocation structure for platform access and utility.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto mb-8 lg:mb-12">
          <div
            ref={(el) => {
              if (el) cardsRef.current[0] = el;
            }}
            className="relative bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 lg:p-6 text-center animate-float-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
            onMouseEnter={handleHover(65, setVal1, 0)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gradient glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative z-10">
              <p
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 animate-pulse-soft"
                style={{
                  background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))",
                }}
              >
                {val1}%
              </p>
              <p className="text-base lg:text-lg font-bold text-white/90">Public Trading</p>
            </div>
          </div>
          <div
            ref={(el) => {
              if (el) cardsRef.current[1] = el;
            }}
            className="relative bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 lg:p-6 text-center animate-float-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
            style={{ animationDelay: '0.1s' }}
            onMouseEnter={handleHover(15, setVal2, 1)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative z-10">
              <p
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 animate-pulse-soft"
                style={{
                  background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))",
                }}
              >
                {val2}%
              </p>
              <p className="text-base lg:text-lg font-bold text-white/90">Core Reserve</p>
            </div>
          </div>
          <div
            ref={(el) => {
              if (el) cardsRef.current[2] = el;
            }}
            className="relative bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 lg:p-6 text-center animate-float-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
            style={{ animationDelay: '0.2s' }}
            onMouseEnter={handleHover(10, setVal3, 2)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative z-10">
              <p
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 animate-pulse-soft"
                style={{
                  background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))",
                }}
              >
                {val3}%
              </p>
              <p className="text-base lg:text-lg font-bold text-white/90">Development & Operations</p>
            </div>
          </div>
          <div
            ref={(el) => {
              if (el) cardsRef.current[3] = el;
            }}
            className="relative bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 lg:p-6 text-center animate-float-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:border-purple-500/50 hover:bg-black/60"
            style={{ animationDelay: '0.3s' }}
            onMouseEnter={handleHover(10, setVal4, 3)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative z-10">
              <p
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 animate-pulse-soft"
                style={{
                  background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))",
                }}
              >
                {val4}%
              </p>
              <p className="text-base lg:text-lg font-bold text-white/90">Player Rewards & Challenges</p>
            </div>
          </div>
        </div>
        <div
          ref={infoRef}
          className="text-center mt-6 lg:mt-8 max-w-2xl mx-auto"
        >
          <h3
            className="text-lg lg:text-xl font-bold mb-3 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
            style={{
              textShadow: "0 0 20px rgba(251, 191, 36, 0.3)",
              filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.2))",
            }}
          >
            Token Utility and Supply
          </h3>
          <p className="text-white/70 text-sm md:text-base leading-relaxed">USDFG has a fixed supply of 21,000,000 tokens. No inflation. No dilution. No burning.</p>
          <p className="text-white/70 text-sm md:text-base mt-2 leading-relaxed">USDFG is used for access, skill based gameplay, and challenge participation inside the platform.</p>
          <p className="text-white/70 text-sm md:text-base mt-2 leading-relaxed">USDFG is not a gambling product. No randomness. No house. No custodial accounts. Just your wallet and your verified results.</p>
          <p className="text-white/70 text-sm md:text-base mt-2 leading-relaxed">No income, interest, or financial benefit is promised or implied. This is not financial advice.</p>
        </div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <style>{`
        @keyframes floatSoft {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
        .animate-float-soft {
          animation: floatSoft 3.2s ease-in-out infinite;
        }
        @keyframes pulseSoft {
          0% { text-shadow: 0 0 8px rgba(251, 191, 36, 0.3); }
          50% { text-shadow: 0 0 16px rgba(251, 191, 36, 0.6); }
          100% { text-shadow: 0 0 8px rgba(251, 191, 36, 0.3); }
        }
        .animate-pulse-soft {
          animation: pulseSoft 2.2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default Tokenomics;
