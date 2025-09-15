// Simple wallet connection functions - no React hooks, no useRef

export const connectPhantom = async () => {
  if (typeof window === 'undefined') {
    throw new Error("Window not available");
  }
  
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider?.isPhantom) {
      await provider.connect();
      return provider.publicKey.toString();
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
      await provider.connect();
      return provider.publicKey.toString();
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
    if (provider?.publicKey) {
      return provider.publicKey.toString();
    }
  }
  
  // Check Solflare
  if ("solflare" in window) {
    const provider = (window as any).solflare;
    if (provider?.publicKey) {
      return provider.publicKey.toString();
    }
  }
  
  return null;
};

export const isWalletConnected = () => {
  return getWalletPublicKey() !== null;
};

export const formatPublicKey = (publicKey: string, length: number = 8) => {
  if (publicKey.length <= length * 2) return publicKey;
  return `${publicKey.slice(0, length)}...${publicKey.slice(-length)}`;
};

export const getUSDFGBalance = async (publicKey: string): Promise<number> => {
  // Mock balance for now - replace with actual Solana RPC call
  return Math.floor(Math.random() * 5000) + 1000;
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
