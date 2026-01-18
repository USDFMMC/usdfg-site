import React, { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { useUSDFGWallet } from '@/lib/wallet/useUSDFGWallet';
import { clearPhantomConnectingState } from '@/lib/utils/wallet-state';

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
  const { publicKey, connecting, connect, disconnect, connection } = useUSDFGWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);

  // Fetch balances when publicKey exists
  useEffect(() => {
    if (!publicKey || !connection) {
      setBalance(null);
      setUsdfgBalance(null);
      return;
    }

    // Fetch SOL balance
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

    // Fetch USDFG balance
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

    fetchSOLBalance().catch(() => setBalance(null));
    fetchUSDFGBalance().catch(() => setUsdfgBalance(0));

    // Log connection event
    const currentWalletString = publicKey.toString();
    const lastLoggedWallet = sessionStorage.getItem('last_logged_wallet');
    if (lastLoggedWallet !== currentWalletString) {
      logWalletEvent('connected', { wallet: currentWalletString });
      sessionStorage.setItem('last_logged_wallet', currentWalletString);
      onConnect();
    }
  }, [publicKey, connection, onConnect]);

  // Handle disconnect cleanup
  useEffect(() => {
    if (!publicKey) {
      const lastLoggedWallet = sessionStorage.getItem('last_logged_wallet');
      if (lastLoggedWallet) {
        sessionStorage.removeItem('last_logged_wallet');
        onDisconnect();
      }
    }
  }, [publicKey, onDisconnect]);

  // Clear connecting state when publicKey appears
  useEffect(() => {
    if (publicKey) {
      clearPhantomConnectingState();
    }
  }, [publicKey]);

  const handleConnect = () => {
    if (connecting) {
      console.warn("⚠️ Connection already in progress - ignoring click");
      return;
    }
    
    if (publicKey) {
      console.log("✅ Already connected - ignoring click");
      return;
    }

    (async () => {
      try {
        logWalletEvent('selecting', { adapter: 'Phantom' });
        await connect();
        logWalletEvent('connect_called', { adapter: 'Phantom' });
        clearPhantomConnectingState();
      } catch (error: any) {
        clearPhantomConnectingState();
        logWalletEvent('error', { 
          message: error.message || 'Connection failed',
          error: String(error)
        });
        
        if (error.message?.includes('User rejected') || error.message?.includes('User cancelled')) {
          console.log('User cancelled wallet connection');
        } else {
          const errorMessage = error.message || 'Unknown error';
          if (errorMessage.includes('not found') || errorMessage.includes('not detected')) {
            alert(`Phantom wallet not found. Please install Phantom from https://phantom.app and try again.`);
          } else {
            alert(`Connection failed: ${errorMessage}`);
          }
        }
      }
    })();
  };

  const handleDisconnect = async () => {
    try {
      logWalletEvent('disconnecting', {});
      clearPhantomConnectingState();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('last_logged_wallet');
      }
      
      await disconnect();
      window.dispatchEvent(new Event('walletDisconnected'));
      onDisconnect();
      logWalletEvent('disconnected', {});
    } catch (error) {
      console.error('Disconnect error:', error);
      clearPhantomConnectingState();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('last_logged_wallet');
      }
      onDisconnect();
    }
  };

  // Show connecting state (only when connecting AND publicKey is null)
  if (connecting && !publicKey) {
    return (
      <div className="flex flex-col space-y-2">
        {compact ? (
          <button
            onClick={() => { clearPhantomConnectingState(); }}
            className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs text-center cursor-pointer hover:bg-amber-600/30 active:opacity-70 touch-manipulation"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title="Tap to cancel connection"
          >
            Connecting...
          </button>
        ) : (
          <button
            onClick={() => { clearPhantomConnectingState(); }}
            className="px-3 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm text-center cursor-pointer hover:bg-amber-600/30 active:opacity-70"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title="Click to cancel connection"
          >
            Connecting...
          </button>
        )}
      </div>
    );
  }

  // Show connected state if publicKey exists
  if (publicKey) {
    const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    
    if (compact) {
      return (
        <div className="flex items-center gap-2">
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
    
    return (
      <div className="flex items-center gap-3">
        <div className="text-right hidden lg:block">
          <div className="text-cyan-400 font-semibold text-xs leading-tight">
            {usdfgBalance !== null ? `${usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDFG` : "Loading..."}
          </div>
          <div className="text-gray-400 text-[10px] leading-tight">
            {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
          </div>
        </div>
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

  // Disconnected state - show Connect Wallet button
  return (
    <div className="flex flex-col space-y-2">
      {compact ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50 shadow-sm shadow-amber-500/10 text-xs backdrop-blur-sm touch-manipulation"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            position: 'relative',
            zIndex: 10
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 font-light tracking-wide rounded-md hover:from-amber-500/30 hover:to-amber-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50 shadow-sm shadow-amber-500/10 text-sm backdrop-blur-sm"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            position: 'relative',
            zIndex: 10
          }}
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletConnectSimple;
