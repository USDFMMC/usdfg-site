import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
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
import PhantomReturn from "@/pages/phantom-return";
import { Helmet } from "react-helmet";
import { startVersionMonitoring } from "@/lib/version";
import UpdateBanner from "@/components/ui/UpdateBanner";

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
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/whitepaper" element={<Whitepaper />} />
      <Route path="/app/phantom-return" element={<PhantomReturn />} />
      <Route path="/app" element={<ArenaRoute />} />
      <Route path="/app/challenge/new" element={<CreateChallenge />} />
      <Route path="/app/profile/:address" element={<PlayerProfile />} />
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
