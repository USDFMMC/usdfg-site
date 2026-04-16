import React, { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { USDFG_MINT } from '@/lib/chain/config';
import { logWalletEvent } from '@/utils/wallet-log';
import { useUSDFGWallet } from '@/lib/wallet/useUSDFGWallet';

interface WalletConnectSimpleProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  compact?: boolean;
  profileAvatar?: React.ReactNode;
  onProfileClick?: () => void;
  onAppToast?: (message: string, type?: "info" | "warning" | "error" | "success", title?: string) => void;
}

const WalletConnectSimple: React.FC<WalletConnectSimpleProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  compact = false,
  profileAvatar,
  onProfileClick,
  onAppToast,
}) => {
  const { publicKey, connecting, connect, disconnect, connection } = useUSDFGWallet();
  const { disconnect: disconnectAdapter } = useWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);
  const [hoveringDisconnect, setHoveringDisconnect] = useState(false);

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


  const handleConnect = () => {
    if (publicKey) {
      console.log("✅ Already connected - ignoring click");
      return;
    }

    // Stuck `connecting` (adapter hung) used to make every click a silent no-op — clear and retry.
    if (connecting) {
      void (async () => {
        try {
          await disconnectAdapter();
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 150));
        try {
          await connect();
        } catch (error: any) {
          logWalletEvent('error', {
            message: error?.message || 'Connection failed',
            error: String(error),
          });
          if (error?.message) onAppToast?.(error.message, "error", "Connection");
          const m = error?.message || '';
          if (
            m.includes('Phantom') ||
            m.includes('not detected') ||
            m.includes('not found') ||
            m.includes('install')
          ) {
            setVisible(true);
          }
        }
      })();
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
          error: String(error),
        });
        if (error.message?.includes('User rejected') || error.message?.includes('User cancelled')) {
          console.log('User cancelled wallet connection');
        } else if (error?.message) {
          onAppToast?.(error.message, "error", "Connection");
        }
        const m = error?.message || '';
        if (
          m.includes('Phantom') ||
          m.includes('not detected') ||
          m.includes('not found') ||
          m.includes('install')
        ) {
          setVisible(true);
        }
      }
    })();
  };

  const handleDisconnect = async () => {
    try {
      logWalletEvent('disconnecting', {});
      await disconnect();
      onDisconnect();
      logWalletEvent('disconnected', {});
    } catch (error) {
      console.error('Disconnect error:', error);
      onDisconnect();
    }
  };

  // Show connecting state (only when connecting AND publicKey is null)
  if (connecting && !publicKey) {
    return (
      <div className="flex flex-col space-y-2">
        {compact ? (
          <button
            className="px-2.5 py-1.5 bg-[#0B0C12]/90 text-purple-200/90 border border-purple-500/40 rounded-md text-xs text-center cursor-pointer hover:bg-purple-950/40"
            disabled
          >
            Connecting...
          </button>
        ) : (
          <button
            className="px-3 py-2 bg-[#0B0C12]/90 text-purple-200/90 border border-purple-500/40 rounded-lg text-sm text-center cursor-pointer hover:bg-purple-950/40"
            disabled
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
        <div className="flex items-center gap-2 rounded-full border border-purple-500/40 bg-[#07080C]/95 px-2 py-1.5 shadow-[0_0_0_1px_rgba(124,58,237,0.15)] ring-1 ring-purple-500/20 backdrop-blur-sm">
          {profileAvatar ? (
            <button
              type="button"
              onClick={onProfileClick}
              className="flex items-center"
              title="View profile"
            >
              {profileAvatar}
            </button>
          ) : null}
          {(usdfgBalance !== null || balance !== null) && (
            <div className="flex flex-col leading-tight">
              {usdfgBalance !== null && (
                <div className="text-[11px] text-white/90 font-semibold">
                  {usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDFG
                </div>
              )}
              {balance !== null && (
                <div className="text-[10px] text-gray-400">
                  {balance.toFixed(2)} SOL
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleDisconnect}
            onMouseEnter={() => setHoveringDisconnect(true)}
            onMouseLeave={() => setHoveringDisconnect(false)}
            onFocus={() => setHoveringDisconnect(true)}
            onBlur={() => setHoveringDisconnect(false)}
            className="text-[11px] text-emerald-300 font-semibold hover:text-emerald-200 transition-colors whitespace-nowrap"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title="Disconnect wallet"
          >
            {hoveringDisconnect ? 'Disconnect' : shortAddress}
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-3 rounded-full border border-purple-500/40 bg-[#07080C]/95 px-3 py-1.5 shadow-[0_0_0_1px_rgba(124,58,237,0.15)] ring-1 ring-purple-500/20 backdrop-blur-sm">
        {profileAvatar ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="flex items-center"
            title="View profile"
          >
            {profileAvatar}
          </button>
        ) : null}
        <div className="flex flex-col leading-tight">
          <div className="text-white/90 font-semibold text-sm">
            {usdfgBalance !== null
              ? `${usdfgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDFG`
              : "Loading..."}
          </div>
          <div className="text-xs text-gray-400">
            {balance !== null ? `${balance.toFixed(2)} SOL` : "Loading..."}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          onMouseEnter={() => setHoveringDisconnect(true)}
          onMouseLeave={() => setHoveringDisconnect(false)}
          onFocus={() => setHoveringDisconnect(true)}
          onBlur={() => setHoveringDisconnect(false)}
          className="text-emerald-300 text-xs font-semibold hover:text-emerald-200 transition-colors"
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          title="Disconnect wallet"
        >
          {hoveringDisconnect ? 'Disconnect' : shortAddress}
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
          className="px-3 py-1 bg-[#0B0C12]/90 text-white/90 font-light tracking-wide rounded-md hover:bg-purple-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/50 ring-1 ring-purple-500/20 text-xs backdrop-blur-sm touch-manipulation"
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
          className="px-4 py-1.5 bg-[#0B0C12]/90 text-white/90 font-light tracking-wide rounded-md hover:bg-purple-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/50 ring-1 ring-purple-500/20 text-sm backdrop-blur-sm"
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
