import React, { FC, ReactNode, useMemo } from "react";
import {
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

export const DesktopWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // RPC Endpoint Configuration
  // OPTION 1: Use custom RPC (recommended - no rate limits)
  // Get free RPC from: https://www.helius.dev/ or https://www.quicknode.com/
  // const endpoint = "https://your-custom-rpc-url-here";
  
  // OPTION 2: Use public mainnet (for production - still has rate limits but more generous)
  // const endpoint = clusterApiUrl("mainnet-beta");
  
  // OPTION 3: Use public devnet (current - has strict rate limits ⚠️)
  const endpoint = clusterApiUrl("devnet");
  
  // NOTE: If you see HTTP 429 errors, you're hitting rate limits!
  // Solution: Get a free RPC from Helius or QuickNode (see OPTION 1 above)
  
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

