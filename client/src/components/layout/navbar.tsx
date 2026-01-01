import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Menu } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/scrollLock";

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [mobileMenuOpen]);

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
          <Link to="/" className="flex items-center space-x-3 group" title="Built for the ones who don't blink.">
            <div className="relative">
              <picture>
                <source srcSet="/assets/usdfg-logo-transparent.webp" type="image/webp" />
                <img 
                  src="/assets/usdfg-logo-transparent.png" 
                  alt="USDFG Logo" 
                  className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                  loading="lazy" decoding="async"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent font-extrabold text-xl tracking-wide">
              USDFG
            </span>
          </Link>

          {/* Mobile "Enter the Arena" Button - Always Visible */}
          <Link to="/app" className="lg:hidden">
            <button className="elite-btn neocore-button px-4 py-2 text-sm text-amber-300 hover:text-amber-200">
              <span role="img" aria-label="controller">🎮</span> Enter Arena
            </button>
          </Link>

          {/* Mobile Menu Button - Hidden (no longer needed but keeping for future links) */}
          <button
            onClick={toggleMobileMenu}
            className="hidden p-2 rounded-md text-muted-foreground hover:text-primary focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6" role="navigation" aria-label="Main Navigation">
            <Link to="/app">
              <button className="elite-btn neocore-button px-5 py-2 text-amber-300 hover:text-amber-200">
                <span role="img" aria-label="controller">🎮</span> Enter the Arena
              </button>
            </Link>
          </nav>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 bg-black/95 z-50 lg:hidden">
              <div className="container mx-auto px-4 pt-20 pb-8">
                <button
                  onClick={toggleMobileMenu}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
                <nav className="flex flex-col space-y-4">
                  <Link to="/app" onClick={toggleMobileMenu}>
                    <button className="elite-btn neocore-button w-full px-5 py-2 text-amber-300 hover:text-amber-200">
                      <span role="img" aria-label="controller">🎮</span> Enter the Arena
                    </button>
                  </Link>
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Navbar;
