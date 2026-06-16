/**
 * TEMPORARY pre-launch client gate for /app/* — replace with Cloudflare Access at the edge.
 * Delete src/temporary/arena-password-gate/ and revert ArenaRoute when Access is live.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import ArenaPasswordForm from '@/temporary/arena-password-gate/ArenaPasswordForm';
import { ARENA_ACCESS_STORAGE_KEY } from '@/temporary/arena-password-gate/constants';

function readStoredAccess(): boolean {
  try {
    const access = localStorage.getItem(ARENA_ACCESS_STORAGE_KEY);
    return access === 'true' || access === 'granted';
  } catch {
    return false;
  }
}

interface ArenaPasswordGateProps {
  children: ReactNode;
}

export default function ArenaPasswordGate({ children }: ArenaPasswordGateProps) {
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Phantom mobile return — existing wallet flow sets arena-access; honor param here too.
      if (location.search.includes('phantom_encryption_public_key')) {
        try {
          localStorage.setItem(ARENA_ACCESS_STORAGE_KEY, 'true');
        } catch {
          // ignore
        }
        setHasAccess(true);
        return;
      }

      setHasAccess(readStoredAccess());
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
    return <ArenaPasswordForm onSuccess={() => setHasAccess(true)} />;
  }

  return <>{children}</>;
}
