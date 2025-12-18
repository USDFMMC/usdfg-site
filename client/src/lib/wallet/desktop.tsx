import React, { FC, ReactNode, useMemo } from "react";
import {
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { getRpcEndpoint } from "@/lib/chain/rpc";

export const DesktopWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use centralized RPC configuration
  // To use a custom RPC, add to .env: VITE_SOLANA_RPC_ENDPOINT=https://your-rpc-endpoint.com
  const endpoint = getRpcEndpoint();
  
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

