import React, { useState, useEffect } from "react";
import { 
  connectPhantom, 
  connectSolflare, 
  disconnectWallet, 
  getWalletPublicKey, 
  isWalletConnected,
  formatPublicKey,
  getUSDFGBalance,
  hasPhantomInstalled,
  hasSolflareInstalled,
  hasAnyWalletInstalled
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

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = () => {
      if (isWalletConnected()) {
        const pubkey = getWalletPublicKey();
        if (pubkey) {
          setAddress(pubkey);
          onConnect();
          // Fetch balance
          getUSDFGBalance(pubkey).then(setBalance).catch(console.error);
        }
      }
    };

    checkConnection();
  }, [onConnect]);

  const handleConnectPhantom = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const pubkey = await connectPhantom();
      setAddress(pubkey);
      const bal = await getUSDFGBalance(pubkey);
      setBalance(bal);
      onConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      console.error("Phantom connection failed:", err);
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
      const bal = await getUSDFGBalance(pubkey);
      setBalance(bal);
      onConnect();
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
      onDisconnect();
    } catch (err) {
      console.error("Disconnect failed:", err);
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
            {balance ? `${balance.toFixed(2)} $USDFG` : "Loading..."}
          </div>
        </div>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
          🟢 Connected
        </span>
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