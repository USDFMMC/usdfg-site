import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';

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

  // Configure wallet adapters
  // CRITICAL: SolanaMobileWalletAdapter MUST be first to enable Safari → Phantom → Safari flow
  // This prevents deep link fallback and ensures MWA is used on mobile browsers
  const wallets = useMemo(() => {
    const adapters = [];
    
    // Add Mobile Wallet Adapter FIRST for seamless mobile browser experience
    // MWA must be first in the array to take priority over Phantom's deep link fallback
    try {
      const mobileAdapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'USDFG',
          uri: typeof window !== 'undefined' ? window.location.origin : 'https://usdfg.pro',
          icon: '/favicon.png',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: 'devnet',
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      });
      adapters.push(mobileAdapter);
      console.log('✅ Mobile Wallet Adapter initialized:', mobileAdapter.name);
    } catch (error) {
      console.warn('⚠️ Mobile Wallet Adapter initialization failed (non-fatal):', error);
      // Continue without MWA - Phantom/Solflare will still work
    }
    
    // Add standard wallet adapters AFTER MWA
    // These will be used as fallbacks if MWA is not available
    const phantomAdapter = new PhantomWalletAdapter();
    const solflareAdapter = new SolflareWalletAdapter();
    adapters.push(phantomAdapter, solflareAdapter);
    
    // Log all adapter names for debugging
    console.log('📋 Available wallet adapters (in priority order):');
    adapters.forEach((adapter, index) => {
      console.log(`  ${index + 1}. ${adapter.name} (readyState: ${adapter.readyState})`);
    });
    
    return adapters;
  }, []);

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
