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
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render trigger

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
    // Check adapter state as well (iOS fix)
    const adapterConnected = wallets.length > 0 && wallets.some(w => 
      w.adapter.name === 'Phantom' && (w.adapter.connected || w.adapter.publicKey !== null)
    );
    const adapterPublicKey = wallets.find(w => w.adapter.name === 'Phantom')?.adapter.publicKey || null;
    
    if ((connected && publicKey) || (adapterConnected && adapterPublicKey)) {
      const activePublicKey = publicKey || adapterPublicKey;
      // Clear disconnect flag when user successfully connects
      // This allows auto-connect to work again on refresh
      localStorage.removeItem('wallet_disconnected');
      onConnect();
      
      // Fetch SOL balance (non-blocking, fail gracefully)
      const fetchSOLBalance = async (): Promise<void> => {
        try {
          const balanceLamports = await Promise.race([
            connection.getBalance(activePublicKey, 'confirmed'),
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
          const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, activePublicKey);
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
    } else if (!connected && !adapterConnected) {
      setBalance(null);
      setUsdfgBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, wallets, onConnect, onDisconnect, connection]);

  // Check if adapter is connected (even if hook state hasn't updated yet)
  // This fixes iOS issue where connect() succeeds but hook state doesn't update
  const adapterConnected = wallets.length > 0 && wallets.some(w => 
    w.adapter.name === 'Phantom' && (w.adapter.connected || w.adapter.publicKey !== null)
  );
  
  // Use adapter state if hook state hasn't updated yet (iOS fix)
  const isActuallyConnected = connected && publicKey || adapterConnected;
  const actualPublicKey = publicKey || wallets.find(w => w.adapter.name === 'Phantom')?.adapter.publicKey || null;

  // If connected, show connected state
  if (isActuallyConnected && actualPublicKey) {
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
          <span className="hidden sm:inline">{actualPublicKey.toString().slice(0, 4)}...</span>
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
            {actualPublicKey.toString().slice(0, 8)}...{actualPublicKey.toString().slice(-8)}
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

  // Check if we're on mobile (for render logic)
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check if Phantom is already injected (in-app browser) - for render logic
  const isPhantomInjected = typeof window !== 'undefined' && (
    (window as any).phantom?.solana?.isPhantom ||
    (window as any).solana?.isPhantom ||
    (window as any).solflare?.isSolflare
  );
  
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
    
    // Re-check Phantom injection at click time (more reliable)
    const isPhantomInjectedAtClick = typeof window !== 'undefined' && (
      (window as any).phantom?.solana?.isPhantom ||
      (window as any).solana?.isPhantom ||
      (window as any).solflare?.isSolflare ||
      typeof (window as any).solana !== 'undefined'
    );
    
    console.log('🔘🔘🔘 BUTTON CLICKED! 🔘🔘🔘');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Screen width:', typeof window !== 'undefined' ? window.innerWidth : 'N/A');
    console.log('   isMobileDevice:', isMobileDevice);
    console.log('   isPhantomInjected (render):', isPhantomInjected);
    console.log('   isPhantomInjected (click):', isPhantomInjectedAtClick);
    console.log('   window.solana exists:', typeof (window as any).solana !== 'undefined');
    console.log('   window.phantom exists:', typeof (window as any).phantom !== 'undefined');
    console.log('   wallets count:', wallets.length);
    console.log('   wallet names:', wallets.map(w => w.adapter.name));
    console.log('   connected:', connected);
    console.log('   connecting:', connecting);
    
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
    
    // For iOS Phantom app or mobile - try to connect directly
    // Be very aggressive - try to connect if we're on mobile OR if Phantom might be available
    if (isPhantomInjectedAtClick || isMobileDevice || wallets.length > 0) {
      try {
        // Try to find Phantom wallet - check multiple times if needed
        let phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
        
        // If not found, wait for wallets to load (iOS Phantom app can be slow)
        if (!phantomWallet) {
          console.log('⏳ Waiting for wallets to load...');
          
          // Wait longer and check more frequently
          for (let i = 0; i < 10; i++) { // Wait up to 5 seconds
            await new Promise(resolve => setTimeout(resolve, 500));
            phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
            if (phantomWallet) {
              console.log('✅ Found Phantom wallet after wait');
              break;
            }
            console.log(`   Check ${i + 1}/10: wallets=${wallets.length}, names=${wallets.map(w => w.adapter.name).join(', ')}`);
          }
        }
        
        if (phantomWallet) {
          try {
            console.log('🔗 Connecting to Phantom...');
            select(phantomWallet.adapter.name);
            await phantomWallet.adapter.connect();
            console.log('✅ Connect() call completed');
            
            // Wait for wallet adapter state to update (iOS can be slow)
            let attempts = 0;
            const maxAttempts = 30; // Wait up to 3 seconds
            let stateUpdated = false;
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Check if connection succeeded by checking the adapter's state
              const adapterConnected = phantomWallet.adapter.connected || phantomWallet.adapter.publicKey !== null;
              const hookConnected = connected && publicKey;
              
              if (adapterConnected || hookConnected) {
                console.log('✅ Wallet adapter state updated!');
                stateUpdated = true;
                break;
              }
              
              attempts++;
              console.log(`   Waiting for state update... (${attempts}/${maxAttempts})`);
              
              // Force a re-render every few attempts to check state
              if (attempts % 5 === 0) {
                setForceUpdate(prev => prev + 1);
              }
            }
            
            // Force a final re-render
            setForceUpdate(prev => prev + 1);
            
            // Force a re-check of connection state
            console.log('🔍 Final connection state check...');
            console.log('   adapter.connected:', phantomWallet.adapter.connected);
            console.log('   adapter.publicKey:', phantomWallet.adapter.publicKey?.toString());
            console.log('   hook.connected:', connected);
            console.log('   hook.publicKey:', publicKey?.toString());
            
            if (onConnect) {
              onConnect();
            }
            
            // Force another re-render after calling onConnect
            setTimeout(() => {
              setForceUpdate(prev => prev + 1);
            }, 100);
            
            // If still not connected after waiting, try to manually trigger state refresh
            if (!stateUpdated && !phantomWallet.adapter.connected && !connected) {
              console.error('⚠️ Connection completed but state not updated');
              console.log('   Attempting manual state refresh...');
              
              // Try to manually trigger a connection check
              // Sometimes the adapter needs to be re-selected
              try {
                select(phantomWallet.adapter.name);
                // Force one more re-render
                setTimeout(() => {
                  setForceUpdate(prev => prev + 1);
                }, 500);
              } catch (e) {
                console.error('   Manual refresh failed:', e);
              }
              
              alert('Connection successful! If the UI doesn\'t update, please refresh the page.');
            } else {
              console.log('✅ Connection successful and state updated!');
            }
          } catch (error: any) {
            console.error('❌ Connection error:', error);
            // Try one more time after a delay
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying connection...');
                await phantomWallet.adapter.connect();
                if (onConnect) {
                  await onConnect();
                }
                console.log('✅ Connected on retry!');
              } catch (retryError: any) {
                console.error('❌ Retry failed:', retryError);
                alert(`Failed to connect wallet.\n\nPlease try:\n1. Restart the Phantom app\n2. Reload the page\n3. Make sure you approve the connection popup`);
              }
            }, 2000);
          }
        } else {
          // No Phantom wallet found - show helpful message
          console.error('❌ Phantom wallet not found');
          console.error('   Available wallets:', wallets.map(w => w.adapter.name));
          alert('Phantom wallet not detected.\n\nPlease make sure:\n1. You\'re using the Phantom app browser\n2. Phantom is installed and open\n3. Try refreshing the page');
        }
      } catch (error: any) {
        console.error('❌ Unexpected error:', error);
        alert('Error connecting wallet. Please try again.');
      }
    } else {
      // Not mobile and no Phantom detected
      alert('Please open this site in the Phantom app browser.');
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
