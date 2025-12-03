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

// Guard to prevent double navigation
let isNavigating = false;

export function phantomMobileConnect() {
  // CRITICAL: Check if we're already connecting (persists across page reloads)
  const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
  if (isConnecting) {
    console.warn("⚠️ Phantom connection already in progress - ignoring duplicate call");
    return;
  }
  
  // Prevent double navigation - if already navigating, ignore
  if (isNavigating) {
    console.warn("⚠️ Phantom deep link already in progress - ignoring duplicate call");
    return;
  }
  
  // Check if we recently navigated (within last 5 seconds - increased from 2)
  const lastAttempt = sessionStorage.getItem('phantom_connect_attempt');
  if (lastAttempt) {
    const lastAttemptTime = new Date(lastAttempt).getTime();
    const now = Date.now();
    if (now - lastAttemptTime < 5000) {
      console.warn("⚠️ Phantom connect called too soon after last attempt - ignoring");
      return;
    }
  }
  
  // Mark as navigating and connecting BEFORE doing anything else
  isNavigating = true;
  sessionStorage.setItem('phantom_connecting', 'true');
  // Mark this as the original tab (so we can detect if Phantom opens a new tab)
  sessionStorage.setItem('phantom_original_tab', 'true');
  // CRITICAL: Use root / for iOS universal link compatibility
  // iOS always treats root domain as valid universal link (no subpath needed)
  // This ensures Phantom returns to the same tab, not a new blank tab
  const appUrl = "https://usdfg.pro/";
  
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
  
  // Store timestamp for debugging
  sessionStorage.setItem('phantom_connect_attempt', new Date().toISOString());
  sessionStorage.setItem('phantom_connect_timestamp', Date.now().toString());
  console.log("⏰ Connect attempt timestamp stored");
  
  console.log("🚀 Navigating to Phantom universal link...");
  console.log("🔒 Connection guard active - prevents duplicate clicks");
  
  // Navigate - this will redirect to Phantom
  // Reset flag after a delay (in case navigation is cancelled)
  setTimeout(() => {
    isNavigating = false;
  }, 5000);
  
  // CRITICAL: Use window.location.replace() to prevent new tab
  // This ensures Phantom returns to the same tab
  try {
    window.location.replace(url);
  } catch (error) {
    console.warn("⚠️ window.location.replace() failed, using href:", error);
    window.location.href = url;
  }
}
