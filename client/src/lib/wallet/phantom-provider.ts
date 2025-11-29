import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { launchPhantomDeepLink, shouldUseDeepLink } from "@/lib/wallet/phantom-deeplink";

export function usePhantom() {
  const wallet = useWallet();
  const { connection } = useConnection();

  // Clear stale nonce before connecting (Phantom iOS fix)
  const connect = useCallback(async () => {
    try {
      console.log("🚀 usePhantom.connect() called");
      console.log("🔍 Current URL:", window.location.href);
      console.log("🔍 Wallet state:", {
        wallet: wallet.wallet?.adapter.name,
        connected: wallet.connected,
        connecting: wallet.connecting,
        walletsCount: wallet.wallets.length,
        wallets: wallet.wallets.map(w => w.adapter.name)
      });
      
      // Clear stale nonce (Phantom iOS fix)
      localStorage.removeItem("walletAdapterMobileNonce");
      console.log("✅ Cleared walletAdapterMobileNonce");
      
      // CRITICAL: Select Phantom wallet first before connecting
      // This prevents WalletNotSelectedError on Safari
      if (!wallet.wallet) {
        // Find Phantom adapter in wallets list
        const phantomWallet = wallet.wallets.find(
          (w) => w.adapter.name === "Phantom"
        );
        
        if (phantomWallet) {
          console.log("🔍 Selecting Phantom wallet before connect");
          console.log("🔍 Phantom adapter readyState:", phantomWallet.adapter.readyState);
          await wallet.select(phantomWallet.adapter.name);
          console.log("✅ Phantom wallet selected");
          // Wait a bit for selection to complete
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          console.error("❌ Phantom wallet not found in wallets list");
          console.error("❌ Available wallets:", wallet.wallets.map(w => w.adapter.name));
          throw new Error("Phantom wallet not available");
        }
      } else {
        console.log("✅ Wallet already selected:", wallet.wallet.adapter.name);
      }
      
      // On mobile Safari, use manual deep link (adapter doesn't always generate it)
      const shouldUseManualDeepLink = shouldUseDeepLink();
      
      if (shouldUseManualDeepLink) {
        console.log("📱 Mobile Safari detected - using manual deep link");
        console.log("🔗 Launching manual Phantom deep link...");
        launchPhantomDeepLink();
        // Deep link redirects immediately, so we don't await
        return;
      }
      
      // Desktop or non-Safari mobile - use adapter's connect
      // This should trigger deep link generation automatically
      console.log("🔗 Calling wallet.connect() - this should generate deep link");
      await wallet.connect();
      console.log("✅ wallet.connect() completed");
    } catch (e: any) {
      console.error("❌ Phantom connect error:", e);
      console.error("❌ Error name:", e?.name);
      console.error("❌ Error message:", e?.message);
      console.error("❌ Error stack:", e?.stack);
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

