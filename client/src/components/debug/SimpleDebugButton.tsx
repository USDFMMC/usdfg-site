import React, { useState, useEffect } from 'react';

// Ultra-simple debug button that ALWAYS renders, no dependencies
export const SimpleDebugButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Add initial log
    setLogs(['🐛 Debug console loaded']);
    
    // Listen for console logs
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      if (message.includes('Wallet') || message.includes('MWA') || message.includes('adapter')) {
        setLogs(prev => [...prev.slice(-19), message]);
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-bold border-2 border-yellow-400 shadow-lg"
        style={{
          cursor: 'pointer',
        }}
      >
        🐛 DEBUG
      </button>
    );
  }

  return (
    <div
      className="fixed top-16 right-4 z-[999999] bg-black/98 text-white p-4 rounded-lg text-xs border-2 border-red-500 shadow-2xl"
      style={{
        maxWidth: '90vw',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong style={{ color: 'red' }}>🐛 DEBUG CONSOLE</strong>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'red', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px', fontFamily: 'monospace' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

