import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Register GSAP plugins for the app.
 *
 * CRITICAL: Call this exactly once globally (e.g. in `client/src/main.tsx`).
 */
export function registerGsapPluginsOnce() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

registerGsapPluginsOnce();

