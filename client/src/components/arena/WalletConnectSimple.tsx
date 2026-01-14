import React, { useState, useEffect, useMemo, useRef } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { useUSDFGWallet } from '@/lib/wallet/useUSDFGWallet';
import { isMobileSafari } from '@/lib/utils/isMobileSafari';
import { 
  getPhantomConnectionState, 
  setPhantomConnectionState, 
  clearPhantomConnectionState,
  isPhantomConnecting,
  setPhantomConnecting,
  getPhantomConnectTimestamp,
  isRecentPhantomConnection,
  clearPhantomConnectingState,
  validatePhantomConnectionState
} from '@/lib/utils/wallet-state';

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
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when connecting state changes
  
  // CRITICAL: On mobile, check localStorage directly for Phantom connection
  // This ensures we detect connections even if parent component state is stale
  // BUT: Validate on mount - if localStorage says connected but no valid connection, clear it
  const [mobileConnectionState, setMobileConnectionState] = useState(() => {
    if (!mobile || typeof window === 'undefined') return { connected: false, publicKey: null };
    
    // Use utility function to get connection state
    const storedState = getPhantomConnectionState();
    
    // If user explicitly disconnected or localStorage is stale, clear it
    if (localStorage.getItem('wallet_disconnected') === 'true' || (storedState.connected && !storedState.publicKey)) {
      clearPhantomConnectionState();
      return { connected: false, publicKey: null };
    }
    
    return storedState;
  });

  // Clean up stuck connection states on mount - be aggressive on Safari
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // CRITICAL FIX FOR MOBILE: If adapter says not connected, clear ALL localStorage state
    // This prevents the green button from showing when wallet is not actually connected
    if (mobile && (!connected || !publicKey)) {
      // On mobile, if adapter says not connected, clear localStorage immediately
      // This ensures users always see "Connect Wallet" button, not stuck green button
      clearPhantomConnectionState();
      setMobileConnectionState({ connected: false, publicKey: null });
    }
    
    // CRITICAL FIX: Validate localStorage connection state matches actual state
    // Use utility function to validate and clean up stale state
    const isValid = validatePhantomConnectionState(connected, publicKey?.toString() || null, mobile ? 2000 : 10000);
    
    if (!isValid && mobile) {
      setMobileConnectionState({ connected: false, publicKey: null });
    }
    
    // Clear stuck connection states that are older than threshold (more aggressive on mobile)
    const connectTimestamp = getPhantomConnectTimestamp();
    const stuckThreshold = mobile ? 10000 : 15000; // 10 seconds on mobile, 15 on desktop
    if (connectTimestamp) {
      const timeSinceConnect = Date.now() - connectTimestamp;
      if (timeSinceConnect > stuckThreshold) {
        console.log("🧹 Clearing stuck connecting state (older than threshold)");
        clearPhantomConnectingState();
      }
    } else {
      // No timestamp but marked as connecting - clear orphaned state immediately
      if (isPhantomConnecting()) {
        console.log("🧹 Clearing orphaned connecting state (no timestamp)");
        clearPhantomConnectingState();
      }
    }
    
    // CRITICAL FIX FOR MOBILE: Also check if wallet adapter says not connecting but sessionStorage says connecting
    // This prevents stuck "Connecting..." state when adapter has given up
    if (mobile && !connecting && isPhantomConnecting()) {
      const timestamp = getPhantomConnectTimestamp();
      if (timestamp && (Date.now() - timestamp > 5000)) {
        // Adapter says not connecting but sessionStorage says connecting for >5 seconds - clear it
        console.log("🧹 Clearing stuck mobile connecting state (adapter says not connecting)");
        clearPhantomConnectingState();
      }
    }
    
    // If there's no active connection and no recent attempt, clear phantom_original_tab
    // This allows normal browsing without the "new tab" warning
    const hasRecentTimestamp = connectTimestamp && (Date.now() - connectTimestamp < 5000);
    if (!isPhantomConnecting() && !hasRecentTimestamp) {
      // Clear original tab marker if there's no active connection
      // This prevents false positives on normal visits
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('phantom_original_tab');
        sessionStorage.removeItem('phantom_redirect_count');
      }
    }
    
    // Force a re-render after cleanup to ensure button state updates
    // This is especially important on Safari where state might be stale
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 100);
  }, [connected, publicKey, mobile]);

  // Listen for localStorage changes (when Phantom sets connection)
  // OPTIMIZED: Reduced polling frequency and added state change detection
  useEffect(() => {
    if (!mobile || typeof window === 'undefined') return;
    
    let lastState: { connected: boolean; publicKey: string | null } = { 
      connected: false, 
      publicKey: null 
    };
    
    const checkConnection = () => {
      const phantomState = getPhantomConnectionState();
      const isPhantomConnected = phantomState.connected;
      const storedPublicKey = phantomState.publicKey;
      
      // Only update state if it actually changed (prevents unnecessary re-renders)
      if (lastState.connected === isPhantomConnected && lastState.publicKey === storedPublicKey) {
        return; // No change, skip update
      }
      
      // Update last state
      lastState = {
        connected: isPhantomConnected,
        publicKey: storedPublicKey
      };
      
      // If connected, clear any connecting flags
      if (isPhantomConnected && storedPublicKey) {
        clearPhantomConnectingState();
      }
      
      setMobileConnectionState({
        connected: isPhantomConnected,
        publicKey: storedPublicKey
      });
      
      // Force parent component re-render by calling onConnect if newly connected
      if (isPhantomConnected && storedPublicKey && !lastState.connected) {
        onConnect();
      }
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
      checkConnection();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('phantom_connected', handlePhantomConnected);
    
    // OPTIMIZED: Reduced polling from 300ms to 2000ms (2 seconds) - still responsive but much less frequent
    const interval = setInterval(checkConnection, 2000);
    
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
    // CRITICAL: ONLY use wallet adapter's publicKey - do NOT trust localStorage
    // This prevents showing random/stale wallet addresses like "8MJW...k5Tx" when not connected
    const effectivePublicKey = publicKey; // ONLY trust adapter - localStorage can be stale
    
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
      // Wallet adapter says disconnected - clear everything including stale localStorage
      const lastLoggedWallet = sessionStorage.getItem('last_logged_wallet');
      if (lastLoggedWallet) {
        sessionStorage.removeItem('last_logged_wallet');
        // CRITICAL: Clear stale localStorage to prevent showing wrong wallet address
        clearPhantomConnectionState();
        // Clear mobile connection state
        if (mobile) {
          setMobileConnectionState({ connected: false, publicKey: null });
        }
        onDisconnect();
      }
      setBalance(null);
      setUsdfgBalance(null);
    }
  }, [connected, publicKey, onConnect, onDisconnect, connection, mobile]);

  // Calculate derived values (needed before conditional returns)
  // CRITICAL: ONLY use wallet adapter's publicKey - do NOT trust localStorage
  // This prevents showing random/stale wallet addresses
  const effectivePublicKey = publicKey; // ONLY trust adapter
  
  // Check connection from multiple sources (prop, hook, localStorage) - most reliable detection
  // CRITICAL FIX: On mobile, ONLY trust wallet adapter - if adapter says not connected, show Connect button
  // This prevents showing green "connected" button when user can't actually login
  const actuallyConnected = Boolean(
    // ONLY trust wallet adapter hook - this is the source of truth
    // On mobile, if adapter says not connected, we're NOT connected (even if localStorage says otherwise)
    (connected && publicKey) ||
    // Parent prop ONLY if adapter also confirms (double-check)
    (isConnected && connected && publicKey)
    // DO NOT trust localStorage on mobile - it can be stale and show wrong wallet
    // CRITICAL: On mobile, if adapter says not connected, we MUST show Connect button
  );
  
  // CRITICAL FIX FOR MOBILE: If adapter says not connected, NEVER show green button
  // This ensures users can always login on mobile, even if localStorage has stale data
  // On mobile, ONLY show green button if adapter explicitly confirms connection (connected && publicKey)
  // If adapter says not connected, ALWAYS show Connect Wallet button
  // MOBILE: Completely ignore localStorage - ONLY trust wallet adapter
  const isMobileActuallyConnected = mobile 
    ? (connected === true && publicKey !== null && publicKey !== undefined) // On mobile: ONLY trust adapter, ignore localStorage completely
    : actuallyConnected; // Desktop: use normal logic

  // Calculate mobile-specific connection state
  const isMobile = isMobileSafari();
  const hasWindowSolana = typeof window !== "undefined" && !!(window as any).solana;
  
  // CRITICAL: Check if Phantom connection is in progress, but only if it's recent (not stuck)
  let isPhantomConnectingFlag = false;
  if (typeof window !== "undefined") {
    const connectingFlag = isPhantomConnecting();
    const connectTimestamp = getPhantomConnectTimestamp();
    
    const stuckThreshold = mobile ? 10000 : 15000; // 10 seconds on mobile, 15 on desktop
    
    if (connectingFlag && connectTimestamp) {
      const timeSinceConnect = Date.now() - connectTimestamp;
      if (timeSinceConnect > stuckThreshold) {
        console.log(`🧹 Clearing stuck connection state (older than ${stuckThreshold/1000} seconds)`);
        clearPhantomConnectingState();
        isPhantomConnectingFlag = false;
      } else {
        // Only show connecting if adapter also says connecting (prevents stuck state)
        isPhantomConnectingFlag = connecting || connectingFlag;
      }
    } else if (connectingFlag && !connectTimestamp) {
      console.log("🧹 Clearing orphaned connection state immediately");
      clearPhantomConnectingState();
      isPhantomConnectingFlag = false;
    } else if (connectingFlag && !connecting) {
      // SessionStorage says connecting but adapter says not - clear if stuck
      if (connectTimestamp && (Date.now() - connectTimestamp > 5000)) {
        console.log("🧹 Clearing stuck connecting state (adapter says not connecting)");
        clearPhantomConnectingState();
        isPhantomConnectingFlag = false;
      }
    }
  }
  
  // Calculate button disabled state
  // CRITICAL: Only disable if actually connecting or already connected
  // On mobile, be more permissive - allow connection attempts even if there's stale state
  let isButtonDisabled = false;
  if (mobile) {
    // Only disable if very recently connecting (within 2 seconds) to prevent double-clicks
    if (isPhantomConnectingFlag) {
      const connectTimestamp = getPhantomConnectTimestamp();
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - connectTimestamp;
        isButtonDisabled = timeSinceConnect < 2000; // Disable only if very recent (within 2s)
      }
    }
    // Don't disable if actuallyConnected - let the connected state UI handle it
    // This ensures button is always clickable when not connected
  } else {
    isButtonDisabled = connecting || isPhantomConnectingFlag;
  }

  // Removed button state logging useEffect - was causing unnecessary re-renders on mobile

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
      const phantomState = getPhantomConnectionState();
      
      if (phantomState.connected) {
        console.log("✅ Already connected on mobile - ignoring click");
        return;
      }
      
      // Clear any stale connection states before proceeding
      const connectTimestamp = getPhantomConnectTimestamp();
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - connectTimestamp;
        // If older than 2 seconds, clear it (very aggressive on mobile)
        if (timeSinceConnect > 2000) {
          console.log("🧹 Clearing stale connection state on mobile (older than 2 seconds)");
          clearPhantomConnectingState();
        }
      } else {
        // No timestamp - clear any orphaned state
        if (isPhantomConnecting()) {
          clearPhantomConnectingState();
        }
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
      if (isPhantomConnecting()) {
        const connectTimestamp = getPhantomConnectTimestamp();
        if (connectTimestamp) {
          const timeSinceConnect = Date.now() - connectTimestamp;
          if (timeSinceConnect > 5000) {
            console.warn("⚠️ Clearing stuck connection state (older than 5 seconds)");
            clearPhantomConnectingState();
          }
        } else {
          clearPhantomConnectingState();
        }
      }
    }

    (async () => {
      // CRITICAL FIX: Clear ALL stale state before connecting
      // This ensures clean connection state, especially on mobile after disconnect
      localStorage.removeItem('wallet_disconnected');
      // Don't clear phantom_connected/phantom_public_key here - let Phantom set them
      
      // Update mobile connection state to ensure button shows correct state
      if (mobile) {
        setMobileConnectionState({ connected: false, publicKey: null });
      }
      
      // CRITICAL: On mobile, DON'T set connecting state here
      // Let phantomMobileConnect() set it when it actually navigates
      // This prevents the guard from blocking the first call
      if (!mobile) {
        // Desktop: Set connecting state with timestamp
        setPhantomConnecting(true);
      }
      
      // Set a timeout to clear stuck states (10 seconds on mobile, 15 seconds on desktop)
      // Shorter timeout on mobile to prevent users from getting stuck
      const timeoutMs = mobile ? 10000 : 15000;
      const timeoutId = setTimeout(() => {
        if (isPhantomConnecting()) {
          console.warn("⚠️ Connection timeout - clearing stuck state");
          clearPhantomConnectingState();
          if (mobile) {
            // On mobile, just clear silently - user can try again
            console.log("✅ Connection timeout cleared - user can try again");
          } else {
            alert("Connection timed out. Please try again. If Phantom didn't open, make sure it's installed from https://phantom.app");
          }
        }
      }, timeoutMs);
      
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
      
      // CRITICAL FIX: Clear state BEFORE calling disconnect to ensure immediate UI update
      // This prevents the "stuck connected" state on mobile
      clearPhantomConnectionState();
      clearPhantomConnectingState();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wallet_connected');
        localStorage.removeItem('wallet_address');
        sessionStorage.removeItem('last_logged_wallet');
      }
      
      // Update mobile connection state immediately (BEFORE disconnect call)
      if (mobile) {
        setMobileConnectionState({ connected: false, publicKey: null });
      }
      
      // Now call disconnect (may fail, but state is already cleared)
      try {
        await disconnect();
      } catch (disconnectError) {
        console.warn('Disconnect call failed, but state already cleared:', disconnectError);
        // State is already cleared, continue
      }
      
      // Trigger disconnect event
      window.dispatchEvent(new Event('walletDisconnected'));
      
      // Call parent's onDisconnect callback to update parent state
      onDisconnect();
      
      logWalletEvent('disconnected', {});
    } catch (error) {
      console.error('Disconnect error:', error);
      // Clear state even on error - ensure clean state
      clearPhantomConnectionState();
      clearPhantomConnectingState();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wallet_connected');
        localStorage.removeItem('wallet_address');
        sessionStorage.removeItem('last_logged_wallet');
      }
      if (mobile) {
        setMobileConnectionState({ connected: false, publicKey: null });
      }
      onDisconnect();
    }
  };

  // If connecting, show connecting state with cancel option
  if (connecting || isPhantomConnectingFlag) {
    // Check if connecting state is stuck (older than 10 seconds)
    const connectTimestamp = getPhantomConnectTimestamp();
    const isStuck = connectTimestamp && (Date.now() - connectTimestamp > 10000);
    
    // If stuck, allow user to cancel
    const handleCancelConnect = () => {
      console.log("🛑 User cancelled connection");
      clearPhantomConnectingState();
      // Force component to re-render by updating state
      setForceUpdate(prev => prev + 1);
      // Also dispatch events to trigger other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('walletStateChanged'));
      }
    };
    
    return (
      <div className="flex flex-col space-y-2">
        {compact ? (
          <button
            onClick={isStuck ? handleCancelConnect : undefined}
            disabled={!isStuck}
            className={`px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs text-center ${
              isStuck ? 'cursor-pointer hover:bg-amber-600/30 active:opacity-70' : 'cursor-default'
            } touch-manipulation`}
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title={isStuck ? 'Tap to cancel connection' : 'Connecting...'}
          >
            {isStuck ? 'Tap to Cancel' : 'Connecting...'}
          </button>
        ) : (
          <button
            onClick={isStuck ? handleCancelConnect : undefined}
            disabled={!isStuck}
            className={`px-3 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm text-center ${
              isStuck ? 'cursor-pointer hover:bg-amber-600/30 active:opacity-70' : 'cursor-default'
            }`}
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title={isStuck ? 'Click to cancel connection' : 'Connecting...'}
          >
            {isStuck ? 'Click to Cancel' : 'Connecting to Phantom...'}
          </button>
        )}
      </div>
    );
  }

  // Show connected state if connected - using same button design but green
  // CRITICAL FIX FOR MOBILE: Only show green button if adapter explicitly confirms connection
  // On mobile, if adapter says not connected, ALWAYS show Connect Wallet button (never green button)
  // Do NOT trust localStorage alone - it can show stale/wrong wallet addresses
  // MOBILE FIX: On mobile, ONLY show green button if adapter explicitly says connected AND has publicKey
  // If mobile and adapter says not connected, skip green button and show Connect Wallet button
  const shouldShowGreenButton = mobile 
    ? (connected === true && publicKey !== null && publicKey !== undefined && effectivePublicKey !== null)
    : (isMobileActuallyConnected && effectivePublicKey);
  
  if (shouldShowGreenButton) {
    const shortAddress = `${effectivePublicKey.toString().slice(0, 4)}...${effectivePublicKey.toString().slice(-4)}`;
    
    // Compact mode for mobile - same design, green colors, horizontal layout
    if (compact) {
        return (
        <div className="flex items-center gap-2">
          {/* Balances - compact inline */}
          {(usdfgBalance !== null || balance !== null) && (
            <div className="text-right hidden xs:block">
            {usdfgBalance !== null && (
                <div className="text-[10px] text-cyan-400 font-semibold leading-tight">
                  {usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDFG
                </div>
              )}
              {balance !== null && (
                <div className="text-[9px] text-gray-400 leading-tight">
                  {balance.toFixed(2)} SOL
                </div>
              )}
              </div>
            )}
          <button
              onClick={handleDisconnect}
            className="px-2.5 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-300 font-light tracking-wide rounded-md hover:from-green-500/30 hover:to-emerald-600/30 transition-all border border-green-500/50 shadow-sm shadow-green-500/10 text-xs backdrop-blur-sm touch-manipulation whitespace-nowrap"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {shortAddress}
          </button>
          </div>
        );
    }
    
    // Full mode for desktop - same design, green colors, with balances
    return (
      <div className="flex items-center gap-3">
        {/* Balances - compact display */}
        <div className="text-right hidden lg:block">
          <div className="text-cyan-400 font-semibold text-xs leading-tight">
            {usdfgBalance !== null ? `${usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDFG` : "Loading..."}
          </div>
          <div className="text-gray-400 text-[10px] leading-tight">
                {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
          </div>
        </div>
        {/* Wallet address button */}
        <button
          onClick={handleDisconnect}
          className="px-4 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-300 font-light tracking-wide rounded-md hover:from-green-500/30 hover:to-emerald-600/30 transition-all border border-green-500/50 shadow-sm shadow-green-500/10 text-sm backdrop-blur-sm"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {shortAddress}
        </button>
      </div>
    );
  }

  // Disconnected state - original amber design
  // CRITICAL: Always show "Connect Wallet" button when not connected (ensures users can always connect)
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
            className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50 shadow-sm shadow-amber-500/10 text-xs backdrop-blur-sm touch-manipulation"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            position: 'relative',
            zIndex: 10
          }}
          >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button
          onClick={handleConnect}
          disabled={isButtonDisabled}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50 shadow-sm shadow-amber-500/10 text-sm backdrop-blur-sm"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            position: 'relative',
            zIndex: 10
          }}
              >
          {connecting || isPhantomConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
