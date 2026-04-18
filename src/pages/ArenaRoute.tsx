import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PasswordForm from '@/components/PasswordForm';

export default function ArenaRoute() {
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (location.search.includes('phantom_encryption_public_key')) {
        try {
          localStorage.setItem('arena-access', 'true');
        } catch {
          // ignore
        }
        setHasAccess(true);
        return;
      }

      const access = localStorage.getItem('arena-access');
      if (access === 'true' || access === 'granted') {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-void flex items-center justify-center">
        <div className="text-white/60 text-sm">Loading…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return <PasswordForm onSuccess={() => setHasAccess(true)} />;
  }

  return <Outlet />;
}
