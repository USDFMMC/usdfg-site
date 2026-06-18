import { useBindWalletToFirebaseUser } from "@/hooks/useBindWalletToFirebaseUser";
import WalletIdentityRecoveryPrompt from "@/components/WalletIdentityRecoveryPrompt";

export default function BindWalletIdentity() {
  useBindWalletToFirebaseUser();
  return <WalletIdentityRecoveryPrompt />;
}

