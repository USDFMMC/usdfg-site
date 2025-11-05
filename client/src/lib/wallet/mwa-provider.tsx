import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export const MWAProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const network = 'devnet';
  // Use a more reliable RPC endpoint
  // Try multiple fallback endpoints for better reliability
  const endpoint = useMemo(() => {
    // List of reliable devnet RPC endpoints (in order of preference)
    // TryNode is a free public RPC that's usually more reliable
    const endpoints = [
      'https://api.devnet.solana.com', // Official Solana devnet
      'https://solana-devnet-rpc.allthatnode.com', // AllThatNode (free tier)
      clusterApiUrl(network), // Default fallback
    ];
    
    // Use the first endpoint (official devnet is most reliable)
    return endpoints[0];
  }, [network]);
  
  // Auto-connect by default, UNLESS user explicitly disconnected
  // Check localStorage SYNCHRONOUSLY before any state initialization
  // This must happen before WalletProvider initializes
  const initialAutoConnect = (() => {
    if (typeof window === 'undefined') return true;
    
    // Check disconnect flag first
    const userDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
    console.log('🔍 WalletProvider init - userDisconnected:', userDisconnected);
    
    // If user disconnected, also clear any wallet adapter keys that might have been created
    if (userDisconnected) {
      try {
        const allKeys = Object.keys(localStorage);
        const keysToClear = allKeys.filter(key => 
          (key.toLowerCase().includes('wallet') || 
           key.toLowerCase().includes('solana') ||
           key.startsWith('walletName') ||
           key.includes('@solana') ||
           key.includes('wallet-adapter')) &&
          key !== 'wallet_disconnected'
        );
        console.log('🗑️ Clearing wallet adapter keys on init:', keysToClear);
        
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.error('❌ Error clearing keys:', e);
      }
    }
    
    const shouldAutoConnect = !userDisconnected;
    console.log('✅ WalletProvider autoConnect set to:', shouldAutoConnect);
    return shouldAutoConnect;
  })();
  
  const [shouldAutoConnect, setShouldAutoConnect] = useState(initialAutoConnect);

  // Check if user has explicitly disconnected
  useEffect(() => {
    const checkDisconnect = () => {
      const userDisconnected = typeof window !== 'undefined' && localStorage.getItem('wallet_disconnected') === 'true';
      setShouldAutoConnect(!userDisconnected);
    };

    checkDisconnect();
    
    // Listen for storage changes (in case user disconnects in another tab)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', checkDisconnect);
      // Also listen for custom events
      window.addEventListener('walletDisconnected', checkDisconnect);
      return () => {
        window.removeEventListener('storage', checkDisconnect);
        window.removeEventListener('walletDisconnected', checkDisconnect);
      };
    }
  }, []);

  // Auto-detect Standard Wallets (like Phantom)
  // Empty array allows the wallet adapter to automatically detect and use
  // wallets that follow the Standard Wallet protocol
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={shouldAutoConnect}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
