import React, { useEffect, useRef, useState } from "react";

const Tokenomics: React.FC = () => {
  // Count-up states
  const [val1, setVal1] = useState(0);
  const [val2, setVal2] = useState(0);
  const [val3, setVal3] = useState(0);
  const [val4, setVal4] = useState(0);
  const animRefs = useRef<(number | null)[]>([null, null, null, null]);
  const hasAnimated = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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

  // Scroll-in animation (only once)
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
    <section id="tokenomics" className="py-12 text-center relative" ref={sectionRef}>
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
        TOKENOMICS
      </h2>
      <p className="text-sm md:text-base text-neutral-400 mb-6 max-w-xl mx-auto">
        USDFG Token allocation structure for platform access and utility.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-w-5xl mx-auto mb-6">
        <div className="neocore-panel rounded-lg p-3 text-center animate-float-soft"
          onMouseEnter={handleHover(65, setVal1, 0)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-3xl md:text-4xl font-extrabold text-amber-300 mb-2 animate-pulse-soft">{val1}%</p>
          <p className="text-base font-bold text-white/90">Public Trading</p>
        </div>
        <div className="neocore-panel rounded-lg p-4 text-center animate-float-soft"
          onMouseEnter={handleHover(15, setVal2, 1)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-3xl md:text-4xl font-extrabold text-amber-300 mb-2 animate-pulse-soft">{val2}%</p>
          <p className="text-base font-bold text-white/90">Core Reserve</p>
        </div>
        <div className="neocore-panel rounded-lg p-4 text-center animate-float-soft"
          onMouseEnter={handleHover(10, setVal3, 2)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-3xl md:text-4xl font-extrabold text-amber-300 mb-2 animate-pulse-soft">{val3}%</p>
          <p className="text-base font-bold text-white/90">Development & Operations</p>
        </div>
        <div className="neocore-panel rounded-lg p-4 text-center animate-float-soft"
          onMouseEnter={handleHover(10, setVal4, 3)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-3xl md:text-4xl font-extrabold text-amber-300 mb-2 animate-pulse-soft">{val4}%</p>
          <p className="text-base font-bold text-white/90">Player Rewards & Challenges</p>
        </div>
      </div>
      <div className="text-center mt-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-amber-300 mb-3">Token Utility and Supply</h3>
        <p className="text-gray-400 text-sm">USDFG has a fixed supply of 21,000,000 tokens. No inflation. No dilution. No burning.</p>
        <p className="text-gray-400 text-sm mt-2">USDFG is used for access, skill based gameplay, and challenge participation inside the platform.</p>
        <p className="text-gray-400 text-sm mt-2">USDFG is not a gambling product. No randomness. No house. No custodial accounts. Just your wallet and your verified results.</p>
        <p className="text-gray-400 text-sm mt-2">No income, interest, or financial benefit is promised or implied. This is not financial advice.</p>
      </div>
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
