/**
 * Wallet State Utilities
 * Centralized management of wallet connection state in localStorage and sessionStorage
 * Reduces code duplication across multiple files
 */

/**
 * Phantom connection state stored in localStorage
 */
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

  const connected = localStorage.getItem('phantom_connected') === 'true';
  const publicKey = localStorage.getItem('phantom_public_key');
  const walletDisconnected = localStorage.getItem('wallet_disconnected') === 'true';

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
    localStorage.setItem('phantom_connected', 'true');
    localStorage.setItem('phantom_public_key', publicKey);
    localStorage.removeItem('wallet_disconnected');
  } else {
    clearPhantomConnectionState();
  }
}

/**
 * Clear Phantom connection state from localStorage
 */
export function clearPhantomConnectionState(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('phantom_connected');
  localStorage.removeItem('phantom_public_key');
  localStorage.setItem('wallet_disconnected', 'true');
}

/**
 * Check if Phantom is marked as connecting in sessionStorage
 */
export function isPhantomConnecting(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('phantom_connecting') === 'true';
}

/**
 * Set Phantom connecting state in sessionStorage
 */
export function setPhantomConnecting(isConnecting: boolean, timestamp?: number): void {
  if (typeof window === 'undefined') return;

  if (isConnecting) {
    sessionStorage.setItem('phantom_connecting', 'true');
    sessionStorage.setItem('phantom_connect_timestamp', (timestamp || Date.now()).toString());
    sessionStorage.setItem('phantom_connect_attempt', new Date().toISOString());
  } else {
    clearPhantomConnectingState();
  }
}

/**
 * Get Phantom connection timestamp from sessionStorage
 */
export function getPhantomConnectTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  const timestamp = sessionStorage.getItem('phantom_connect_timestamp');
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

  sessionStorage.removeItem('phantom_connecting');
  sessionStorage.removeItem('phantom_connect_timestamp');
  sessionStorage.removeItem('phantom_connect_attempt');
  sessionStorage.removeItem('phantom_redirect_count');
  sessionStorage.removeItem('phantom_original_tab');
}

/**
 * Clear all Phantom-related state (both localStorage and sessionStorage)
 */
export function clearAllPhantomState(): void {
  clearPhantomConnectionState();
  clearPhantomConnectingState();
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_address');
    sessionStorage.removeItem('last_logged_wallet');
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
