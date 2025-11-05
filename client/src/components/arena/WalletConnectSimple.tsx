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
    // Check multiple ways to detect Phantom
    const isPhantomInjected = typeof window !== 'undefined' && (
      (window as any).phantom?.solana?.isPhantom ||
      (window as any).solana?.isPhantom ||
      (window as any).solflare?.isSolflare
    );
    const userDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
    
    // Don't auto-connect if user explicitly disconnected
    if (userDisconnected) {
      console.log('🚫 User has disconnected - skipping auto-connect');
      return;
    }
    
    if (isPhantomInjected && !connected && !connecting) {
      console.log('👻 Phantom detected in mobile browser - auto-connecting...');
      
      // Find Phantom wallet - wait for wallets to load if needed
      let phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      
      if (!phantomWallet && wallets.length === 0) {
        // Wait a bit for wallets to load
        const timeoutId = setTimeout(() => {
          phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
          if (phantomWallet) {
            select(phantomWallet.adapter.name);
          }
        }, 500);
        return () => clearTimeout(timeoutId);
      }
      
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

  // Custom click handler for mobile - handles both Phantom in-app browser and regular mobile browser
  const handleMobileConnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check at click time (not render time) - more reliable
    const isMobileDevice = typeof window !== 'undefined' && (
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768 || // Also check screen width
      'ontouchstart' in window // Check for touch support
    );
    
    const isPhantomInjected = typeof window !== 'undefined' && (
      (window as any).phantom?.solana?.isPhantom ||
      (window as any).solana?.isPhantom ||
      (window as any).solflare?.isSolflare ||
      typeof (window as any).solana !== 'undefined'
    );
    
    console.log('🔘🔘🔘 BUTTON CLICKED! 🔘🔘🔘');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Screen width:', typeof window !== 'undefined' ? window.innerWidth : 'N/A');
    console.log('   isMobileDevice:', isMobileDevice);
    console.log('   isPhantomInjected:', isPhantomInjected);
    console.log('   window.solana exists:', typeof (window as any).solana !== 'undefined');
    console.log('   window.phantom exists:', typeof (window as any).phantom !== 'undefined');
    console.log('   wallets count:', wallets.length);
    console.log('   wallet names:', wallets.map(w => w.adapter.name));
    console.log('   connected:', connected);
    console.log('   connecting:', connecting);
    
    // Show alert to confirm click is working
    alert('Button clicked! Check console for details.');
    
    // If already connected, don't do anything
    if (connected) {
      console.log('✅ Already connected');
      return;
    }
    
    // If already connecting, don't do anything
    if (connecting) {
      console.log('⏳ Already connecting, please wait...');
      return;
    }
    
    // Always try to connect if we detect Phantom OR if we're on mobile
    // This is more aggressive - will try even if detection isn't perfect
    if (isPhantomInjected || isMobileDevice) {
      try {
        // Check if Phantom is injected (in-app browser)
        if (isPhantomInjected) {
          // Phantom is injected (in-app browser) - connect directly
          console.log('👻 Phantom in-app browser detected - connecting directly...');
          console.log('   Available wallets:', wallets.map(w => w.adapter.name));
          
          // Try to find Phantom wallet
          let phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
          
          // If not found, wait a bit for wallets to load (up to 2 seconds)
          if (!phantomWallet && wallets.length === 0) {
            console.log('   Waiting for wallets to load...');
            for (let i = 0; i < 4; i++) {
              await new Promise(resolve => setTimeout(resolve, 500));
              phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
              if (phantomWallet) break;
            }
          }
          
          if (phantomWallet) {
            try {
              console.log('   Selecting Phantom wallet...');
              select(phantomWallet.adapter.name);
              console.log('   Connecting to Phantom...');
              await phantomWallet.adapter.connect();
              console.log('✅ Connected via Phantom in-app browser');
              if (onConnect) {
                await onConnect();
              }
            } catch (error: any) {
              console.error('❌ Connection error:', error);
              console.error('   Error details:', error?.message, error?.code);
              // Try connecting again after a short delay
              setTimeout(async () => {
                try {
                  console.log('🔄 Retrying connection...');
                  await phantomWallet.adapter.connect();
                  if (onConnect) {
                    await onConnect();
                  }
                } catch (retryError) {
                  console.error('❌ Retry connection error:', retryError);
                  alert('Failed to connect wallet. Please try again.');
                }
              }, 1000);
              return;
            }
          } else {
            console.error('❌ Phantom wallet not found in wallets list');
            console.error('   Wallets available:', wallets.map(w => w.adapter.name));
            alert('Phantom wallet not detected. Please make sure Phantom is installed and open.');
          }
        } else {
          // Not in Phantom in-app browser - try wallet adapter first, then redirect
          console.log('📱 Regular mobile browser - trying wallet adapter...');
          const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
          
          if (phantomWallet) {
            try {
              select(phantomWallet.adapter.name);
              await phantomWallet.adapter.connect();
              console.log('✅ Connected via wallet adapter');
              if (onConnect) {
                await onConnect();
              }
              return; // Success - no redirect needed
            } catch (error) {
              console.log('⚠️ Wallet adapter connection failed, redirecting to Phantom app:', error);
            }
          }
          
          // If wallet adapter doesn't work, redirect to Phantom browser
          console.log('🔄 Redirecting to Phantom app...');
          const currentUrl = window.location.href;
          window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}`;
        }
      } catch (error) {
        console.error('❌ Unexpected error in handleMobileConnect:', error);
        alert('Error connecting wallet. Please try again.');
      }
    } else {
      console.log('⚠️ Not mobile and Phantom not detected - cannot connect');
      alert('Please open this site in Phantom browser or use a mobile device.');
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
            onClick={(e) => {
              console.log('🔘 Compact mobile button clicked');
              handleMobileConnect(e);
            }}
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
          {isMobile ? (
            <button
              onClick={(e) => {
                console.log('🔘 Full mobile button clicked');
                handleMobileConnect(e);
              }}
              disabled={connecting}
              className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2 border border-amber-400/50 shadow-[0_0_15px_rgba(255,215,130,0.2)] disabled:opacity-50 active:scale-95"
              style={{ 
                minHeight: '40px',
                fontSize: '14px',
                touchAction: 'manipulation'
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
              Opens in Phantom app
            </div>
          )}
          {isMobile && isPhantomInjected && (
            <div className="text-xs text-amber-400 text-center mt-2">
              Tap to connect in Phantom browser
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WalletConnectSimple;
