import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { isMobileSafari } from '../utils/isMobileSafari';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export const MWAProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const mobile = isMobileSafari();
  const endpoint = clusterApiUrl("devnet");
  
  // CRITICAL: Always provide WalletProvider, but conditionally load adapters
  // On mobile Safari: empty array (no adapters, but provider exists for useWallet hooks)
  // On desktop: Phantom adapter (normal flow)
  const wallets = useMemo(() => {
    // CRITICAL: Always include PhantomWalletAdapter - even on mobile Safari
    // The adapter must exist to prevent WalletNotSelectedError
    // Deep link flow works alongside adapter, not instead of it
    console.log("🟢 Loading Phantom adapter for all platforms");
    return [
      new PhantomWalletAdapter({
        pollInterval: 1000,
        pollTimeout: 15000,
      }),
    ];
  }, []);

  // ALWAYS wrap with WalletProvider - even on mobile
  // This prevents "You have tried to read publicKey on a WalletContext without providing one" errors
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={!mobile}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
