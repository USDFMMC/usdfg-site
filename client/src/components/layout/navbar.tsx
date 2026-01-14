import React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {

  return (
    <>
      {/* Skip to main content link for accessibility - only visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-full focus:bg-gradient-to-r focus:from-amber-400 focus:via-yellow-500 focus:to-amber-400 focus:text-black focus:font-bold focus:text-lg focus:shadow-[0_0_24px_rgba(251,191,36,0.6)] transition-all duration-300 focus:outline-none focus:border-2 focus:border-amber-400"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-amber-400/20 shadow-[0_2px_24px_rgba(251,191,36,0.1)] backdrop-blur-md bg-black/80">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group" style={{ gap: '2px' }} title="Built for the ones who don't blink.">
            <div className="relative flex-shrink-0">
              <img 
                src="/assets/usdfgToken2.png" 
                alt="USDFG Logo" 
                className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                loading="lazy" decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent font-extrabold text-xl tracking-tighter whitespace-nowrap" style={{ marginLeft: '-2px', letterSpacing: '-0.02em' }}>
              USDFG
            </span>
          </Link>

          {/* Navigation - "Enter the Arena" Button */}
          <nav className="flex items-center space-x-6" role="navigation" aria-label="Main Navigation">
            <Link to="/app">
              <button className="elite-btn neocore-button px-4 py-2 text-sm lg:px-5 lg:py-2 text-amber-300 hover:text-amber-200">
                <span role="img" aria-label="controller">🎮</span> <span className="hidden sm:inline">Enter the Arena</span><span className="sm:hidden">Enter Arena</span>
              </button>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Navbar;
