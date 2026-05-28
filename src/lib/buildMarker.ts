/** Baked in at `vite build` via `define` in vite.config.ts */
declare const __USDFG_BUILD_COMMIT__: string;

const BUILD_MARKER = 'cleanup-disabled';

let logged = false;

export function logUsdfgBuildMarker(): void {
  if (logged) return;
  logged = true;
  const commit =
    typeof __USDFG_BUILD_COMMIT__ === 'string' && __USDFG_BUILD_COMMIT__
      ? __USDFG_BUILD_COMMIT__
      : 'unknown';
  console.log(`USDFG BUILD: ${commit} ${BUILD_MARKER}`);
}

// Guaranteed once per page load when the app bundle loads.
logUsdfgBuildMarker();
