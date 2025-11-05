import React, { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { USDFG_MINT } from '@/lib/chain/config';

interface WalletConnectSimpleProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  compact?: boolean; // New prop for mobile compact mode
}

const WalletConnectSimple: React.FC<WalletConnectSimpleProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  compact = false
}) => {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [usdfgBalance, setUsdfgBalance] = useState<number | null>(null);

  // Auto-connect Phantom if in mobile browser (only if user hasn't explicitly disconnected)
  useEffect(() => {
    const isPhantomInjected = typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom;
    const userDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
    
    // Don't auto-connect if user explicitly disconnected
    if (userDisconnected) {
      console.log('🚫 User has disconnected - skipping auto-connect');
      return;
    }
    
    if (isPhantomInjected && !connected && !connecting) {
      console.log('👻 Phantom detected in mobile browser - auto-connecting...');
      
      // Find Phantom wallet
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
      }
    }
  }, [wallets, connected, connecting, select]);

  // Handle connection state changes
  useEffect(() => {
    if (connected && publicKey) {
      // Clear disconnect flag when user successfully connects
      // This allows auto-connect to work again on refresh
      localStorage.removeItem('wallet_disconnected');
      onConnect();
      
      // Fetch SOL balance (non-blocking, fail gracefully)
      const fetchSOLBalance = async (): Promise<void> => {
        try {
          const balanceLamports = await Promise.race([
            connection.getBalance(publicKey, 'confirmed'),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000) // 5s timeout
            )
          ]);
          const balance = balanceLamports / LAMPORTS_PER_SOL;
          setBalance(balance);
        } catch (err: any) {
          // Silently fail - don't show errors or retry
          // Just set to null and let UI show "Loading..." or nothing
          setBalance(null);
        }
      };
      
      // Fetch balance in background (don't block UI)
      fetchSOLBalance().catch(() => {
        // Silently handle any uncaught errors
        setBalance(null);
      });

      // Fetch USDFG balance (non-blocking, fail gracefully)
      const fetchUSDFGBalance = async (): Promise<void> => {
        try {
          const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, publicKey);
          const tokenBalance = await Promise.race([
            connection.getTokenAccountBalance(tokenAccount, 'confirmed'),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000) // 5s timeout
            )
          ]);
          const usdfg = tokenBalance.value.uiAmount || 0;
          setUsdfgBalance(usdfg);
        } catch (err: any) {
          // If token account doesn't exist, that's fine - just set to 0
          if (err.message?.includes('Invalid param: could not find account') || 
              err.message?.includes('could not find account')) {
            setUsdfgBalance(0);
            return;
          }
          
          // Silently fail - don't show errors or retry
          // Just set to 0 and let UI show "0" or nothing
          setUsdfgBalance(0);
        }
      };
      
      // Fetch balance in background (don't block UI)
      fetchUSDFGBalance().catch(() => {
        // Silently handle any uncaught errors
        setUsdfgBalance(0);
        });
    } else if (!connected) {
      setBalance(null);
      setUsdfgBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, onConnect, onDisconnect, connection]);

  // If connected, show connected state
  if (connected && publicKey) {
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
          onClick={async () => {
            try {
              console.log('🔌 Disconnect button clicked (compact mode)');
              
              // Call disconnect from wallet adapter FIRST
              if (disconnect) {
                try {
                  await disconnect();
                  console.log('✅ Wallet adapter disconnect called');
                } catch (disconnectError) {
                  console.error('⚠️ Disconnect error:', disconnectError);
                }
              }
              
              // Clear wallet adapter keys AFTER disconnect
              if (typeof window !== 'undefined') {
                const allKeys = Object.keys(localStorage);
                const keysToClear = allKeys.filter(k => {
                  // Explicitly exclude our disconnect flag
                  if (k === 'wallet_disconnected') return false;
                  
                  // Only clear wallet adapter specific keys
                  return (
                    k.startsWith('walletName') || 
                    k.includes('@solana/wallet-adapter') || 
                    k.includes('wallet-adapter-react')
                  );
                });
                console.log('🗑️ Clearing localStorage keys:', keysToClear);
                
                keysToClear.forEach(key => {
                  localStorage.removeItem(key);
                });
              }
              
              // Set disconnect flag AFTER everything (so it persists)
              localStorage.setItem('wallet_disconnected', 'true');
              console.log('✅ Disconnect flag set:', localStorage.getItem('wallet_disconnected'));
              
              // Dispatch custom event to notify wallet provider
              window.dispatchEvent(new Event('walletDisconnected'));
              
              // Small delay to ensure everything is saved, then reload
              setTimeout(() => {
                // Set flag again RIGHT BEFORE reload to ensure it persists
                localStorage.setItem('wallet_disconnected', 'true');
                const finalCheck = localStorage.getItem('wallet_disconnected');
                console.log('🔍 Final disconnect flag check:', finalCheck);
                console.log('🔄 Reloading page...');
                if (finalCheck !== 'true') {
                  console.error('❌ CRITICAL: Disconnect flag is not set! Setting again...');
                  localStorage.setItem('wallet_disconnected', 'true');
                }
                window.location.reload();
              }, 200);
            } catch (error) {
              console.error('❌ Disconnect error:', error);
              // Force disconnect by setting flag and reloading
              if (typeof window !== 'undefined') {
                localStorage.setItem('wallet_disconnected', 'true');
                window.dispatchEvent(new Event('walletDisconnected'));
                window.location.reload();
              }
            }
          }}
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
          onClick={async () => {
            try {
              console.log('🔌 Disconnect button clicked (full mode)');
              
              // Call disconnect from wallet adapter FIRST
              if (disconnect) {
                try {
                  await disconnect();
                  console.log('✅ Wallet adapter disconnect called');
                } catch (disconnectError) {
                  console.error('⚠️ Disconnect error:', disconnectError);
                }
              }
              
              // Clear wallet adapter keys AFTER disconnect
              if (typeof window !== 'undefined') {
                const allKeys = Object.keys(localStorage);
                const keysToClear = allKeys.filter(k => {
                  // Explicitly exclude our disconnect flag
                  if (k === 'wallet_disconnected') return false;
                  
                  // Only clear wallet adapter specific keys
                  return (
                    k.startsWith('walletName') || 
                    k.includes('@solana/wallet-adapter') || 
                    k.includes('wallet-adapter-react')
                  );
                });
                console.log('🗑️ Clearing localStorage keys:', keysToClear);
                
                keysToClear.forEach(key => {
                  localStorage.removeItem(key);
                });
              }
              
              // Set disconnect flag AFTER everything (so it persists)
              localStorage.setItem('wallet_disconnected', 'true');
              console.log('✅ Disconnect flag set:', localStorage.getItem('wallet_disconnected'));
              
              // Dispatch custom event to notify wallet provider
              window.dispatchEvent(new Event('walletDisconnected'));
              
              // Small delay to ensure everything is saved, then reload
              setTimeout(() => {
                // Set flag again RIGHT BEFORE reload to ensure it persists
                localStorage.setItem('wallet_disconnected', 'true');
                const finalCheck = localStorage.getItem('wallet_disconnected');
                console.log('🔍 Final disconnect flag check:', finalCheck);
                console.log('🔄 Reloading page...');
                if (finalCheck !== 'true') {
                  console.error('❌ CRITICAL: Disconnect flag is not set! Setting again...');
                  localStorage.setItem('wallet_disconnected', 'true');
                }
                window.location.reload();
              }, 200);
            } catch (error) {
              console.error('❌ Disconnect error:', error);
              // Force disconnect by setting flag and reloading
              if (typeof window !== 'undefined') {
                localStorage.setItem('wallet_disconnected', 'true');
                window.dispatchEvent(new Event('walletDisconnected'));
                window.location.reload();
              }
            }
          }}
          className="px-3 py-1 border border-gray-600 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check if Phantom is already injected (in-app browser)
  const isPhantomInjected = typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom;
  
  // Custom click handler for mobile - try wallet adapter first, then redirect to Phantom browser
  const handleMobileConnect = async () => {
    if (isMobile && !isPhantomInjected) {
      // First, try to connect via wallet adapter (in case Phantom extension is available)
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      
      if (phantomWallet) {
        try {
          select(phantomWallet.adapter.name);
          await phantomWallet.adapter.connect();
          return; // Success - no redirect needed
        } catch (error) {
          console.log('⚠️ Wallet adapter connection failed, redirecting to Phantom app:', error);
        }
      }
      
      // If wallet adapter doesn't work, redirect to Phantom browser
      const currentUrl = window.location.href;
      window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}`;
    } else if (isMobile && isPhantomInjected) {
      // Phantom is injected (in-app browser) - connect directly
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet) {
        try {
          select(phantomWallet.adapter.name);
          await phantomWallet.adapter.connect();
        } catch (error) {
          console.error('Connection error:', error);
        }
      }
    }
  };
  
  // Show connection button
  return (
    <div className="flex flex-col space-y-2">
      {/* Compact mode for mobile navbar */}
      {compact ? (
        // Mobile and desktop connection button
        isMobile ? (
          <button
            onClick={handleMobileConnect}
            disabled={connecting}
            className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <button
            onClick={async () => {
              // Desktop: Directly connect to Phantom without modal
              const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
              if (phantomWallet) {
                select(phantomWallet.adapter.name);
                // The wallet adapter will automatically connect after selection
                try {
                  await phantomWallet.adapter.connect();
                } catch (error) {
                  console.error('Connection error:', error);
                }
              }
            }}
            disabled={connecting}
            className="px-2.5 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
            >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )
      ) : (
        <>
          {/* Mobile and Desktop connection button */}
          {isMobile && !isPhantomInjected ? (
            <button
              onClick={handleMobileConnect}
              disabled={connecting}
              className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2 border border-amber-400/50 shadow-[0_0_15px_rgba(255,215,130,0.2)] disabled:opacity-50"
              style={{ 
                minHeight: '40px',
                fontSize: '14px'
              }}
            >
              <span style={{ fontSize: '18px' }}>👻</span>
              <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={async () => {
                  // Desktop: Directly connect to Phantom without modal
                  const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
                  if (phantomWallet) {
                    select(phantomWallet.adapter.name);
                    // The wallet adapter will automatically connect after selection
                    try {
                      await phantomWallet.adapter.connect();
                    } catch (error) {
                      console.error('Connection error:', error);
                    }
                  }
                }}
                disabled={connecting}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-amber-400/50 shadow-lg shadow-amber-500/20 text-sm"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              
              {connecting && (
                <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                  🔗 Please approve the connection in your wallet popup.
                </div>
              )}
            </>
          )}
          
          {/* Help text for mobile */}
          {isMobile && !isPhantomInjected && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Opens in Phantom browser
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WalletConnectSimple;
