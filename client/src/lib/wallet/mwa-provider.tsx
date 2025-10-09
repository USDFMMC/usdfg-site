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
      
      const walletList = [
        // Desktop wallets first
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ];
      
      // Add mobile wallet adapter last to avoid overriding desktop wallets
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
      return walletList;
    },
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider 
          featuredWallets={2}
          className="wallet-modal"
        >
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
