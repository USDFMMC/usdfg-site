import { useState, useEffect } from "react";
import ArenaHome from "./app/index";

export default function ArenaRoute() {
  const [entered, setEntered] = useState(false);
  const [password, setPassword] = useState("");

  const correctPassword = "6996"; // fixed password

  // Check if password was already entered in this session
  useEffect(() => {
    const savedEntry = localStorage.getItem('arena-access');
    if (savedEntry === 'true') {
      setEntered(true);
    }
  }, []);

  if (!entered) {
    return (
      <div className="min-h-screen bg-app-background-dark text-app-foreground flex flex-col items-center justify-center relative">
        <div className="app-vignette"></div>
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-xl font-bold mb-4 text-app-accent-color" style={{fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.5px'}}>Enter Arena Password</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-md bg-black/50 border border-app-accent-color/30 text-app-foreground backdrop-blur-sm focus:border-app-accent-color/60 focus:outline-none"
            placeholder="Password"
          />
          <button
            onClick={() => {
              if (password === correctPassword) {
                setEntered(true);
                localStorage.setItem('arena-access', 'true');
              } else {
                alert("Wrong password");
              }
            }}
            className="mt-3 px-4 py-2 rounded-md app-button text-app-foreground font-semibold uppercase tracking-wide"
            style={{fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, letterSpacing: '-0.5px'}}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return <ArenaHome />;
}
