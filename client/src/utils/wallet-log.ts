/**
 * Wallet connection logging utility
 * Helps debug wallet adapter selection and connection issues
 */

type WalletEventType = 
  | 'selecting' 
  | 'connect_called' 
  | 'connect_direct' 
  | 'connected' 
  | 'disconnecting' 
  | 'disconnected' 
  | 'error';

interface WalletEventData {
  adapter?: string;
  wallet?: string;
  message?: string;
  error?: string;
  [key: string]: any;
}

export function logWalletEvent(
  event: WalletEventType,
  data: WalletEventData = {}
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...data,
  };

  // Log to console with emoji for easy scanning
  const emoji = {
    selecting: '🔍',
    connect_called: '📞',
    connect_direct: '🔌',
    connected: '✅',
    disconnecting: '🔌',
    disconnected: '👋',
    error: '❌',
  }[event] || '📝';

  console.log(`${emoji} [Wallet] ${event}`, logEntry);

  // Detect adapter type
  if (data.adapter) {
    const isMobile = data.adapter === 'Mobile Wallet Adapter' || 
                     data.adapter.includes('Mobile');
    const adapterType = isMobile ? 'mobile' : 'desktop';
    console.log(`   Adapter type: ${adapterType}`);
  }

  // Log error details if present
  if (event === 'error' && data.error) {
    console.error('   Error details:', data.error);
  }

  // Check if MWA is available (for mobile)
  if (typeof window !== 'undefined') {
    const hasMWA = 'solanaMobile' in window || 
                   typeof (window as any).solanaMobile !== 'undefined';
    if (event === 'selecting' || event === 'connect_called') {
      console.log(`   MWA available: ${hasMWA}`);
    }
  }
}

