import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { createDefaultAuthorizationResultCache, SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';

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
      
      // Always add Solflare (works in all browsers)
      const solflareWallet = new SolflareWalletAdapter();
      walletList.push(solflareWallet);
      
      // Add Phantom only if detected or in Phantom app
      if (isInPhantomApp || (typeof window !== 'undefined' && window.solana)) {
        const phantomWallet = new PhantomWalletAdapter();
        walletList.push(phantomWallet);
      }
      
      // Add mobile wallet adapter for mobile browsers
      if (isMobile) {
        walletList.push(
          new SolanaMobileWalletAdapter({
            appIdentity: { name: 'USDFG Arena' },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
          })
        );
      }
      
      console.log('🔧 MWA Provider: Available wallets:', walletList.map(w => w.name));
      console.log('📱 Mobile detected:', isMobile);
      console.log('👻 In Phantom app:', isInPhantomApp);
      console.log('🔧 Window.solana exists:', !!window.solana);
      
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
