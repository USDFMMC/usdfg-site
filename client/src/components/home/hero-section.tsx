import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const MASCOT_WEBP = "/assets/usdfg-mascot-trophy-illustration.webp";
const MASCOT_PNG  = "/assets/usdfg-mascot-trophy-illustration.png";
// Last-resort absolute URL (works regardless of base path issues)
const MASCOT_ABS  = "https://tangerine-valkyrie-b2552f.netlify.app/assets/usdfg-mascot-trophy-illustration.webp";

const HeroSection: React.FC = () => {
  // Removed redundant hero particles - using StarBackground instead

  const mascotRef = useScrollFadeIn<HTMLDivElement>();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleImgError = () => {
    if (!imgRef.current) return;
    const tried = imgRef.current.getAttribute("data-tried") || "";
    if (!tried.includes("png")) {
      imgRef.current.src = MASCOT_PNG;                     // 1st fallback: PNG in /public/assets
      imgRef.current.setAttribute("data-tried", tried + " png");
    } else if (!tried.includes("abs")) {
      imgRef.current.src = MASCOT_ABS;                     // 2nd fallback: absolute URL
      imgRef.current.setAttribute("data-tried", tried + " abs");
    }
  };

  return (
    <section className="hero relative py-20 lg:py-32 overflow-hidden">
      {/* Removed particles-container - using StarBackground */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left copy */}
          <div className="lg:w-1/2 mb-12 lg:mb-0 text-center lg:text-left">
            <div
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: "var(--secondary-color)", textShadow: "var(--neon-glow)" }}
            >
USDFG
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">GAME. EARN. </span>
              <span className="conquer-glow" style={{ color: "var(--accent-color)" }}>
                CONQUER.
              </span>
            </h1>

            <p className="text-lg md:text-xl mb-8 max-w-xl" style={{ color: "var(--text-light)" }}>
              USDFG wasn't built for everyone.<br />
              It was built for the ones who don't blink.<br />
              Compete. Earn. Walk away with the token — if you can.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <a href="#platform">
                <Button
                  className="w-full sm:w-auto px-6 py-5 transition-all btn-animation"
                  style={{
                    background: "var(--primary-color)",
                    color: "var(--text-light)",
                    boxShadow: "var(--primary-glow)",
                  }}
                >
                  EXPLORE PLATFORM
                </Button>
              </a>

              <Link to="/whitepaper">
                <Button
                  className="w-full sm:w-auto px-6 py-5 transition-all btn-animation border-2 border-cyan-400 text-white font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:brightness-125 hover:scale-105"
                  style={{ boxShadow: "0 0 16px #00e8fc99, 0 0 4px #fff1", fontWeight: 700 }}
                >
                  WHITEPAPER
                </Button>
              </Link>
            </div>
          </div>

          {/* Right mascot */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div ref={mascotRef} className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
              <div className="mascot-glow-pulse absolute inset-0 z-0 pointer-events-none" />
              <picture>
                <source srcSet={MASCOT_WEBP} type="image/webp" />
                <img
                  ref={imgRef}
                  src={MASCOT_PNG}
                  alt="USDFG mascot holding trophy - skill-based gaming rewards"
                  loading="eager"
                  decoding="async"
                  onError={handleImgError}
                  className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 max-w-full object-contain relative z-10 mascot-float"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .conquer-glow { text-shadow: 0 0 16px #ff005c, 0 0 32px #ff005c99, 0 0 2px #fff; }
        .mascot-glow-pulse {
          border-radius: 50%;
          background: radial-gradient(circle, #00e8fc 0%, #00e8fc44 60%, transparent 80%);
          filter: blur(16px);
          opacity: 0.4;
          animation: mascotGlowPulse 2.8s ease-in-out infinite alternate;
        }
        @keyframes mascotGlowPulse { 0% { opacity: .3; filter: blur(12px);} 100% { opacity:.5; filter: blur(22px);} }
        .mascot-float { animation: mascotFloat 4.5s ease-in-out infinite alternate; }
        @keyframes mascotFloat { 0% { transform: translateY(0);} 100% { transform: translateY(-18px);} }
      `}</style>
    </section>
  );
};

export default HeroSection;
