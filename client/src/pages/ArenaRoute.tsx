import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ArenaHome from "./app/index";
import LetterGlitch from "@/components/effects/LetterGlitch";

export default function ArenaRoute() {
  const [entered, setEntered] = useState(false);
  const [password, setPassword] = useState("");
  const location = useLocation();

  const correctPassword = "6996"; // fixed password

  // CRITICAL: Phantom return route must bypass password check
  // This allows /app/phantom-return to load and decrypt the wallet payload
  const phantomSafeRoutes = ["/app/phantom-return"];
  const isPhantomReturn = phantomSafeRoutes.includes(location.pathname);

  // Check if password was already entered in this session
  useEffect(() => {
    console.log('🔍 ArenaRoute component mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    console.log('🔍 Is Phantom return route?', isPhantomReturn);
    
    // Skip password check for Phantom return route
    if (isPhantomReturn) {
      console.log('✅ Phantom return route detected - bypassing password check');
      return;
    }
    
    const savedEntry = localStorage.getItem('arena-access');
    if (savedEntry === 'true') {
      setEntered(true);
    }
  }, [isPhantomReturn]);

  // Handle password submission
  const handleSubmit = () => {
    if (password === correctPassword) {
      setEntered(true);
      localStorage.setItem('arena-access', 'true');
    } else {
      alert("Wrong password");
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // CRITICAL: Never show password screen for Phantom return route
  // This route is handled separately by PhantomReturn component
  if (isPhantomReturn) {
    console.log('✅ Phantom return route - rendering ArenaHome directly (no password check)');
    return <ArenaHome />;
  }

  if (!entered) {
    return (
      <div className="min-h-screen text-text-primary flex flex-col items-center justify-center relative overflow-hidden">
        {/* LetterGlitch Background */}
        <div className="absolute inset-0 w-full h-full">
          <LetterGlitch
            glitchSpeed={50}
            centerVignette={true}
            outerVignette={false}
            smooth={true}
          />
        </div>
        
        {/* Password Form */}
        <div className="relative z-10 flex flex-col items-center neocore-panel p-8 backdrop-blur-md bg-black/40 border border-cyan-500/30">
          <h1 className="neocore-h2 mb-4 text-glow-cyan">Enter Arena Password</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="px-3 py-2 rounded-md bg-black/60 border border-cyan-500/50 text-cyan-100 backdrop-blur-sm focus:border-cyan-400 focus:outline-none neocore-body"
            placeholder="Password"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            className="mt-3 elite-btn neocore-button"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return <ArenaHome />;
}
