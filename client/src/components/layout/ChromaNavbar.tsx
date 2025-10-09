import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

interface ChromaNavbarProps {
  children?: React.ReactNode;
}

const ChromaNavbar: React.FC<ChromaNavbarProps> = ({ children }) => {
  const navbarRef = useRef<HTMLElement>(null);
  const setX = useRef<((v: number) => void) | null>(null);
  const setY = useRef<((v: number) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = navbarRef.current;
    if (!el) return;
    
    setX.current = gsap.quickSetter(el, '--x', 'px');
    setY.current = gsap.quickSetter(el, '--y', 'px');
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: 0.3,
      ease: "power2.out",
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const r = navbarRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const handleLeave = () => {
    const el = navbarRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    moveTo(width / 2, height / 2);
  };

  return (
    <header
      ref={navbarRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="sticky top-0 z-50 border-b border-cyan-400/30 shadow-[0_2px_24px_#00e8fc22] backdrop-blur-md"
      style={
        {
          '--r': '200px',
          '--x': '50%',
          '--y': '50%',
          background: 'linear-gradient(145deg, #1a142e, #181c2f, #0c1222)',
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 70%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 70%, black 100%)'
        } as React.CSSProperties
      }
    >
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
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 bg-clip-text text-transparent font-extrabold text-xl tracking-wide drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
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

export default ChromaNavbar;
