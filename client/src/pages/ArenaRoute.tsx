import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ArenaHome from "./app/index";
import PasswordForm from "@/components/PasswordForm";

export default function ArenaRoute() {
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check access on mount and when location changes
  useEffect(() => {
    // CRITICAL: If Phantom params are present — bypass password gate and unlock arena
    if (location.search.includes("phantom_encryption_public_key")) {
      console.log("🔥 Bypassing password for Phantom return");
      localStorage.setItem("arena-access", "granted");
      setHasAccess(true);
      setLoading(false);
      return;
    }
    
    // Check if user already has access
    const access = localStorage.getItem("arena-access");
    if (access === "true" || access === "granted") {
      console.log("✅ Access found in localStorage");
      setHasAccess(true);
    } else {
      console.log("🔒 Password gate ACTIVE - access required");
    }
    setLoading(false);
  }, [location.search]);
  
  // Don't render anything until we've checked access
  if (loading) {
    return null;
  }

  // Show password gate if no access
  if (!hasAccess) {
    return <PasswordForm onSuccess={() => setHasAccess(true)} />;
  }

  // User has access - show arena
  return <ArenaHome />;
}
