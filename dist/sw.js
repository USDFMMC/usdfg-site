// Service Worker for USDFG Arena PWA
// Provides offline functionality and caching

const CACHE_NAME = 'usdfg-arena-v1';
const STATIC_CACHE_NAME = 'usdfg-static-v1';
const DYNAMIC_CACHE_NAME = 'usdfg-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/app',
  '/app/challenge/new',
  '/manifest.json',
  '/assets/usdfg-logo-transparent.png',
  '/assets/usdfg-144.png',
  '/assets/usdfg-og-banner.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (isStaticFile(request)) {
    // Static files - cache first strategy
    event.respondWith(cacheFirst(request));
  } else if (isAppRoute(request)) {
    // App routes - network first, fallback to cache
    event.respondWith(networkFirst(request));
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request));
  }
});

// Cache first strategy for static files
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network first strategy for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for app routes
    if (isAppRoute(request)) {
      return caches.match('/app');
    }

    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Check if request is for a static file
function isStaticFile(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.webp') ||
         url.pathname.endsWith('.ico') ||
         url.pathname === '/manifest.json';
}

// Check if request is for an app route
function isAppRoute(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/app') ||
         url.pathname === '/' ||
         url.pathname === '/privacy' ||
         url.pathname === '/terms' ||
         url.pathname === '/whitepaper';
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'challenge-submission') {
    event.waitUntil(handleOfflineChallengeSubmission());
  }
});

// Handle offline challenge submissions
async function handleOfflineChallengeSubmission() {
  try {
    // Get offline submissions from IndexedDB
    const submissions = await getOfflineSubmissions();
    
    for (const submission of submissions) {
      try {
        // Attempt to submit to server
        const response = await fetch('/api/challenges/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission)
        });

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineSubmission(submission.id);
          console.log('Offline submission synced:', submission.id);
        }
      } catch (error) {
        console.error('Failed to sync submission:', submission.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New challenge available!',
    icon: '/assets/usdfg-144.png',
    badge: '/assets/usdfg-144.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/app'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Arena',
        icon: '/assets/usdfg-144.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('USDFG Arena', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/app')
    );
  }
});

// Helper functions for offline storage (would need IndexedDB implementation)
async function getOfflineSubmissions() {
  // TODO: Implement IndexedDB storage for offline submissions
  return [];
}

async function removeOfflineSubmission(id) {
  // TODO: Implement IndexedDB removal
  console.log('Removing offline submission:', id);
}
