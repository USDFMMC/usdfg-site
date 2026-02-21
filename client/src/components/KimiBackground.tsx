import React from "react";
import GalaxyOverlay from "./GalaxyOverlay";

/**
 * KimiBackground Component
 *
 * Provides the standard Kimi theme background with:
 * - Kimi dot grid pattern
 * - Kimi radial glow (center)
 * - Void gradient with subtle Kimi purple tint
 * - Galaxy starfield overlay (when includeGalaxy=true)
 *
 * Usage:
 * <KimiBackground includeGalaxy={true} />
 */
interface KimiBackgroundProps {
  /** Render scattered stars + nebula for cosmic galaxy look */
  includeGalaxy?: boolean;
  /** Additional className for customization */
  className?: string;
}

const KimiBackground: React.FC<KimiBackgroundProps> = ({
  includeGalaxy = false,
  className = "",
}) => {
  return (
    <>
      {/* Global Unified Background - Kimi style: void + dot grid + radial glow + subtle purple tint */}
      <div className={`fixed inset-0 z-0 bg-[var(--kimi-void)] ${className}`}>
        {/* Kimi Dot Grid Pattern */}
        <div className="absolute inset-0 bg-kimi-dot-grid opacity-25" />

        {/* Kimi radial glow (center) */}
        <div className="absolute inset-0 bg-gradient-radial-kimi pointer-events-none" />

        {/* Void gradient + Kimi purple tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--kimi-void)] via-[var(--kimi-void)]/95 to-[var(--kimi-void)]" />
        <div className="absolute inset-0 bg-kimi-purple-tint-5" />

        {/* Galaxy starfield – ON TOP so visible; drifting particles */}
        {includeGalaxy && <GalaxyOverlay />}
      </div>
    </>
  );
};

export default KimiBackground;
