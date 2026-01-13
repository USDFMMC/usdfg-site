import React from 'react';
import { Link } from 'react-router-dom';

interface ElegantNavbarProps {
  children?: React.ReactNode;
}

const ElegantNavbar: React.FC<ElegantNavbarProps> = ({ children }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-400/20 shadow-[0_2px_24px_rgba(251,191,36,0.1)] backdrop-blur-md bg-black/80">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-0.5 group"
            title="Built for the ones who don't blink."
          >
            <div className="relative flex-shrink-0">
              <img 
                src="/assets/usdfgToken2.png" 
                alt="USDFG Logo" 
                className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                loading="lazy" decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent font-extrabold text-xl tracking-tighter whitespace-nowrap -ml-0.5">
              USDFG
            </span>
          </Link>

          {/* Live Stats */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-amber-400">🔥</span>
              <span className="text-sm font-medium">Live Arena</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-green-400">●</span>
              <span className="text-sm font-medium">Active Now</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-blue-400">⚡</span>
              <span className="text-sm font-medium">Real-time</span>
            </div>
          </div>

          {/* Right side content */}
          <div className="flex items-center space-x-4">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ElegantNavbar;
