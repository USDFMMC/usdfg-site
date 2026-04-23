import { useBindWalletToFirebaseUser } from "@/hooks/useBindWalletToFirebaseUser";

export default function BindWalletIdentity() {
  useBindWalletToFirebaseUser();
  return null;
}

