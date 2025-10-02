import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const CTASection: React.FC = () => {
  const ctaRef = useScrollFadeIn<HTMLDivElement>();
  const founderRef = useRef<HTMLParagraphElement>(null);
  const [founderVisible, setFounderVisible] = useState(false);

  useEffect(() => {
    const node = founderRef.current;
    if (!node) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFounderVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 bg-gradient-to-r from-card to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Enter the Challenge Image - Pro-level polish */}
          <section className="flex flex-col items-center py-14 px-4">
            <div className="flex justify-center mb-8 relative w-full" style={{ alignItems: 'center', minHeight: '340px' }}>
              <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-0">
                <div className="glow-behind pulse-glow" style={{ width: '80%', height: '80%' }} />
              </div>
              <div className="relative rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
                <img
                  src="/assets/usdfg-enter-the-challenge-arcade.webp"
                  alt="USDFG Mascot Entering the Challenge Arena"
                  className="w-full max-w-3xl rounded-xl premium-float"
                  style={{ display: 'block', margin: '0 auto' }}
                  loading="lazy" decoding="async"
                />
              </div>
            </div>
            <p className="text-center text-sm text-neutral-400 mt-2 italic animate-glow">
              Step in. Only the skilled walk out.
            </p>
          </section>
          <p className="text-center text-lg text-white font-semibold mt-12">
            Ready to <span className="text-purple-400">Game</span>, <span className="text-blue-400">Earn</span>, and <span className="text-purple-400">Conquer</span>?
          </p>
          <Link to="/app" className="flex justify-center">
            <button className="mt-4 px-6 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 text-black rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/60">
              Enter the Arena →
            </button>
          </Link>
          <div className="flex justify-center mt-8">
            <div className="relative max-w-2xl w-full">
              <div className="absolute inset-0 rounded-xl blur-2xl bg-gradient-to-r from-cyan-400/10 via-purple-500/10 to-cyan-400/10 z-0" style={{ filter: 'blur(24px)' }} />
              <blockquote className="relative z-10 text-center text-neutral-300 italic font-medium px-4 py-6">
                "I built USDFG to reward the ones who never begged for a seat. No mercy. No reruns. If you're waiting for permission, you already lost."
                <br />
                <span className="block mt-2 text-xs text-neutral-500">— Hussein A.</span>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
