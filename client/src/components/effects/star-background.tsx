import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDelay: number;
}

const StarBackground: React.FC = () => {
  const starsContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = starsContainerRef.current;
    if (!container) return;
    
    // Clear existing stars first
    container.innerHTML = '';
    
    const numberOfStars = 40; // Minimal stars for clean performance
    const stars: Star[] = [];
    
    // Generate random stars
    for (let i = 0; i < numberOfStars; i++) {
      stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random(),
        opacity: 0.2 + Math.random() * 0.3,
        animationDelay: Math.random() * 5,
      });
    }
    
    // Create and append star elements
    stars.forEach(star => {
      const starElement = document.createElement('div');
      starElement.classList.add('star');
      
      // Set size class
      if (star.size > 0.8) {
        starElement.classList.add('large');
      } else if (star.size > 0.5) {
        starElement.classList.add('medium');
      }
      
      // Set position
      starElement.style.left = `${star.x}%`;
      starElement.style.top = `${star.y}%`;
      
      // Set opacity
      starElement.style.opacity = star.opacity.toString();
      
      // Add animation with random delay
      starElement.style.animation = `starPulse 3s ease-in-out infinite`;
      starElement.style.animationDelay = `${star.animationDelay}s`;
      
      container.appendChild(starElement);
    });
  }, []);
  
  return (
    <>
      {/* Aurora Gradient Waves */}
      <div className="fixed inset-0 z-[-2] pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" className="absolute w-full h-full">
          <defs>
            <linearGradient id="aurora1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00fff0" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="aurora2" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path d="M0,800 Q960,1000 1920,800 L1920,1080 L0,1080 Z" fill="url(#aurora1)">
            <animate attributeName="d" dur="12s" repeatCount="indefinite"
              values="M0,800 Q960,1000 1920,800 L1920,1080 L0,1080 Z;
                      M0,820 Q960,950 1920,820 L1920,1080 L0,1080 Z;
                      M0,800 Q960,1000 1920,800 L1920,1080 L0,1080 Z" />
          </path>
          {/* Second aurora layer removed for performance */}
        </svg>
      </div>
      {/* Neon Glow Orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden="true">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
      {/* Starfield */}
      <div 
        ref={starsContainerRef} 
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />
      {/* Styles for aurora, orbs, and stars */}
      <style>{`
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px #00fff0, 0 0 16px #a78bfa44;
        }
        .star.medium { width: 3px; height: 3px; }
        .star.large { width: 4px; height: 4px; }
        @keyframes starPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(48px);
          opacity: 0.18;
          pointer-events: none;
          animation: orbMove 24s linear infinite alternate;
        }
        .orb1 {
          width: 240px; height: 240px;
          background: radial-gradient(circle, #00fff0 0%, transparent 70%);
          top: 10%; left: 5%; animation-delay: 0s;
        }
        .orb2 {
          width: 180px; height: 180px;
          background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
          top: 60%; left: 70%; animation-delay: 8s;
        }
        .orb3 {
          width: 140px; height: 140px;
          background: radial-gradient(circle, #67e8f9 0%, transparent 70%);
          top: 80%; left: 20%; animation-delay: 16s;
        }
        @keyframes orbMove {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-40px) scale(1.08); }
        }
      `}</style>
    </>
  );
};

export default StarBackground;
