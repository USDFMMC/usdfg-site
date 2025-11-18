// ============================================
// 🔍 SAFARI DEBUG COMMANDS - PASTE INTO CONSOLE
// ============================================
// Copy and paste these commands ONE AT A TIME into Safari debug console
// ============================================

// ============================================
// 1. Check Current Page URL
// ============================================
console.log('📍 Current Page:', window.location.href);
console.log('📍 Origin:', window.location.origin);
console.log('📍 Pathname:', window.location.pathname);

// ============================================
// 2. Check Debug Variables
// ============================================
console.log('🔍 __phantom_debug_redirect:', window.__phantom_debug_redirect);
console.log('🔍 __phantom_redirect_debug:', window.__phantom_redirect_debug); // Check both spellings
console.log('🔍 launchPhantomDeepLink exists:', typeof window.launchPhantomDeepLink);
console.log('🔍 shouldUseDeepLink exists:', typeof window.shouldUseDeepLink);

// ============================================
// 3. List All Scripts Loaded
// ============================================
const scripts = Array.from(document.querySelectorAll('script'));
console.log('📜 Total scripts:', scripts.length);
scripts.forEach((script, i) => {
  console.log(`${i + 1}. ${script.src || 'INLINE'} (type: ${script.type || 'text/javascript'})`);
});

// ============================================
// 4. Find the Main JS Bundle
// ============================================
const jsBundles = scripts.filter(s => s.src && s.src.includes('/assets/index-'));
console.log('📦 JS Bundles found:', jsBundles.length);
jsBundles.forEach((script, i) => {
  console.log(`Bundle ${i + 1}: ${script.src}`);
});

// ============================================
// 5. Check Service Worker
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(reg => {
    if (reg) {
      console.log('🔧 Service Worker ACTIVE:', reg.active ? 'YES' : 'NO');
      console.log('🔧 Service Worker Scope:', reg.scope);
      console.log('🔧 Service Worker State:', reg.active?.state);
    } else {
      console.log('❌ No Service Worker registered');
    }
  });
} else {
  console.log('❌ Service Worker not supported');
}

// ============================================
// 6. Check Cache
// ============================================
if ('caches' in window) {
  caches.keys().then(names => {
    console.log('💾 Caches found:', names.length);
    names.forEach(name => console.log('  -', name));
  });
}

// ============================================
// 7. Search for Deep Link Code in Page
// ============================================
// This will search the page source for deep link strings
fetch(window.location.href)
  .then(r => r.text())
  .then(html => {
    const hasDeepLink = html.includes('launchPhantomDeepLink') || html.includes('phantom-deeplink');
    console.log('🔍 Deep link code in HTML:', hasDeepLink ? 'FOUND' : 'NOT FOUND');
    
    // Check for redirect URL patterns
    const hasOriginApp = html.includes('window.location.origin') && html.includes('/app');
    const hasHref = html.includes('window.location.href');
    console.log('🔍 Has origin/app pattern:', hasOriginApp);
    console.log('🔍 Has location.href pattern:', hasHref);
  })
  .catch(err => console.error('❌ Error checking HTML:', err));

// ============================================
// 8. Try to Access Deep Link Function
// ============================================
// This will try to find the function in the global scope
console.log('🔍 Searching for deep link function...');
const globalKeys = Object.keys(window).filter(k => 
  k.toLowerCase().includes('phantom') || 
  k.toLowerCase().includes('deeplink') ||
  k.toLowerCase().includes('launch')
);
console.log('🔍 Global keys with "phantom/deeplink/launch":', globalKeys);

// ============================================
// 9. Check if Module is Loaded
// ============================================
console.log('🔍 Module loaded check:');
console.log('  - DEEPLINK MODULE LOADED log should appear if module imported');
console.log('  - Check console for: "🔍 DEEPLINK MODULE LOADED - phantom-deeplink.ts imported"');

// ============================================
// 10. Clear Cache and Reload (UNCOMMENT TO USE)
// ============================================
/*
// WARNING: This will clear all caches and reload
(async () => {
  if ('caches' in window) {
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
      console.log('🗑️ Deleted cache:', name);
    }
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
      console.log('🗑️ Unregistered SW:', reg.scope);
    }
  }
  console.log('🔄 Reloading page...');
  window.location.reload(true);
})();
*/

