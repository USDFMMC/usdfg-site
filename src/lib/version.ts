/**
 * Version Management System
 * Detects when a new version is deployed and prompts users to refresh
 */

const APP_VERSION = Date.now().toString(); // Use timestamp as version
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export const getAppVersion = () => APP_VERSION;

export const checkForUpdates = async (): Promise<boolean> => {
  try {
    // Fetch the index.html with cache-busting
    const response = await fetch(`/index.html?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) return false;
    
    const html = await response.text();

    // Compare current loaded module asset filenames against the latest index.html assets.
    // This is more reliable than matching only "index-*.js".
    const currentAssets = new Set(
      Array.from(document.querySelectorAll('script[type="module"][src], link[rel="stylesheet"][href]'))
        .map((el) => {
          const raw = el instanceof HTMLScriptElement ? el.src : (el as HTMLLinkElement).href;
          const withoutQuery = raw.split('?')[0];
          return withoutQuery.split('/').pop() || '';
        })
        .filter(Boolean)
    );

    const latestAssets = new Set(
      Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g))
        .map((m) => m[1] || '')
        .filter((u) => /\/assets\/.+\.(?:js|css)$/.test(u))
        .map((u) => {
          const withoutQuery = u.split('?')[0];
          return withoutQuery.split('/').pop() || '';
        })
        .filter(Boolean)
    );

    if (currentAssets.size === 0 || latestAssets.size === 0) return false;

    for (const filename of currentAssets) {
      if (!latestAssets.has(filename)) return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Version check failed:', error);
    return false;
  }
};

export const startVersionMonitoring = (onUpdateAvailable: () => void) => {
  console.log('🔍 Starting version monitoring...');
  
  const checkVersion = async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      console.log('🆕 New version detected!');
      onUpdateAvailable();
    }
  };
  
  // Check immediately
  checkVersion();
  
  // Then check periodically
  const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);
  
  return () => clearInterval(interval);
};

export const forceReload = () => {
  console.log('🔄 Forcing app reload...');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  }
  
  // Reload with cache bypass
  window.location.reload();
};

