// Cloudflare Pages Functions middleware – minimal pass-through for SPA.
// SPA routing is handled by _redirects; this runs for paths in _routes.json include.

export async function onRequest(context: { next: () => Promise<Response> }) {
  return context.next();
}
