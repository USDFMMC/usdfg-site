import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ArenaHome from "./app/index";
import PasswordForm from "@/components/PasswordForm";

export default function ArenaRoute() {
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    // Check if user already has access
    const access = localStorage.getItem("arena-access");
    if (access === "true" || access === "granted") {
      setHasAccess(true);
    }
  }, []);
  
  // CRITICAL: If Phantom params are present — bypass password gate and unlock arena
  // Phantom returns to same page (/app) with query params, so we need to allow it
  if (location.search.includes("phantom_encryption_public_key")) {
    console.log("🔥 Bypassing password for Phantom return");
    // Unlock arena access when Phantom returns
    localStorage.setItem("arena-access", "granted");
    if (!hasAccess) {
      setHasAccess(true);
    }
    return <ArenaHome />; // Let ArenaHome handle the Phantom return
  }

  // Show password gate if no access
  if (!hasAccess) {
    console.log("🔒 Password gate ACTIVE - access required");
    return <PasswordForm onSuccess={() => setHasAccess(true)} />;
  }

  // User has access - show arena
  console.log("✅ Access granted - showing arena");
  return <ArenaHome />;
}
