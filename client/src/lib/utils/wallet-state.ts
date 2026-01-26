/**
 * Wallet State Utilities
 * Centralized management of wallet connection state in localStorage and sessionStorage
 * Reduces code duplication across multiple files
 */

/**
 * Phantom connection state stored in localStorage
 */
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
  safeSessionStorageGetItem,
  safeSessionStorageRemoveItem,
  safeSessionStorageSetItem
} from './storage';

export interface PhantomConnectionState {
  connected: boolean;
  publicKey: string | null;
}

/**
 * Get Phantom connection state from localStorage
 */
export function getPhantomConnectionState(): PhantomConnectionState {
  if (typeof window === 'undefined') {
    return { connected: false, publicKey: null };
  }

  const connected = safeLocalStorageGetItem('phantom_connected') === 'true';
  const publicKey = safeLocalStorageGetItem('phantom_public_key');
  const walletDisconnected = safeLocalStorageGetItem('wallet_disconnected') === 'true';

  // If explicitly disconnected or no public key, return disconnected state
  if (walletDisconnected || (connected && !publicKey)) {
    return { connected: false, publicKey: null };
  }

  return {
    connected: connected && !!publicKey,
    publicKey: publicKey || null
  };
}

/**
 * Set Phantom connection state in localStorage
 */
export function setPhantomConnectionState(connected: boolean, publicKey?: string): void {
  if (typeof window === 'undefined') return;

  if (connected && publicKey) {
    safeLocalStorageSetItem('phantom_connected', 'true');
    safeLocalStorageSetItem('phantom_public_key', publicKey);
    safeLocalStorageRemoveItem('wallet_disconnected');
  } else {
    clearPhantomConnectionState();
  }
}

/**
 * Clear Phantom connection state from localStorage
 */
export function clearPhantomConnectionState(): void {
  if (typeof window === 'undefined') return;

  safeLocalStorageRemoveItem('phantom_connected');
  safeLocalStorageRemoveItem('phantom_public_key');
  safeLocalStorageSetItem('wallet_disconnected', 'true');
}

/**
 * Check if Phantom is marked as connecting in sessionStorage
 */
export function isPhantomConnecting(): boolean {
  if (typeof window === 'undefined') return false;
  return safeSessionStorageGetItem('phantom_connecting') === 'true';
}

/**
 * Set Phantom connecting state in sessionStorage
 */
export function setPhantomConnecting(isConnecting: boolean, timestamp?: number): void {
  if (typeof window === 'undefined') return;

  if (isConnecting) {
    safeSessionStorageSetItem('phantom_connecting', 'true');
    safeSessionStorageSetItem('phantom_connect_timestamp', (timestamp || Date.now()).toString());
    safeSessionStorageSetItem('phantom_connect_attempt', new Date().toISOString());
  } else {
    clearPhantomConnectingState();
  }
}

/**
 * Get Phantom connection timestamp from sessionStorage
 */
export function getPhantomConnectTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  const timestamp = safeSessionStorageGetItem('phantom_connect_timestamp');
  return timestamp ? parseInt(timestamp) : null;
}

/**
 * Check if Phantom connection attempt is recent (within specified milliseconds)
 */
export function isRecentPhantomConnection(maxAgeMs: number = 10000): boolean {
  const timestamp = getPhantomConnectTimestamp();
  if (!timestamp) return false;
  return (Date.now() - timestamp) < maxAgeMs;
}

/**
 * Clear all Phantom connecting state from sessionStorage
 */
export function clearPhantomConnectingState(): void {
  if (typeof window === 'undefined') return;

  safeSessionStorageRemoveItem('phantom_connecting');
  safeSessionStorageRemoveItem('phantom_connect_timestamp');
  safeSessionStorageRemoveItem('phantom_connect_attempt');
  safeSessionStorageRemoveItem('phantom_redirect_count');
  safeSessionStorageRemoveItem('phantom_original_tab');
}

/**
 * Clear all Phantom-related state (both localStorage and sessionStorage)
 */
export function clearAllPhantomState(): void {
  clearPhantomConnectionState();
  clearPhantomConnectingState();
  
  if (typeof window !== 'undefined') {
    safeLocalStorageRemoveItem('wallet_connected');
    safeLocalStorageRemoveItem('wallet_address');
    safeSessionStorageRemoveItem('last_logged_wallet');
  }
}

/**
 * Validate and clean up stale Phantom connection state
 * Removes localStorage state if wallet adapter says not connected (unless very recent)
 */
export function validatePhantomConnectionState(
  adapterConnected: boolean,
  adapterPublicKey: string | null,
  maxRecentAgeMs: number = 2000
): boolean {
  if (typeof window === 'undefined') return false;

  const storedState = getPhantomConnectionState();
  
  // If adapter says not connected but localStorage says connected, check if it's stale
  if (storedState.connected && !adapterConnected) {
    const isRecent = isRecentPhantomConnection(maxRecentAgeMs);
    
    if (!isRecent) {
      // Stale state - clear it
      clearPhantomConnectionState();
      return false;
    }
  }

  // If adapter says connected, update localStorage
  if (adapterConnected && adapterPublicKey) {
    setPhantomConnectionState(true, adapterPublicKey);
    return true;
  }

  return storedState.connected;
}
