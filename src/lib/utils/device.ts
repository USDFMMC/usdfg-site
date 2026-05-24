/** iOS Safari (excludes Chrome/Firefox on iOS). */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  return /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Defer non-critical work until after first paint (Safari-friendly). */
export function runAfterFirstPaint(fn: () => void | (() => void)): () => void {
  let cancelled = false;
  let innerCleanup: void | (() => void);

  const start = () => {
    if (cancelled) return;
    innerCleanup = fn();
  };

  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(start, { timeout: 1500 });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(id);
      if (typeof innerCleanup === 'function') innerCleanup();
    };
  }

  const t = window.setTimeout(start, 120);
  return () => {
    cancelled = true;
    window.clearTimeout(t);
    if (typeof innerCleanup === 'function') innerCleanup();
  };
}
