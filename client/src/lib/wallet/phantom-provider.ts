import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export function usePhantom() {
  const wallet = useWallet();
  const { connection } = useConnection();

  // Clear stale nonce before connecting (Phantom iOS fix)
  const connect = useCallback(async () => {
    try {
      // Clear stale nonce (Phantom iOS fix)
      localStorage.removeItem("walletAdapterMobileNonce");
      
      // CRITICAL: Select Phantom wallet first before connecting
      // This prevents WalletNotSelectedError on Safari
      if (!wallet.wallet) {
        // Find Phantom adapter in wallets list
        const phantomWallet = wallet.wallets.find(
          (w) => w.adapter.name === "Phantom"
        );
        
        if (phantomWallet) {
          console.log("🔍 Selecting Phantom wallet before connect");
          await wallet.select(phantomWallet.adapter.name);
          // Wait a bit for selection to complete
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          console.error("❌ Phantom wallet not found in wallets list");
          throw new Error("Phantom wallet not available");
        }
      }
      
      // Now connect
      await wallet.connect();
    } catch (e) {
      console.log("Phantom connect canceled:", e);
      throw e; // Re-throw so UI can handle it
    }
  }, [wallet]);

  const disconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
    } catch (e) {
      console.log("Disconnect error:", e);
    }
  }, [wallet]);

  return {
    connect,
    disconnect,
    publicKey: wallet.publicKey as PublicKey | null,
    connected: wallet.connected,
    connecting: wallet.connecting,
    connection,
  };
}

