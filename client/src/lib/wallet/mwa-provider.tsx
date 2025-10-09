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
      // Create wallet instances with explicit configuration
      const phantomWallet = new PhantomWalletAdapter();
      const solflareWallet = new SolflareWalletAdapter();
      
      const walletList = [phantomWallet, solflareWallet];
      
      console.log('🔧 MWA Provider: Available wallets:', walletList.map(w => w.name));
      console.log('📱 User agent:', navigator.userAgent);
      console.log('🔧 Phantom ready:', phantomWallet.readyState);
      console.log('🔧 Solflare ready:', solflareWallet.readyState);
      
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
