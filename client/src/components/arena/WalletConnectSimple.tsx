import React, { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface WalletConnectSimpleProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  compact?: boolean; // New prop for mobile compact mode
}

const WalletConnectSimple: React.FC<WalletConnectSimpleProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  compact = false
}) => {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  // Auto-connect Phantom if in mobile browser
  useEffect(() => {
    const isPhantomInjected = typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom;
    
    if (isPhantomInjected && !connected && !connecting) {
      console.log('👻 Phantom detected in mobile browser - auto-connecting...');
      
      // Find Phantom wallet
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
      }
    }
  }, [wallets, connected, connecting, select]);

  // Handle connection state changes
  useEffect(() => {
    if (connected && publicKey) {
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
      setBalance(null);
      onDisconnect();
    }
  }, [connected, publicKey, onConnect, onDisconnect, connection]);

  // If connected, show connected state
  if (connected && publicKey) {
    // Compact mode for mobile
    if (compact) {
      return (
        <button
          onClick={() => disconnect()}
          className="px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
          <span className="hidden sm:inline">{publicKey.toString().slice(0, 4)}...</span>
          <span className="sm:hidden">Connected</span>
        </button>
      );
    }
    
    // Full mode for desktop
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
  
  // Check if Phantom is already injected (in-app browser)
  const isPhantomInjected = typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom;
  
  // Custom click handler for mobile - redirect to Phantom browser
  const handleMobileConnect = () => {
    if (isMobile && !isPhantomInjected) {
      // Simple: Just redirect to Phantom browser
      const currentUrl = window.location.href;
      window.location.href = `https://phantom.app/ul/browse/${currentUrl}`;
    }
  };
  
  // Show connection button
  return (
    <div className="flex flex-col space-y-2">
      {/* Compact mode for mobile navbar */}
      {compact ? (
        // Custom button for mobile, standard for desktop
        isMobile && !isPhantomInjected ? (
          <button
            onClick={handleMobileConnect}
            className="px-2.5 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-xs font-medium hover:bg-cyan-500/30 transition-colors"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-adapter-button-trigger-wrapper">
            <WalletMultiButton 
              className="!px-2.5 !py-1.5 !bg-cyan-500/20 !text-cyan-400 !border !border-cyan-500/30 !rounded-md !text-xs !font-medium hover:!bg-cyan-500/30 !transition-colors !min-w-0"
            >
              Connect Wallet
            </WalletMultiButton>
          </div>
        )
      ) : (
        <>
          {/* Mobile: Direct "Connect Wallet" button that opens Phantom */}
          {isMobile && !isPhantomInjected ? (
            <button
              onClick={handleMobileConnect}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2 border-2 border-purple-400 shadow-lg"
              style={{ 
                minHeight: '48px',
                fontSize: '16px'
              }}
            >
              <span style={{ fontSize: '20px' }}>👻</span>
              <span>Connect Wallet</span>
            </button>
          ) : (
            <>
              <WalletMultiButton className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
                Connect Wallet
              </WalletMultiButton>
              
              {connecting && (
                <div className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded p-2">
                  🔗 Please approve the connection in your wallet popup.
                </div>
              )}
            </>
          )}
          
          {/* Help text for mobile */}
          {isMobile && !isPhantomInjected && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Opens in Phantom browser
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WalletConnectSimple;
