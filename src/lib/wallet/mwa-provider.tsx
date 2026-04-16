/**
 * Wallet root provider — matches usdfg-site `client/src/lib/wallet/mwa-provider.tsx` pattern:
 * ConnectionProvider → WalletProvider → WalletModalProvider.
 * Phantom + Solflare (Solflare kept for admin / WalletMultiButton parity).
 */
import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { getRpcEndpoint } from '@/lib/chain/rpc';

export const MWAProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => getRpcEndpoint(), []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
