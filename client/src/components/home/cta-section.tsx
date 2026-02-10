import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const CTASection: React.FC = () => {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden py-20">
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Kimi badge: glass pill with icon + text */}
          <div data-kimi-scroll className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass rounded-full border border-purple/30 kimi-scroll kimi-delay-0">
            <Sparkles className="w-4 h-4 shrink-0 text-orange" aria-hidden />
            <span className="kimi-font-body text-sm text-white/80">
              Your Journey Begins Now
            </span>
          </div>

          {/* Kimi headline: font-display, gradient on second line */}
          <h2 data-kimi-scroll className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight mb-6 kimi-scroll kimi-delay-1">
            <span className="block">Ready to enter</span>
            <span className="block mt-1 text-gradient">
              the arena?
            </span>
          </h2>

          {/* Kimi supporting copy */}
          <p data-kimi-scroll className="font-body text-white/80 text-lg mb-8 max-w-2xl mx-auto kimi-scroll kimi-delay-2">
            Compete through skill. Earn verified rewards. Join the skill-based
            competition platform built for performance.
          </p>

          {/* Kimi CTAs: Enter the Arena (gradient) + Learn More (outline) */}
          <div data-kimi-scroll className="flex flex-wrap items-center justify-center gap-4 mb-8 kimi-scroll kimi-delay-3">
            <Link to="/app" className="inline-block">
              <button className="relative font-semibold text-base uppercase tracking-wide px-8 py-4 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group rounded-lg transition-all kimi-font-body">
                <span className="relative z-10 flex items-center gap-2">
                  Enter the Arena
                  <span
                    className="group-hover:translate-x-0.5 transition-transform"
                    aria-hidden
                  >
                    →
                  </span>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </Link>
            <Link to="/whitepaper">
              <button
                type="button"
                className="font-body font-semibold text-base uppercase tracking-wide px-8 py-4 rounded-lg border border-white/30 text-white bg-transparent hover:bg-white/10 transition-all"
              >
                Learn More
              </button>
            </Link>
          </div>

          {/* Kimi feature bullets: green dots */}
          <div data-kimi-scroll className="font-body flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-white/80 mb-12 kimi-scroll kimi-delay-4">
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
        <div className="flex justify-center max-w-4xl mx-auto">
          <div
            data-kimi-scroll
            className="relative max-w-2xl w-full glass border border-purple/30 rounded-2xl px-6 lg:px-8 py-6 lg:py-8 transition-all duration-300 kimi-bottom-neon kimi-scroll kimi-delay-5"
            style={
              {
                "--neon-color": "rgba(168, 85, 247, 0.3)",
                "--neon-hover-color": "rgba(168, 85, 247, 0.5)",
              } as React.CSSProperties
            }
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <blockquote className="relative z-10 text-center text-white/80 italic font-medium text-base lg:text-lg leading-relaxed">
              "I built USDFG to reward the ones who never begged for a seat. No
              mercy. No reruns. If you're waiting for permission, you already
              lost."
              <br />
              <span className="block mt-3 text-sm text-white/60">
                — Hussein A.
              </span>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
