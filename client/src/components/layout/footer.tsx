import React from "react";
import { Link } from "react-router-dom";
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
    <footer className="border-t border-purple-500/20 pt-6 pb-10 animate-fade-in text-white/80 shadow-[0_-2px_24px_rgba(147,51,234,0.15)] relative overflow-hidden" role="contentinfo" aria-label="Site Footer">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-purple-600/5" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-0 w-full">
          {/* Left: Same logo as navbar + Tagline */}
          <div className="flex items-center justify-center md:justify-start">
            <Link to="/" className="flex items-center group flex-shrink-0" style={{ gap: "2px" }} title="Built for the ones who don't blink.">
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
                  marginLeft: "-2px",
                  letterSpacing: "-0.02em",
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.3)",
                  filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.2))",
                }}
              >
                USDFG
              </span>
            </Link>
            <span
              className="text-sm text-white/80 font-medium whitespace-nowrap ml-3"
              style={{
                textShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
              }}
            >
              — The Last Great Token for Gamers.
            </span>
          </div>

            {/* Center: Social Icons */}
            <div className="flex items-center justify-center gap-4 lg:gap-6 mt-4">
              <a 
                href="https://twitter.com/USDFGAMING" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-amber-300 transition-colors duration-200"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 4px rgba(251, 191, 36, 0))";
                }}
                aria-label="Follow us on Twitter"
              >
                <Twitter size={18} />
                <span className="text-sm">Twitter</span>
              </a>
              <a 
                href="https://t.me/+TPjhAyJiAF9mZTI0" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-amber-300 transition-colors duration-200"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 4px rgba(251, 191, 36, 0))";
                }}
                aria-label="Join us on Telegram"
              >
                <Send size={18} />
                <span className="text-sm">Telegram</span>
              </a>
              <a 
                href="https://instagram.com/usdfgaming" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-amber-300 transition-colors duration-200"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 4px rgba(251, 191, 36, 0))";
                }}
                aria-label="Follow us on Instagram"
              >
                <Instagram size={18} />
                <span className="text-sm">Instagram</span>
              </a>
              <a 
                href="https://www.tiktok.com/@usdfgames" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-amber-300 transition-colors duration-200"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 4px rgba(251, 191, 36, 0))";
                }}
                aria-label="Follow us on TikTok"
              >
                <Music2 size={18} />
                <span className="text-sm">TikTok</span>
              </a>
            </div>

          {/* Right: Footer Links (reveal) */}
            <nav className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-end gap-3 md:gap-4 overflow-x-auto md:overflow-visible opacity-100 transition-opacity duration-700">
              {footerLinks.map((link, index) => (
                <div key={index} className="whitespace-nowrap">
                  <Link
                    to={link.href}
                    className="text-sm sm:text-base font-medium text-white/70 hover:text-amber-300 transition-colors duration-200 block"
                    style={{
                      textShadow: "0 0 4px rgba(255, 255, 255, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textShadow = "0 0 8px rgba(251, 191, 36, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textShadow = "0 0 4px rgba(255, 255, 255, 0)";
                    }}
                  >
                    {link.title}
                  </Link>
                </div>
              ))}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-white/70 hover:text-amber-300 text-sm transition duration-200 underline whitespace-nowrap"
                style={{
                  textShadow: "0 0 4px rgba(255, 255, 255, 0)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow = "0 0 8px rgba(251, 191, 36, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = "0 0 4px rgba(255, 255, 255, 0)";
                }}
                type="button"
                aria-label="Back to Top"
              >
                Back to Top ↑
              </button>
            </nav>
        </div>

          {/* Copyright */}
          <div className="text-center text-xs sm:text-sm text-white/60 mt-6 leading-relaxed">
            © 2025 <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent font-semibold">USDFG.PRO</span> — All rights reserved. This platform is proprietary. Built for the relentless. Proven by performance.
          </div>
          <p className="text-xs text-white/50 text-center mt-2 leading-relaxed">
            Need help? Contact <a href="mailto:support@usdfg.pro" className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent hover:underline" style={{ filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))" }}>support@usdfg.pro</a>
          </p>
        </div>
      </footer>
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        color: 'rgba(251, 191, 36, 0.9)',
        fontSize: '0.95rem',
        fontWeight: 500,
        textAlign: 'center',
        padding: '0.5rem 0.75rem',
        zIndex: 50,
        borderTop: '2px solid rgba(147, 51, 234, 0.3)',
        letterSpacing: '0.01em',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
        textShadow: '0 0 8px rgba(251, 191, 36, 0.3)'
      }}>
        <span style={{marginRight: 8, fontWeight: 700}} role="img" aria-label="lock">🔒</span>
        USDFG is a skill-based competition platform. Your wallet, your verified results.
      </div>
    </>
  );
};

export default Footer;
