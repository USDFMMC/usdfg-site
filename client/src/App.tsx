import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ArenaRoute from "@/pages/ArenaRoute";
import CreateChallenge from "@/pages/app/challenge/new";
import PlayerProfile from "@/pages/app/profile/[address]";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Whitepaper from "@/pages/whitepaper";
import StarBackground from "@/components/effects/star-background";
import Crosshair from "@/components/effects/Crosshair";
import { Helmet } from "react-helmet";

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/app" element={<ArenaRoute />} />
        <Route path="/app/challenge/new" element={<CreateChallenge />} />
        <Route path="/app/profile/:address" element={<PlayerProfile />} />
        <Route path="/login" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Helmet>
        <title>USDFGAMING – Skill-Based Crypto Gaming | Game. Earn. Conquer.</title>
        <meta
          name="description"
          content="USDFGAMING is the elite, skill-based crypto gaming platform. Compete, verify results, and earn $USDFG. No gambling. 100% on-chain."
        />
        <link rel="canonical" href="https://usdfg.pro/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="USDFGAMING" />
        <meta property="og:url" content="https://usdfg.pro/" />
        <meta property="og:title" content="USDFGAMING – Skill-Based Crypto Gaming" />
        <meta
          property="og:description"
          content="Compete in verified challenges, earn $USDFG, and prove your skill."
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
          content="Compete in verified challenges, earn $USDFG, and prove your skill."
        />
        <meta name="twitter:image" content="https://usdfg.pro/assets/usdfg-og-banner.png" />

        {/* Nice to have */}
        <meta name="theme-color" content="#0c1222" />
      </Helmet>

      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <StarBackground />
        <Crosshair color="#00ffff" />
        <AppRouter />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
