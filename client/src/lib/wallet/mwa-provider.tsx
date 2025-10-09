import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
// Removed mobile wallet adapter import - was causing override issues

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export const MWAProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const network = 'devnet';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => {
      const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isInPhantomApp = typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
      
      const walletList = [];
      
      // Always add Solflare (works everywhere)
      walletList.push(new SolflareWalletAdapter());
      
      // Add Phantom only if:
      // 1. We're in the Phantom app, OR
      // 2. We're on desktop (not mobile), OR  
      // 3. Phantom is actually detected
      if (isInPhantomApp || !isMobile || (typeof window !== 'undefined' && window.solana)) {
        walletList.push(new PhantomWalletAdapter());
      }
      
      console.log('🔧 MWA Provider: Available wallets:', walletList.map(w => w.name));
      console.log('📱 Mobile detected:', isMobile);
      console.log('👻 In Phantom app:', isInPhantomApp);
      
      return walletList;
    },
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
