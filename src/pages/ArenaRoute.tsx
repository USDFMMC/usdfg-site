import { Outlet } from 'react-router-dom';
import { ArenaPasswordGate } from '@/temporary/arena-password-gate';

/**
 * Arena shell for all /app/* routes.
 *
 * TEMPORARY: ArenaPasswordGate blocks public access until Cloudflare Access is deployed.
 * To remove: delete src/temporary/arena-password-gate/ and return <Outlet /> here.
 */
export default function ArenaRoute() {
  return (
    <ArenaPasswordGate>
      <Outlet />
    </ArenaPasswordGate>
  );
}
