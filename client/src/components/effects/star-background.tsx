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
      {/* Simplified Starfield Only */}
      <div 
        ref={starsContainerRef} 
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />
      {/* Simplified star styles only */}
      <style>{`
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 4px #00fff0;
        }
        .star.medium { width: 3px; height: 3px; }
        .star.large { width: 4px; height: 4px; }
        @keyframes starPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default StarBackground;
