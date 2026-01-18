import React from 'react';
import { Link } from 'react-router-dom';

interface ElegantNavbarProps {
  children?: React.ReactNode;
}

const ElegantNavbar: React.FC<ElegantNavbarProps> = ({ children }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-400/5 backdrop-blur-md bg-black/95">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between">
          {/* Logo - Ultra Compact */}
          <Link 
            to="/" 
            className="flex items-center group"
            style={{ gap: '3px' }}
            title="Built for the ones who don't blink."
          >
            <div className="relative flex-shrink-0">
                <img 
                src="/assets/usdfgToken2.png" 
                alt="USDFG Logo" 
                  className="w-6 h-6 object-contain transition-transform duration-150 group-hover:scale-105"
                  loading="lazy" decoding="async"
                />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 rounded blur-sm opacity-0 group-hover:opacity-20 transition-opacity duration-150"></div>
            </div>
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent font-medium text-sm tracking-tight whitespace-nowrap" style={{ letterSpacing: '-0.015em' }}>
              USDFG
            </span>
          </Link>

          {/* Minimal Live Indicator - Ultra Compact */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center gap-1 text-white/50">
              <span className="w-1 h-1 rounded-full bg-green-400"></span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Right side content */}
          <div className="flex items-center gap-2">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ElegantNavbar;
