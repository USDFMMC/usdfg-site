import React, { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { useUSDFGWallet } from '@/lib/wallet/useUSDFGWallet';
import { isMobileSafari } from '@/lib/utils/isMobileSafari';

// NOTE: openPhantomMobile() function removed - connection logic now consolidated in useUSDFGWallet.connect()
// This prevents conflicts between multiple connection paths

interface WalletConnectSimpleProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  compact?: boolean;
}

const WalletConnectSimple: React.FC<WalletConnectSimpleProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  compact = false
}) => {
  const { publicKey, connected, connecting, connect, disconnect, mobile, connection } = useUSDFGWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);
  
  // CRITICAL: On mobile, check localStorage directly for Phantom connection
  // This ensures we detect connections even if parent component state is stale
  const [mobileConnectionState, setMobileConnectionState] = useState(() => {
    if (!mobile || typeof window === 'undefined') return { connected: false, publicKey: null };
    return {
      connected: localStorage.getItem('phantom_connected') === 'true',
      publicKey: localStorage.getItem('phantom_public_key')
    };
  });

  // Clean up stuck connection states on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear stuck connection states that are older than 10 seconds
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    if (connectTimestamp) {
      const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
      if (timeSinceConnect > 10000) {
        console.log("🧹 Clearing stuck connection state on mount");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        // Also clear redirect count if it's stale
        sessionStorage.removeItem('phantom_redirect_count');
      }
    } else {
      // No timestamp but marked as connecting - clear orphaned state
      const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
      if (isConnecting) {
        console.log("🧹 Clearing orphaned connection state on mount");
        sessionStorage.removeItem('phantom_connecting');
      }
    }
    
    // If there's no active connection and no recent attempt, clear phantom_original_tab
    // This allows normal browsing without the "new tab" warning
    const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    const hasRecentTimestamp = connectTimestamp && (Date.now() - parseInt(connectTimestamp) < 30000);
    if (!isConnecting && !hasRecentTimestamp) {
      // Clear original tab marker if there's no active connection
      // This prevents false positives on normal visits
      sessionStorage.removeItem('phantom_original_tab');
    }
  }, []);

  // Listen for localStorage changes (when Phantom sets connection)
  useEffect(() => {
    if (!mobile || typeof window === 'undefined') return;
    
    const checkConnection = () => {
      const isPhantomConnected = localStorage.getItem('phantom_connected') === 'true';
      const storedPublicKey = localStorage.getItem('phantom_public_key');
      setMobileConnectionState({
        connected: isPhantomConnected,
        publicKey: storedPublicKey
      });
    };
    
    // Check immediately
    checkConnection();
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'phantom_connected' || e.key === 'phantom_public_key') {
        checkConnection();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll periodically (in case storage event doesn't fire)
    const interval = setInterval(checkConnection, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [mobile]);

  // Handle connection state changes
  useEffect(() => {
    // On mobile, check BOTH the prop (from parent) AND localStorage directly
    // On desktop, use adapter connection or prop
    const actuallyConnected = mobile 
      ? (isConnected || connected || mobileConnectionState.connected) // Mobile: check prop, hook, and localStorage
      : (isConnected || (connected && publicKey)); // Desktop uses adapter or prop
    
    // Get the effective public key (from hook, localStorage, or prop)
    const effectivePublicKey = publicKey || 
      (mobile && mobileConnectionState.publicKey ? new PublicKey(mobileConnectionState.publicKey) : null) ||
      (mobile && typeof window !== 'undefined' && localStorage.getItem('phantom_public_key') 
        ? new PublicKey(localStorage.getItem('phantom_public_key')!) 
        : null);
    
    if (actuallyConnected && effectivePublicKey) {
      // Clear disconnect flag when user successfully connects
      localStorage.removeItem('wallet_disconnected');
      onConnect();
      
      logWalletEvent('connected', { wallet: effectivePublicKey.toString() });
      
      // Fetch SOL balance (non-blocking, fail gracefully)
      const fetchSOLBalance = async (): Promise<void> => {
        try {
          const balanceLamports = await Promise.race([
            connection.getBalance(effectivePublicKey, 'confirmed'),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          const balance = balanceLamports / LAMPORTS_PER_SOL;
          setBalance(balance);
        } catch (err: any) {
          setBalance(null);
        }
      };
      
      fetchSOLBalance().catch(() => {
        setBalance(null);
      });

      // Fetch USDFG balance (non-blocking, fail gracefully)
      const fetchUSDFGBalance = async (): Promise<void> => {
        try {
          const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, effectivePublicKey);
          const tokenBalance = await Promise.race([
            connection.getTokenAccountBalance(tokenAccount, 'confirmed'),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          const usdfg = tokenBalance.value.uiAmount || 0;
          setUsdfgBalance(usdfg);
        } catch (err: any) {
          setUsdfgBalance(0);
        }
      };
      
      fetchUSDFGBalance().catch(() => {
        setUsdfgBalance(0);
        });
    } else if (!actuallyConnected) {
      setBalance(null);
      setUsdfgBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, isConnected, mobile, mobileConnectionState, onConnect, onDisconnect, connection]);

  // Handle wallet connection
  // CRITICAL: Check connection guard BEFORE doing anything
  const handleConnect = () => {
    // CRITICAL: Only block if we're in a new tab AND there's evidence of a connection attempt
    // On first visit, there's no connection attempt, so allow connection
    const isOriginalTab = sessionStorage.getItem('phantom_original_tab') === 'true';
    const hasConnectionAttempt = sessionStorage.getItem('phantom_connecting') === 'true' || 
      sessionStorage.getItem('phantom_connect_timestamp') !== null ||
      sessionStorage.getItem('phantom_redirect_count') !== null;
    const isNewTab = !isOriginalTab && document.referrer === "" && window.name === "";
    
    if (isNewTab && mobile && hasConnectionAttempt) {
      console.warn("⚠️ Blocking connection attempt in new tab - this prevents infinite loops");
      console.warn("⚠️ Phantom opened a new tab instead of returning to the original");
      console.warn("⚠️ Please close this tab and use the original tab");
      alert("⚠️ This is a new tab opened by Phantom. Please close this tab and use the original tab to connect.");
      return;
    }
    
    // Prevent double-clicks
    if (connected || isConnected || connecting) {
      console.warn("⚠️ Already connected or connecting - ignoring click");
      return;
    }
    
    // CRITICAL: Check if Phantom connection is already in progress
    const isPhantomConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    
    // CRITICAL: Clear stuck connection states (if it's been more than 10 seconds)
    if (isPhantomConnecting) {
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        if (timeSinceConnect > 10000) {
          console.warn("⚠️ Clearing stuck connection state (older than 10 seconds)");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_connect_attempt');
        } else {
          console.warn("⚠️ Phantom connection already in progress - ignoring click");
          return;
        }
      } else {
        // No timestamp but marked as connecting - clear it
        console.warn("⚠️ Clearing orphaned connection state");
        sessionStorage.removeItem('phantom_connecting');
      }
    }
    
    // Check if we recently attempted (within last 3 seconds)
    const lastAttempt = sessionStorage.getItem('phantom_connect_attempt');
    if (lastAttempt) {
      const lastAttemptTime = new Date(lastAttempt).getTime();
      const now = Date.now();
      if (now - lastAttemptTime < 3000) {
        console.warn("⚠️ Connect called too soon after last attempt - ignoring");
        return;
      }
    }

    (async () => {
      // Set connecting state with timestamp
      sessionStorage.setItem('phantom_connecting', 'true');
      sessionStorage.setItem('phantom_connect_timestamp', Date.now().toString());
      sessionStorage.setItem('phantom_connect_attempt', new Date().toISOString());
      
      // Set a timeout to clear stuck states (30 seconds)
      const timeoutId = setTimeout(() => {
        const stillConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
        if (stillConnecting) {
          console.warn("⚠️ Connection timeout - clearing stuck state");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          alert("Connection timed out. Please try again. If Phantom didn't open, make sure it's installed from https://phantom.app");
        }
      }, 30000);
      
      try {
        logWalletEvent('selecting', { adapter: 'Phantom' });
        await connect();
        logWalletEvent('connect_called', { adapter: 'Phantom' });
        
        // Clear timeout and connecting state on success
        clearTimeout(timeoutId);
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
      } catch (error: any) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        
        logWalletEvent('error', { 
          message: error.message || 'Connection failed',
          error: String(error)
        });
        console.error('Connection error:', error);
        
        // Clear connecting state on error
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        
        if (error.message?.includes('User rejected') || error.message?.includes('User cancelled')) {
          console.log('User cancelled wallet connection');
        } else {
          // Show user-friendly error message
          const errorMessage = error.message || 'Unknown error';
          if (errorMessage.includes('not found') || errorMessage.includes('not detected') || errorMessage.includes('not available')) {
            alert(`Phantom wallet not found. Please install Phantom from https://phantom.app and try again.`);
          } else {
            alert(`Connection failed: ${errorMessage}`);
          }
        }
      }
    })();
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      logWalletEvent('disconnecting', {});
      await disconnect();
  
      // Clear disconnect flag
      localStorage.setItem('wallet_disconnected', 'true');
      window.dispatchEvent(new Event('walletDisconnected'));
      
      logWalletEvent('disconnected', {});
    } catch (error) {
      console.error('Disconnect error:', error);
      // Set disconnect flag even on error
      localStorage.setItem('wallet_disconnected', 'true');
    }
  };

  // If connected (via prop OR adapter), show connected state
  // On mobile, also check localStorage for stored connection
  const effectivePublicKey = publicKey || 
    (mobile && mobileConnectionState.publicKey ? new PublicKey(mobileConnectionState.publicKey) : null) ||
    (mobile && typeof window !== 'undefined' && localStorage.getItem('phantom_public_key')
      ? new PublicKey(localStorage.getItem('phantom_public_key')!)
      : null);
  const actuallyConnected = isConnected || (connected && effectivePublicKey) || 
    (mobile && (mobileConnectionState.connected || (typeof window !== 'undefined' && localStorage.getItem('phantom_connected') === 'true')) && effectivePublicKey);

  // Show connected state if connected
  if (actuallyConnected && effectivePublicKey) {
    // Compact mode for mobile
    if (compact) {
        return (
          <div className="flex flex-col items-end gap-1">
            {usdfgBalance !== null && (
              <div className="text-xs text-amber-300 font-semibold">
                {usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDFG
              </div>
            )}
          <button
              onClick={handleDisconnect}
            className="px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              <span className="hidden sm:inline">{effectivePublicKey.toString().slice(0, 4)}...</span>
            <span className="sm:hidden">Connected</span>
          </button>
          </div>
        );
    }
    
    // Full mode for desktop
    return (
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {effectivePublicKey.toString().slice(0, 8)}...{effectivePublicKey.toString().slice(-8)}
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-cyan-400 font-bold text-sm">
                {usdfgBalance !== null ? `${usdfgBalance.toLocaleString()} USDFG` : "Loading..."}
              </div>
              <div className="text-gray-400 text-xs">
                {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
              </div>
            </div>
          </div>
        </div>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
          🟢 Connected
        </span>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1 border border-gray-600 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // If connecting, show connecting state
  if (connecting) {
    return (
      <div className="flex flex-col space-y-2">
        <div className={`px-${compact ? '2.5' : '3'} py-${compact ? '1.5' : '2'} bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-${compact ? 'md' : 'lg'} text-${compact ? 'xs' : 'sm'} text-center`}>
          Connecting to Phantom...
        </div>
      </div>
    );
      }
  
  // Show connection button
  // CRITICAL: Always use handleConnect - it calls useUSDFGWallet.connect()
  // which now handles the logic: checks window.solana on mobile, uses adapter if available, deep link otherwise
  // This consolidates all connection logic in one place (useUSDFGWallet)
  const isMobile = isMobileSafari();
  const hasWindowSolana = typeof window !== "undefined" && !!(window as any).solana;
  
  // CRITICAL: Check if Phantom connection is in progress, but only if it's recent (not stuck)
  // Clear stuck states automatically
  let isPhantomConnecting = false;
  if (typeof window !== "undefined") {
    const connectingFlag = sessionStorage.getItem('phantom_connecting') === 'true';
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    
    if (connectingFlag && connectTimestamp) {
      const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
      // If connection state is older than 10 seconds, consider it stuck and clear it
      if (timeSinceConnect > 10000) {
        console.log("🧹 Clearing stuck connection state (older than 10 seconds)");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        isPhantomConnecting = false;
      } else {
        isPhantomConnecting = true;
      }
    } else if (connectingFlag && !connectTimestamp) {
      // No timestamp but marked as connecting - clear it (orphaned state)
      console.log("🧹 Clearing orphaned connection state");
      sessionStorage.removeItem('phantom_connecting');
      isPhantomConnecting = false;
    }
  }
  
  // CRITICAL: Only show warning if we're in a new tab AND there's a RECENT connection attempt
  // Don't show warning on normal visits - only when Phantom actually opened a new tab during connection
  const isOriginalTab = sessionStorage.getItem('phantom_original_tab') === 'true';
  
  // Check for RECENT connection attempt (within last 30 seconds)
  let hasRecentConnectionAttempt = false;
  if (typeof window !== "undefined") {
    // Must be actively connecting (not stuck)
    if (isPhantomConnecting) {
      hasRecentConnectionAttempt = true;
    } else {
      // Check if there's a recent timestamp (within 30 seconds)
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        if (timeSinceConnect < 30000) {
          hasRecentConnectionAttempt = true;
        } else {
          // Stale timestamp - clear it
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_redirect_count');
        }
      }
    }
  }
  
  // Only detect new tab if we're NOT the original tab AND there's no referrer
  // But also check if we have URL params (Phantom return) - if so, it's not a blocked new tab
  const hasPhantomParams = typeof window !== "undefined" && 
    (window.location.search.includes('phantom_encryption_public_key') || 
     window.location.search.includes('data') ||
     window.location.search.includes('nonce'));
  
  const isNewTab = typeof window !== "undefined" && 
    !isOriginalTab && 
    document.referrer === "" && 
    window.name === "" &&
    !hasPhantomParams; // Don't treat as blocked new tab if Phantom returned with params
  
  // Only block if we're in a new tab AND there's a RECENT connection attempt
  // AND we're on mobile (where deep links are used)
  const isNewTabBlocked = isNewTab && mobile && hasRecentConnectionAttempt;
  
  // If we're in a new tab on mobile with connection attempt, show a message instead of the button
  if (isNewTabBlocked) {
    return (
      <div className="flex flex-col space-y-2">
        <div className={`px-${compact ? '2.5' : '3'} py-${compact ? '1.5' : '2'} bg-red-600/20 text-red-300 border border-red-500/30 rounded-${compact ? 'md' : 'lg'} text-${compact ? 'xs' : 'sm'} text-center`}>
          ⚠️ New tab opened by Phantom
          <br />
          <span className="text-xs">Close this tab and use the original tab</span>
        </div>
      </div>
    );
  }
  
  // Only disable button if actually connecting (not stuck)
  const isButtonDisabled = connecting || connected || isPhantomConnecting;
  
  // Log detection for debugging
  if (isMobile) {
    console.log("🔍 Connection method detection:", {
      isMobile,
      hasWindowSolana,
      willUseAdapter: hasWindowSolana,
      willUseDeepLink: !hasWindowSolana,
      isPhantomConnecting,
      isButtonDisabled,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      solanaIsPhantom: typeof window !== "undefined" && !!(window as any).solana?.isPhantom
    });
  }
  
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
            className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
          >
          Connect Wallet
          </button>
        ) : (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-amber-400/50 shadow-lg shadow-amber-500/20 text-sm"
              >
          Connect Wallet
              </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
