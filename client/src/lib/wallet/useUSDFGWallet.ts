import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { isMobileSafari } from "../utils/isMobileSafari";
import { phantomMobileConnect } from "./mobile";
import { PublicKey } from "@solana/web3.js";

export function useUSDFGWallet() {
  const wallet = useWallet();
  // ConnectionProvider is always available (even on mobile, we provide it)
  const { connection } = useConnection();
  const mobile = isMobileSafari();

  async function connect() {
    // Only clear stuck connection states (older than 10 seconds)
    // Don't clear fresh connection attempts set by the button
    if (typeof window !== "undefined") {
      const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
      if (connectTimestamp) {
        const timeSinceConnect = Date.now() - parseInt(connectTimestamp);
        if (timeSinceConnect > 10000) {
          console.log("🧹 Clearing stuck connection state in connect()");
          sessionStorage.removeItem('phantom_connecting');
          sessionStorage.removeItem('phantom_connect_timestamp');
          sessionStorage.removeItem('phantom_connect_attempt');
        }
      } else {
        // No timestamp but marked as connecting - clear orphaned state
        const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
        if (isConnecting) {
          console.log("🧹 Clearing orphaned connection state in connect()");
          sessionStorage.removeItem('phantom_connecting');
        }
      }
    }
    
    if (mobile) {
      // On mobile Safari: check if window.solana exists (Phantom browser)
      // If it exists, use wallet adapter (works in Phantom browser)
      // If not, use deep link (works from Safari)
      const hasWindowSolana = typeof window !== "undefined" && !!(window as any).solana;
      
      if (hasWindowSolana) {
        console.log("📱 Mobile Safari + window.solana detected → using wallet adapter (Phantom browser)");
        
        // Select Phantom if not already selected
        if (!wallet.wallet) {
          const phantomWallet = wallet.wallets.find(
            (w) => w.adapter.name === "Phantom"
          );
          
          if (phantomWallet) {
            await wallet.select(phantomWallet.adapter.name);
            await new Promise((resolve) => setTimeout(resolve, 100));
          } else {
            throw new Error("Phantom wallet not found. Please ensure Phantom is installed.");
          }
        }
        
        return wallet.connect();
      } else {
        console.log("📱 Mobile Safari detected → using Phantom deep link");
        return phantomMobileConnect();
      }
    }

    console.log("🖥 Desktop detected → using wallet adapter");
    
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
      
      console.log("🔍 Selecting Phantom wallet...");
      try {
        await wallet.select(phantomWallet.adapter.name);
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Verify selection worked
        if (!wallet.wallet) {
          const errorMsg = "Failed to select Phantom wallet. Please try again.";
          console.error("❌", errorMsg);
          throw new Error(errorMsg);
        }
      } catch (selectError: any) {
        console.error("❌ Error selecting wallet:", selectError);
        // Re-throw with more context
        throw new Error(`Failed to select Phantom wallet: ${selectError.message || 'Unknown error'}`);
      }
    }
    
    console.log("🔗 Connecting to Phantom...");
    try {
      await wallet.connect();
      console.log("✅ Successfully connected to Phantom");
    } catch (error: any) {
      console.error("❌ Connection error:", error);
      // Clear all connection state on error
      if (typeof window !== "undefined") {
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
      }
      throw error;
    }
  }

  async function disconnect() {
    // Clear all connection-related state
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('phantom_connecting');
      sessionStorage.removeItem('phantom_connect_timestamp');
      sessionStorage.removeItem('phantom_connect_attempt');
      sessionStorage.removeItem('phantom_dapp_nonce');
      sessionStorage.removeItem('phantom_dapp_keypair');
      sessionStorage.removeItem('phantom_original_tab');
      sessionStorage.removeItem('phantom_redirect_count');
      localStorage.removeItem('phantom_connected');
      localStorage.removeItem('phantom_public_key');
      localStorage.removeItem('phantom_dapp_handshake');
      sessionStorage.removeItem('phantomSession');
    }
    
    if (!mobile) {
      return wallet.disconnect();
    }
    // On mobile, connection state is already cleared above
  }

  // On mobile, check for stored connection from deep link return
  const mobileConnected = mobile && typeof window !== 'undefined' && 
    localStorage.getItem('phantom_connected') === 'true';
  const mobilePublicKey = mobile && typeof window !== 'undefined' && 
    localStorage.getItem('phantom_public_key');

  return {
    connect,
    disconnect,
    connected: mobile ? mobileConnected : wallet.connected,
    publicKey: mobile 
      ? (mobilePublicKey ? new PublicKey(mobilePublicKey) : null)
      : (wallet.publicKey as PublicKey | null),
    mobile,
    connecting: mobile ? false : wallet.connecting,
    connection,
  };
}

