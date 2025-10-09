import React, { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sendSOL } from "@/lib/wallet/solana";

interface WalletConnectMWAProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnectMWA: React.FC<WalletConnectMWAProps> = ({
  isConnected,
  onConnect,
  onDisconnect
}) => {
  const { publicKey, connected, connecting, disconnect, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh SOL balance every 15 seconds
  useEffect(() => {
    if (!publicKey) {
      console.log("🔄 Auto-refresh: No address, skipping");
      return;
    }
    
    console.log("🔄 Auto-refresh: Starting for address:", publicKey.toString().slice(0, 8) + "...");
    let stop = false;
    
    const fetchBalance = async () => {
      try {
        console.log("🔄 Auto-refresh: Fetching balance...");
        const balanceLamports = await connection.getBalance(publicKey);
        const balance = balanceLamports / LAMPORTS_PER_SOL;
        console.log("🔄 Auto-refresh: Raw balance:", balanceLamports, "lamports =", balance, "SOL");
        
        if (!stop) {
          setBalance(balance);
          console.log("🔄 Balance auto-refreshed:", balance.toFixed(4), "SOL");
        }
      } catch (e) {
        console.warn("Balance auto-refresh failed:", e);
      }
    };
    
    // Initial fetch
    console.log("🔄 Auto-refresh: Initial fetch");
    fetchBalance();
    
    // Set up interval
    console.log("🔄 Auto-refresh: Setting up 15s interval");
    const iv = setInterval(fetchBalance, 15000); // every 15s
    
    return () => { 
      console.log("🔄 Auto-refresh: Cleanup");
      stop = true; 
      clearInterval(iv); 
    };
  }, [publicKey, connection]);

  // Handle connection state changes
  useEffect(() => {
    if (connected && publicKey) {
      console.log("🔗 Wallet connected via MWA:", publicKey.toString().slice(0, 8) + "...");
      onConnect();
      
      // Fetch initial balance
      console.log("💰 Initial balance fetch for:", publicKey.toString().slice(0, 8) + "...");
      connection.getBalance(publicKey)
        .then(balanceLamports => {
          const balance = balanceLamports / LAMPORTS_PER_SOL;
          console.log("💰 Balance loaded:", balance);
          setBalance(balance);
        })
        .catch(err => {
          console.error("❌ Balance fetch failed:", err);
          setBalance(null);
        });
    } else if (!connected) {
      console.log("🔌 Wallet disconnected via MWA");
      setBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, onConnect, onDisconnect, connection]);

  const handleTestTransaction = async () => {
    if (!publicKey) return;
    
    setSending(true);
    setError(null);
    
    try {
      // Send 0.01 SOL to a test address (you can change this)
      const testRecipient = "11111111111111111111111111111112"; // System program address as test
      const signature = await sendSOL(publicKey.toString(), testRecipient, 0.01, {
        signTransaction: signTransaction
      });
      
      // Refresh balance after transaction
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      
      alert(`Test transaction sent! Signature: ${signature.slice(0, 8)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      console.error("Test transaction failed:", err);
    } finally {
      setSending(false);
    }
  };

  // If connected, show connected state
  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </div>
          <div className="text-white font-semibold">
            {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading balance..."}
          </div>
        </div>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
          🟢 Connected
        </span>
        <button 
          onClick={handleTestTransaction}
          disabled={sending || (balance !== null && balance < 0.01)}
          className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : "Test 0.01 SOL"}
        </button>
        <WalletDisconnectButton className="px-3 py-1 border border-gray-600 text-white rounded hover:bg-gray-800 transition-colors" />
      </div>
    );
  }

  // Show connection options
  return (
    <div className="flex flex-col space-y-2">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      )}
      
      <WalletMultiButton className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50" />
      
      {connecting && (
        <div className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded p-2">
          🔗 Please approve the connection in your wallet popup.
        </div>
      )}
    </div>
  );
};

// Helper function for sending SOL (keeping the same logic as before)
const sendSOL = async (senderPublicKey: string, recipientPublicKey: string, amount: number): Promise<string> => {
  try {
    // This would need to be updated to use MWA's transaction signing
    // For now, keeping the same logic as the original implementation
    throw new Error("Transaction functionality needs to be updated for MWA");
  } catch (err) {
    console.error("Error sending SOL:", err);
    throw err;
  }
};

export default WalletConnectMWA;
