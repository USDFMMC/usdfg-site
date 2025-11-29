import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

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
  
  // Disable auto-connect on iOS Safari to prevent loops
  // This is critical for Safari deep link flow
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const skipAutoConnect = isIOS && isSafari;
  
  // Auto-connect by default, UNLESS on iOS Safari OR user explicitly disconnected
  const initialAutoConnect = (() => {
    if (typeof window === 'undefined') return !skipAutoConnect;
    
    // Never auto-connect on iOS Safari (prevents loops)
    if (skipAutoConnect) {
      console.log('🍎 iOS Safari detected - skipping auto-connect');
      return false;
    }
    
    // Check disconnect flag
    const userDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
    console.log('🔍 WalletProvider init - userDisconnected:', userDisconnected);
    
    // If user disconnected, clear any wallet adapter keys
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

  // Configure wallet adapters
  // CRITICAL: Use @solana/wallet-adapter-wallets for mobile-capable Phantom adapter
  // This package includes the mobile Safari deep link support
  const wallets = useMemo(() => {
    console.log('🔍 Creating Phantom adapter from @solana/wallet-adapter-wallets');
    
    const phantomAdapter = new PhantomWalletAdapter({
      pollInterval: 1000,
      pollTimeout: 15000,
    });
    
    // CRITICAL DEBUG: Verify which adapter we actually got
    console.log('✅ Phantom Wallet Adapter initialized:', {
      name: phantomAdapter.name,
      readyState: phantomAdapter.readyState,
      adapterClass: phantomAdapter.constructor.name,
      adapterPackage: '@solana/wallet-adapter-wallets',
      adapterInstance: phantomAdapter,
    });
    
    // Log adapter methods to verify mobile support
    console.log('🔍 Adapter methods check:', {
      hasConnect: typeof phantomAdapter.connect === 'function',
      hasDisconnect: typeof phantomAdapter.disconnect === 'function',
      hasSignTransaction: typeof phantomAdapter.signTransaction === 'function',
      hasSignMessage: typeof phantomAdapter.signMessage === 'function',
      // Check for mobile-specific methods
      adapterPrototype: Object.getPrototypeOf(phantomAdapter),
      adapterKeys: Object.keys(phantomAdapter),
    });
    
    // Log the full adapter to see all properties
    console.log('🔍 Full adapter object:', phantomAdapter);
    
    return [phantomAdapter];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={initialAutoConnect}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
