/**
 * Arena logic and flows ported from usdfg-site; presentation should stay on Kimi styles,
 * effects, and animations (landing/sections, KimiBackground, shared UI tokens). When
 * syncing more files from the original repo, transfer behavior/data only—do not replace
 * this app’s visual system with the old site’s marketing or component styling.
 * Main arena shell. TEMPORARY client password gate wraps /app via ArenaRoute until Cloudflare Access is live.
 */
export { default } from './app/index';
