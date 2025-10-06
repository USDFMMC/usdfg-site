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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold mb-4">Enter Arena Password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded-md text-black"
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
          className="mt-3 px-4 py-2 rounded-md bg-cyan-500 text-black font-semibold"
        >
          Enter
        </button>
      </div>
    );
  }

  return <ArenaHome />;
}
