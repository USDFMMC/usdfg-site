import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export function useUSDFGWallet() {
  const wallet = useWallet();
  const { connection } = useConnection();

  async function connect() {
    
    // Check if user is on Safari desktop (Phantom doesn't support Safari)
    const isSafariDesktop = typeof window !== "undefined" && 
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
      !/iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isSafariDesktop) {
      const errorMsg = "⚠️ Phantom wallet doesn't support Safari desktop.\n\nPlease use one of these browsers:\n• Chrome\n• Firefox\n• Brave\n• Edge\n\nOr use the Phantom mobile app on your phone.";
      console.error("❌", errorMsg);
      alert(errorMsg);
      throw new Error("Phantom doesn't support Safari desktop. Please use Chrome, Firefox, Brave, or Edge.");
    }
    
    // CRITICAL: Check if Phantom extension is actually installed
    const hasPhantomExtension = typeof window !== "undefined" && !!(window as any).solana?.isPhantom;
    
    if (!hasPhantomExtension) {
      // Check if Phantom is in the wallets list (adapter might detect it)
      const phantomWallet = wallet.wallets.find(
        (w) => w.adapter.name === "Phantom"
      );
      
      if (!phantomWallet) {
        const errorMsg = "Phantom wallet extension not detected. Please install Phantom from https://phantom.app";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
      
      // Check adapter ready state
      if (phantomWallet.adapter.readyState === "NotFound") {
        const errorMsg = "Phantom wallet extension not found. Please install Phantom from https://phantom.app";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
    }
    
    // Select Phantom if not already selected
    if (!wallet.wallet) {
      const phantomWallet = wallet.wallets.find(
        (w) => w.adapter.name === "Phantom"
      );
      
      if (!phantomWallet) {
        const errorMsg = "Phantom wallet not available. Please install Phantom from https://phantom.app";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
      
      // Check adapter ready state before attempting selection
      console.log("🔍 Phantom adapter readyState:", phantomWallet.adapter.readyState);
      
      if (phantomWallet.adapter.readyState === "NotFound") {
        const errorMsg = "Phantom wallet extension not found. Please install Phantom from https://phantom.app and refresh the page.";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
      
      if (phantomWallet.adapter.readyState === "Installed" || phantomWallet.adapter.readyState === "Loadable") {
        console.log("🔍 Selecting Phantom wallet...");
        try {
          await wallet.select(phantomWallet.adapter.name);
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          // Verify selection worked
          if (!wallet.wallet) {
            const errorMsg = "Failed to select Phantom wallet. Please refresh the page and try again.";
            console.error("❌", errorMsg);
            throw new Error(errorMsg);
          }
          console.log("✅ Phantom wallet selected successfully");
        } catch (selectError: any) {
          console.error("❌ Error selecting wallet:", selectError);
          
          // Provide specific error messages based on error type
          let errorMsg = "Failed to select Phantom wallet.";
          
          if (selectError.message?.includes("not found") || selectError.message?.includes("NotFound")) {
            errorMsg = "Phantom wallet extension not found. Please install Phantom from https://phantom.app and refresh the page.";
          } else if (selectError.message?.includes("User rejected") || selectError.message?.includes("User cancelled")) {
            errorMsg = "Wallet connection was cancelled. Please try again.";
          } else if (selectError.message) {
            errorMsg = `Failed to select Phantom wallet: ${selectError.message}`;
          } else {
            errorMsg = "Failed to select Phantom wallet. Please refresh the page and try again.";
          }
          
          throw new Error(errorMsg);
        }
      } else {
        // Adapter is not ready yet
        const errorMsg = "Phantom wallet is not ready yet. Please wait a moment and try again.";
        console.error("❌", errorMsg, "ReadyState:", phantomWallet.adapter.readyState);
        throw new Error(errorMsg);
      }
    }
    
    console.log("🔗 Connecting to Phantom...");
    try {
      await wallet.connect();
      console.log("✅ Successfully connected to Phantom");
    } catch (error: any) {
      console.error("❌ Connection error:", error);
      throw error;
    }
  }

  async function disconnect() {
    return wallet.disconnect();
  }

  return {
    connect,
    disconnect,
    connected: wallet.connected,
    publicKey: wallet.publicKey as PublicKey | null,
    connecting: wallet.connecting,
    connection,
  };
}

