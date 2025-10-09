import React, { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface WalletConnectSimpleProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnectSimple: React.FC<WalletConnectSimpleProps> = ({
  isConnected,
  onConnect,
  onDisconnect
}) => {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  // Handle connection state changes
  useEffect(() => {
    if (connected && publicKey) {
      console.log("🔗 Wallet connected:", publicKey.toString().slice(0, 8) + "...");
      onConnect();
      
      // Fetch balance
      connection.getBalance(publicKey)
        .then(balanceLamports => {
          const balance = balanceLamports / LAMPORTS_PER_SOL;
          setBalance(balance);
        })
        .catch(err => {
          console.error("❌ Balance fetch failed:", err);
          setBalance(null);
        });
    } else if (!connected) {
      console.log("🔌 Wallet disconnected");
      setBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, onConnect, onDisconnect, connection]);

  // If connected, show connected state
  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </div>
          <div className="text-white font-semibold">
            {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
          </div>
        </div>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
          🟢 Connected
        </span>
        <WalletDisconnectButton className="px-3 py-1 border border-gray-600 text-white rounded hover:bg-gray-800 transition-colors" />
      </div>
    );
  }

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Debug mobile detection
  console.log('📱 Mobile detection:', isMobile);
  console.log('📱 User agent:', navigator.userAgent);
  
  // Show connection button
  return (
    <div className="flex flex-col space-y-2">
      {/* Always show mobile options on mobile, with fallback detection */}
      {(isMobile || (typeof window !== 'undefined' && window.innerWidth < 768)) ? (
        <div className="space-y-3">
          <div className="text-sm text-gray-400 mb-2">
            Connect with Phantom:
          </div>
          
          {/* Mobile wallet options */}
          <div className="space-y-2">
            <button
              onClick={() => {
                // Open Phantom app
                window.open('https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href), '_blank');
              }}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 border-2 border-purple-400 shadow-lg"
              style={{ 
                backgroundColor: '#9333ea', 
                color: 'white',
                minHeight: '48px',
                fontSize: '16px'
              }}
            >
              <span style={{ fontSize: '20px' }}>👻</span>
              <span>Open in Phantom</span>
            </button>
            
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Or use the wallet button below if Phantom is installed
          </div>
        </div>
      ) : null}
      
      <WalletMultiButton className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50" />
      
      {connecting && (
        <div className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded p-2">
          🔗 Please approve the connection in your wallet popup.
        </div>
      )}
    </div>
  );
};

export default WalletConnectSimple;
