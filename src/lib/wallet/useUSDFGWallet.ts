import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { launchPhantomDeepLink } from "@/lib/wallet/phantom-deeplink";

/** Browsers where there is usually no injected Phantom (use universal-link flow instead). */
function shouldUsePhantomMobileDeepLink(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  // iPadOS 13+ often reports as Mac
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function useUSDFGWallet() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async function selectWalletWithRetry(adapterName: WalletName, maxRetries: number = 2): Promise<void> {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await wallet.select(adapterName);
        // Wait for adapter + React context to update (context can lag behind connect event)
        await wait(400 + attempt * 200);
        if (wallet.wallet || wallet.connected || wallet.publicKey) {
          return;
        }
      } catch (error: any) {
        lastError = error;
      }
      await wait(300 + attempt * 150);
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("Failed to select wallet");
  }

  async function connect() {
    
    // Check if user is on Safari desktop (Phantom doesn't support Safari)
    const isSafariDesktop = typeof window !== "undefined" && 
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
      !/iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isSafariDesktop) {
      const errorMsg = "⚠️ Phantom wallet doesn't support Safari desktop.\n\nPlease use one of these browsers:\n• Chrome\n• Firefox\n• Brave\n• Edge\n\nOr use the Phantom mobile app on your phone.";
      console.error("❌", errorMsg);
      throw new Error("Phantom doesn't support Safari desktop. Please use Chrome, Firefox, Brave, or Edge.");
    }

    // Mobile / in-app browsers: open Phantom via universal link (extension path usually unavailable).
    const hasInjectedPhantom =
      typeof window !== "undefined" && !!(window as any).solana?.isPhantom;
    if (shouldUsePhantomMobileDeepLink() && !hasInjectedPhantom) {
      launchPhantomDeepLink();
      return;
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
      if (phantomWallet.adapter.readyState === WalletReadyState.NotDetected) {
        const errorMsg = "Phantom wallet extension not found. Please install Phantom from https://phantom.app";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
    }
    
    // Give adapter state a moment to settle (helps quick reconnects)
    await wait(150);

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
      
      if (phantomWallet.adapter.readyState === WalletReadyState.NotDetected) {
        const errorMsg = "Phantom wallet extension not found. Please install Phantom from https://phantom.app and refresh the page.";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }
      
      if (phantomWallet.adapter.readyState === WalletReadyState.Installed || phantomWallet.adapter.readyState === WalletReadyState.Loadable) {
        console.log("🔍 Selecting Phantom wallet...");
        try {
          await selectWalletWithRetry(phantomWallet.adapter.name, 2);
          // Verify selection worked (wallet context may update after connect event)
          if (!wallet.wallet && !wallet.connected && !wallet.publicKey) {
            const errorMsg = "Failed to select Phantom wallet. Please wait a moment and try again.";
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
      const message = error?.message || "";
      const shouldRetry = message.includes("not selected") || message.includes("WalletNotSelected") || message.includes("Failed to select");
      if (shouldRetry) {
        await wait(200);
        const phantomWallet = wallet.wallets.find(
          (w) => w.adapter.name === "Phantom"
        );
        if (phantomWallet) {
          await selectWalletWithRetry(phantomWallet.adapter.name, 1);
        }
        await wallet.connect();
        console.log("✅ Successfully connected to Phantom after retry");
        return;
      }
      // If connection completed despite error, silently succeed
      await wait(300);
      if (wallet.connected || wallet.publicKey) {
        console.log("✅ Connected despite transient error");
        return;
      }
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

