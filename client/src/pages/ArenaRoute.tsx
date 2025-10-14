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

  if (!entered) {
    return (
      <div className="min-h-screen bg-background-1 text-text-primary flex flex-col items-center justify-center relative">
        <div className="parallax-glow"></div>
        <div className="relative z-10 flex flex-col items-center neocore-panel p-8">
          <h1 className="neocore-h2 mb-4 text-glow-cyan">Enter Arena Password</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="px-3 py-2 rounded-md bg-background-2/60 border border-glow/30 text-text-primary backdrop-blur-sm focus:border-glow-cyan/60 focus:outline-none neocore-body"
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
