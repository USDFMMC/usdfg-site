/**
 * Detect if we're running in Phantom's in-app browser
 * Phantom's browser has a specific user agent that we can detect
 */
export function isPhantomBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Phantom's in-app browser typically includes "phantom" in the user agent
  // or we can check for specific Phantom browser indicators
  return ua.includes("phantom") || 
         (typeof window !== "undefined" && 
          (window as any).phantom?.solana !== undefined);
}

