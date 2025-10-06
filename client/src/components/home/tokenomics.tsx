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
    <section id="tokenomics" className="py-20 text-center" ref={sectionRef}>
      {/* Why Tokenomics Matters Intro */}
      <div className="max-w-2xl mx-auto mb-8 px-6 py-4 rounded-xl bg-gradient-to-br from-white/10 to-[#a78bfa22] border border-purple-700/40 shadow-lg backdrop-blur-md animate-fade-in" style={{ textAlign: 'center' }}>
        <p className="text-lg md:text-xl font-bold text-purple-300 mb-2 drop-shadow-glow">Why Tokenomics Matters</p>
        <p className="text-base md:text-lg text-white/90 font-medium">Transparent tokenomics ensures every USDFG token is allocated for platform access and utility, with no hidden distributions. Our structure is designed for platform integrity and fair access—so you always know exactly how tokens are used within the ecosystem.</p>
      </div>
      <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white" style={{ textShadow: 'var(--primary-glow)' }}>
        TOKENOMICS
      </h2>
      <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
        USDFG Token allocation structure for platform access and utility.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-8">
        <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-[#a78bfa11] to-[#a78bfa22] p-6 text-center shadow-lg animate-float-soft"
          onMouseEnter={handleHover(65, setVal1, 0)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-4xl md:text-5xl font-extrabold text-purple-300 mb-2 animate-pulse-soft">{val1}%</p>
          <p className="text-lg font-bold text-white/90">Public Trading</p>
        </div>
        <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-[#a78bfa11] to-[#a78bfa22] p-6 text-center shadow-lg animate-float-soft"
          onMouseEnter={handleHover(15, setVal2, 1)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-4xl md:text-5xl font-extrabold text-purple-300 mb-2 animate-pulse-soft">{val2}%</p>
          <p className="text-lg font-bold text-white/90">Core Reserve</p>
        </div>
        <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-[#a78bfa11] to-[#a78bfa22] p-6 text-center shadow-lg animate-float-soft"
          onMouseEnter={handleHover(10, setVal3, 2)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-4xl md:text-5xl font-extrabold text-purple-300 mb-2 animate-pulse-soft">{val3}%</p>
          <p className="text-lg font-bold text-white/90">Development & Operations</p>
        </div>
        <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-[#a78bfa11] to-[#a78bfa22] p-6 text-center shadow-lg animate-float-soft"
          onMouseEnter={handleHover(10, setVal4, 3)}
          onMouseLeave={handleMouseLeave}>
          <p className="text-4xl md:text-5xl font-extrabold text-purple-300 mb-2 animate-pulse-soft">{val4}%</p>
          <p className="text-lg font-bold text-white/90">Player Rewards & Challenges</p>
        </div>
      </div>
      <div className="text-center mt-6">
        <p className="text-gray-400 text-sm">USDFG has a fixed supply of 21,000,000 tokens. No inflation. No dilution. No burning. Just hard supply — like it should be.</p>
        <p className="text-gray-400 text-sm mt-2">The percentages shown reflect platform utility allocation only. These are not financial indicators or investment guidance.</p>
        <p className="text-gray-400 text-sm mt-2">USDFG is used strictly for access, skill-based gameplay, and challenge participation within the platform.</p>
        <p className="text-gray-400 text-sm mt-2">No income, interest, or financial benefit is promised or implied. USDFG is not a security.</p>
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
          0% { text-shadow: 0 0 8px #a78bfa44; }
          50% { text-shadow: 0 0 16px #a78bfa99; }
          100% { text-shadow: 0 0 8px #a78bfa44; }
        }
        .animate-pulse-soft {
          animation: pulseSoft 2.2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default Tokenomics;
