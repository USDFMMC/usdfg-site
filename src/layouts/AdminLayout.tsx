import { Outlet } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useAdminWalletAuth } from "@/hooks/useAdminWalletAuth";
import { normalizeAddress } from "@/utils/normalizeAddress";

export default function AdminLayout() {
  const { publicKey, connected, connecting } = useWallet();
  const { isAdminVerified, isUnauthorized } = useAdminWalletAuth();

  if (connecting) {
    return <FullScreenLoader text="Checking access..." />;
  }

  if (!connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] text-white">
        <div className="text-center">
          <h2 className="mb-4 text-xl font-semibold">Admin Access</h2>
          <p className="mb-6 text-white/70">Connect your wallet to continue</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  const address = normalizeAddress(publicKey?.toString());

  if (!address) {
    return <FullScreenLoader text="Checking access..." />;
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
    return (
      <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-white/80 text-sm">Verifying...</p>
      </div>
    );
  }

  return <Outlet />;
}
