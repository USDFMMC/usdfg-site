/**
 * Centralized Kimi motion presets.
 *
 * Keep these values subtle and consistent across the site so animation
 * feels like one continuous system (not stitched per-section).
 */
export const kimiDurations = {
  fast: 0.35,
  medium: 0.6,
  slow: 0.9,
} as const;

/** Default easing for Kimi motion (GSAP ease string). */
export const kimiEasing = {
  default: "power2.out",
} as const;

/** Shared stagger preset for multi-item reveals. */
export const kimiStagger = {
  each: 0.08,
  from: "start" as const,
} as const;

