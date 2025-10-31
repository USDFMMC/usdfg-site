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
    <section className="hero relative py-12 lg:py-20 overflow-hidden">
      {/* Removed particles-container - using StarBackground */}
        <div className="container mx-auto px-2 relative z-10">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left copy */}
          <div className="lg:w-1/2 mb-6 lg:mb-0 text-center lg:text-left">
            <div
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2"
              style={{ color: "var(--secondary-color)", textShadow: "var(--neon-glow)" }}
            >
USDFG
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              <span className="text-white">GAME. EARN. </span>
              <span className="conquer-glow" style={{ color: "var(--accent-color)" }}>
                CONQUER.
              </span>
            </h1>

            <p className="text-sm md:text-base mb-4 max-w-xl" style={{ color: "var(--text-light)" }}>
              USDFG wasn't built for everyone.<br />
              It was built for the ones who don't blink.<br />
              Compete. Earn. Walk away with the token — if you can.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-2">
              <a href="#platform">
                <Button
                  className="w-full sm:w-auto px-4 py-2 transition-all btn-animation"
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
                  className="w-full sm:w-auto px-4 py-2 transition-all btn-animation border border-amber-400/50 text-white font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-125 hover:scale-105"
                  style={{ boxShadow: "0 0 16px #00e8fc99, 0 0 4px #fff1", fontWeight: 700 }}
                >
                  WHITEPAPER
                </Button>
              </Link>
            </div>
          </div>

          {/* Right mascot */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div ref={mascotRef} className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80">
              <picture>
                <source srcSet={MASCOT_WEBP} type="image/webp" />
                <img
                  ref={imgRef}
                  src={MASCOT_PNG}
                  alt="USDFG mascot holding trophy - skill-based gaming rewards"
                  loading="eager"
                  decoding="async"
                  onError={handleImgError}
                  className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 max-w-full object-contain"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .conquer-glow { text-shadow: 0 0 8px #ff005c; }
      `}</style>
    </section>
  );
};

export default HeroSection;
