/**
 * TEMPORARY pre-launch arena gate — remove this folder when Cloudflare Access is deployed.
 * @see src/pages/ArenaRoute.tsx
 */
export const ARENA_ACCESS_STORAGE_KEY = 'arena-access';

/** Set via Cloudflare Pages / .env.local — not committed. */
export const ARENA_ACCESS_PASSWORD = import.meta.env.VITE_ARENA_ACCESS_PASSWORD ?? '';
