/**
 * Phantom Deep Link Connection Handler
 * Implements the Safari → Phantom → Safari flow using deep links
 * Similar to tools.smithii.io implementation
 */

console.log('🔍 DEEPLINK MODULE LOADED - phantom-deeplink.ts imported');

import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const PHANTOM_DEEPLINK_BASE = 'https://phantom.app/ul/v1/connect';
const SESSION_STORAGE_KEY = 'phantom_dapp_keypair';
export const SESSION_STORAGE_NONCE = 'phantom_dapp_nonce';

/**
 * Generate a DApp keypair for encryption
 */
function getOrCreateDAppKeypair(): Keypair {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  // Try to get existing keypair from sessionStorage
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    try {
      const secretKey = JSON.parse(stored);
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    } catch (e) {
      console.warn('Failed to parse stored keypair, creating new one');
    }
  }

  // Create new keypair
  const keypair = Keypair.generate();
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

/**
 * Generate a random nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Launch Phantom deep link for connection
 */
export function launchPhantomDeepLink(): void {
  console.log('🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts');
  console.log('🔍 launchPhantomDeepLink() CALLED');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);
  console.log('🔍 Stack trace:', new Error().stack);
  
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
    
    const dappKeypair = getOrCreateDAppKeypair();
    const nonce = generateNonce();
    
    // Store nonce for verification
    sessionStorage.setItem(SESSION_STORAGE_NONCE, nonce);
    // Mark this as the original tab (so we can detect if Phantom opens a new tab)
    sessionStorage.setItem('phantom_original_tab', 'true');
    console.log('💾 Stored nonce in sessionStorage:', nonce);
    console.log('💾 Marked as original tab');
    console.log('💾 Marked as connecting (prevents duplicates)');

    const dappPublicKey = dappKeypair.publicKey.toBase58();
    
    // CRITICAL: Hardcoded redirect URL - matches Smithii behavior
    // Phantom ALWAYS returns to /app, regardless of where user clicked Connect
    // This is stable, consistent, and matches tools.smithii.io exactly
    const redirectLink = encodeURIComponent("https://usdfg.pro/app");
    // app_url is what Phantom displays in connected accounts - use full app path
    const appUrl = encodeURIComponent("https://usdfg.pro/app");
    
    // Store redirect URL globally for debugging
    (window as any).__phantom_debug_redirect = "https://usdfg.pro/app/index.html";

    console.log('🔗 Redirect link (HARDCODED /app/index.html):', "https://usdfg.pro/app/index.html");
    console.log('🔗 App URL (HARDCODED - what Phantom displays):', "https://usdfg.pro/app/index.html");
    console.log('🔍 DEBUG: window.__phantom_debug_redirect =', "https://usdfg.pro/app/index.html");
    
    // Build deep link URL with properly encoded parameters
    // Format matches Phantom's expected structure exactly
    const deepLinkUrl = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}&dapp_encryption_public_key=${dappPublicKey}&nonce=${nonce}&cluster=devnet`;

    // CRITICAL LOG - This shows EXACTLY what redirect URL is being sent to Phantom
    console.log('🔗 Redirecting Phantom to (HARDCODED):', "https://usdfg.pro/app/index.html");
    console.log('🔗 Redirect Link (encoded):', redirectLink);
    console.log('🔗 App URL (HARDCODED - displayed in Phantom):', "https://usdfg.pro/app/index.html");
    console.log('🔗 App URL (encoded):', appUrl);
    console.log('🔗 Full Deep Link URL:', deepLinkUrl);
    console.log('📱 Redirecting to Phantom NOW...');
    console.log('📍 DApp Public Key:', dappPublicKey);
    console.log('📍 Nonce:', nonce);

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
 */
export function handlePhantomReturn(): {
  publicKey: string;
  session: string;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const phantomPublicKey = params.get('phantom_encryption_public_key');
  const encryptedData = params.get('data');
  const nonce = params.get('nonce');

  if (!phantomPublicKey || !encryptedData || !nonce) {
    return null;
  }

  console.log('✅ Phantom returned with payload');
  console.log('🔍 Phantom public key:', phantomPublicKey);
  console.log('🔍 Encrypted data length:', encryptedData?.length);
  console.log('🔍 Nonce:', nonce);

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
    
    const secretKey = new Uint8Array(secretKeyArray);
    const dappKeypair = Keypair.fromSecretKey(secretKey);
    console.log('✅ DApp keypair loaded successfully');

    // Verify nonce
    const storedNonce = sessionStorage.getItem(SESSION_STORAGE_NONCE);
    if (storedNonce !== nonce) {
      console.error('❌ Nonce mismatch');
      return null;
    }

    // Decrypt the payload
    console.log('🔐 Starting decryption...');
    const phantomPubKey = new PublicKey(phantomPublicKey);
    console.log('🔐 Phantom public key bytes length:', phantomPubKey.toBytes().length);
    
    const encryptedBytes = bs58.decode(encryptedData);
    console.log('🔐 Encrypted bytes length:', encryptedBytes.length);
    
    const nonceBytes = bs58.decode(nonce);
    console.log('🔐 Nonce bytes length:', nonceBytes.length);
    console.log('🔐 DApp secret key length:', dappKeypair.secretKey.length);
    
    // Decrypt using nacl.box.open (Phantom's format)
    console.log('🔐 Attempting nacl.box.open...');
    const decrypted = nacl.box.open(
      encryptedBytes,
      nonceBytes,
      phantomPubKey.toBytes(),
      dappKeypair.secretKey
    );

    if (!decrypted) {
      console.error('❌ Failed to decrypt Phantom payload - nacl.box.open returned null');
      console.error('❌ This usually means:');
      console.error('   1. Secret key is incorrect');
      console.error('   2. Encrypted data is corrupted');
      console.error('   3. Nonce mismatch');
      console.error('   4. Public key mismatch');
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

