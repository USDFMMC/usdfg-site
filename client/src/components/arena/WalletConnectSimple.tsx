import React, { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { useUSDFGWallet } from '@/lib/wallet/useUSDFGWallet';
import nacl from "tweetnacl";
import { isMobileSafari } from '@/lib/utils/isMobileSafari';
import { isPhantomBrowser } from '@/lib/utils/isPhantomBrowser';

// CRITICAL: Pure synchronous function OUTSIDE React component
// This function has ZERO React logic, ZERO hooks, ZERO state
// Must be called directly from onClick with NO conditions, NO async, NO logging
// This ensures Safari treats it as a trusted user gesture
function openPhantomMobile(): void {
  // ATOMIC check-and-set using sessionStorage (works across React re-renders)
  const lastAttempt = sessionStorage.getItem('phantom_last_attempt');
  const now = Date.now();
  
  if (lastAttempt) {
    const timeSinceLastAttempt = now - parseInt(lastAttempt);
    if (timeSinceLastAttempt < 2000) {
      console.warn("⚠️ Phantom connect called too soon after last attempt - ignoring");
      return;
    }
  }
  
  // Set timestamp IMMEDIATELY (atomic operation)
  sessionStorage.setItem('phantom_last_attempt', now.toString());
  
  // Double-check: if we're already connecting, abort
  if (sessionStorage.getItem('phantom_connecting') === 'true') {
    console.warn("⚠️ Phantom connection already in progress - ignoring duplicate click");
    return;
  }
  
  // Generate X25519 keypair synchronously
  const kp = nacl.box.keyPair();
  // Generate 24-byte nonce synchronously
  const nonce = nacl.randomBytes(24);
  
  // Encode to base64 synchronously
  function encodeBase64(u8: Uint8Array): string {
    let binary = "";
    u8.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
  
  const dappPublicKeyBase64 = encodeBase64(kp.publicKey);
  const nonceBase64 = encodeBase64(nonce);
  
  // Store for return handler (synchronously, before navigation)
  sessionStorage.setItem("phantom_dapp_keypair", JSON.stringify(Array.from(kp.secretKey)));
  sessionStorage.setItem("phantom_dapp_nonce", nonceBase64);
  localStorage.setItem("phantom_dapp_handshake", JSON.stringify({
    dappSecretKey: encodeBase64(kp.secretKey),
    nonce: nonceBase64,
  }));
  
  // Build URL synchronously
  // CRITICAL: Use root / for iOS universal link compatibility
  const rootUrl = "https://usdfg.pro/";
  const manifestUrl = "https://usdfg.pro/phantom/manifest.json";
  
  // Mark that we're connecting (for return handler to detect)
  sessionStorage.setItem('phantom_connecting', 'true');
  // Store timestamp for silent rejection detection
  sessionStorage.setItem('phantom_connect_timestamp', Date.now().toString());
  
  const url =
    "https://phantom.app/ul/v1/connect" +
    `?app_url=${encodeURIComponent(rootUrl)}` +
    `&dapp_encryption_public_key=${encodeURIComponent(dappPublicKeyBase64)}` +
    `&nonce=${encodeURIComponent(nonceBase64)}` +
    `&redirect_link=${encodeURIComponent(rootUrl)}` +
    `&cluster=devnet` +
    `&scope=${encodeURIComponent("wallet:sign,wallet:signMessage,wallet:decrypt")}` +
    `&app_metadata_url=${encodeURIComponent(manifestUrl)}`;
  
  // Log the exact URL being sent to Phantom (for debugging)
  console.log("🚀 Opening Phantom deep link...");
  console.log("🔗 Full URL:", url);
  console.log("🔗 Parameters:", {
    app_url: rootUrl,
    redirect_link: rootUrl,
    app_metadata_url: manifestUrl,
    dapp_encryption_public_key_length: dappPublicKeyBase64.length,
    nonce_length: nonceBase64.length,
    cluster: "devnet",
    scope: "wallet:sign,wallet:signMessage,wallet:decrypt"
  });
  
  // Navigate IMMEDIATELY - no async, no logging, no delays, no React batching
  // CRITICAL: Any async operations (like fetch) MUST happen AFTER navigation
  // Safari requires pure synchronous user gesture for deep links
  window.location.href = url;
  
  // Reset guard after a delay (in case navigation fails)
  setTimeout(() => {
    isConnecting = false;
  }, 5000);
}

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

  // Handle connection state changes
  useEffect(() => {
    // On mobile, use stored connection; on desktop, use adapter connection
    const actuallyConnected = mobile 
      ? (connected && publicKey) // Mobile uses stored connection
      : (isConnected || (connected && publicKey)); // Desktop uses adapter
    
    if (actuallyConnected && publicKey) {
      // Clear disconnect flag when user successfully connects
      localStorage.removeItem('wallet_disconnected');
      onConnect();
      
      logWalletEvent('connected', { wallet: publicKey.toString() });
      
      // Fetch SOL balance (non-blocking, fail gracefully)
      const fetchSOLBalance = async (): Promise<void> => {
        try {
          const balanceLamports = await Promise.race([
            connection.getBalance(publicKey, 'confirmed'),
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
          const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, publicKey);
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
  }, [connected, publicKey, isConnected, onConnect, onDisconnect, connection]);

  // Handle wallet connection (desktop only)
  // Mobile Safari uses openPhantomMobile() directly (defined outside component)
  const handleConnect = () => {
    // Prevent double-clicks
    if (connected || isConnected || connecting) {
      return;
    }

    (async () => {
      try {
        logWalletEvent('selecting', { adapter: 'Phantom' });
        await connect();
        logWalletEvent('connect_called', { adapter: 'Phantom' });
      } catch (error: any) {
        logWalletEvent('error', { 
          message: error.message || 'Connection failed',
          error: String(error)
        });
        console.error('Connection error:', error);
        
        if (error.message?.includes('User rejected') || error.message?.includes('User cancelled')) {
          console.log('User cancelled wallet connection');
        } else {
          alert(`Connection failed: ${error.message || 'Unknown error'}`);
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
  const actuallyConnected = isConnected || (connected && publicKey);

  // Show connected state if connected
  if (actuallyConnected && publicKey) {
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
            <span className="hidden sm:inline">{publicKey.toString().slice(0, 4)}...</span>
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
            {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
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
  // CRITICAL: On mobile Safari (NOT Phantom browser), use deep link
  // On Phantom browser or desktop, use wallet adapter (normal async flow)
  // Use pure JavaScript check for mobile (not React hook) to avoid React batching
  const isMobile = isMobileSafari();
  const isPhantom = isPhantomBrowser();
  const shouldUseDeepLink = isMobile && !isPhantom; // Mobile Safari but NOT Phantom browser
  
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
          <button
          onClick={shouldUseDeepLink ? openPhantomMobile : handleConnect}
          disabled={!shouldUseDeepLink && (connecting || connected)}
            className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
          >
          Connect Wallet
          </button>
        ) : (
          <button
          onClick={shouldUseDeepLink ? openPhantomMobile : handleConnect}
          disabled={!shouldUseDeepLink && (connecting || connected)}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-amber-400/50 shadow-lg shadow-amber-500/20 text-sm"
              >
          Connect Wallet
              </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
