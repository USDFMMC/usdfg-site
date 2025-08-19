import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Whitepaper from "@/pages/whitepaper";
import StarBackground from "@/components/effects/star-background";
import { Helmet } from "react-helmet";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route path="/app" component={Home} />
      <Route path="/login" component={Home} />
      <Route component={NotFound} />
    </Switch>
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
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
