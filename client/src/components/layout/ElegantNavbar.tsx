import React from 'react';
import { Link } from 'react-router-dom';

interface ElegantNavbarProps {
  children?: React.ReactNode;
}

const ElegantNavbar: React.FC<ElegantNavbarProps> = ({ children }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/20 shadow-[0_2px_24px_rgba(0,232,252,0.1)] backdrop-blur-md bg-black/80">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group"
            title="Built for the ones who don't blink."
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <span className="text-black font-bold text-lg">🎮</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 bg-clip-text text-transparent font-extrabold text-xl tracking-wide">
              USDFG
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-white/80 hover:text-cyan-400 transition-colors duration-300 font-medium relative group"
            >
              Home
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link 
              to="/app" 
              className="text-white/80 hover:text-cyan-400 transition-colors duration-300 font-medium relative group"
            >
              Arena
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link 
              to="/whitepaper" 
              className="text-white/80 hover:text-cyan-400 transition-colors duration-300 font-medium relative group"
            >
              Whitepaper
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 group-hover:w-full transition-all duration-300"></div>
            </Link>
          </nav>

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
