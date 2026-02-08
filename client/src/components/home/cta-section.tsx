import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CTASection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(taglineRef.current, { opacity: 0, y: 12 });
      gsap.set(headingRef.current, { opacity: 0, y: 12 });
      gsap.set(buttonRef.current, { opacity: 0, y: 8, scale: 0.98 });
      gsap.set(quoteRef.current, { opacity: 0, y: 12, scale: 0.99 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      });

      tl.to(taglineRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
        .to(buttonRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }, '-=0.5')
        .to(quoteRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power2.out' }, '-=0.4');
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden py-20"
    >

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20" style={{ willChange: "transform" }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Kimi badge: glass pill with icon + text */}
          <div
            ref={taglineRef}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 kimi-glass rounded-full border border-purple-500/30"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" aria-hidden />
            <span className="kimi-font-body text-sm text-white/80">Your Journey Begins Now</span>
          </div>

          {/* Kimi headline: font-display, gradient on second line */}
          <h2
            ref={headingRef}
            className="kimi-font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight mb-6"
          >
            <span className="block">Ready to enter</span>
            <span className="block mt-1" style={{ 
              background: "linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
              filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))"
            }}>the arena?</span>
          </h2>

          {/* Kimi supporting copy */}
          <p className="kimi-font-body text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join elite gamers competing for glory and fortune. The arena is waiting for your arrival.
          </p>

          {/* Kimi CTAs: Enter the Arena (gradient) + Learn More (outline) */}
          <div ref={buttonRef} className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Link to="/app" className="inline-block">
              <button className="relative font-semibold text-base uppercase tracking-wide px-8 py-4 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group rounded-lg transition-all kimi-font-body">
                <span className="relative z-10 flex items-center gap-2">
                  Enter the Arena
                  <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </Link>
            <Link to="/whitepaper">
              <button type="button" className="kimi-font-body font-semibold text-base uppercase tracking-wide px-8 py-4 rounded-lg border border-white/30 text-white bg-transparent hover:bg-white/10 transition-all">
                Learn More
              </button>
            </Link>
          </div>

          {/* Kimi feature bullets: green dots */}
          <div className="kimi-font-body flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-white/80 mb-12">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" aria-hidden />
              Free to Join
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" aria-hidden />
              Instant Rewards
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" aria-hidden />
              24/7 Support
            </span>
          </div>
        </div>
      </div>

      {/* Quote card below Kimi block */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div ref={quoteRef} className="flex justify-center max-w-4xl mx-auto">
            <div className="relative max-w-2xl w-full bg-black/40 backdrop-blur-sm rounded-lg px-6 lg:px-8 py-6 lg:py-8 transition-all duration-300 kimi-bottom-neon" style={{ 
              '--neon-color': 'rgba(168, 85, 247, 0.3)',
              '--neon-hover-color': 'rgba(168, 85, 247, 0.5)',
            } as React.CSSProperties}>
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
              <blockquote className="relative z-10 text-center text-white/80 italic font-medium text-base lg:text-lg leading-relaxed">
                "I built USDFG to reward the ones who never begged for a seat. No mercy. No reruns. If you're waiting for permission, you already lost."
                <br />
                <span className="block mt-3 text-sm text-white/60">— Hussein A.</span>
              </blockquote>
            </div>
          </div>
      </div>
    </section>
  );
};

export default CTASection;
