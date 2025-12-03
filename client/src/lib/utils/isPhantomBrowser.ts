/**
 * Detect if we're running in Phantom's in-app browser
 * Phantom's browser injects window.solana when the page loads
 */
export function isPhantomBrowser(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for Phantom's injected solana object (most reliable)
  // Phantom injects this immediately when page loads in its browser
  const solana = (window as any).solana;
  if (solana) {
    // Check if it's Phantom specifically
    if (solana.isPhantom) {
      console.log("🔍 Phantom browser detected via window.solana.isPhantom");
      return true;
    }
    // Sometimes Phantom injects solana but isPhantom might not be set yet
    // Check if solana object exists and has connect method (Phantom-specific)
    if (typeof solana.connect === "function" && solana.publicKey !== undefined) {
      console.log("🔍 Phantom browser detected via window.solana (has connect method)");
      return true;
    }
  }
  
  // Check for window.phantom object (older detection method)
  if ((window as any).phantom?.solana !== undefined) {
    console.log("🔍 Phantom browser detected via window.phantom.solana");
    return true;
  }
  
  // Check user agent as last resort (less reliable)
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("phantom")) {
      console.log("🔍 Phantom browser detected via user agent");
      return true;
    }
  }
  
  return false;
}

