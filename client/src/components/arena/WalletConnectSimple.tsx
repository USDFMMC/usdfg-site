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

  // Clean up stuck connection states on mount - be aggressive on Safari
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear stuck connection states that are older than 5 seconds (more aggressive)
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    if (connectTimestamp) {
      const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
      if (timeSinceConnect > 5000) {
        console.log("🧹 Clearing stuck connection state on mount (older than 5 seconds)");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        // Also clear redirect count if it's stale
        sessionStorage.removeItem('phantom_redirect_count');
        // Clear original tab marker if connection is stale
        sessionStorage.removeItem('phantom_original_tab');
      }
    } else {
      // No timestamp but marked as connecting - clear orphaned state immediately
      const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
      if (isConnecting) {
        console.log("🧹 Clearing orphaned connection state on mount immediately");
        sessionStorage.removeItem('phantom_connecting');
        // If there's no timestamp, Phantom probably didn't open - clear original tab marker
        sessionStorage.removeItem('phantom_original_tab');
        sessionStorage.removeItem('phantom_redirect_count');
      }
    }
    
    // If there's no active connection and no recent attempt, clear phantom_original_tab
    // This allows normal browsing without the "new tab" warning
    const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    const hasRecentTimestamp = connectTimestamp && (Date.now() - parseInt(connectTimestamp) < 5000);
    if (!isConnecting && !hasRecentTimestamp) {
      // Clear original tab marker if there's no active connection
      // This prevents false positives on normal visits
      sessionStorage.removeItem('phantom_original_tab');
      sessionStorage.removeItem('phantom_redirect_count');
    }
    
    // Force a re-render after cleanup to ensure button state updates
    // This is especially important on Safari where state might be stale
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 100);
  }, []);

  // Listen for localStorage changes (when Phantom sets connection)
  useEffect(() => {
    if (!mobile || typeof window === 'undefined') return;
    
    const checkConnection = () => {
      const isPhantomConnected = localStorage.getItem('phantom_connected') === 'true';
      const storedPublicKey = localStorage.getItem('phantom_public_key');
      
      // If connected, clear any connecting flags
      if (isPhantomConnected && storedPublicKey) {
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
      }
      
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
    
    // Listen for custom phantom_connected event
    const handlePhantomConnected = () => {
      console.log("📢 Received phantom_connected event");
      checkConnection();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('phantom_connected', handlePhantomConnected);
    
    // Also poll periodically (in case storage event doesn't fire)
    const interval = setInterval(checkConnection, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('phantom_connected', handlePhantomConnected);
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
    
    // Prevent double-clicks - check actual connected state (mobile-aware)
    const actuallyConnected = mobile ? mobileConnectionState.connected : (connected || isConnected);
    if (actuallyConnected || connecting) {
      console.warn("⚠️ Already connected or connecting - ignoring click");
      return;
    }
    
    // CRITICAL: Check if Phantom connection is already in progress
    // Be aggressive about clearing stale state on Safari
    const isPhantomConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    
    // CRITICAL: Clear stuck connection states (if it's been more than 5 seconds)
    // More aggressive timeout for Safari to ensure button is clickable
    if (isPhantomConnecting) {
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        if (timeSinceConnect > 5000) {
          console.warn("⚠️ Clearing stuck connection state (older than 5 seconds)");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_connect_attempt');
          // Continue with connection attempt
        } else {
          // Very recent connection attempt - allow it to proceed (might be a retry)
          console.log("ℹ️ Recent connection attempt detected, but allowing retry");
          // Don't block - let the connection logic handle it
        }
      } else {
        // No timestamp but marked as connecting - clear it immediately
        console.warn("⚠️ Clearing orphaned connection state immediately");
        sessionStorage.removeItem('phantom_connecting');
        // Continue with connection attempt
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
  // Clear stuck states automatically - be aggressive about clearing on Safari
  let isPhantomConnecting = false;
  if (typeof window !== "undefined") {
    const connectingFlag = sessionStorage.getItem('phantom_connecting') === 'true';
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    
    if (connectingFlag && connectTimestamp) {
      const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
      // If connection state is older than 5 seconds, consider it stuck and clear it (more aggressive)
      // This ensures button is clickable quickly on Safari
      if (timeSinceConnect > 5000) {
        console.log("🧹 Clearing stuck connection state (older than 5 seconds)");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        isPhantomConnecting = false;
      } else {
        // Only consider it connecting if it's very recent (within 5 seconds)
        isPhantomConnecting = true;
      }
    } else if (connectingFlag && !connectTimestamp) {
      // No timestamp but marked as connecting - clear it immediately (orphaned state)
      console.log("🧹 Clearing orphaned connection state immediately");
      sessionStorage.removeItem('phantom_connecting');
      isPhantomConnecting = false;
    } else {
      // No connecting flag at all - ensure it's false
      isPhantomConnecting = false;
    }
  }
  
  // Removed new tab warning - if Phantom works correctly, it returns to same tab
  // If it opens a new tab, user can close it themselves (no need for warning)
  
  // Only disable button if actually connecting (not stuck) or already connected
  // On mobile Safari, be more lenient - only disable if very recent connection attempt
  const isButtonDisabled = connecting || actuallyConnected || (isPhantomConnecting && mobile);
  
  // Log detection for debugging - especially helpful for Safari issues
  if (isMobile || typeof window !== "undefined") {
    console.log("🔍 Button state check:", {
      isMobile,
      hasWindowSolana,
      connecting,
      connected,
      isConnected,
      mobileConnectionState,
      actuallyConnected,
      isPhantomConnecting,
      isButtonDisabled,
      phantomConnectingFlag: typeof window !== "undefined" ? sessionStorage.getItem('phantom_connecting') : null,
      connectTimestamp: typeof window !== "undefined" ? sessionStorage.getItem('phantom_connect_timestamp') : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      solanaIsPhantom: typeof window !== "undefined" && !!(window as any).solana?.isPhantom
    });
  }
  
  // Show connected state if connected
  if (actuallyConnected && effectivePublicKey) {
    const shortAddress = `${effectivePublicKey.toString().slice(0, 4)}...${effectivePublicKey.toString().slice(-4)}`;
    return (
      <div className="flex flex-col space-y-2">
        {compact ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-green-500/10 text-green-300 border border-green-500/40 rounded-md text-xs font-normal hover:bg-green-500/20 hover:border-green-500/60 transition-all backdrop-blur-sm"
          >
            {shortAddress}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="px-4 py-1.5 bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 font-light tracking-wide rounded-md hover:from-green-500/30 hover:to-green-600/30 transition-all border border-green-500/50 shadow-sm shadow-green-500/10 text-sm backdrop-blur-sm"
          >
            {shortAddress}
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
            className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/40 rounded-md text-xs font-normal hover:bg-amber-500/20 hover:border-amber-500/60 transition-all disabled:opacity-50 backdrop-blur-sm"
          >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 border border-amber-500/50 shadow-sm shadow-amber-500/10 text-sm backdrop-blur-sm"
              >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
