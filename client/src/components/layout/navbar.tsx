import React, { useState } from "react";
import { Link } from "wouter";
import { X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link absolute left-2 top-2 z-[100] px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 text-black font-bold text-lg shadow-[0_0_24px_#22d3ee99] focus:opacity-100 focus:translate-y-0 opacity-0 -translate-y-10 transition-all duration-300 outline-none border-2 border-cyan-400"
        tabIndex={0}
      >
        Skip to main content
      </a>
      <header className="sticky top-0 bg-gradient-to-r from-[#181c2f] via-[#1a142e] to-[#181c2f] bg-opacity-95 backdrop-blur-md z-50 border-b border-cyan-400/30 shadow-[0_2px_24px_#00e8fc22]">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center navbar-brand" title="Built for the ones who don't blink.">
            <img 
              src="/assets/usdfg-logo-transparent.png" 
              alt="USDFG Logo" 
              className="w-10 h-10 object-contain mr-3 mascot-glow"
              style={{filter: 'drop-shadow(0 0 10px rgba(0, 232, 252, 0.5))'}} 
              loading="lazy" decoding="async"
            />
            <span 
              className="bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] text-xl tracking-wide"
            >USDFG</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-primary focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6" role="navigation" aria-label="Main Navigation">
            <Link href="/app">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2 rounded-full font-semibold shadow-[0_0_24px_#a78bfa99] hover:brightness-110 flex items-center gap-2 transition-all duration-200">
                <span role="img" aria-label="controller">🎮</span> Enter the Arena
              </Button>
            </Link>
          </nav>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 bg-[#181c2f]/95 z-50 lg:hidden">
              <div className="container mx-auto px-4 pt-20 pb-8">
                <button
                  onClick={toggleMobileMenu}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
                <nav className="flex flex-col space-y-4">
                  <Link href="/app" onClick={toggleMobileMenu}>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2 rounded-full font-semibold shadow-[0_0_24px_#a78bfa99] hover:brightness-110 flex items-center gap-2 transition-all duration-200">
                      <span role="img" aria-label="controller">🎮</span> Enter the Arena
                    </Button>
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
