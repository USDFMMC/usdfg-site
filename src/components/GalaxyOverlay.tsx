import React, { useMemo } from "react";

/**
 * Galaxy starfield overlay – drifting particles, purple nebula.
 * Stars move slowly for "flying through space" feel.
 */
const STAR_COUNT = 60;

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const GalaxyOverlay: React.FC = () => {
  const stars = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      left: rng() * 100,
      top: rng() * 100,
      size: 1.5 + rng() * 2.5,
      duration: 15 + rng() * 25,
      delay: rng() * -20,
      purple: rng() > 0.6,
    }));
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={{ zIndex: 1 }}
    >
      {/* Drifting stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute animate-galaxy-drift rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: star.purple
              ? "rgba(126, 67, 255, 0.8)"
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: star.purple
              ? `0 0 ${star.size * 2}px rgba(126, 67, 255, 0.6)`
              : `0 0 ${star.size}px rgba(255, 255, 255, 0.5)`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Nebula blobs – more visible */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 15% 25%, rgba(126, 67, 255, 0.25) 0%, transparent 55%),
            radial-gradient(ellipse 45% 35% at 85% 75%, rgba(126, 67, 255, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 35% 30% at 55% 45%, rgba(126, 67, 255, 0.15) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
};

export default GalaxyOverlay;
