import { Outlet } from "react-router-dom";

/**
 * Arena (app shell): wallet-first access; no password gate.
 */
export default function ArenaRoute() {
  return <Outlet />;
}
