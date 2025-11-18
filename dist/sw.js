// Simple ServiceWorker for USDFG Arena
// Safari-compatible ServiceWorker with fallbacks

const CACHE_VERSION = Date.now(); // Dynamic version based on deployment time
const CACHE_NAME = `usdfg-arena-v${CACHE_VERSION}`;

// Safari compatibility check
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// CRITICAL: DO NOT cache JS bundles - they must always be fresh
// Only cache static assets, not application code
const urlsToCache = [
  '/',
  '/app'
  // NOTE: Removed /assets/index.css and /assets/index.js from cache
  // JS bundles must always load fresh to ensure latest deep link code runs
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 ServiceWorker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 ServiceWorker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ ServiceWorker: Cache failed:', error);
      })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Safari-specific handling - be more permissive
  if (isSafari) {
    // In Safari, bypass ServiceWorker for most requests to avoid issues
    if (
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase.googleapis.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/firestore/') ||
      url.pathname.includes('/Listen/') ||
      url.pathname.includes('/Listen') ||
      url.pathname.includes('.woff2') ||
      url.pathname.includes('.woff') ||
      url.pathname.includes('.ttf') ||
      event.request.method !== 'GET'
    ) {
      console.log('🚫 ServiceWorker: Safari bypass for', url.hostname);
      return;
    }
  } else {
    // Non-Safari browsers - full ServiceWorker functionality
    if (
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase.googleapis.com') ||
      url.hostname.includes('firebaseinstallations.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com') ||
      url.hostname.includes('api.devnet.solana.com') ||
      url.hostname.includes('api.mainnet-beta.solana.com') ||
      url.hostname.includes('api.testnet.solana.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/firestore/') ||
      url.pathname.includes('/Listen/') ||
      url.pathname.includes('/Listen') ||
      url.pathname.includes('.woff2') ||
      url.pathname.includes('.woff') ||
      url.pathname.includes('.ttf') ||
      event.request.method !== 'GET'
    ) {
      console.log('🚫 ServiceWorker: Bypassing request to', url.hostname);
      return;
    }
  }
  
  // CRITICAL: Never cache JS bundles - always fetch fresh
  // This ensures deep link code updates are immediately available
  if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) {
    console.log('🚫 ServiceWorker: Bypassing cache for JS bundle:', url.pathname);
    return fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    });
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Return a fallback response for failed requests
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
      .catch((error) => {
        console.error('❌ ServiceWorker: Fetch failed:', error);
        return new Response('Error', { status: 500, statusText: 'Internal Server Error' });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`✅ ServiceWorker: Activated ${CACHE_NAME} (Safari compatible)`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ ServiceWorker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force all clients to use the new ServiceWorker immediately
      console.log('🔄 ServiceWorker: Taking control of all pages');
      return self.clients.claim();
    })
  );
  
  // Skip waiting - activate immediately
  self.skipWaiting();
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('📨 ServiceWorker: Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

console.log('🚀 ServiceWorker: Loaded successfully');
