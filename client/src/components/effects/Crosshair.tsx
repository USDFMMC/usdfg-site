import React, { useEffect, useRef } from 'react';

interface CrosshairProps {
  color?: string;
}

const Crosshair: React.FC<CrosshairProps> = ({ color = '#00ffff' }) => {
  const horizontalRef = useRef<HTMLDivElement>(null);
  const verticalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (horizontalRef.current && verticalRef.current) {
        // Update horizontal line position
        horizontalRef.current.style.top = `${e.clientY}px`;
        horizontalRef.current.style.opacity = '0.4';
        
        // Update vertical line position  
        verticalRef.current.style.left = `${e.clientX}px`;
        verticalRef.current.style.opacity = '0.4';
      }
    };

    const handleMouseLeave = () => {
      if (horizontalRef.current && verticalRef.current) {
        horizontalRef.current.style.opacity = '0';
        verticalRef.current.style.opacity = '0';
      }
    };

    const handleMouseEnter = () => {
      if (horizontalRef.current && verticalRef.current) {
        horizontalRef.current.style.opacity = '0.4';
        verticalRef.current.style.opacity = '0.4';
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] crosshair-container"
      style={{
        '--crosshair-color': color
      } as React.CSSProperties}
    >
      {/* Horizontal Line */}
      <div
        ref={horizontalRef}
        className="absolute w-full h-[1px] pointer-events-none opacity-0 crosshair-horizontal"
        style={{ 
          background: `linear-gradient(90deg, transparent 0%, transparent 40%, ${color} 45%, ${color} 55%, transparent 60%, transparent 100%)`,
          filter: `drop-shadow(0 0 1px ${color})`,
          transform: 'translateY(-0.5px)'
        }}
      />
      {/* Vertical Line */}
      <div
        ref={verticalRef}
        className="absolute h-full w-[1px] pointer-events-none opacity-0 crosshair-vertical"
        style={{ 
          background: `linear-gradient(180deg, transparent 0%, transparent 40%, ${color} 45%, ${color} 55%, transparent 60%, transparent 100%)`,
          filter: `drop-shadow(0 0 1px ${color})`,
          transform: 'translateX(-0.5px)'
        }}
      />
    </div>
  );
};

export default Crosshair;
