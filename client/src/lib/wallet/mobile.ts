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

export function phantomMobileConnect() {
  const appUrl = encodeURIComponent("https://usdfg.pro/app");
  const redirect = encodeURIComponent("https://usdfg.pro/app");

  const dappKeyPair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(24);

  const dappPublicKeyBase64 = encodeBase64(dappKeyPair.publicKey);
  const nonceBase64 = encodeBase64(nonce);

  const link =
    `https://phantom.app/ul/v1/connect?` +
    `app_url=${appUrl}` +
    `&dapp_encryption_public_key=${encodeURIComponent(dappPublicKeyBase64)}` +
    `&nonce=${encodeURIComponent(nonceBase64)}` +
    `&redirect_link=${redirect}` +
    `&cluster=devnet`;

  localStorage.setItem(
    "phantom_dapp_handshake",
    JSON.stringify({
      dappSecretKey: encodeBase64(dappKeyPair.secretKey),
      nonce: nonceBase64,
    })
  );

  // DEBUG: Log the generated URL (safe - only first few params, not full sensitive data)
  const urlParts = link.split('&');
  const safeUrl = urlParts.slice(0, 3).join('&') + '&...';
  console.log("📱 Mobile Safari → Generated Phantom universal link:");
  console.log("🔗 URL (first 3 params):", safeUrl);
  console.log("📏 Full URL length:", link.length, "characters");
  console.log("🔑 dapp_encryption_public_key length:", dappPublicKeyBase64.length);
  console.log("🔢 nonce length:", nonceBase64.length);
  console.log("🌐 redirect_link:", redirect);
  console.log("⚙️ cluster: devnet");
  
  // Also log to window for easy copy-paste (first part only)
  (window as any).__phantom_debug_url = safeUrl;
  console.log("💡 To inspect full URL, check window.__phantom_debug_url or network tab");
  
  window.location.href = link;
}

