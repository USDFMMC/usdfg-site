import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Leaderboard', href: '#leaderboard' },
    { name: 'Games', href: '#games' },
    { name: 'Tokenomics', href: '#tokenomics' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Skip to main content link for accessibility - only visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-full focus:bg-gradient-to-r focus:from-purple-600 focus:to-amber-500 focus:text-white focus:font-bold focus:text-lg focus:shadow-[0_0_24px_rgba(147,51,234,0.6)] transition-all duration-300 focus:outline-none focus:border-2 focus:border-purple-500"
      >
        Skip to main content
      </a>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#0a0215]/90 backdrop-blur-xl border-b border-purple-500/20'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 group"
              onClick={(e) => {
                if (isHomePage) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img 
                src="/assets/usdfgToken2.png" 
                alt="USDFG Logo" 
                className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))" }}
              />
              <span 
                className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-extrabold text-xl tracking-tighter whitespace-nowrap" 
                style={{ 
                  letterSpacing: '-0.02em',
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.3)",
                  filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.2))"
                }}
              >
                USDFG
              </span>
            </Link>

            {/* Desktop Navigation */}
            {isHomePage && (
              <div className="hidden lg:flex items-center gap-6">
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className="relative kimi-font-body font-medium text-sm text-white/70 hover:text-white transition-colors group"
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-amber-500 group-hover:w-full transition-all duration-300" />
                  </button>
                ))}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/app">
                <Button className="relative kimi-font-display font-semibold text-sm bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-white border-0 overflow-hidden group">
                  <span className="relative z-10">Enter the Arena</span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div className="absolute top-20 left-0 right-0 p-6">
          <div className="flex flex-col gap-4">
            {isHomePage && navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href)}
                className="kimi-font-display font-semibold text-2xl text-white/80 hover:text-white text-left py-3 border-b border-purple-500/20"
              >
                {link.name}
              </button>
            ))}
            <div className="flex flex-col gap-3 mt-6">
              <Link to="/app" className="w-full">
                <Button className="w-full kimi-font-display font-semibold bg-gradient-to-r from-purple-600 to-amber-500 text-white">
                  Enter the Arena
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
