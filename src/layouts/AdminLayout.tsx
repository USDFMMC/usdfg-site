import { Outlet } from "react-router-dom";

/**
 * Wrapper for /admin/* so deep links always resolve through a stable parent route.
 */
export default function AdminLayout() {
  return <Outlet />;
}
