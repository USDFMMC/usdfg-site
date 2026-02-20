import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  // Kimi Navigation.tsx behavior: bg + border only after scrolling
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Skip to main content link for accessibility - only visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-full focus:bg-gradient-to-r focus:from-[#7e43ff] focus:to-[#ff7e3e] focus:text-white focus:font-bold focus:text-lg focus:shadow-[0_0_24px_rgba(126,67,255,0.6)] transition-all duration-300 focus:outline-none focus:border-2 focus:border-[#7e43ff]"
      >
        Skip to main content
      </a>
      {/* Kimi-style top navigation (from _kimi src/sections/Navigation.tsx) */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? "bg-void/90 backdrop-blur-xl border-b border-purple/20" : "bg-transparent"
        }`}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 group"
              aria-label="USDFG home"
            >
              <img
                src="/assets/usdfgToken2.png"
                alt="USDFG Logo"
                className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                style={{ filter: "drop-shadow(0 0 8px var(--kimi-purple))" }}
              />
              <span
                className="font-display font-bold text-xl text-white whitespace-nowrap"
                style={{ textShadow: "0 0 20px rgba(126, 67, 255, 0.25)" }}
              >
                USDFG
              </span>
            </Link>

            {/* Primary action */}
            <div className="flex items-center">
              <Link
                to="/app"
                className="relative font-display font-semibold text-sm px-4 py-2 rounded-md bg-gradient-to-r from-purple to-orange hover:from-purple-400 hover:to-orange-400 text-white border-0 overflow-hidden group"
              >
                <span className="relative z-10">Enter Arena</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
