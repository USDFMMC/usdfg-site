import { useLocation } from 'react-router-dom';
import ArenaHome from "./app/index";

export default function ArenaRoute() {
  const location = useLocation();
  
  // CRITICAL: Phantom return must NOT be handled by ArenaRoute
  // Use startsWith to catch all variants: /app/phantom-return, /app/phantom-return/, etc.
  const isPhantomReturn = location.pathname.startsWith("/app/phantom-return");

  if (isPhantomReturn) {
    console.log("🔥 Phantom return — bypassing ArenaRoute completely");
    return null; // Let App.tsx render <PhantomReturn />
  }

  console.log("🔓 Password gate temporarily DISABLED for testing");
  return <ArenaHome />;
}
