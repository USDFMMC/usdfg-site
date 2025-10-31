import React from "react";
import { Link } from "react-router-dom";

const AboutSection: React.FC = () => {
  return (
    <section id="about-usdfg" className="relative flex justify-center items-center min-h-[70vh] px-2 py-16 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/50 to-black/80"></div>
      
      {/* Mascot Echo Watermark with enhanced glow */}
      <picture>
        <source srcSet="/assets/usdfg-mascot-trophy-illustration.webp" type="image/webp" />
        <img
          src="/assets/usdfg-mascot-trophy-illustration.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-10 pointer-events-none select-none z-0 filter blur-[2px]"
          style={{ top: 0, left: 0 }}
          loading="lazy" decoding="async"
        />
      </picture>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        <div className="relative w-full max-w-4xl mx-auto px-6 py-8 rounded-lg bg-gradient-to-br from-white/10 to-amber-900/20 border border-amber-400/30 shadow-[0_0_30px_rgba(255,215,130,0.15)] backdrop-blur-md flex flex-col items-center group transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,215,130,0.2)]">
          {/* Radial glow effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-radial from-amber-400/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 w-full flex flex-col items-center text-center space-y-8">
            <h2 className="text-3xl font-bold text-center mb-4">What is <span className="text-amber-400">USDFG?</span></h2>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-lg text-center mb-4 font-bold">
                USDFG is the access token for a decentralized competition platform—built for those who outperform, not those who get lucky.
              </p>
              <p className="text-base text-center mb-4">
                <strong>No gambling. No randomness. Only verified performance.</strong>
              </p>
              <p className="text-base text-center mb-4">
                Every challenge is <span className="text-amber-400 font-medium">merit-based</span>, and every reward is <span className="text-amber-400 font-medium">earned</span>.<br/>
                USDFG exists to reward skill—not speculation.
              </p>
              <p className="text-base text-center mb-4">
                This isn't a passive asset. It's a <strong>competitive layer for digital performance</strong>, tied to strategy, execution, and outcome.
              </p>
              <p className="text-base text-center mb-4">
                <strong>Fixed supply.</strong> No inflation. No hidden mechanics. Just a clean contract and a clear goal: <span className="text-amber-400 font-medium">reward performance</span>.
              </p>
              <p className="text-base text-center mt-6 font-bold">
                USDFG is for players who win on skill—nothing else.<br/>
                If that's you, step forward. The next challenge awaits.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced animation keyframes */}
      <style>{`
        .fade-in {
          opacity: 0;
          transform: translateY(24px);
          animation-name: fadeInUp;
        }
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: none;
          }
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 6px rgba(255,215,130,0.6));
        }
        .neon-pulse {
          box-shadow: 0 0 16px #00ffff, 0 0 32px #00ffff44;
          transition: box-shadow 0.3s, background 0.3s;
        }
        .group:hover .neon-pulse {
          box-shadow: 0 0 32px #00ffff, 0 0 64px #00ffff99;
          background: #22d3ee;
        }
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </section>
  );
};

export default AboutSection;
