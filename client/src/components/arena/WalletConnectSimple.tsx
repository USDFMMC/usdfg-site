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
      
      console.log("🔍 [Mobile] Checking connection:", { isPhantomConnected, hasPublicKey: !!storedPublicKey });
      
      // If connected, clear any connecting flags
      if (isPhantomConnected && storedPublicKey) {
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        console.log("✅ [Mobile] Connection detected - updating state");
      }
      
      setMobileConnectionState({
        connected: isPhantomConnected,
        publicKey: storedPublicKey
      });
      
      // Force parent component re-render by calling onConnect if newly connected
      if (isPhantomConnected && storedPublicKey) {
        onConnect();
      }
    };
    
    // Check immediately
    checkConnection();
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'phantom_connected' || e.key === 'phantom_public_key') {
        console.log("📢 [Mobile] Storage event detected:", e.key);
        checkConnection();
      }
    };
    
    // Listen for custom phantom_connected event
    const handlePhantomConnected = () => {
      console.log("📢 [Mobile] Received phantom_connected event");
      checkConnection();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('phantom_connected', handlePhantomConnected);
    
    // Poll more aggressively on mobile (every 300ms instead of 500ms)
    const interval = setInterval(checkConnection, 300);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('phantom_connected', handlePhantomConnected);
      clearInterval(interval);
    };
  }, [mobile, onConnect]);

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
      
      // Only log and call onConnect if this is a new connection (check last logged wallet)
      const lastLoggedWallet = sessionStorage.getItem('last_logged_wallet');
      const currentWalletString = effectivePublicKey.toString();
      
      if (lastLoggedWallet !== currentWalletString) {
        logWalletEvent('connected', { wallet: currentWalletString });
        sessionStorage.setItem('last_logged_wallet', currentWalletString);
        onConnect();
      }
      
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
      // Only call onDisconnect if we were previously connected
      const lastLoggedWallet = sessionStorage.getItem('last_logged_wallet');
      if (lastLoggedWallet) {
        sessionStorage.removeItem('last_logged_wallet');
        onDisconnect();
      }
      setBalance(null);
      setUsdfgBalance(null);
    }
  }, [connected, publicKey, isConnected, mobile, mobileConnectionState, onConnect, onDisconnect, connection]);

  // Calculate derived values (needed before conditional returns)
  const effectivePublicKey = publicKey || 
    (mobile && mobileConnectionState.publicKey ? new PublicKey(mobileConnectionState.publicKey) : null) ||
    (mobile && typeof window !== 'undefined' && localStorage.getItem('phantom_public_key')
      ? new PublicKey(localStorage.getItem('phantom_public_key')!)
      : null);
  const actuallyConnected = Boolean(isConnected || (connected && effectivePublicKey) || 
    (mobile && (mobileConnectionState.connected || (typeof window !== 'undefined' && localStorage.getItem('phantom_connected') === 'true')) && effectivePublicKey));

  // Calculate mobile-specific connection state
  const isMobile = isMobileSafari();
  const hasWindowSolana = typeof window !== "undefined" && !!(window as any).solana;
  
  // CRITICAL: Check if Phantom connection is in progress, but only if it's recent (not stuck)
  let isPhantomConnecting = false;
  if (typeof window !== "undefined") {
    const connectingFlag = sessionStorage.getItem('phantom_connecting') === 'true';
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    
    if (connectingFlag && connectTimestamp) {
      const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
      if (timeSinceConnect > 5000) {
        console.log("🧹 Clearing stuck connection state (older than 5 seconds)");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        isPhantomConnecting = false;
      } else {
        isPhantomConnecting = true;
      }
    } else if (connectingFlag && !connectTimestamp) {
      console.log("🧹 Clearing orphaned connection state immediately");
      sessionStorage.removeItem('phantom_connecting');
      isPhantomConnecting = false;
    }
  }
  
  // Calculate button disabled state
  let isButtonDisabled = false;
  if (mobile) {
    const veryRecentConnection = isPhantomConnecting && typeof window !== "undefined";
    if (veryRecentConnection) {
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        if (timeSinceConnect > 2000) {
          isButtonDisabled = false;
        } else {
          isButtonDisabled = true;
        }
      }
    }
    if (actuallyConnected) {
      isButtonDisabled = true;
    }
  } else {
    isButtonDisabled = connecting || actuallyConnected || isPhantomConnecting;
  }

  // Only log button state changes (not on every render) - reduces console spam
  // CRITICAL: This hook must be called BEFORE any conditional returns
  useEffect(() => {
    if (isMobile && typeof window !== "undefined") {
      const stateKey = `${actuallyConnected}-${connecting}-${isPhantomConnecting}-${isButtonDisabled}`;
      const lastState = sessionStorage.getItem('last_button_state');
      if (lastState !== stateKey) {
        console.log("🔍 Button state changed:", {
          actuallyConnected,
          connecting,
          isPhantomConnecting,
          isButtonDisabled
        });
        sessionStorage.setItem('last_button_state', stateKey);
      }
    }
  }, [actuallyConnected, connecting, isPhantomConnecting, isButtonDisabled, isMobile]);

  // Handle wallet connection
  // CRITICAL: On mobile, be VERY permissive - allow connection attempts
  const handleConnect = () => {
    // Prevent multiple simultaneous connection attempts
    if (connecting) {
      console.warn("⚠️ Connection already in progress - ignoring click");
      return;
    }
    
    console.log("🔘 Connect button clicked", { mobile, actuallyConnected, connecting, isPhantomConnecting });
    
    // On mobile, be very permissive - only block if definitely connected
    if (mobile) {
      // Check if actually connected (check localStorage directly)
      const isActuallyConnected = typeof window !== "undefined" && 
        localStorage.getItem('phantom_connected') === 'true';
      
      if (isActuallyConnected) {
        console.log("✅ Already connected on mobile - ignoring click");
        return;
      }
      
      // Clear any stale connection states before proceeding
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        // If older than 2 seconds, clear it (very aggressive on mobile)
        if (timeSinceConnect > 2000) {
          console.log("🧹 Clearing stale connection state on mobile (older than 2 seconds)");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_connect_attempt');
        }
      } else {
        // No timestamp - clear any orphaned state
        sessionStorage.removeItem('phantom_connecting');
      }
      
      // Allow connection to proceed on mobile (don't block)
    } else {
      // Desktop: Use normal checks
      const actuallyConnected = connected || isConnected;
      if (actuallyConnected || connecting) {
        console.warn("⚠️ Already connected or connecting - ignoring click");
        return;
      }
      
      // Clear stuck states on desktop too
      const isPhantomConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
      if (isPhantomConnecting) {
        const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
        if (connectTimestamp) {
          const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
          if (timeSinceConnect > 5000) {
            console.warn("⚠️ Clearing stuck connection state (older than 5 seconds)");
            sessionStorage.removeItem('phantom_connecting');
            sessionStorage.removeItem('phantom_connect_timestamp');
            sessionStorage.removeItem('phantom_connect_attempt');
          }
        } else {
          sessionStorage.removeItem('phantom_connecting');
        }
      }
    }

    (async () => {
      // CRITICAL: On mobile, DON'T set connecting state here
      // Let phantomMobileConnect() set it when it actually navigates
      // This prevents the guard from blocking the first call
      if (!mobile) {
        // Desktop: Set connecting state with timestamp
        sessionStorage.setItem('phantom_connecting', 'true');
        sessionStorage.setItem('phantom_connect_timestamp', Date.now().toString());
        sessionStorage.setItem('phantom_connect_attempt', new Date().toISOString());
      }
      
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
        
        // Wrap in try-catch to prevent React hook order issues
        try {
          await connect();
        } catch (connectError: any) {
          // Log the error but re-throw it to be handled by outer catch
          console.error('❌ Connection error in handleConnect:', connectError);
          throw connectError;
        }
        
        logWalletEvent('connect_called', { adapter: 'Phantom' });
        
        // Clear timeout and connecting state on success
        clearTimeout(timeoutId);
        if (!mobile) {
          // Desktop: Clear connecting state
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
        }
        // Mobile: phantomMobileConnect() handles its own state
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
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 border border-amber-500/50 shadow-sm shadow-amber-500/10 text-sm backdrop-blur-sm"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
              >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
