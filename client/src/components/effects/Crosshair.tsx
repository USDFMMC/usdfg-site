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
        horizontalRef.current.style.opacity = '0.6';
        
        // Update vertical line position  
        verticalRef.current.style.left = `${e.clientX}px`;
        verticalRef.current.style.opacity = '0.6';
      }
    };

    const handleMouseLeave = () => {
      if (horizontalRef.current && verticalRef.current) {
        horizontalRef.current.style.opacity = '0';
        verticalRef.current.style.opacity = '0';
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
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
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          filter: `drop-shadow(0 0 2px ${color})`
        }}
      />
      {/* Vertical Line */}
      <div
        ref={verticalRef}
        className="absolute h-full w-[1px] pointer-events-none opacity-0 crosshair-vertical"
        style={{ 
          background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
          filter: `drop-shadow(0 0 2px ${color})`
        }}
      />
    </div>
  );
};

export default Crosshair;
