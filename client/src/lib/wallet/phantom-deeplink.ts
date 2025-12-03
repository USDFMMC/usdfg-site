/**
 * Phantom Deep Link Connection Handler
 * Implements the Safari → Phantom → Safari flow using deep links
 * Similar to tools.smithii.io implementation
 * 
 * CRITICAL: Must use X25519 keys (nacl.box.keyPair) NOT Ed25519 (Solana Keypair)
 * Phantom requires base64 encoding, NOT base58
 * Nonce must be 24 bytes, NOT 16 bytes
 */

console.log('🔍 DEEPLINK MODULE LOADED - phantom-deeplink.ts imported');

import nacl from "tweetnacl";
import { PublicKey } from '@solana/web3.js';

const PHANTOM_DEEPLINK_BASE = 'https://phantom.app/ul/v1/connect';
const SESSION_STORAGE_KEY = 'phantom_dapp_keypair';
export const SESSION_STORAGE_NONCE = 'phantom_dapp_nonce';

// CRITICAL: Browser-native base64 encoding (Safari compatible)
function encodeBase64(u8: Uint8Array): string {
  let binary = "";
  u8.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/**
 * Generate a DApp keypair for encryption (X25519, not Ed25519)
 */
function getOrCreateDAppKeypair(): nacl.BoxKeyPair {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  // Try to get existing keypair from sessionStorage
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    try {
      const secretKeyArray = JSON.parse(stored);
      const secretKey = new Uint8Array(secretKeyArray);
      // Reconstruct X25519 keypair from secret key
      // nacl.box.keyPair.fromSecretKey expects the full 64-byte keypair
      // But we only store the 32-byte secret key, so we need to derive the public key
      const keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
      return keyPair;
    } catch (e) {
      console.warn('Failed to parse stored keypair, creating new one');
    }
  }

  // Create new X25519 keypair (NOT Ed25519 Solana keypair)
  const keypair = nacl.box.keyPair();
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

/**
 * Generate a random nonce (24 bytes, base64 encoded)
 */
function generateNonce(): string {
  // CRITICAL: Phantom requires 24-byte nonce, NOT 16 bytes
  const nonceBytes = nacl.randomBytes(24);
  return encodeBase64(nonceBytes);
}

/**
 * Launch Phantom deep link for connection
 */
export function launchPhantomDeepLink(): void {
  console.log('🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts');
  console.log('🔍 launchPhantomDeepLink() CALLED');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);
  
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  console.log('🚀 Launching Phantom deep link...');

  // Check if we're already connecting (prevent multiple attempts)
  const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
  if (isConnecting) {
    console.warn('⚠️ Already connecting to Phantom - ignoring duplicate request');
    return;
  }

  try {
    // Mark that we're connecting (prevents duplicate clicks)
    sessionStorage.setItem('phantom_connecting', 'true');
    
    // CRITICAL: Use X25519 keypair (nacl.box.keyPair), NOT Ed25519 (Solana Keypair)
    const dappKeypair = getOrCreateDAppKeypair();
    
    // CRITICAL: 24-byte nonce, base64 encoded (NOT 16-byte hex)
    const nonce = generateNonce();
    
    // Store nonce for verification
    sessionStorage.setItem(SESSION_STORAGE_NONCE, nonce);
    // Mark this as the original tab (so we can detect if Phantom opens a new tab)
    sessionStorage.setItem('phantom_original_tab', 'true');
    console.log('💾 Stored nonce in sessionStorage:', nonce);
    console.log('💾 Marked as original tab');
    console.log('💾 Marked as connecting (prevents duplicates)');

    // CRITICAL: Base64 encode the public key (NOT base58)
    const dappPublicKeyBase64 = encodeBase64(dappKeypair.publicKey);
    
    // CRITICAL: Hardcoded redirect URL - Phantom returns to /app/ (with trailing slash)
    // Phantom on iOS requires trailing slash for folder-based URLs
    // CRITICAL: Use root / for iOS universal link compatibility
    // iOS always treats root domain as valid universal link
    const redirectLink = encodeURIComponent("https://usdfg.pro/");
    // app_url is what Phantom displays in connected accounts
    const appUrl = encodeURIComponent("https://usdfg.pro/");
    const appMetadataUrl = encodeURIComponent("https://usdfg.pro/phantom/manifest.json");
    
    // Store redirect URL globally for debugging
    (window as any).__phantom_debug_redirect = "https://usdfg.pro/";

    console.log('🔗 Redirect link (ROOT /):', "https://usdfg.pro/");
    console.log('🔗 App URL (ROOT - what Phantom displays):', "https://usdfg.pro/");
    console.log('🔍 DEBUG: window.__phantom_debug_redirect =', "https://usdfg.pro/");
    console.log('🔑 DApp Public Key (base64):', dappPublicKeyBase64);
    console.log('🔑 Nonce (base64):', nonce);
    
    // Build deep link URL with properly encoded parameters
    // Format matches Phantom's expected structure exactly
    const deepLinkUrl = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}&dapp_encryption_public_key=${encodeURIComponent(dappPublicKeyBase64)}&nonce=${encodeURIComponent(nonce)}&cluster=devnet&scope=${encodeURIComponent("wallet:sign,wallet:signMessage,wallet:decrypt")}&app_metadata_url=${appMetadataUrl}`;

    // CRITICAL LOG - This shows EXACTLY what redirect URL is being sent to Phantom
        console.log('🔗 Redirecting Phantom to (ROOT /):', "https://usdfg.pro/");
        console.log('🔗 Redirect Link (encoded):', redirectLink);
        console.log('🔗 App URL (ROOT - displayed in Phantom):', "https://usdfg.pro/");
        console.log('🔗 App URL (encoded):', appUrl);
    console.log('🔗 Full Deep Link URL:', deepLinkUrl);
    console.log('📱 Redirecting to Phantom NOW...');
    console.log('📍 DApp Public Key (base64):', dappPublicKeyBase64);
    console.log('📍 Nonce (base64):', nonce);

    // CRITICAL: Redirect to Phantom immediately
    // Use window.location.replace() instead of href to prevent new tab
    // This ensures Phantom returns to the same tab instead of opening a new one
    try {
      window.location.replace(deepLinkUrl);
    } catch (error) {
      // Fallback to href if replace fails
      console.warn('⚠️ window.location.replace() failed, using href:', error);
      window.location.href = deepLinkUrl;
    }
    
    // If we somehow get here, log a warning
    console.warn('⚠️ Redirect may not have occurred');
  } catch (error) {
    console.error('❌ Error launching Phantom deep link:', error);
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Check if we're returning from Phantom
 */
export function isPhantomReturn(): boolean {
  if (typeof window === 'undefined') return false;
  
  const params = new URLSearchParams(window.location.search);
  return params.has('phantom_encryption_public_key') && 
         params.has('data') && 
         params.has('nonce');
}

/**
 * Handle Phantom return and decrypt the payload
 * Phantom returns: phantom_encryption_public_key, data (encrypted), nonce
 * CRITICAL: All values are base64 encoded, NOT base58
 */
export function handlePhantomReturn(): {
  publicKey: string;
  session: string;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const phantomPublicKeyB64 = params.get('phantom_encryption_public_key');
  const encryptedDataB64 = params.get('data');
  const nonceB64 = params.get('nonce');

  if (!phantomPublicKeyB64 || !encryptedDataB64 || !nonceB64) {
    return null;
  }

  console.log('✅ Phantom returned with payload');
  console.log('🔍 Phantom public key (base64):', phantomPublicKeyB64);
  console.log('🔍 Encrypted data (base64) length:', encryptedDataB64?.length);
  console.log('🔍 Nonce (base64):', nonceB64);

  try {
    // Get stored DApp keypair
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      console.error('❌ DApp keypair not found in sessionStorage');
      console.error('❌ Available sessionStorage keys:', Object.keys(sessionStorage));
      return null;
    }

    console.log('🧪 Attempting to decrypt using stored dappKeyPair');
    const secretKeyArray = JSON.parse(stored);
    console.log('🧪 Secret key array type:', Array.isArray(secretKeyArray) ? 'Array' : typeof secretKeyArray);
    console.log('🧪 Secret key array length:', Array.isArray(secretKeyArray) ? secretKeyArray.length : 'N/A');
    
    // Reconstruct X25519 keypair from stored secret key
    const secretKey = new Uint8Array(secretKeyArray);
    const dappKeypair = nacl.box.keyPair.fromSecretKey(secretKey);
    console.log('✅ DApp keypair loaded successfully');

    // Verify nonce
    const storedNonce = sessionStorage.getItem(SESSION_STORAGE_NONCE);
    if (storedNonce !== nonceB64) {
      console.error('❌ Nonce mismatch');
      console.error('❌ Stored nonce:', storedNonce);
      console.error('❌ Returned nonce:', nonceB64);
      return null;
    }

    // Decrypt the payload
    console.log('🔐 Starting decryption...');
    
    // CRITICAL: All values from Phantom are base64 encoded, NOT base58
    const phantomPubKeyBytes = decodeBase64(phantomPublicKeyB64);
    console.log('🔐 Phantom public key bytes length:', phantomPubKeyBytes.length);
    
    const encryptedBytes = decodeBase64(encryptedDataB64);
    console.log('🔐 Encrypted bytes length:', encryptedBytes.length);
    
    const nonceBytes = decodeBase64(nonceB64);
    console.log('🔐 Nonce bytes length:', nonceBytes.length);
    console.log('🔐 DApp secret key length:', dappKeypair.secretKey.length);
    
    // Decrypt using nacl.box.open (Phantom's format)
    console.log('🔐 Attempting nacl.box.open...');
    const decrypted = nacl.box.open(
      encryptedBytes,
      nonceBytes,
      phantomPubKeyBytes,
      dappKeypair.secretKey
    );

    if (!decrypted) {
      console.error('❌ Failed to decrypt Phantom payload - nacl.box.open returned null');
      console.error('❌ This usually means:');
      console.error('   1. Secret key is incorrect');
      console.error('   2. Encrypted data is corrupted');
      console.error('   3. Nonce mismatch');
      console.error('   4. Public key mismatch');
      console.error('   5. Wrong encryption format (Ed25519 vs X25519)');
      return null;
    }
    
    console.log('✅ Decryption successful, decrypted bytes length:', decrypted.length);

    // Parse the decrypted data
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    console.log('✅ Decrypted payload:', payload);

    // Extract public key and session
    const publicKey = payload.public_key || payload.publicKey || payload.wallet;
    const session = payload.session || payload.session_token || payload.sessionToken;

    if (!publicKey) {
      console.error('❌ No public key in decrypted payload');
      return null;
    }

    console.log('✅ Connected public key:', publicKey);
    console.log('✅ Session:', session ? 'Present' : 'Not present');

    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete('phantom_encryption_public_key');
    url.searchParams.delete('data');
    url.searchParams.delete('nonce');
    window.history.replaceState({}, '', url.toString());

    // Clean up sessionStorage
    sessionStorage.removeItem(SESSION_STORAGE_NONCE);

    return {
      publicKey,
      session: session || '',
    };
  } catch (error) {
    console.error('❌ Error handling Phantom return:', error);
    return null;
  }
}

/**
 * Check if we should use deep link (mobile Safari)
 */
export function shouldUseDeepLink(): boolean {
  console.log('🔍 shouldUseDeepLink() CALLED');
  console.log('🔍 Current URL:', typeof window !== 'undefined' ? window.location.href : 'window undefined');
  console.log('🔍 Current pathname:', typeof window !== 'undefined' ? window.location.pathname : 'window undefined');
  
  if (typeof window === 'undefined') {
    console.log('🔍 shouldUseDeepLink: window is undefined');
    return false;
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const currentPath = window.location.pathname;
  const isOnAppRoute = currentPath.startsWith('/app');
  
  console.log('🔍 shouldUseDeepLink check:', {
    userAgent,
    isMobile,
    isSafari,
    currentPath,
    isOnAppRoute,
    shouldUse: isMobile && isSafari
  });
  
  if (isMobile && isSafari && !isOnAppRoute) {
    console.warn('⚠️ Mobile Safari detected but NOT on /app route! Current path:', currentPath);
    console.warn('⚠️ Deep link will still work, but user should be on /app route');
  }
  
  return isMobile && isSafari;
}
