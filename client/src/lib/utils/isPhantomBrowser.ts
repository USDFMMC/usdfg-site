/**
 * Detect if we're running in Phantom's in-app browser
 * Phantom's browser has a specific user agent that we can detect
 */
export function isPhantomBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for Phantom's injected object (most reliable)
  if (typeof window !== "undefined" && (window as any).phantom?.solana !== undefined) {
    console.log("🔍 Phantom browser detected via window.phantom.solana");
    return true;
  }
  
  // Check user agent for "phantom" (less reliable, but backup)
  if (ua.includes("phantom")) {
    console.log("🔍 Phantom browser detected via user agent");
    return true;
  }
  
  // Check for Phantom-specific window properties
  if (typeof window !== "undefined" && (window as any).solana?.isPhantom) {
    console.log("🔍 Phantom browser detected via window.solana.isPhantom");
    return true;
  }
  
  return false;
}

