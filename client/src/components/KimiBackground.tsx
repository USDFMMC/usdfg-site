import React from "react";
import GalaxyBackground from "@/components/GalaxyBackground";

/**
 * KimiBackground Component
 * 
 * Provides the standard Kimi Galaxy theme background with:
 * - Kimi dot grid pattern
 * - Kimi radial glow (center)
 * - Void gradient with subtle Kimi purple tint
 * - Optional 3D galaxy particle effect
 * 
 * Usage:
 * <KimiBackground includeGalaxy={true} />
 */
interface KimiBackgroundProps {
  /** Include the 3D galaxy particle effect (default: true) */
  includeGalaxy?: boolean;
  /** Additional className for customization */
  className?: string;
}

const KimiBackground: React.FC<KimiBackgroundProps> = ({ 
  includeGalaxy = true,
  className = ""
}) => {
  return (
    <>
      {/* Galaxy Background - Kimi Galaxy Effect (3D particles) */}
      {includeGalaxy && <GalaxyBackground />}
      
      {/* Global Unified Background - Kimi style: void + dot grid + radial glow + subtle purple tint */}
      <div className={`fixed inset-0 z-0 bg-[var(--kimi-void)] ${className}`}>
        {/* Kimi Dot Grid Pattern */}
        <div className="absolute inset-0 bg-kimi-dot-grid opacity-25" />
        
        {/* Kimi radial glow (center) */}
        <div className="absolute inset-0 bg-gradient-radial-kimi pointer-events-none" />
        
        {/* Void gradient + Kimi purple tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--kimi-void)] via-[var(--kimi-void)]/95 to-[var(--kimi-void)]" />
        <div className="absolute inset-0 bg-kimi-purple-tint-5" />
      </div>
    </>
  );
};

export default KimiBackground;
