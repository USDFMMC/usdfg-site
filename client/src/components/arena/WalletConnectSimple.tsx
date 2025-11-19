import React, { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { launchPhantomDeepLink, shouldUseDeepLink } from '@/lib/wallet/phantom-deeplink';

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
  const { publicKey: adapterPublicKey, connected, connecting, disconnect, select, wallets, connect } = useWallet();
  const { connection } = useConnection();
  
  // For mobile deep links, use stored public key if adapter doesn't have one
  const storedPhantomPublicKey = typeof window !== 'undefined' ? localStorage.getItem('phantom_public_key') : null;
  const publicKey = adapterPublicKey || (storedPhantomPublicKey ? new PublicKey(storedPhantomPublicKey) : null);
  const [balance, setBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);

  // Handle connection state changes
  useEffect(() => {
    // Use prop isConnected for mobile deep links
    const actuallyConnected = isConnected || (connected && publicKey);
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
  }, [connected, publicKey, onConnect, onDisconnect, connection]);

  // Handle wallet selection and connection
  // On mobile Safari, use Phantom deep link flow (like tools.smithii.io)
  const handleConnect = async () => {
    console.log('🔍 CONNECT BUTTON CLICKED');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    console.log('🔍 Component: WalletConnectSimple');
    console.log('🔍 Stack trace:', new Error().stack);
    
    // Check if already connected (adapter OR stored Phantom connection)
    const hasStoredConnection = typeof window !== 'undefined' && 
      localStorage.getItem('phantom_connected') === 'true' && 
      localStorage.getItem('phantom_public_key');
    
    if (connected || isConnected || hasStoredConnection) {
      console.log('🔍 Already connected (adapter or stored), returning');
      console.log('🔍 connected:', connected);
      console.log('🔍 isConnected prop:', isConnected);
      console.log('🔍 hasStoredConnection:', hasStoredConnection);
      return;
    }
    if (connecting) {
      console.log('🔍 Already connecting, returning');
      return;
    }

    try {
      // Check if we should use deep link (mobile Safari)
      const shouldUse = shouldUseDeepLink();
      console.log('🔍 shouldUseDeepLink() returned:', shouldUse);
      
      if (shouldUse) {
        console.log('📱 Mobile Safari detected - using Phantom deep link');
        logWalletEvent('selecting', { adapter: 'Phantom (Deep Link)' });
        
        // Launch Phantom deep link - this will redirect immediately
        try {
          console.log('🔍 About to call launchPhantomDeepLink()...');
          launchPhantomDeepLink();
          console.log('🔍 launchPhantomDeepLink() returned (should not happen if redirect worked)');
          // If we get here, the redirect didn't happen (shouldn't happen)
          console.warn('⚠️ Deep link launch returned - redirect may have failed');
        } catch (error) {
          console.error('❌ Error launching Phantom deep link:', error);
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
          alert('Failed to open Phantom. Please make sure Phantom is installed.');
        }
        return; // Deep link will redirect, so we return here
      }

      // Desktop or non-Safari mobile - use standard adapter flow
      console.log('🔍 Available wallets for connection:');
      wallets.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.adapter.name} (readyState: ${w.adapter.readyState})`);
      });
      
      // Try MWA first, then Phantom, then first available
      let walletToConnect = wallets.find(w => 
        w.adapter.name === 'Solana Mobile Wallet Adapter' || 
        w.adapter.name === 'Mobile Wallet Adapter'
      ) || wallets.find(w => w.adapter.name === 'Phantom') || wallets[0];

      if (!walletToConnect) {
        logWalletEvent('error', { message: 'No wallet adapter available' });
        alert('No wallet detected. Please install Phantom or another Solana wallet.');
        return;
      }

      console.log(`🎯 Selected wallet: ${walletToConnect.adapter.name}`);
      logWalletEvent('selecting', { adapter: walletToConnect.adapter.name });
      
      // Select the wallet first
      select(walletToConnect.adapter.name);
      
      // Wait for the selection to complete and wallet to be ready
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const selectedWallet = wallets.find(w => w.adapter.name === walletToConnect.adapter.name);
        if (selectedWallet && selectedWallet.adapter.readyState === 'Installed') {
          break;
        }
        attempts++;
      }
      
      // Connect using the adapter's connect method directly
      await walletToConnect.adapter.connect();
      logWalletEvent('connect_called', { adapter: walletToConnect.adapter.name });
    } catch (error: any) {
      logWalletEvent('error', { 
        message: error.message || 'Connection failed',
        error: String(error)
      });
      console.error('Connection error:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('WalletNotSelectedError') || error.name === 'WalletNotSelectedError') {
        alert('Please select a wallet from the list and try again.');
      } else if (error.message?.includes('User rejected') || error.message?.includes('User cancelled')) {
        console.log('User cancelled wallet connection');
      } else {
        alert(`Connection failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      logWalletEvent('disconnecting', {});
      
      if (disconnect) {
        await disconnect();
      }
      
      // Clear stored Phantom connection (mobile deep link)
      localStorage.removeItem('phantom_connected');
      localStorage.removeItem('phantom_public_key');
      sessionStorage.removeItem('phantomSession');
      
      // Set disconnect flag
      localStorage.setItem('wallet_disconnected', 'true');
      window.dispatchEvent(new Event('walletDisconnected'));
      
      // Clear wallet adapter keys
      if (typeof window !== 'undefined') {
        const allKeys = Object.keys(localStorage);
        const keysToClear = allKeys.filter(k => {
          if (k === 'wallet_disconnected') return false;
          return (
            k.startsWith('walletName') || 
            k.includes('@solana/wallet-adapter') || 
            k.includes('wallet-adapter-react')
          );
        });
        
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      logWalletEvent('disconnected', {});
      
      // Reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 200);
    } catch (error) {
      console.error('Disconnect error:', error);
      // Force reload even on error
      localStorage.setItem('wallet_disconnected', 'true');
      // Clear Phantom connection
      localStorage.removeItem('phantom_connected');
      localStorage.removeItem('phantom_public_key');
      sessionStorage.removeItem('phantomSession');
      window.location.reload();
    }
  };

  // If connected (via prop OR adapter), show connected state
  // Use prop isConnected for mobile deep links, fallback to adapter connected
  const actuallyConnected = isConnected || (connected && publicKey);
  const displayPublicKey = publicKey; // Use adapter's publicKey if available
  
  if (actuallyConnected && displayPublicKey) {
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

  // Show connection button
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-amber-400/50 shadow-lg shadow-amber-500/20 text-sm"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
