import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const MASCOT_WEBP = "/assets/usdfg-mascot-trophy-illustration.webp";
const MASCOT_PNG  = "/assets/usdfg-mascot-trophy-illustration.png";
// Last-resort absolute URL (works regardless of base path issues)
const MASCOT_ABS  = "https://tangerine-valkyrie-b2552f.netlify.app/assets/usdfg-mascot-trophy-illustration.webp";

interface HeroSectionProps {
  onExploreClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick }) => {
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
    <section className="hero relative py-8 lg:py-12 overflow-hidden bg-[#07080C]">
      <div className="container mx-auto px-3">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left copy */}
          <div className="lg:w-1/2 mb-4 lg:mb-0 text-center lg:text-left">
            <div
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-amber-300"
              style={{ textShadow: "0 0 20px rgba(251, 191, 36, 0.5)" }}
            >
USDFG
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              <span className="text-white">GAME. EARN. </span>
              <span className="text-amber-300" style={{ textShadow: "0 0 20px rgba(251, 191, 36, 0.5)" }}>
                CONQUER.
              </span>
            </h1>

            <p className="text-sm md:text-base mb-4 max-w-xl text-neutral-300">
              USDFG wasn't built for everyone.<br />
              It was built for the ones who don't blink.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-2">
              <button
                onClick={onExploreClick}
                className="elite-btn neocore-button w-full sm:w-auto px-4 py-2 text-sm md:text-base text-amber-300 hover:text-amber-200"
              >
                EXPLORE PLATFORM
              </button>

              <Link to="/whitepaper">
                <button
                  className="elite-btn neocore-button w-full sm:w-auto px-4 py-2 text-sm md:text-base text-amber-300 hover:text-amber-200"
                >
                  WHITEPAPER
                </button>
              </Link>
            </div>
          </div>

          {/* Right mascot */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div ref={mascotRef} className="relative w-44 h-44 md:w-64 md:h-64 lg:w-80 lg:h-80">
              <picture>
                <source srcSet={MASCOT_WEBP} type="image/webp" />
                <img
                  ref={imgRef}
                  src={MASCOT_PNG}
                  alt="USDFG mascot holding trophy - skill-based gaming rewards"
                  loading="eager"
                  decoding="async"
                  onError={handleImgError}
                  className="w-44 h-44 md:w-64 md:h-64 lg:w-80 lg:h-80 max-w-full object-contain"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
