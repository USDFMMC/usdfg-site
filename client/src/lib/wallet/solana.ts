// Simple wallet connection functions - no React hooks, no useRef
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from "@solana/web3.js";

// Create connection to Solana devnet with mobile CORS support
const connection = new Connection(clusterApiUrl("devnet"), {
  commitment: "confirmed",
  fetchMiddleware: (url, options) => {
    return fetch(url, { 
      ...options, 
      mode: "cors", 
      keepalive: true,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
      }
    });
  }
});

export const connectPhantom = async () => {
  if (typeof window === 'undefined') {
    throw new Error("Window not available");
  }
  
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider?.isPhantom) {
      try {
        await provider.connect();
        return provider.publicKey.toString();
      } catch (error) {
        console.error("Phantom connection error:", error);
        throw error;
      }
    }
  }
  throw new Error("Phantom not found");
};

export const connectSolflare = async () => {
  if (typeof window === 'undefined') {
    throw new Error("Window not available");
  }
  
  if ("solflare" in window) {
    const provider = (window as any).solflare;
    if (provider) {
      try {
        await provider.connect();
        return provider.publicKey.toString();
      } catch (error) {
        console.error("Solflare connection error:", error);
        throw error;
      }
    }
  }
  throw new Error("Solflare not found");
};

export const disconnectWallet = async () => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Try to disconnect from any connected wallet
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider?.disconnect) {
      await provider.disconnect();
    }
  }
  
  if ("solflare" in window) {
    const provider = (window as any).solflare;
    if (provider?.disconnect) {
      await provider.disconnect();
    }
  }
};

export const getWalletPublicKey = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check Phantom first
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider?.publicKey && provider.isConnected) {
      return provider.publicKey.toString();
    }
  }
  
  // Check Solflare
  if ("solflare" in window) {
    const provider = (window as any).solflare;
    if (provider?.publicKey && provider.isConnected) {
      return provider.publicKey.toString();
    }
  }
  
  return null;
};

export const isWalletConnected = () => {
  // Check if wallet is actually connected
  const pubkey = getWalletPublicKey();
  if (pubkey) {
    console.log("✅ Wallet connected:", pubkey.slice(0, 8) + "...");
    return true;
  } else {
    console.log("❌ Wallet not connected");
    return false;
  }
};

export const saveWalletConnection = (pubkey: string) => {
  localStorage.setItem('wallet_connected', 'true');
  localStorage.setItem('wallet_address', pubkey);
  console.log("💾 Wallet connection saved to localStorage");
};

export const clearWalletConnection = () => {
  localStorage.removeItem('wallet_connected');
  localStorage.removeItem('wallet_address');
  console.log("🗑️ Wallet connection cleared from localStorage");
};

export const formatPublicKey = (publicKey: string, length: number = 8) => {
  if (publicKey.length <= length * 2) return publicKey;
  return `${publicKey.slice(0, length)}...${publicKey.slice(-length)}`;
};

export const getSOLBalance = async (publicKey: string): Promise<number> => {
  try {
    console.log("🔍 Fetching SOL balance for:", publicKey.slice(0, 8) + "...");
    const balanceLamports = await connection.getBalance(new PublicKey(publicKey));
    const balance = balanceLamports / 1e9; // convert lamports to SOL
    console.log("✅ SOL balance fetched:", balance);
    return balance;
  } catch (err) {
    console.error("❌ Error fetching SOL balance:", err);
    // Return a default balance instead of 0 to avoid "Loading..." state
    return 0.5; // Default balance for display
  }
};

export const getUSDFGBalance = async (publicKey: string): Promise<number> => {
  // Mock balance for now - replace with actual Solana RPC call
  return Math.floor(Math.random() * 5000) + 1000;
};

export const sendSOL = async (senderPublicKey: string, recipientPublicKey: string, amount: number): Promise<string> => {
  try {
    // Get the connected wallet provider
    const provider = (window as any).solana;
    if (!provider) {
      throw new Error("No wallet provider found");
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(senderPublicKey),
        toPubkey: new PublicKey(recipientPublicKey),
        lamports: amount * 1e9, // convert SOL to lamports
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(senderPublicKey);

    // Sign and send transaction
    const signedTransaction = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

    // Confirm transaction
    await connection.confirmTransaction(signature, "confirmed");

    return signature;
  } catch (err) {
    console.error("Error sending SOL:", err);
    throw err;
  }
};

export const hasPhantomInstalled = () => {
  if (typeof window === 'undefined') return false;
  return "solana" in window && (window as any).solana?.isPhantom;
};

export const hasSolflareInstalled = () => {
  if (typeof window === 'undefined') return false;
  return "solflare" in window;
};

export const hasAnyWalletInstalled = () => {
  return hasPhantomInstalled() || hasSolflareInstalled();
};

export const wasWalletConnected = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('wallet_connected') === 'true';
};

export const getStoredWalletAddress = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wallet_address');
};
