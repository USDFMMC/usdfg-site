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
    if (mobile) {
      console.log("🟢 Mobile Safari: returning empty wallets (deep link mode)");
      return []; // NO wallet adapters, but provider still exists
    }

    console.log("🟢 Desktop: loading Phantom adapter");
    return [
      new PhantomWalletAdapter({
        pollInterval: 1000,
        pollTimeout: 15000,
      }),
    ];
  }, [mobile]);

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
