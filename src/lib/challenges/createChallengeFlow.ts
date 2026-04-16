import { ADMIN_WALLET } from "@/lib/chain/config";
import { extractGameFromTitle, getGameCategory } from "@/lib/gameAssets";
import type { TournamentState } from "@/lib/firebase/firestore";

/** Minimal challenge row for the “one active challenge” guard (matches prior page logic). */
export interface FirestoreChallengeForCreateGuard {
  id?: string;
  creator: string;
  players?: string[];
  status?: string;
  title?: string;
  rawData?: { status?: string };
}

export interface CreateChallengeFormPayload {
  challengeType?: string;
  entryFee?: string | number;
  founderChallengeCount?: number;
  format?: string;
  tournament?: TournamentState | unknown;
  maxPlayers?: number;
  mode?: string;
  title?: string;
  game?: string;
  username?: string;
  prizePool?: number;
  founderParticipantReward?: number;
  founderWinnerBonus?: number;
  teamOnly?: boolean;
  platform?: string;
}

export interface CreateChallengeWalletSource {
  /** Primary public key from wallet adapter hook (may lag after connect). */
  readPublicKey: () => string | null | undefined;
  /** Phantom adapter publicKey when hook is not ready yet (same as previous pages). */
  readPhantomAdapterPublicKey: () => string | null | undefined;
}

export type CreateChallengeFlowResult =
  | { ok: true; createdIds: string[] }
  | { ok: false; reason: "team_missing" }
  | { ok: false; reason: "active_challenge" };

export interface RunCreateChallengeFlowOptions {
  challengeData: CreateChallengeFormPayload | Record<string, unknown>;
  wallet: CreateChallengeWalletSource;
  firestoreChallenges: FirestoreChallengeForCreateGuard[];
  /** Called when the user must join/create a team before continuing; then flow returns `team_missing`. */
  onTeamMissing?: () => void | Promise<void>;
  /** Called when an existing active challenge blocks creation (non-founder); then flow returns `active_challenge`. */
  onActiveChallengeBlocked?: (ctx: {
    title: string;
    id?: string;
    status: string;
  }) => void;
  /** After Firestore writes succeed (before returning `{ ok: true }`). */
  onSuccess?: (ctx: { createdIds: string[] }) => void | Promise<void>;
  /** Invoked on thrown errors before rethrowing (wallet, validation, `addChallenge`, etc.). */
  onError?: (error: unknown) => void | Promise<void>;
}

function coercePayload(
  data: CreateChallengeFormPayload | Record<string, unknown>
): CreateChallengeFormPayload {
  return data as CreateChallengeFormPayload;
}

function getMaxPlayersForMode(mode: string): number {
  if (!mode) return 2;
  switch (mode.toLowerCase()) {
    case "head-to-head":
    case "1v1":
      return 2;
    case "tournament":
    case "bracket":
      return 8;
    case "battle royale":
      return 16;
    case "lobby":
    case "community lobby":
    case "open lobby":
      return 24;
    case "team vs team":
      return 4;
    default:
      return 2;
  }
}

/**
 * Step 1: create challenge document(s) in Firestore via `addChallenge`.
 * No UI; optional hooks for callers. Preserves prior index + challenge/new behavior.
 */
export async function runCreateChallengeFlow(
  options: RunCreateChallengeFlowOptions
): Promise<CreateChallengeFlowResult> {
  const {
    challengeData: raw,
    wallet,
    firestoreChallenges,
    onTeamMissing,
    onActiveChallengeBlocked,
    onSuccess,
    onError,
  } = options;

  try {
    return await runCreateChallengeFlowCore({
      raw,
      wallet,
      firestoreChallenges,
      onTeamMissing,
      onActiveChallengeBlocked,
      onSuccess,
    });
  } catch (e) {
    await onError?.(e);
    throw e;
  }
}

async function runCreateChallengeFlowCore(options: {
  raw: CreateChallengeFormPayload | Record<string, unknown>;
  wallet: CreateChallengeWalletSource;
  firestoreChallenges: FirestoreChallengeForCreateGuard[];
  onTeamMissing?: () => void | Promise<void>;
  onActiveChallengeBlocked?: (ctx: { title: string; id?: string; status: string }) => void;
  onSuccess?: (ctx: { createdIds: string[] }) => void | Promise<void>;
}): Promise<CreateChallengeFlowResult> {
  const { raw, wallet, firestoreChallenges, onTeamMissing, onActiveChallengeBlocked, onSuccess } =
    options;
  const challengeData = coercePayload(raw);

  const isTeamChallenge = challengeData.challengeType === "team";

  let attempts = 0;
  let currentWallet = wallet.readPublicKey() || null;
  const phantomPk = wallet.readPhantomAdapterPublicKey();
  if (!currentWallet && phantomPk) {
    currentWallet = phantomPk;
  }
  while (!currentWallet && attempts < 20) {
    await new Promise((r) => setTimeout(r, 100));
    currentWallet = wallet.readPublicKey() || wallet.readPhantomAdapterPublicKey() || null;
    attempts++;
  }
  if (!currentWallet) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  if (isTeamChallenge) {
    const { getTeamByMember } = await import("@/lib/firebase/firestore");
    const userTeam = await getTeamByMember(currentWallet);
    if (!userTeam) {
      await onTeamMissing?.();
      return { ok: false, reason: "team_missing" };
    }
    if (userTeam.teamKey !== currentWallet) {
      throw new Error(
        "Only the team key holder can create team challenges. You are a team member, not the key holder."
      );
    }
    currentWallet = userTeam.teamKey;
  }

  const entryFeeValue =
    typeof challengeData.entryFee === "string"
      ? parseFloat(challengeData.entryFee) || 0
      : challengeData.entryFee || 0;
  const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  const isFounderChallenge = isAdmin && (entryFeeValue === 0 || entryFeeValue < 0.000000001);
  const founderChallengeCount = Math.min(
    25,
    Math.max(1, Math.floor(Number(challengeData.founderChallengeCount || 1)))
  );
  const isTournament =
    challengeData.format === "tournament" || Boolean(challengeData.tournament);
  const founderParticipantReward =
    isFounderChallenge && isTournament
      ? Math.max(0, Number(challengeData.founderParticipantReward || 0))
      : 0;
  const founderWinnerBonus =
    isFounderChallenge && isTournament
      ? Math.max(0, Number(challengeData.founderWinnerBonus || 0))
      : 0;

  const existingActive = firestoreChallenges.find((fc) => {
    const isCreator = fc.creator === currentWallet;
    const isParticipant = Array.isArray(fc.players) && fc.players.includes(currentWallet);
    const status = fc.status || fc.rawData?.status || "unknown";
    const isActive =
      status === "active" ||
      status === "pending_waiting_for_opponent" ||
      status === "creator_confirmation_required" ||
      status === "creator_funded";
    const isCompleted =
      status === "completed" ||
      status === "cancelled" ||
      status === "disputed" ||
      status === "expired";
    const shouldBlock = (isCreator || isParticipant) && isActive && !isCompleted;
    return shouldBlock;
  });

  if (existingActive && !isFounderChallenge) {
    const status = existingActive.status || existingActive.rawData?.status || "unknown";
    const title = existingActive.title || "";
    const id = existingActive.id;
    onActiveChallengeBlocked?.({ title, id, status });
    return { ok: false, reason: "active_challenge" };
  }

  const maxPlayers =
    challengeData.maxPlayers || getMaxPlayersForMode(String(challengeData.mode || ""));

  if (!currentWallet) {
    throw new Error("Wallet address not found. Please connect your wallet first.");
  }

  const entryFee = entryFeeValue;
  console.log("📝 Challenge created in Firestore only. PDA will be created when creator funds.");

  const platformFee = 0.05;
  let totalPrize: number;
  if (isFounderChallenge) {
    totalPrize = isTournament ? founderWinnerBonus : (challengeData.prizePool || 0);
  } else if (isTournament) {
    totalPrize = entryFee * maxPlayers;
  } else {
    totalPrize = entryFee * 2;
  }

  const prizePool = isFounderChallenge ? totalPrize : totalPrize - totalPrize * platformFee;

  const { addChallenge } = await import("@/lib/firebase/firestore");
  const { Timestamp } = await import("firebase/firestore");

  const challengeTitle =
    challengeData.title ||
    `${challengeData.game || "Game"} - ${challengeData.mode || "Challenge"}${
      challengeData.username ? ` by ${challengeData.username}` : ""
    }`;

  const now = Date.now();
  const expirationTimer = Timestamp.fromDate(new Date(now + 60 * 60 * 1000));
  const initialPlayers = isFounderChallenge && isTournament ? [] : [currentWallet];

  const firestoreChallengeData = {
    creator: currentWallet,
    entryFee,
    status: "pending_waiting_for_opponent" as const,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date(now + 2 * 60 * 60 * 1000)),
    expirationTimer,
    players: initialPlayers,
    maxPlayers: challengeData.maxPlayers || maxPlayers,
    format: (challengeData.format === "tournament" || challengeData.tournament
      ? "tournament"
      : "standard") as "standard" | "tournament",
    tournament:
      challengeData.format === "tournament"
        ? (challengeData.tournament as TournamentState | undefined)
        : undefined,
    pda: isFounderChallenge ? null : undefined,
    prizePool,
    founderParticipantReward:
      isFounderChallenge && isTournament ? founderParticipantReward : undefined,
    founderWinnerBonus: isFounderChallenge && isTournament ? founderWinnerBonus : undefined,
    title: challengeTitle,
    game: challengeData.game || extractGameFromTitle(challengeTitle),
    isCustomGame: Boolean((challengeData as { isCustomGame?: boolean }).isCustomGame),
    category: getGameCategory(challengeData.game || extractGameFromTitle(challengeTitle)),
    platform: challengeData.platform || "All Platforms",
    challengeType: (isTeamChallenge ? "team" : "solo") as "solo" | "team",
    teamOnly: isTeamChallenge ? challengeData.teamOnly || false : undefined,
  };

  console.log("🔥 Adding challenge to Firestore...");
  console.log("🔥 Firestore Challenge Data:", firestoreChallengeData);
  console.log("🔥 Challenge PDA: Will be created when creator funds (no PDA at creation time)");

  if (!firestoreChallengeData.creator) {
    throw new Error("Creator wallet is required");
  }
  if (firestoreChallengeData.entryFee === undefined || firestoreChallengeData.entryFee === null) {
    throw new Error("Challenge amount is required");
  }
  if (!firestoreChallengeData.status) {
    throw new Error("Status is required");
  }

  const totalChallengesToCreate = founderChallengeCount;
  const createdIds: string[] = [];
  for (let i = 1; i <= totalChallengesToCreate; i++) {
    const titleSuffix = totalChallengesToCreate > 1 ? ` #${i}` : "";
    const payload = {
      ...firestoreChallengeData,
      title: `${challengeTitle}${titleSuffix}`,
    };
    const createdId = await addChallenge(payload);
    createdIds.push(createdId);
  }

  await onSuccess?.({ createdIds });
  return { ok: true, createdIds };
}
