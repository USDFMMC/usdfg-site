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
      <div
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 99999999,
          background: 'red',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          border: '3px solid yellow',
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(255,0,0,0.8)',
        }}
      >
        🐛 DEBUG
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 99999999,
        background: 'black',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '12px',
        border: '3px solid red',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 0 30px rgba(255,0,0,0.9)',
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

