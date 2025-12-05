/**
 * Mobile Safari → DIRECT Phantom universal link method
 * This bypasses wallet adapter completely on mobile Safari
 * Uses official Phantom universal link (https://phantom.app/ul/v1/connect)
 * with full encryption key handshake so Safari returns to the same tab
 * 
 * Phantom REQUIRES:
 * - dapp_encryption_public_key (for encrypted response)
 * - nonce (for encryption)
 * - redirect_link (where to return)
 * - cluster (devnet/mainnet)
 * - scope (permissions)
 * 
 * CRITICAL: Must use browser-native base64 encoding (btoa) not Buffer
 * Safari doesn't handle Node.js Buffer polyfills correctly
 */

import nacl from "tweetnacl";

function encodeBase64(u8: Uint8Array): string {
  let binary = "";
  u8.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Guard to prevent double navigation - STRONG guard
let isNavigating = false;
let navigationStartTime = 0;

// Export function to reset navigation guard (called when Phantom returns)
export function resetNavigationGuard() {
  console.log("🧹 Resetting navigation guard (Phantom returned)");
  isNavigating = false;
  navigationStartTime = 0;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem('phantom_navigation_start');
  }
}

export function phantomMobileConnect() {
  // CRITICAL: STRONG guard - prevent multiple navigations
  if (isNavigating) {
    const timeSinceNav = Date.now() - navigationStartTime;
    if (timeSinceNav < 10000) { // Within 10 seconds of navigation
      console.warn("⚠️ Navigation already in progress - BLOCKING duplicate call");
    return;
    } else {
      // Navigation started more than 10 seconds ago - reset guard
      console.log("🧹 Resetting navigation guard (stale)");
      isNavigating = false;
    }
  }
  
  // CRITICAL: Check if we're already connecting, but only if it's very recent (not stuck)
  // Be more lenient - allow retries if first attempt failed
  if (typeof window !== "undefined") {
    const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    
    if (isConnecting) {
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        // If connection state is older than 2 seconds, consider it stuck and clear it (more aggressive)
        if (timeSinceConnect > 2000) {
          console.log("🧹 Clearing stuck connection state in phantomMobileConnect() (older than 2s)");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_connect_attempt');
          // Allow connection to proceed
        } else {
          // Very recent (within 2 seconds) - block to prevent double-clicks
          console.warn("⚠️ Phantom connection very recent (within 2s) - blocking duplicate call");
    return;
        }
      } else {
        // No timestamp but marked as connecting - clear orphaned state immediately
        console.log("🧹 Clearing orphaned connection state in phantomMobileConnect()");
        sessionStorage.removeItem('phantom_connecting');
        // Allow connection to proceed
      }
    }
  }
  
  // Check if we recently navigated (within last 3 seconds - STRICT)
  const lastAttempt = sessionStorage.getItem('phantom_connect_attempt');
  if (lastAttempt) {
    const lastAttemptTime = new Date(lastAttempt).getTime();
    const now = Date.now();
    if (now - lastAttemptTime < 3000) {
      console.warn("⚠️ Phantom connect called too soon after last attempt (within 3s) - BLOCKING");
      return;
    }
  }
  
  // Set navigation guard BEFORE any async operations
  // CRITICAL: Do this synchronously, before any async operations
  isNavigating = true;
  navigationStartTime = Date.now();
  const now = Date.now();
  sessionStorage.setItem('phantom_connecting', 'true');
  sessionStorage.setItem('phantom_connect_timestamp', now.toString());
  sessionStorage.setItem('phantom_connect_attempt', new Date().toISOString());
  // Mark this as the original tab (so we can detect if Phantom opens a new tab)
  sessionStorage.setItem('phantom_original_tab', 'true');
  // Reset redirect count (for detecting loops)
  sessionStorage.setItem('phantom_redirect_count', '0');
  // CRITICAL: Use /app/ for redirect (where React app lives)
  // iOS universal links work with subpaths, and this ensures Phantom returns to the app
  const appUrl = "https://usdfg.pro/app/";
  
  const dappKeyPair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(24);

  const dappPublicKeyBase64 = encodeBase64(dappKeyPair.publicKey);
  const nonceBase64 = encodeBase64(nonce);

  // CRITICAL: All 7 parameters MUST be included for Phantom to accept the request
  // Format: base URL + query params with proper encoding
  const appMetadataUrl = "https://usdfg.pro/phantom/manifest.json";
  const url =
    "https://phantom.app/ul/v1/connect" +
    `?app_url=${encodeURIComponent(appUrl)}` +
    `&dapp_encryption_public_key=${encodeURIComponent(dappPublicKeyBase64)}` +
    `&nonce=${encodeURIComponent(nonceBase64)}` +
    `&redirect_link=${encodeURIComponent(appUrl)}` +
    `&cluster=devnet` +
    `&scope=${encodeURIComponent("wallet:sign,wallet:signMessage,wallet:decrypt")}` +
    `&app_metadata_url=${encodeURIComponent(appMetadataUrl)}`;

  // Store keypair in sessionStorage for decryption on return
  // The return handler expects it in sessionStorage with key from SESSION_STORAGE_KEY
  // Format: Array of numbers (secret key bytes)
  sessionStorage.setItem(
    "phantom_dapp_keypair",
    JSON.stringify(Array.from(dappKeyPair.secretKey))
  );
  
  // Store nonce in sessionStorage for verification
  // The return handler expects it with key from SESSION_STORAGE_NONCE
  sessionStorage.setItem("phantom_dapp_nonce", nonceBase64);
  
  // Also store in localStorage as backup (for debugging)
  localStorage.setItem(
    "phantom_dapp_handshake",
    JSON.stringify({
      dappSecretKey: encodeBase64(dappKeyPair.secretKey),
      nonce: nonceBase64,
    })
  );

  // DEBUG: Log the generated URL (safe - only first few params, not full sensitive data)
  const urlParts = url.split('&');
  const safeUrl = urlParts.slice(0, 3).join('&') + '&...';
  console.log("📱 Mobile Safari → Generated Phantom universal link:");
  console.log("🔗 URL (first 3 params):", safeUrl);
  console.log("📏 Full URL length:", url.length, "characters");
  console.log("✅ app_url:", appUrl);
  console.log("✅ dapp_encryption_public_key length:", dappPublicKeyBase64.length);
  console.log("✅ nonce length:", nonceBase64.length);
  console.log("✅ redirect_link:", appUrl);
  console.log("✅ cluster: devnet");
  console.log("✅ scope: wallet:sign,wallet:signMessage,wallet:decrypt");
  console.log("✅ app_metadata_url:", appMetadataUrl);
  console.log("✅ All 7 required parameters included");
  
  // Also log to window for easy copy-paste (first part only)
  (window as any).__phantom_debug_url = safeUrl;
  console.log("💡 To inspect full URL, check window.__phantom_debug_url or network tab");
  
  console.log("🚀 Navigating to Phantom universal link...");
  console.log("🔒 Connection guard active - prevents duplicate clicks");
  
  // Store navigation timestamp
  sessionStorage.setItem('phantom_navigation_start', Date.now().toString());
  
  // CRITICAL: Navigate IMMEDIATELY and SYNCHRONOUSLY
  // Safari requires navigation to happen in the direct user interaction context
  // Any delay or async operation can cause Safari to block it as a popup
  // On mobile Safari, use window.location.href (more reliable than replace)
  // This ensures Phantom returns to the same tab
  try {
    // Navigate immediately - this is synchronous and happens in user click context
    // Use href instead of replace for better Safari mobile compatibility
    window.location.href = url;
    // Code after this line won't execute if navigation succeeds
  } catch (error) {
    console.warn("⚠️ window.location.href failed, trying replace:", error);
    try {
      window.location.replace(url);
    } catch (replaceError) {
      console.error("❌ Both href and replace failed:", replaceError);
    }
  }
  
  // If we somehow get here (navigation was blocked), reset guard after timeout
  // This should rarely happen if navigation is called synchronously in user click handler
  setTimeout(() => {
    // Only reset if we're still on the same page (navigation was blocked)
    if (typeof window !== "undefined" && window.location.href.includes('usdfg.pro') && !window.location.href.includes('phantom.app')) {
      console.log("🧹 Navigation was blocked - resetting guard");
      isNavigating = false;
      sessionStorage.removeItem('phantom_connecting');
      sessionStorage.removeItem('phantom_connect_timestamp');
    }
  }, 5000); // Increased to 5 seconds to give navigation more time
}
