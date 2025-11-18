/**
 * Phantom Deep Link Connection Handler
 * Implements the Safari → Phantom → Safari flow using deep links
 * Similar to tools.smithii.io implementation
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const PHANTOM_DEEPLINK_BASE = 'https://phantom.app/ul/v1/connect';
const SESSION_STORAGE_KEY = 'phantom_dapp_keypair';
const SESSION_STORAGE_NONCE = 'phantom_dapp_nonce';

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
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  console.log('🚀 Launching Phantom deep link...');

  try {
    const dappKeypair = getOrCreateDAppKeypair();
    const nonce = generateNonce();
    
    // Store nonce for verification
    sessionStorage.setItem(SESSION_STORAGE_NONCE, nonce);
    console.log('💾 Stored nonce in sessionStorage:', nonce);

    const dappPublicKey = dappKeypair.publicKey.toBase58();
    
    // CRITICAL: redirect_link MUST be properly URI-encoded
    // If not encoded, Phantom will not open and Safari will load it as a webpage
    const redirect = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
    const appUrl = encodeURIComponent(window.location.origin);

    // Build URL using URLSearchParams for proper encoding
    const params = new URLSearchParams({
      dapp_encryption_public_key: dappPublicKey,
      redirect_link: redirect,
      app_url: appUrl,
      nonce: nonce,
    });

    const deepLinkUrl = `${PHANTOM_DEEPLINK_BASE}?${params.toString()}`;

    console.log('🔗 Deep Link URL:', deepLinkUrl);
    console.log('📱 Redirecting to Phantom NOW...');
    console.log('📍 DApp Public Key:', dappPublicKey);
    console.log('📍 Redirect Link (encoded):', redirect);
    console.log('📍 App URL (encoded):', appUrl);
    console.log('📍 Nonce:', nonce);

    // CRITICAL: Redirect to Phantom immediately
    // This MUST execute for the deep link to work
    window.location.href = deepLinkUrl;
    
    // If we somehow get here, log a warning
    console.warn('⚠️ window.location.href was set but redirect may not have occurred');
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
  console.log('🔍 Nonce:', nonce);

  try {
    // Get stored DApp keypair
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      console.error('❌ DApp keypair not found in sessionStorage');
      return null;
    }

    const secretKey = JSON.parse(stored);
    const dappKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

    // Verify nonce
    const storedNonce = sessionStorage.getItem(SESSION_STORAGE_NONCE);
    if (storedNonce !== nonce) {
      console.error('❌ Nonce mismatch');
      return null;
    }

    // Decrypt the payload
    const phantomPubKey = new PublicKey(phantomPublicKey);
    const encryptedBytes = bs58.decode(encryptedData);
    const nonceBytes = bs58.decode(nonce);
    
    // Decrypt using nacl.box.open (Phantom's format)
    const decrypted = nacl.box.open(
      encryptedBytes,
      nonceBytes,
      phantomPubKey.toBytes(),
      dappKeypair.secretKey
    );

    if (!decrypted) {
      console.error('❌ Failed to decrypt Phantom payload');
      return null;
    }

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
  if (typeof window === 'undefined') {
    console.log('🔍 shouldUseDeepLink: window is undefined');
    return false;
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  
  console.log('🔍 shouldUseDeepLink check:', {
    userAgent,
    isMobile,
    isSafari,
    shouldUse: isMobile && isSafari
  });
  
  return isMobile && isSafari;
}

