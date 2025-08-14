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
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <StarBackground />
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
