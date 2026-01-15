import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MWAProvider } from "@/lib/wallet/mwa-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ArenaRoute from "@/pages/ArenaRoute";
import CreateChallenge from "@/pages/app/challenge/new";
import PlayerProfile from "@/pages/app/profile/[address]";
import CategoryDetailPage from "@/pages/app/category/[category]";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Whitepaper from "@/pages/whitepaper";
import { Helmet } from "react-helmet";
import { startVersionMonitoring } from "@/lib/version";
import UpdateBanner from "@/components/ui/UpdateBanner";
import nacl from "tweetnacl";
import { resetNavigationGuard } from "@/lib/wallet/mobile";

function RoutesWithLogging() {
  const location = useLocation();
  
  // Removed excessive route logging - only needed for debugging
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('🔍 Route changed:', location.pathname);
  //   }
  // }, [location]);

  return (
      <Routes>
        {/* Root / serves the landing page (Home component) - no Phantom/Firestore initialization */}
        <Route path="/" element={<Home />} />
        
        {/* App routes under /app - full React app with Phantom, Firestore, etc. */}
        <Route path="/app" element={<ArenaRoute />} />
        <Route path="/app/" element={<ArenaRoute />} />
        <Route path="/app/challenge/new" element={<CreateChallenge />} />
        <Route path="/app/profile/:address" element={<PlayerProfile />} />
        <Route path="/app/category/:category" element={<CategoryDetailPage />} />
        
        {/* Static pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        
        {/* Legacy redirects for backwards compatibility */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}

function AppRouter() {
  // Removed excessive logging - only needed for debugging
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('🔍 AppRouter mounted');
  //   }
  // }, []);

  return (
    <Router>
      <RoutesWithLogging />
    </Router>
  );
}

function App() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Phantom return handler - decrypts payload when Phantom returns
  // CRITICAL: This runs BEFORE Router, so it catches /app/ and /app with query params
  useEffect(() => {
    // CRITICAL: Only track redirects during an active Phantom connection attempt
    // Don't increment counter during normal browsing
    const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
    const isOriginalTab = sessionStorage.getItem('phantom_original_tab') === 'true';
    const redirectCount = parseInt(sessionStorage.getItem('phantom_redirect_count') || '0');
    
    // Only check for redirect loops if we're actually connecting
    if (isConnecting) {
      if (redirectCount > 3) {
        console.error("❌❌❌ REDIRECT LOOP DETECTED ❌❌❌");
        console.error("❌ Tab has redirected more than 3 times - breaking loop");
        console.error("❌ This means Phantom opened a new tab but universal link isn't working");
        console.error("❌ Clearing all Phantom connection state");
        
        // Clear all connection state
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_dapp_nonce');
        sessionStorage.removeItem('phantom_original_tab');
        sessionStorage.removeItem('phantom_redirect_count');
        sessionStorage.removeItem('phantom_connect_timestamp');
        
        // Stop the redirect loop
        window.stop();
        return;
      }
      
      // Only increment redirect count if:
      // 1. We're actively connecting to Phantom AND
      // 2. We're NOT in the original tab (Phantom opened a new tab)
      if (!isOriginalTab) {
        sessionStorage.setItem('phantom_redirect_count', (redirectCount + 1).toString());
      }
    } else {
      // Not connecting - clear redirect count to allow normal browsing
      sessionStorage.removeItem('phantom_redirect_count');
    }
    
    // Removed excessive Phantom debugging logs - only log critical errors
    // Check if we just attempted to connect (detect silent Phantom rejection)
    const connectTimestamp = sessionStorage.getItem('phantom_connect_timestamp');
    // isConnecting already declared above, don't redeclare
    const hasSearchParams = window.location.search.length > 0;
    const timeSinceConnect = connectTimestamp ? Date.now() - parseInt(connectTimestamp) : null;
    
    // Check EVERY possible Phantom return parameter
    const urlParams = new URLSearchParams(window.location.search);
    const allParams = Object.fromEntries(urlParams.entries());
    
    // Detect silent rejection
    if (connectTimestamp && !hasSearchParams && timeSinceConnect && timeSinceConnect < 10000) {
      console.error("❌ Phantom silent rejection detected - no params returned");
      }
    
    // Check if we were trying to connect (detect if Phantom closed without returning)
    const hasPendingNonce = sessionStorage.getItem('phantom_dapp_nonce');
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    
    // Detect if Phantom opened a new tab (indicates universal link isn't working)
    // Note: isOriginalTab is already declared above (line 91)
    const isNewTab = !isOriginalTab && document.referrer === "" && window.name === "";
    
    // If we're on root path with no params but have a pending connection, Phantom might have closed silently
    if (isConnecting && hasPendingNonce && currentPath === "/" && !window.location.search) {
      if (isNewTab) {
        console.error("❌❌❌ PHANTOM OPENED NEW TAB - UNIVERSAL LINK NOT WORKING ❌❌❌");
        console.error("❌ This tab was opened by Phantom but has no connection params");
        console.error("❌ This means Phantom opened a new tab instead of returning to the original");
        console.error("❌ Universal link association is broken");
        console.error("❌ ACTION REQUIRED:");
        console.error("   1. Clear Safari cache: Settings → Safari → Advanced → Website Data → usdfg.pro");
        console.error("   2. Clear Phantom cache: Settings → Connected Apps → Remove USDFG");
        console.error("   3. Restart both Safari and Phantom");
        console.error("   4. Try connecting again");
        
        // CRITICAL: Clear all connection state immediately to prevent loops
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_dapp_nonce');
        sessionStorage.removeItem('phantom_original_tab');
        sessionStorage.removeItem('phantom_redirect_count');
        sessionStorage.removeItem('phantom_connect_timestamp');
        
        // Stop any pending redirects/navigation
        try {
          window.stop();
        } catch (e) {
          console.warn("Could not stop navigation:", e);
        }
        
        // Close this tab or show message
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            // Can't close - silently fail (user can manually close)
          }
        }, 1000);
        return;
      }
      
      console.warn("⚠️ Phantom opened but closed without returning - possible silent rejection");
      console.warn("⚠️ This usually means:");
      console.warn("   1. Phantom couldn't read the manifest.json");
      console.warn("   2. The deep link parameters are invalid");
      console.warn("   3. Phantom cache has old data");
      console.warn("   4. User cancelled in Phantom");
      
      // CRITICAL: Clear connecting state immediately if we're on the original tab
      // This allows the button to be clicked again after Phantom silently rejects
      if (isOriginalTab) {
        console.log("🧹 Clearing connecting state immediately (original tab)");
        console.log("🧹 This allows the button to be clicked again");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_dapp_nonce');
        sessionStorage.removeItem('phantom_connect_timestamp');
        // Don't remove phantom_original_tab - we need it to detect new tabs
      } else {
        // If we're in a new tab, clear everything and show error
        console.log("🧹 Clearing all connection state (new tab)");
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_dapp_nonce');
        sessionStorage.removeItem('phantom_original_tab');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_redirect_count');
      }
    }
    
    function base64ToUint8Array(b64: string) {
      return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }

    // Normalize path - handle both / and /app (for backwards compatibility)
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    // Accept both / and /app for Phantom return (backwards compatibility)
    if (path !== "/" && path !== "/app") {
      return;
    }

    const url = new URL(window.location.href);
    
    // Check for Phantom errors first (user rejection, invalid request, etc.)
    const error = url.searchParams.get("error");
    const errorCode = url.searchParams.get("errorCode");
    const errorMessage = url.searchParams.get("errorMessage");
    
    if (error || errorCode || errorMessage) {
      console.error("❌ Phantom returned with error:");
      console.error("   Error:", error);
      console.error("   Error Code:", errorCode);
      console.error("   Error Message:", errorMessage);
      console.error("   This usually means:");
      console.error("   1. User rejected the connection");
      console.error("   2. Phantom couldn't read the manifest.json");
      console.error("   3. Invalid deep link parameters");
      console.error("   4. app_url doesn't match manifest.json url");
      
      // CRITICAL: Clear all connection state to prevent loops
      sessionStorage.removeItem('phantom_connecting');
      sessionStorage.removeItem('phantom_connect_timestamp');
      sessionStorage.removeItem('phantom_connect_attempt');
      sessionStorage.removeItem('phantom_dapp_nonce');
      sessionStorage.removeItem('phantom_dapp_keypair');
      sessionStorage.removeItem('phantom_original_tab');
      sessionStorage.removeItem('phantom_redirect_count');
      sessionStorage.removeItem('phantom_navigation_start');
      localStorage.removeItem('phantom_dapp_handshake');
      
      // Reset navigation guard
      resetNavigationGuard();
      
      // If we're on root / with error, redirect to /app so user can try again
      if (window.location.pathname === '/' && (error || errorCode || errorMessage)) {
        window.history.replaceState({}, "", "/app");
        // Trigger a page reload to clear the error state
        window.location.href = "/app";
        return;
      }
      
      // If already on /app, just clean the URL
      if (window.location.pathname.startsWith('/app')) {
        window.history.replaceState({}, "", "/app");
      }
      
      return;
    }
    
    const phantomPubKey = url.searchParams.get("phantom_encryption_public_key");
    const nonceB64 = url.searchParams.get("nonce");
    const dataB64 = url.searchParams.get("data");

    if (!phantomPubKey || !nonceB64 || !dataB64) {
      // Check if we were trying to connect (might be a cancellation)
      const isConnecting = sessionStorage.getItem('phantom_connecting') === 'true';
      if (isConnecting) {
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_dapp_nonce');
      }
      return;
    }

    const stored = localStorage.getItem("phantom_dapp_handshake");
    if (!stored) {
      console.error("❌ No phantom_dapp_handshake in localStorage");
      return;
    }

    try {
      const { dappSecretKey } = JSON.parse(stored);
      const secretKeyBytes = base64ToUint8Array(dappSecretKey);
      const nonceBytes = base64ToUint8Array(nonceB64);
      const dataBytes = base64ToUint8Array(dataB64);
      const phantomPubKeyBytes = base64ToUint8Array(phantomPubKey);

      // Attempting decryption...

      const decrypted = nacl.box.open(
        dataBytes,
        nonceBytes,
        phantomPubKeyBytes,
        secretKeyBytes
      );

      if (!decrypted) {
        console.error("❌ Failed to decrypt Phantom payload");
        return;
      }

      const payload = JSON.parse(new TextDecoder().decode(decrypted));

      if (payload.public_key) {
        localStorage.setItem("publicKey", payload.public_key);
        localStorage.setItem("phantom_connected", "true");
        localStorage.setItem("phantom_public_key", payload.public_key);
        
        // CRITICAL: Clear all connecting flags so UI can update
        sessionStorage.removeItem('phantom_connecting');
        sessionStorage.removeItem('phantom_connect_timestamp');
        sessionStorage.removeItem('phantom_connect_attempt');
        sessionStorage.removeItem('phantom_dapp_nonce');
        sessionStorage.removeItem('phantom_dapp_keypair');
        
        // CRITICAL: Reset navigation guard to allow future connections
        resetNavigationGuard();
        
        // Trigger a storage event to notify other components
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('phantom_connected'));
      }

      // Cleanup
      localStorage.removeItem("phantom_dapp_handshake");
      // Remove Phantom params from URL - normalize to / (root)
      // CRITICAL: Stay on root / - app is now on root (like smithii.io)
      // This allows Phantom to return to Safari properly
      window.history.replaceState({}, "", "/");
    } catch (error) {
      console.error("❌ Error decrypting Phantom payload:", error);
    }
  }, []);

  // Mobile viewport fix - prevent zoom on load
  useEffect(() => {
    // Fix viewport scaling issues on mobile
    const fixViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        // Use a more permissive viewport that prevents initial zoom issues
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes, viewport-fit=cover');
      }
    };
    
    fixViewport();
    
    // Re-apply after orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(fixViewport, 100);
    });
    
    return () => {
      window.removeEventListener('orientationchange', fixViewport);
    };
  }, []);

  // Version monitoring - check for updates
  useEffect(() => {
    const cleanup = startVersionMonitoring(() => {
      setShowUpdateBanner(true);
    });
    
    return cleanup;
  }, []);

  return (
    <MWAProvider>
      <QueryClientProvider client={queryClient}>
        <Helmet>
          <title>USDFGAMING – Skill-Based Crypto Gaming | Game. Earn. Conquer.</title>
          <meta
            name="description"
            content="USDFGAMING is the elite, skill-based crypto gaming platform. Compete, verify results, and earn USDFG. No gambling. 100% on-chain."
          />
          <link rel="canonical" href="https://usdfg.pro/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="USDFGAMING" />
        <meta property="og:url" content="https://usdfg.pro/" />
        <meta property="og:title" content="USDFGAMING – Skill-Based Crypto Gaming" />
        <meta
          property="og:description"
          content="Compete in verified challenges, earn USDFG, and prove your skill."
        />
        <meta property="og:image" content="https://usdfg.pro/assets/usdfg-og-banner.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@USDFGAMING" />
        <meta name="twitter:title" content="USDFGAMING – Skill-Based Crypto Gaming" />
        <meta
          name="twitter:description"
          content="Compete in verified challenges, earn USDFG, and prove your skill."
        />
        <meta name="twitter:image" content="https://usdfg.pro/assets/usdfg-og-banner.png" />

        {/* Nice to have */}
        <meta name="theme-color" content="#0c1222" />
      </Helmet>

      <div className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Update Banner - shows when new version is available */}
        {showUpdateBanner && (
          <UpdateBanner onDismiss={() => setShowUpdateBanner(false)} />
        )}
        
        <AppRouter />
        <Toaster />
      </div>
      </QueryClientProvider>
    </MWAProvider>
  );
}

export default App;

