import React, { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";
import ParticleBackground from "@/components/ParticleBackground";
import { useChallenges } from "@/hooks/useChallenges";
import { runCreateChallengeFlow } from "@/lib/challenges/createChallengeFlow";
import { getWalletScopedValue, PROFILE_STORAGE_KEYS } from "@/lib/storage/profile";
import ElegantNotification from "@/components/ui/ElegantNotification";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase/config";
import { setWalletClaimCallable } from "@/lib/firebase/functions";

const CreateChallenge: React.FC = () => {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { publicKey, connected: isConnected } = wallet;
  const { challenges: firestoreChallenges } = useChallenges();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [walletClaimReady, setWalletClaimReady] = useState(false);
  const [walletClaimLinking, setWalletClaimLinking] = useState(false);

  const [usdfgPrice] = useState<number>(0.15);
  const [userGamerTag, setUserGamerTag] = useState<string>("");
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    type?: "info" | "warning" | "error" | "success";
  }>({ isOpen: false, message: "", type: "info" });

  const showAppToast = useCallback(
    (message: string, type: "info" | "warning" | "error" | "success" = "info", title?: string) => {
      setNotification({ isOpen: true, message, title, type });
    },
    []
  );

  const closeNotification = useCallback(() => {
    setNotification((n) => ({ ...n, isOpen: false }));
  }, []);

  const usdfgToUsd = useCallback(
    (usdfgAmount: number) => usdfgAmount * usdfgPrice,
    [usdfgPrice]
  );

  useEffect(() => {
    if (!publicKey) {
      setUserGamerTag("");
      return;
    }
    const walletKey = publicKey.toString();
    const tag = getWalletScopedValue(PROFILE_STORAGE_KEYS.gamerTag, walletKey);
    setUserGamerTag(tag || "");
  }, [publicKey]);

  // Ensure wallet custom claim is set for this Firebase user (required by Firestore rules).
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const walletAddress = publicKey?.toString() ?? null;
      if (!firebaseUser || !walletAddress) {
        setWalletClaimReady(false);
        return;
      }
      const walletLower = walletAddress.toLowerCase();

      try {
        const tokenResult = await auth.currentUser?.getIdTokenResult();
        const existing = (tokenResult?.claims as any)?.wallet;
        if (typeof existing === "string" && existing.toLowerCase() === walletLower) {
          if (!cancelled) setWalletClaimReady(true);
          return;
        }

        if (!cancelled) setWalletClaimLinking(true);
        await setWalletClaimCallable({ walletAddress });
        await auth.currentUser?.getIdToken(true);
        const refreshed = await auth.currentUser?.getIdTokenResult();
        const claimed = (refreshed?.claims as any)?.wallet;
        const ok = typeof claimed === "string" && claimed.toLowerCase() === walletLower;
        if (!cancelled) setWalletClaimReady(ok);
      } catch (e) {
        console.error("[Identity] Failed to set wallet claim:", e);
        if (!cancelled) setWalletClaimReady(false);
      } finally {
        if (!cancelled) setWalletClaimLinking(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, publicKey]);

  const handleConnect = async () => {
    try {
      const walletToConnect =
        wallet.wallets.find((w) => w.adapter.name === "Phantom") ||
        wallet.wallets[0];
      if (walletToConnect) {
        wallet.select(walletToConnect.adapter.name);
        await new Promise((r) => setTimeout(r, 100));
        await walletToConnect.adapter.connect();
      } else {
        showAppToast("No wallet detected. Please install Phantom or another Solana wallet.", "warning", "Wallet");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Connection error:", error);
      if (!message.includes("User rejected") && !message.includes("User cancelled")) {
        showAppToast(`Connection failed: ${message}`, "error", "Connection");
      }
    }
  };

  const handleCreateChallenge = async (challengeData: Record<string, unknown>) => {
    if (isCreatingChallenge) return;
    if (authLoading || !firebaseUser || !publicKey || !isConnected || walletClaimLinking || !walletClaimReady) {
      showAppToast("Connect your wallet and wait for identity verification before creating a challenge.", "warning", "Identity");
      return;
    }

    setIsCreatingChallenge(true);
    try {
      const result = await runCreateChallengeFlow({
        challengeData,
        wallet: {
          readPublicKey: () => publicKey?.toString() ?? null,
          readPhantomAdapterPublicKey: () =>
            wallet.wallets.find((w) => w.adapter.name === "Phantom")?.adapter?.publicKey?.toString() ??
            null,
        },
        firestoreChallenges,
        onTeamMissing: async () => {
          showAppToast(
            "You must be part of a team to create team challenges. Open the Arena and use Team Management.",
            "warning",
            "Team required"
          );
          navigate("/app");
        },
        onActiveChallengeBlocked: ({ title, id, status }) => {
          showAppToast(
            `You already have an active challenge (${title || id}). Status: ${status}. Complete it before creating a new one.`,
            "warning",
            "Active challenge"
          );
        },
      });

      if (!result.ok) {
        return;
      }

      if (result.createdIds.length > 1) {
        showAppToast(`Created ${result.createdIds.length} challenges.`, "success", "Challenges created");
      }
      navigate("/app");
    } catch (error) {
      console.error("❌ Failed to create challenge:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showAppToast("Failed to create challenge: " + errorMessage, "error", "Create failed");
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  return (
    <>
      <ElegantNotification
        isOpen={notification.isOpen}
        onClose={closeNotification}
        message={notification.message}
        title={notification.title}
        type={notification.type}
        duration={5000}
      />
      <Helmet>
        <title>Start Match - USDFG Arena | USDFG.PRO</title>
        <meta
          name="description"
          content="Create a new skill-based gaming challenge in the USDFG Arena."
        />
      </Helmet>

      <div className="min-h-screen relative bg-void">
        <ParticleBackground />
        <header className="border-b border-soft bg-background-2/80 backdrop-blur-sm neocore-panel relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/app">
                <Button variant="ghost" size="sm" className="text-text-dim hover:text-text-primary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Arena
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-glow-cyan to-glow-electric rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-black" />
                </div>
                <h1 className="neocore-h2 text-text-primary">Start Match</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto">
            <Card className="rounded-xl border border-purple/20 bg-void/80 backdrop-blur-sm shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <CardHeader>
                <CardTitle className="font-display text-xl font-semibold text-white tracking-tight">
                  New gaming challenge
                </CardTitle>
                <p className="font-body text-sm text-white/55 mt-1">
                  Set up a skill-based challenge and let the best player win.
                </p>
              </CardHeader>
              <CardContent>
                <CreateChallengeForm
                  isConnected={isConnected}
                  onConnect={handleConnect}
                  onCreateChallenge={handleCreateChallenge}
                  usdfgPrice={usdfgPrice}
                  usdfgToUsd={usdfgToUsd}
                  userGamerTag={userGamerTag}
                  currentWallet={publicKey?.toString()}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default CreateChallenge;
