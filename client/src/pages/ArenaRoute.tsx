import { useLocation } from 'react-router-dom';
import ArenaHome from "./app/index";

export default function ArenaRoute() {
  const location = useLocation();
  
  // CRITICAL: If Phantom params are present — bypass password gate
  // Phantom returns to same page (/app) with query params, so we need to allow it
  const params = new URLSearchParams(window.location.search);
  if (params.has("phantom_encryption_public_key")) {
    console.log("🔥 Bypassing password for Phantom return");
    return <ArenaHome />; // Let ArenaHome handle the Phantom return
  }

  console.log("🔓 Password gate temporarily DISABLED for testing");
  return <ArenaHome />;
}
