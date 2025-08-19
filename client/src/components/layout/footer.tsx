import React from "react";
import { Link } from "wouter";
import { Twitter, Send, Instagram, Music2 } from "lucide-react";

interface FooterProps {
  isRevealed: boolean;
}

const footerLinks = [
  { title: "Terms", href: "/terms" },
  { title: "Privacy", href: "/privacy" },
];

const Footer: React.FC<FooterProps> = ({ isRevealed }) => {
  return (
    <>
    <footer className="bg-gradient-to-r from-[#181c2f] via-[#1a142e] to-[#181c2f] border-t border-cyan-400/30 pt-6 pb-10 animate-fade-in text-cyan-100 shadow-[0_-2px_24px_#00e8fc22]" role="contentinfo" aria-label="Site Footer">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-0 w-full">
          {/* Left: Mascot + Tagline */}
          <div className="flex items-center justify-center md:justify-start">
            <img 
              src="/assets/usdfg-logo-transparent.png" 
              alt="USDFG Logo" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain mr-3 mascot-glow"
              style={{filter: 'drop-shadow(0 0 10px rgba(0, 232, 252, 0.5))'}} 
              loading="lazy" decoding="async"
            />
            <span className="text-sm text-cyan-400 font-medium whitespace-nowrap">
                USDFGaming — The Last Great Token for Gamers.
              </span>
          </div>

            {/* Center: Social Icons */}
            <div className="flex items-center justify-center gap-6 mt-4 text-cyan-300">
              <a href="https://twitter.com/USDFGAMING" target="_blank" rel="noopener noreferrer" className="twitter-hover flex items-center gap-2 cursor-pointer" aria-label="Follow us on Twitter">
                <Twitter size={18} />
                <span>Twitter</span>
              </a>
              <a href="https://t.me/+TPjhAyJiAF9mZTI0" target="_blank" rel="noopener noreferrer" className="telegram-hover flex items-center gap-2 cursor-pointer" aria-label="Join us on Telegram">
                <Send size={18} />
                <span>Telegram</span>
              </a>
              <a href="https://instagram.com/usdfgaming" target="_blank" rel="noopener noreferrer" className="instagram-hover flex items-center gap-2 cursor-pointer" aria-label="Follow us on Instagram">
                <Instagram size={18} />
                <span>Instagram</span>
              </a>
              <a href="https://www.tiktok.com/@usdfgames" target="_blank" rel="noopener noreferrer" className="tiktok-hover flex items-center gap-2 cursor-pointer" aria-label="Follow us on TikTok">
                <Music2 size={18} />
                <span>TikTok</span>
              </a>
            </div>

          {/* Right: Footer Links (reveal) */}
            <nav className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-end gap-3 md:gap-3 overflow-x-auto md:overflow-visible opacity-100 transition-opacity duration-700">
              {footerLinks.map((link, index) => (
                <div key={index} className="whitespace-nowrap">
                  <Link
                    href={link.href}
                    className="text-sm sm:text-base font-medium hover:text-primary transition-colors duration-200 block"
                  >
                    {link.title}
                  </Link>
                </div>
              ))}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-cyan-400 hover:text-cyan-300 text-sm transition duration-200 underline whitespace-nowrap"
                type="button"
                aria-label="Back to Top"
              >
                Back to Top ↑
              </button>
            </nav>
        </div>

          {/* Copyright */}
          <div className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
            © 2025 USDFG.PRO — All rights reserved. This platform is proprietary. Built for the relentless. Proven by performance.
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Need help? Contact <a href="mailto:support@usdfg.pro" className="underline">support@usdfg.pro</a>
          </p>
        </div>
      </footer>
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#111',
        color: '#FFD700',
        fontSize: '0.95rem',
        fontWeight: 500,
        textAlign: 'center',
        padding: '0.5rem 0.75rem',
        zIndex: 50,
        borderTop: '2px solid #222',
        letterSpacing: '0.01em',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)'
      }}>
        <span style={{marginRight: 8, fontWeight: 700}} role="img" aria-label="lock">🔒</span>
        USDFG is a skill-based competition platform. No gambling. No house. No custodial accounts. Just your wallet, and your skill.
      </div>
    </>
  );
};

export default Footer;
