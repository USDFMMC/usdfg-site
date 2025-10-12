/**
 * Version Management System
 * Detects when a new version is deployed and prompts users to refresh
 */

const APP_VERSION = Date.now().toString(); // Use timestamp as version
const VERSION_CHECK_INTERVAL = 60000; // Check every 60 seconds

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
    
    // Check if the HTML contains different script bundles (new version)
    const currentScripts = Array.from(document.querySelectorAll('script[src*="index-"]'))
      .map(script => (script as HTMLScriptElement).src);
    
    const hasNewVersion = currentScripts.some(src => {
      const filename = src.split('/').pop() || '';
      return !html.includes(filename);
    });
    
    return hasNewVersion;
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

