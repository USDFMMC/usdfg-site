// Cloudflare Pages Functions middleware for SPA routing
// This file should be in the functions/ directory (not client/public/)
// Cloudflare Pages will automatically use this for routing

export async function onRequest(context: any) {
  const { request, next } = context;
  const url = new URL(request.url);

  // If it's a static asset, let it through
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.svg')
  ) {
    return next();
  }

  // For all other routes (including /app), serve index.html for SPA routing
  // Cloudflare Pages will handle this automatically if _routes.json is configured
  return next();
}
