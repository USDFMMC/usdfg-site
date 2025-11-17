import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export const WalletDebugConsole: React.FC = () => {
  // Wrap in try-catch to ensure component always renders even if wallet context fails
  let walletContext;
  try {
    walletContext = useWallet();
  } catch (error) {
    console.error('Wallet context error:', error);
    walletContext = {
      wallets: [],
      wallet: null,
      connected: false,
      connecting: false,
      publicKey: null,
    };
  }
  
  const { wallets, wallet, connected, connecting, publicKey } = walletContext;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Add log entry
  const addLog = (level: LogEntry['level'], message: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs(prev => [...prev.slice(-49), entry]); // Keep last 50 logs
  };

  // Add initial log to confirm component is rendering
  useEffect(() => {
    addLog('info', '🐛 Debug console initialized');
  }, []);

  // Monitor wallet state changes
  useEffect(() => {
    if (wallets.length > 0) {
      addLog('info', `📋 ${wallets.length} wallet adapters loaded:`);
      wallets.forEach((w, i) => {
        addLog('info', `  ${i + 1}. ${w.adapter.name} (${w.adapter.readyState})`);
      });
    }
  }, [wallets]);

  useEffect(() => {
    if (wallet) {
      addLog('success', `✅ Selected: ${wallet.adapter.name}`);
    }
  }, [wallet]);

  useEffect(() => {
    if (connected && publicKey) {
      addLog('success', `🟢 Connected: ${publicKey.toString().slice(0, 8)}...`);
    } else if (!connected && !connecting) {
      addLog('info', '⚪ Disconnected');
    }
  }, [connected, connecting, publicKey]);

  useEffect(() => {
    if (connecting) {
      addLog('info', '🔄 Connecting...');
    }
  }, [connecting]);

  // Check MWA availability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMWA = 'solanaMobile' in window || 
                     typeof (window as any).solanaMobile !== 'undefined';
      addLog(hasMWA ? 'success' : 'warn', 
        `MWA available: ${hasMWA ? '✅ true' : '❌ false'}`);
    }
  }, []);

  // Listen for wallet events
  useEffect(() => {
    const handleWalletEvent = (event: CustomEvent) => {
      const { type, data } = event.detail || {};
      if (type === 'selecting') {
        addLog('info', `🔍 Selecting: ${data?.adapter || 'unknown'}`);
      } else if (type === 'connected') {
        addLog('success', `✅ Connected: ${data?.wallet || 'unknown'}`);
      } else if (type === 'error') {
        addLog('error', `❌ Error: ${data?.message || 'Unknown error'}`);
      }
    };

    window.addEventListener('walletEvent' as any, handleWalletEvent);
    return () => {
      window.removeEventListener('walletEvent' as any, handleWalletEvent);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[999999] bg-amber-600 text-white px-4 py-3 rounded-lg text-sm font-bold border-2 border-amber-400 shadow-lg"
        style={{ 
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 999999
        }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-[999999] w-[90vw] max-w-[400px] max-h-[60vh] bg-black/98 border-2 border-amber-500 rounded-lg shadow-2xl flex flex-col text-xs"
      style={{ 
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 999999
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">🐛 Wallet Debug</span>
          <span className="text-gray-400 text-[10px]">
            {connected ? '🟢' : connecting ? '🔄' : '⚪'}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white px-2"
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white px-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Current State */}
          <div className="p-2 border-b border-amber-500/20 bg-black/50">
            <div className="text-gray-300 space-y-1">
              <div>
                <span className="text-gray-500">Selected:</span>{' '}
                <span className="text-amber-400">
                  {wallet?.adapter.name || 'None'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className={connected ? 'text-green-400' : 'text-gray-400'}>
                  {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              {publicKey && (
                <div className="text-[10px] text-gray-500 break-all">
                  {publicKey.toString().slice(0, 16)}...
                </div>
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[250px]">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                Waiting for events...
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-[10px] font-mono ${
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.level === 'success'
                      ? 'text-green-400'
                      : log.level === 'warn'
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  <span className="text-gray-600">[{log.timestamp}]</span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-amber-500/20 text-[10px] text-gray-500 text-center">
            {logs.length} logs
          </div>
        </>
      )}
    </div>
  );
};

