import React from 'react';
import { Link } from 'react-router-dom';

interface ElegantNavbarProps {
  children?: React.ReactNode;
}

const ElegantNavbar: React.FC<ElegantNavbarProps> = ({ children }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-400/10 shadow-sm backdrop-blur-md bg-black/90">
      <div className="container mx-auto px-4 py-1.5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center group"
            style={{ gap: '4px' }}
            title="Built for the ones who don't blink."
          >
            <div className="relative flex-shrink-0">
                <img 
                src="/assets/usdfgToken2.png" 
                alt="USDFG Logo" 
                  className="w-7 h-7 object-contain transition-transform duration-200 group-hover:scale-105"
                  loading="lazy" decoding="async"
                />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-200"></div>
            </div>
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent font-semibold text-base tracking-tight whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>
              USDFG
            </span>
          </Link>

          {/* Minimal Live Indicator - Compact */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-xs font-medium">Live</span>
            </div>
          </div>

          {/* Right side content */}
          <div className="flex items-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ElegantNavbar;
