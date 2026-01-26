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
    try {
      // CRITICAL: If Phantom params are present — bypass password gate and unlock arena
      if (location.search.includes("phantom_encryption_public_key")) {
        console.log("🔥 Bypassing password for Phantom return");
        try {
          localStorage.setItem("arena-access", "granted");
        } catch (storageError) {
          console.warn("⚠️ Failed to persist arena access (storage blocked):", storageError);
        }
        setHasAccess(true);
        return;
      }

      // Check if user already has access
      let access: string | null = null;
      try {
        access = localStorage.getItem("arena-access");
      } catch (storageError) {
        console.warn("⚠️ Failed to read arena access (storage blocked):", storageError);
      }

      if (access === "true" || access === "granted") {
        console.log("✅ Access found in localStorage");
        setHasAccess(true);
      } else {
        console.log("🔒 Password gate ACTIVE - access required");
        setHasAccess(false);
      }
    } finally {
      setLoading(false);
    }
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
