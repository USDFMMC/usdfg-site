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
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Whitepaper from "@/pages/whitepaper";
import { Helmet } from "react-helmet";
import { startVersionMonitoring } from "@/lib/version";
import UpdateBanner from "@/components/ui/UpdateBanner";
import nacl from "tweetnacl";

function RoutesWithLogging() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔍 RoutesWithLogging mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    console.log('🔍 React Router location:', location.pathname);
  }, [location]);

  return (
      <Routes>
        {/* CRITICAL: Root / is now the main app (for Phantom universal link compatibility) */}
        <Route path="/" element={<ArenaRoute />} />
        {/* Redirect /app to / for backwards compatibility */}
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/app/" element={<Navigate to="/" replace />} />
        {/* Landing page moved to /home */}
        <Route path="/home" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/challenge/new" element={<CreateChallenge />} />
        <Route path="/profile/:address" element={<PlayerProfile />} />
        <Route path="/login" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}

function AppRouter() {
  useEffect(() => {
    console.log('🔍 AppRouter component mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
  }, []);

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
    console.log("📥 App.tsx Phantom return handler checking...");
    console.log("📥 Current URL:", window.location.href);
    console.log("📥 Current pathname:", window.location.pathname);
    console.log("📥 Current search:", window.location.search);
    
    function base64ToUint8Array(b64: string) {
      return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }

    // Normalize path - handle both / and /app (for backwards compatibility)
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    // Accept both / and /app for Phantom return (backwards compatibility)
    if (path !== "/" && path !== "/app") {
      console.log("📥 Not on root or /app route, skipping handler");
      return;
    }

    const url = new URL(window.location.href);
    const phantomPubKey = url.searchParams.get("phantom_encryption_public_key");
    const nonceB64 = url.searchParams.get("nonce");
    const dataB64 = url.searchParams.get("data");

    console.log("📥 Phantom params check:", {
      hasPhantomPubKey: !!phantomPubKey,
      hasNonce: !!nonceB64,
      hasData: !!dataB64
    });

    if (!phantomPubKey || !nonceB64 || !dataB64) {
      console.log("📥 Missing Phantom params, skipping");
      return;
    }

    console.log("📥 ✅ Phantom return detected! Decrypting payload...");

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

      console.log("🔐 Attempting decryption...");

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
      console.log("🔥 ✅ Phantom payload decrypted successfully:", payload);

      if (payload.public_key) {
        localStorage.setItem("publicKey", payload.public_key);
        localStorage.setItem("phantom_connected", "true");
        localStorage.setItem("phantom_public_key", payload.public_key);
        console.log("✅ Phantom public key stored:", payload.public_key);
      }

      // Cleanup
      localStorage.removeItem("phantom_dapp_handshake");
      // Remove Phantom params from URL - normalize to / (root)
      window.history.replaceState({}, "", "/");
      console.log("✅ Cleaned URL, redirecting to /");
    } catch (error) {
      console.error("❌ Error decrypting Phantom payload:", error);
    }
  }, []);

  // Safari compatibility check and error handling
  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      console.log('🍎 Safari detected - applying compatibility fixes');
      
      // Add Safari-specific meta tags
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  }, []);

  // Version monitoring - check for updates
  useEffect(() => {
    console.log('🔄 Initializing version monitoring...');
    const cleanup = startVersionMonitoring(() => {
      console.log('🆕 New version available - showing update banner');
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

