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
    if (mobile) {
      console.log("📱 Mobile Safari detected → using Phantom deep link");
      return phantomMobileConnect();
    }

    console.log("🖥 Desktop detected → using wallet adapter");
    
    // Select Phantom if not already selected
    if (!wallet.wallet) {
      const phantomWallet = wallet.wallets.find(
        (w) => w.adapter.name === "Phantom"
      );
      
      if (phantomWallet) {
        await wallet.select(phantomWallet.adapter.name);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    
    return wallet.connect();
  }

  async function disconnect() {
    if (!mobile) {
      return wallet.disconnect();
    }
    // On mobile, clear stored connection
    localStorage.removeItem('phantom_connected');
    localStorage.removeItem('phantom_public_key');
    sessionStorage.removeItem('phantomSession');
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

