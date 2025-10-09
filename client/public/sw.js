// Simple ServiceWorker for USDFG Arena
// This replaces any problematic ServiceWorker that was causing require() errors

const CACHE_NAME = 'usdfg-arena-v2';
const urlsToCache = [
  '/',
  '/app',
  '/assets/index.css',
  '/assets/index.js'
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
  
  // Skip ServiceWorker for ALL external API requests, Firestore, and external services
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
    url.pathname.includes('/api/') ||
    url.pathname.includes('/firestore/') ||
    url.pathname.includes('/Listen/') ||
    url.pathname.includes('/Listen') ||
    event.request.method !== 'GET'
  ) {
    // Let these requests pass through without ServiceWorker interference
    console.log('🚫 ServiceWorker: Bypassing request to', url.hostname);
    return;
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
  console.log('✅ ServiceWorker: Activated v2');
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
      // Force all clients to use the new ServiceWorker
      return self.clients.claim();
    })
  );
});

console.log('🚀 ServiceWorker: Loaded successfully');
