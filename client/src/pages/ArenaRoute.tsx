import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ArenaHome from './app/index';
import PasswordForm from '../components/PasswordForm';

const ArenaRoute = () => {
  const location = useLocation();
  const [entered, setEntered] = useState(false);

  console.log("🔍 ArenaRoute loaded at:", location.pathname);

  // CRITICAL: Phantom return must NOT be handled by ArenaRoute
  const isPhantomReturn = location.pathname === "/app/phantom-return";

  if (isPhantomReturn) {
    console.log("✅ Phantom return route detected — bypassing ArenaRoute entirely");
    return null; // Let App.tsx render <PhantomReturn />
  }

  useEffect(() => {
    const savedEntry = localStorage.getItem('arena-access');
    console.log("🔍 Password gate entry check:", savedEntry);

    if (savedEntry === 'true') {
      console.log("🔓 Password already validated — unlock Arena");
      setEntered(true);
    }
  }, []);

  if (!entered) {
    console.log("🔒 Showing password screen (ArenaRoute)");
    return <PasswordForm onSuccess={() => setEntered(true)} />;
  }

  console.log("🚀 Rendering ArenaHome (ArenaRoute)");
  return <ArenaHome />;
};

export default ArenaRoute;
