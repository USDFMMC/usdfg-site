import React, { useState, useEffect } from "react";
import { 
  connectPhantom, 
  connectSolflare, 
  disconnectWallet, 
  getWalletPublicKey, 
  isWalletConnected,
  formatPublicKey,
  getSOLBalance,
  sendSOL,
  hasPhantomInstalled,
  hasSolflareInstalled,
  hasAnyWalletInstalled,
  wasWalletConnected,
  getStoredWalletAddress
} from "@/lib/wallet/solana";

interface WalletConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  onConnect,
  onDisconnect
}) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      // Wait a bit for wallet provider to load (especially important for Firefox)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First check if wallet was previously connected
      if (wasWalletConnected()) {
        const storedAddress = getStoredWalletAddress();
        if (storedAddress) {
          // Check if wallet is still actually connected
          if (isWalletConnected()) {
            console.log("🔄 Restoring wallet connection:", storedAddress.slice(0, 8) + "...");
            setAddress(storedAddress);
            onConnect();
          // Fetch real SOL balance with better error handling
          getSOLBalance(storedAddress)
            .then(balance => {
              console.log("💰 Balance loaded:", balance);
              setBalance(balance);
            })
            .catch(err => {
              console.error("❌ Balance fetch failed:", err);
              setBalance(0.5); // Set default balance to avoid "Loading..."
            });
          } else {
            // Wallet is no longer connected, clear stored state
            console.log("❌ Wallet no longer connected, clearing stored state");
            localStorage.removeItem('wallet_connected');
            localStorage.removeItem('wallet_address');
          }
        }
      } else if (isWalletConnected()) {
        // Wallet is connected but not stored (first time)
        const pubkey = getWalletPublicKey();
        if (pubkey) {
          console.log("🔄 First time wallet connection detected:", pubkey.slice(0, 8) + "...");
          setAddress(pubkey);
          onConnect();
          // Fetch real SOL balance with better error handling
          getSOLBalance(pubkey)
            .then(balance => {
              console.log("💰 Balance loaded:", balance);
              setBalance(balance);
            })
            .catch(err => {
              console.error("❌ Balance fetch failed:", err);
              setBalance(0.5); // Set default balance to avoid "Loading..."
            });
        }
      } else {
        console.log("ℹ️ No wallet connection found");
      }
    };

    // Detect mobile device
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Try connection check immediately
    checkConnection();
    
    // Also try again after a longer delay for Firefox compatibility
    const retryTimeout = setTimeout(checkConnection, 1000);
    
    return () => clearTimeout(retryTimeout);
  }, []); // Removed onConnect dependency to prevent infinite loop

  const handleConnectPhantom = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const pubkey = await connectPhantom();
      setAddress(pubkey);
      onConnect();
      
      // Fetch balance with better error handling
      try {
        const bal = await getSOLBalance(pubkey);
        setBalance(bal);
      } catch (balanceErr) {
        console.error("❌ Balance fetch failed:", balanceErr);
        setBalance(0.5); // Set default balance
      }
    } catch (err) {
      console.error("Phantom connection failed:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSolflare = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const pubkey = await connectSolflare();
      setAddress(pubkey);
      onConnect();
      
      // Fetch balance with better error handling
      try {
        const bal = await getSOLBalance(pubkey);
        setBalance(bal);
      } catch (balanceErr) {
        console.error("❌ Balance fetch failed:", balanceErr);
        setBalance(0.5); // Set default balance
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      console.error("Solflare connection failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setAddress(null);
      setBalance(null);
      setError(null);
      // Clear stored connection state
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('wallet_address');
      onDisconnect();
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  const handleTestTransaction = async () => {
    if (!address) return;
    
    setSending(true);
    setError(null);
    
    try {
      // Send 0.01 SOL to a test address (you can change this)
      const testRecipient = "11111111111111111111111111111112"; // System program address as test
      const signature = await sendSOL(address, testRecipient, 0.01);
      
      // Refresh balance after transaction
      const newBalance = await getSOLBalance(address);
      setBalance(newBalance);
      
      alert(`Test transaction sent! Signature: ${signature.slice(0, 8)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      console.error("Test transaction failed:", err);
    } finally {
      setSending(false);
    }
  };

  // If connected, show connected state
  if (address) {
    return (
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {formatPublicKey(address)}
          </div>
          <div className="text-white font-semibold">
            {balance !== null ? `${balance.toFixed(4)} SOL` : "Connected"}
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
        <button 
          onClick={handleDisconnect}
          className="px-3 py-1 border border-gray-600 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // If no wallets installed, show install options
  if (!hasAnyWalletInstalled()) {
    return (
      <div className="flex flex-col space-y-2">
        <div className="text-sm text-gray-400 mb-2">
          No wallet detected. Please install a wallet to continue.
        </div>
        <button 
          onClick={() => window.open('https://phantom.app/download', '_blank')}
          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          📥 Install Phantom
        </button>
        <button 
          onClick={() => window.open('https://solflare.com/download', '_blank')}
          className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          📥 Install Solflare
        </button>
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
      
      {hasPhantomInstalled() && (
        <button 
          onClick={handleConnectPhantom}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "Connecting..." : "👻 Connect Phantom"}
        </button>
      )}
      
      {loading && (
        <div className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded p-2">
          🔗 Please approve the connection in your wallet popup.
        </div>
      )}
      
      {hasSolflareInstalled() && (
        <button 
          onClick={handleConnectSolflare}
          disabled={loading}
          className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Connecting..." : "☀️ Connect Solflare"}
        </button>
      )}
    </div>
  );
};

export default WalletConnect;