/**
 * Arena entry from public/marketing pages must use full document navigation
 * (`<a href={ARENA_ENTRY_HREF}>`) so Cloudflare Access is evaluated at the edge.
 * Do not use React Router `<Link to="/app">` on landing sections.
 */
export const ARENA_ENTRY_HREF = '/app';
