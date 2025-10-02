import React from 'react';

interface CrosshairProps {
  color?: string;
}

const Crosshair: React.FC<CrosshairProps> = ({ color = '#00ffff' }) => {
  return (
    <div 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] crosshair-container"
      style={{
        '--crosshair-color': color
      } as React.CSSProperties}
    >
      {/* Horizontal Line */}
      <div
        className="absolute w-full h-[1px] pointer-events-none opacity-0 crosshair-horizontal"
        style={{ 
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          filter: `drop-shadow(0 0 2px ${color})`
        }}
      />
      {/* Vertical Line */}
      <div
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
