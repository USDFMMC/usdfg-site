import { Outlet, Navigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useAdminWalletAuth } from "@/hooks/useAdminWalletAuth";
import { normalizeAddress } from "@/utils/normalizeAddress";

export default function AdminLayout() {
  const { publicKey } = useWallet();
  const { connecting, isAdminVerified, isUnauthorized } =
    useAdminWalletAuth();

  const address = normalizeAddress(publicKey?.toString());

  if (connecting) {
    return <FullScreenLoader text="Checking access..." />;
  }

  if (!address) {
    return <Navigate to="/" replace />;
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold text-red-300">Unauthorized</h1>
        <p className="text-gray-400 text-center max-w-md">
          Wallet signature verification failed, nonce expired, rate limited, or
          this wallet is not in the admin allowlist.
        </p>
      </div>
    );
  }

  if (!isAdminVerified) {
    return <FullScreenLoader text="Verifying..." />;
  }

  return <Outlet />;
}
