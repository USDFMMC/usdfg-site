import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  setDoc,
  limit,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  deleteField,
  runTransaction
} from 'firebase/firestore';
import { db, auth, ensureFirebaseSignedIn } from './config';
import {
  getCompletedActivityExpiresAtMs,
  isLegacyCreateTimeExpiresAt,
} from '@/lib/utils/challenge-visibility';
import {
  invokeApplyMatchStats,
  invokeUpdatePlayerProfile,
  invokeUpdatePlayerMeta,
  invokeUpdateTrustScore,
} from './adminApi';
import { CHALLENGE_CONFIG, ADMIN_WALLET } from '../chain/config';
import { getExplorerTxUrl } from '../chain/explorer';
import { isWarmupPhaseBlockingSubmit } from '@/lib/utils/warmup-phase';
/** Max challenges in the arena realtime feed (useChallenges / refetch). */
export const RECENT_CHALLENGES_FEED_LIMIT = 30;

// Lightweight Firestore connectivity check (1 doc max — no full collection scan).
export async function testFirestoreConnection() {
  try {
    const q = query(
      collection(db, "challenges"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    await getDocs(q);
    if (import.meta.env.DEV) {
      console.log("✅ Firestore connected.");
    }
    return true;
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
    return false;
  }
}

// Collection references
const usersCollection = collection(db, 'users');
/** Lobby lock documents (site uses `user_locks`, not `users`, for lock state). */
const userLocksCollection = collection(db, 'user_locks');
const lockNotificationsCollection = collection(db, 'lock_notifications');

export async function postChallengeSystemMessage(challengeId: string, text: string): Promise<void> {
  if (!challengeId || !text) {
    return;
  }
  try {
    await addDoc(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'), {
      text,
      sender: 'SYSTEM',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.warn('⚠️ Failed to post system message to chat:', error);
  }
}

/** Remove `voice_signals/{challengeId}` when lobby voice session ends. Safe if doc missing. */
export async function deleteVoiceSignalsDocument(challengeId: string): Promise<void> {
  if (!challengeId?.trim()) return;
  try {
    await deleteDoc(doc(db, 'voice_signals', challengeId));
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (code !== 'not-found' && !msg.includes('not found')) {
      console.warn('⚠️ voice_signals cleanup:', e);
    }
  }
}

// Optimized Challenge Data - Minimal Collection
export interface ChallengeData {
  id?: string;
  creator: string;                    // Creator wallet (or team key for team challenges)
  challenger?: string;                // Challenger wallet (if accepted) or team key
  targetPlayer?: string;               // Optional: specific player to challenge (for direct challenges)
  entryFee: number;                   // Entry fee amount
  // NEW STATE MACHINE (includes legacy / runtime values seen in Firestore)
  status:
    | 'pending_waiting_for_opponent'
    | 'creator_confirmation_required'
    | 'creator_funded'
    | 'active'
    | 'awaiting_auto_resolution'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | 'expired';
  pendingJoiner?: string;             // Wallet that expressed join intent (in creator_confirmation_required state)
  createdAt: Timestamp;               // Creation time
  /** Set when status becomes completed — 2 hr Recent Activity feed visibility only. */
  expiresAt?: Timestamp;
  expirationTimer?: Timestamp;        // 60-minute open matchmaking window (pending_waiting_for_opponent only)
  creatorFundingDeadline?: Timestamp; // Deadline for creator to fund (5 minutes after join intent)
  joinerFundingDeadline?: Timestamp;  // Deadline for joiner to fund (5 minutes after creator funds)
  fundedByCreatorAt?: Timestamp;      // When creator funded escrow
  fundedByJoinerAt?: Timestamp;       // When joiner funded escrow
  winner?: string;                    // Winner wallet (if completed) or team key
  challengeType?: 'solo' | 'team';    // Challenge type - solo or team (defaults to solo for backward compatibility)
  teamOnly?: boolean;                 // For team challenges: true = only teams can accept, false = open to anyone (defaults to false)
  /** Snapshot of raw Firestore fields for UI helpers (optional on stored docs) */
  rawData?: Record<string, any>;
  /** Firebase Auth UID of the creator (paired with creator / creatorWallet). */
  createdByUid?: string | null;
  /** Explicit copy of creator wallet for hybrid identity reads. */
  creatorWallet?: string | null;
  /** Firebase Auth UID of opponent / challenger when known. */
  opponentUid?: string | null;
  /** Opponent / challenger wallet (mirrors challenger when set). */
  opponentWallet?: string | null;
  /** Parallel to players: Firebase UIDs where known (same length as players when written by merge). */
  playersUid?: (string | null)[];
  creatorTag?: string;
  cancelRequests?: string[];
  prizeClaimedAt?: Timestamp;
  updatedAt?: Timestamp;

  // Result submission fields
  results?: {
    [wallet: string]: {
      didWin: boolean;
      submittedAt: Timestamp;
      proofImageData?: string;
      autoDetermined?: boolean;
    }
  };
  resultDeadline?: Timestamp;         // 2 hours after match starts
  /** After a loss-only report; opponent may still submit before resolveAfter. */
  provisionalWinner?: string | null;
  lossReportedBy?: string | null;
  resolveAfter?: Timestamp | null;
  finalizedAt?: Timestamp | null;
  statsApplied?: boolean;
  needsStats?: boolean;
  resolutionMeta?: {
    type: string;
    triggeredBy?: string;
    triggeredAt: Timestamp;
  };
  disputedBy?: string;
  disputedAt?: Timestamp;
  disputeReason?: string | null;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolutionType?: 'auto' | 'admin' | 'forfeit';
  adminResolutionTx?: string | null;
  // UI fields (minimal for display)
  players?: string[];                 // Array of player wallets
  maxPlayers?: number;                // Maximum players allowed
  format?: 'standard' | 'tournament'; // Challenge format. Default = standard (1v1)
  tournament?: TournamentState;       // Tournament metadata when format === 'tournament'
  // Reward claim fields
  canClaim?: boolean;                 // Whether winner can claim reward
  needsPayout?: boolean;               // When true, winner may claim escrow (cleared after successful claim)
  payoutStatus?: 'pending' | 'processing' | 'paid';
  payoutLastError?: string;
  payoutErrorAt?: Timestamp;
  payoutAttemptedAt?: Timestamp;
  payoutLockOwner?: string;
  payoutTriggered?: boolean;          // Whether reward has been claimed
  payoutSignature?: string;            // Transaction signature of reward claim
  payoutTimestamp?: Timestamp;        // When reward was claimed
  /** Set after creator successfully calls cancelChallenge to recover pre-match escrow. */
  escrowRecoveredAt?: Timestamp;
  /** Why a cancelled challenge was closed (joiner timeout escrow recovery uses joiner_funding_timeout). */
  cancelledReason?: 'joiner_funding_timeout';
  pda?: string | null;                // Challenge PDA for smart contract (null for founder flows)
  prizePool?: number;                 // Total challenge reward amount
  founderParticipantReward?: number;  // Founder tournament reward per participant
  founderWinnerBonus?: number;        // Founder tournament winner bonus
  founderPayoutAcknowledgedBy?: string[]; // Wallets that saw "no action required" (hide Claim for them)
  founderPayoutSentAt?: Timestamp;    // When founder airdrop was sent (hide Claim for all)
  // UI display fields
  title?: string;                     // Challenge title (contains game info)
  game?: string;                      // Game name for display
  /** True when creator used the Custom game picker (game holds their custom title). */
  isCustomGame?: boolean;
  category?: string;                  // Game category for filtering
  platform?: string;                  // Platform (PS5, PC, Xbox, etc.) for display
  // Warm-Up sub-phase (optional; does not change top-level status machine)
  warmupEnabled?: boolean;
  warmupStatus?: 'disabled' | 'waiting' | 'active' | 'completed' | 'skipped';
  warmupCompleteBy?: Record<string, boolean>;
  officialReadyBy?: Record<string, boolean>;
  officialMatchStatus?: 'waiting_ready' | 'live' | 'completed';
  officialMatchStartedAt?: Timestamp;
  warmupStartedAt?: Timestamp;
  // REMOVED: rules, mode, creatorTag, solanaAccountId, cancelRequests
  // These are not needed for leaderboard and increase storage costs unnecessarily
}

/** Normalize winner / wallet fields for storage and comparisons (special literals unchanged). */
export function normalizeWinnerWallet(w: string): string {
  if (w === 'forfeit' || w === 'tie' || w === 'cancelled') return w;
  return w.toLowerCase();
}

export function walletsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeWinnerWallet(a) === normalizeWinnerWallet(b);
}

export function isParticipantWallet(players: string[] | undefined, wallet: string): boolean {
  const w = normalizeWinnerWallet(wallet);
  return (players || []).some((p) => normalizeWinnerWallet(p) === w);
}

/** Solana tx signatures are base58 ~87–88 chars; used only for fallback repair when signature exists but flags lag. */
function looksLikeSolanaTxSignature(s: string): boolean {
  const t = (s || '').trim();
  return t.length >= 80 && t.length <= 120;
}

// --- Challenge hybrid identity (wallet <-> Firebase UID) for challenges/{id} writes ---

function walletEq(a?: string | null, b?: string | null): boolean {
  return walletsEqual(a, b);
}

function updatesTouchHybridParticipants(updates: Record<string, unknown>): boolean {
  return Object.keys(updates).some(
    (k) =>
      k === 'creator' ||
      k === 'challenger' ||
      k === 'pendingJoiner' ||
      k === 'players' ||
      k === 'playersUid' ||
      k === 'createdByUid' ||
      k === 'creatorWallet' ||
      k === 'opponentUid' ||
      k === 'opponentWallet'
  );
}

/** Never replace an existing uid/wallet hybrid field with null/undefined from a partial update. */
function stripNullUndefinedIdentityOverwrites(
  current: Record<string, unknown> | undefined,
  updates: Record<string, unknown>
): void {
  if (!current) return;
  const keys = ['createdByUid', 'creatorWallet', 'opponentUid', 'opponentWallet', 'playersUid'] as const;
  for (const k of keys) {
    const next = updates[k];
    if ((next === null || next === undefined) && current[k] != null && current[k] !== undefined) {
      delete updates[k];
    }
  }
}

function buildPlayersUidAligned(
  players: string[],
  base: Record<string, unknown>,
  actingWallet?: string | null,
  actingUid?: string | null
): (string | null)[] {
  const curPlayers = (base.players as string[] | undefined) || [];
  const curUids = (base.playersUid as (string | null)[] | undefined) || [];
  const uidByWallet = new Map<string, string | null>();

  const register = (w?: string | null, u?: string | null) => {
    if (!w) return;
    const key = normalizeWinnerWallet(w);
    if (u && uidByWallet.has(key) && uidByWallet.get(key) && uidByWallet.get(key) !== u) {
      return;
    }
    if (u) uidByWallet.set(key, u);
    else if (!uidByWallet.has(key)) uidByWallet.set(key, null);
  };

  for (let i = 0; i < curPlayers.length; i++) {
    const w = curPlayers[i];
    const u = curUids[i];
    if (w && u) register(w, u);
  }

  const creator = (base.creator as string) || '';
  register(creator, (base.createdByUid as string) || null);
  const creatorWallet = (base.creatorWallet as string) || creator;
  register(creatorWallet, (base.createdByUid as string) || null);

  const challenger = (base.challenger as string) || '';
  const oppUid = (base.opponentUid as string) || null;
  register(challenger, oppUid);
  const oppW =
    (base.opponentWallet as string) || challenger || (base.pendingJoiner as string) || '';
  if (oppW) register(oppW, oppUid);

  const pending = (base.pendingJoiner as string) || '';
  if (pending && !challenger) {
    register(pending, oppUid);
  }

  if (actingWallet && actingUid) {
    register(actingWallet, actingUid);
  }

  const usedUids = new Set<string>();
  return players.map((w) => {
    let uid = uidByWallet.get(w.toLowerCase()) ?? null;
    if (uid && usedUids.has(uid)) {
      uid = null;
    }
    if (uid) usedUids.add(uid);
    return uid;
  });
}

export type ChallengeWriteContext = {
  /** Latest snapshot fields used to merge hybrid identity (avoid wiping uids/wallets). */
  currentData?: ChallengeData | Record<string, unknown>;
  actingWallet?: string | null;
  actingUid?: string | null;
  /** Caller manages hybrid clears (e.g. deleteField); skip merge but still log. */
  skipParticipantHybridMerge?: boolean;
};

/**
 * Single choke point for challenge document updates: logs CHALLENGE WRITE and merges uid+wallet fields
 * whenever participant-related keys are present.
 */
export async function writeChallengeFields(
  challengeId: string,
  updates: Record<string, any>,
  ctx?: ChallengeWriteContext
): Promise<void> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const originalTouches = updatesTouchHybridParticipants(updates);
  const out: Record<string, any> = { ...updates };
  let current = ctx?.currentData as Record<string, unknown> | undefined;
  if (current === undefined && originalTouches) {
    const s = await getDoc(challengeRef);
    current = s.exists() ? (s.data() as Record<string, unknown>) : undefined;
  }

  stripNullUndefinedIdentityOverwrites(current, out);

  const effEntryFee = Number(
    (out.entryFee !== undefined ? out.entryFee : (current as Record<string, unknown> | undefined)?.entryFee) ?? 0
  );
  const effPdaRaw = out.pda !== undefined ? out.pda : (current as Record<string, unknown> | undefined)?.pda;
  const effPda = typeof effPdaRaw === 'string' ? effPdaRaw.trim() : '';
  if (out.status === 'active' && effEntryFee > CHALLENGE_CONFIG.MIN_ENTRY_FEE) {
    if (!effPda || effPda.length < 32) {
      throw new Error(
        'Cannot mark a paid challenge as active without an on-chain PDA. Fund escrow on-chain first.'
      );
    }
  }

  // FINALIZED: resolutionType must always exist for completed challenges.
  // Default only applies when missing; explicit values must never be overridden.
  if (process.env.NODE_ENV !== 'production') {
    if (out.status === 'completed' && out.resolutionType == null) {
      console.warn('Missing resolutionType on completed challenge', out);
    }
  }
  if (out.status === 'completed' && out.resolutionType == null) {
    out.resolutionType = 'auto';
  }

  if (out.status === 'completed' && current === undefined) {
    const snap = await getDoc(challengeRef);
    if (snap.exists()) {
      current = snap.data() as Record<string, unknown>;
    }
  }

  const prevStatus = (current as { status?: string } | undefined)?.status;
  if (out.status === 'completed' && prevStatus !== 'completed') {
    out.expiresAt = Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000);
  }

  const authUid = auth.currentUser?.uid ?? null;
  const actingUid =
    ctx?.actingUid ?? (ctx?.actingWallet && authUid ? authUid : null);

  if (ctx?.skipParticipantHybridMerge) {
    console.log('CHALLENGE WRITE:', {
      challengeId,
      uid: ctx?.actingUid ?? authUid,
      wallet: ctx?.actingWallet ?? null,
    });
    await updateDoc(challengeRef, out);
    return;
  }

  if (originalTouches) {
    const creator = ((out.creator ?? current?.creator) as string) || '';
    if (creator) {
      out.creatorWallet = creator;
      const existingC =
        (out.createdByUid as string) ||
        (current?.createdByUid as string) ||
        (actingUid && walletEq(creator, ctx?.actingWallet) ? actingUid : null) ||
        null;
      if (existingC) out.createdByUid = existingC;
    }

    const oppW =
      (
        (out.challenger ??
          out.pendingJoiner ??
          out.opponentWallet ??
          current?.challenger ??
          current?.pendingJoiner ??
          current?.opponentWallet) as string
      )?.trim() || '';
    if (oppW) {
      out.opponentWallet = oppW;
      const existingO =
        (out.opponentUid as string) ||
        (current?.opponentUid as string) ||
        (actingUid && walletEq(oppW, ctx?.actingWallet) ? actingUid : null) ||
        null;
      if (existingO) out.opponentUid = existingO;
    }

    if (out.players && Array.isArray(out.players)) {
      const eff = { ...(current || {}), ...out } as Record<string, unknown>;
      out.playersUid = buildPlayersUidAligned(out.players as string[], eff, ctx?.actingWallet, actingUid);
    }
  }

  console.log('CHALLENGE WRITE:', {
    challengeId,
    uid: ctx?.actingUid ?? authUid,
    wallet: ctx?.actingWallet ?? null,
  });
  await updateDoc(challengeRef, out);
}

export type TournamentStage = 'waiting_for_players' | 'round_in_progress' | 'awaiting_results' | 'completed';
export type BracketMatchStatus = 'waiting' | 'ready' | 'in-progress' | 'completed' | 'disputed';

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  player1?: string;
  player2?: string;
  winner?: string;
  status: BracketMatchStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  player1Result?: 'win' | 'loss'; // Track player1's submission
  player2Result?: 'win' | 'loss'; // Track player2's submission
  /** When results conflict, match is disputed until admin resolves. */
  disputeId?: string;
  disputedAt?: Timestamp;
}

export interface BracketRound {
  roundNumber: number;
  matches: BracketMatch[];
}

export interface TournamentState {
  format: 'tournament';
  maxPlayers: number;
  currentRound: number;
  stage: TournamentStage;
  bracket: BracketRound[];
  champion?: string;
}

const createInitialBracket = (maxPlayers: number): BracketRound[] => {
  const rounds: BracketRound[] = [];
  let matchesInRound = maxPlayers / 2;
  let roundNumber = 1;

  while (matchesInRound >= 1) {
    const matches: BracketMatch[] = Array.from({ length: matchesInRound }, (_, idx) => ({
      id: `r${roundNumber}-m${idx + 1}`,
      round: roundNumber,
      slot: idx,
      status: 'waiting',
    }));

    rounds.push({ roundNumber, matches });
    matchesInRound = matchesInRound / 2;
    roundNumber += 1;
  }

  return rounds;
};

const deepCloneBracket = (bracket: BracketRound[] | undefined): BracketRound[] => {
  if (!bracket) return [];
  return bracket.map(round => ({
    roundNumber: round.roundNumber,
    matches: round.matches.map(match => ({ ...match })),
  }));
};

const seedPlayersIntoBracket = (bracket: BracketRound[], players: string[]): BracketRound[] => {
  if (!bracket.length) return bracket;

  const cloned = deepCloneBracket(bracket);
  const firstRound = cloned[0];
  if (!firstRound) {
    return cloned;
  }

  let index = 0;
  firstRound.matches.forEach(match => {
    match.player1 = players[index++] || match.player1;
    match.player2 = players[index++] || match.player2;

    const hasBoth = Boolean(match.player1 && match.player2);
    match.status = hasBoth ? (match.status === 'completed' ? 'completed' : 'ready') : 'waiting';
  });

  return cloned;
};

const ensureTournamentState = (
  tournament: TournamentState | undefined,
  maxPlayers: number
): TournamentState => {
  if (tournament && tournament.bracket?.length) {
    return {
      ...tournament,
      maxPlayers: tournament.maxPlayers || maxPlayers,
      format: 'tournament',
    };
  }

  return {
    format: 'tournament',
    maxPlayers,
    currentRound: 1,
    stage: 'waiting_for_players',
    bracket: createInitialBracket(maxPlayers),
  };
};

const activateRoundMatches = (
  bracket: BracketRound[],
  roundNumber: number
): BracketRound[] => {
  return bracket.map(round => {
    if (round.roundNumber !== roundNumber) {
      return round;
    }

    return {
      ...round,
      matches: round.matches.map(match => {
        const hasBothPlayers = Boolean(match.player1 && match.player2);
        return {
          ...match,
          status: hasBothPlayers ? 'in-progress' : match.status,
          startedAt: hasBothPlayers ? match.startedAt || Timestamp.now() : match.startedAt,
        };
      }),
    };
  });
};

const sanitizeTournamentState = (state: TournamentState): TournamentState => {
  const sanitized: TournamentState = {
    format: 'tournament',
    maxPlayers: state.maxPlayers,
    currentRound: state.currentRound,
    stage: state.stage,
    bracket: state.bracket.map(round => ({
      roundNumber: round.roundNumber,
      matches: round.matches.map(match => {
        const sanitizedMatch: any = {
          id: match.id,
          round: match.round,
          slot: match.slot,
          status: match.status,
        };

        if (match.player1) sanitizedMatch.player1 = match.player1;
        if (match.player2) sanitizedMatch.player2 = match.player2;
        if (match.winner) sanitizedMatch.winner = match.winner;
        if (match.startedAt) sanitizedMatch.startedAt = match.startedAt;
        if (match.completedAt) sanitizedMatch.completedAt = match.completedAt;
        if (match.player1Result) sanitizedMatch.player1Result = match.player1Result;
        if (match.player2Result) sanitizedMatch.player2Result = match.player2Result;
        if (match.disputeId) sanitizedMatch.disputeId = match.disputeId;
        if (match.disputedAt) sanitizedMatch.disputedAt = match.disputedAt;

        return sanitizedMatch;
      }),
    })),
  };

  if (state.champion) {
    sanitized.champion = state.champion;
  }

  return sanitized;
};

// Tournament match dispute queue (separate collection for queryability)
export type TournamentMatchDisputeStatus = 'open' | 'resolved';

export interface TournamentMatchDispute {
  id?: string;
  challengeId: string;
  matchId: string;
  round: number;
  slot: number;
  player1: string;
  player2: string;
  player1Result: 'win' | 'loss';
  player2Result: 'win' | 'loss';
  createdAt: Timestamp;
  status: TournamentMatchDisputeStatus;
  resolvedAt?: Timestamp;
  resolvedByUid?: string;
  resolvedByEmail?: string;
  winnerWallet?: string;
}

export const listenToTournamentDisputes = (
  callback: (disputes: TournamentMatchDispute[]) => void
) => {
  const q = query(
    collection(db, 'tournament_disputes'),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const disputes: TournamentMatchDispute[] = [];
      snapshot.forEach((docSnap) => {
        disputes.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(disputes);
    },
    (error) => {
      console.error('❌ Error listening to tournament disputes:', error);
      callback([]);
    }
  );
};

/**
 * Resolve a disputed tournament match as admin.
 * Updates the bracket match winner, advances bracket, and marks the dispute resolved.
 */
export const resolveTournamentMatchDispute = async (
  challengeId: string,
  matchId: string,
  winnerWallet: string,
  adminUid?: string,
  adminEmail?: string
): Promise<void> => {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) throw new Error('Challenge not found');

  const data = snap.data() as ChallengeData;
  const tournament = data.tournament;
  if (!tournament?.bracket) throw new Error('Tournament bracket not found');

  const bracket = deepCloneBracket(tournament.bracket);
  let found = false;
  let currentRoundIndex = -1;
  let matchIndex = -1;
  let disputeId: string | undefined;

  for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
    const round = bracket[roundIdx];
    for (let mi = 0; mi < round.matches.length; mi++) {
      const m = round.matches[mi];
      if (m.id === matchId) {
        // Verify winner is in this match
        const isP1 = m.player1?.toLowerCase() === winnerWallet.toLowerCase();
        const isP2 = m.player2?.toLowerCase() === winnerWallet.toLowerCase();
        if (!isP1 && !isP2) throw new Error('Winner is not a participant in this match');

        disputeId = (m as any).disputeId;

        // Mark match resolved/completed
        m.winner = winnerWallet;
        m.status = 'completed';
        m.completedAt = Timestamp.now();
        (m as any).disputeId = undefined;
        (m as any).disputedAt = undefined;
        // Normalize submissions to match the chosen winner (optional but makes history consistent)
        if (m.player1 && m.player2) {
          m.player1Result = isP1 ? 'win' : 'loss';
          m.player2Result = isP2 ? 'win' : 'loss';
        }

        found = true;
        currentRoundIndex = roundIdx;
        matchIndex = mi;
        break;
      }
    }
    if (found) break;
  }
  if (!found) throw new Error('Match not found in bracket');

  // Advance bracket exactly like advanceBracketWinner
  const currentRound = bracket[currentRoundIndex];
  if (!currentRound) throw new Error('Current round not found');

  const updates: any = {
    'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
    updatedAt: serverTimestamp(),
  };

    if (currentRoundIndex === bracket.length - 1) {
      // Final round => tournament complete
      updates['tournament.champion'] = winnerWallet;
      updates['tournament.stage'] = 'completed';
      updates['tournament.completedAt'] = serverTimestamp();
      updates['tournament.currentRound'] = bracket.length;
      updates['status'] = 'completed';
      updates['resolutionType'] = 'admin';
      updates['canClaim'] = true;
      Object.assign(updates, escrowTournamentClaimGatePatch(data));
    } else {
    const nextRound = bracket[currentRoundIndex + 1];
    if (!nextRound) throw new Error('Next round not found');

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];
    if (!nextMatch) throw new Error('Next round match not found');

    if (matchIndex % 2 === 0) nextMatch.player1 = winnerWallet;
    else nextMatch.player2 = winnerWallet;
    if (nextMatch.player1 && nextMatch.player2) nextMatch.status = 'ready';

    const allMatchesCompleted = currentRound.matches.every((m: any) => m.status === 'completed');
    if (allMatchesCompleted) {
      const nextRoundNumber = currentRound.roundNumber + 1;
      updates['tournament.currentRound'] = nextRoundNumber;
      updates['tournament.stage'] = 'round_in_progress';
      const updatedBracket = activateRoundMatches(bracket, nextRoundNumber);
      updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket: updatedBracket }).bracket;
    } else {
      updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket }).bracket;
    }
  }

  await writeChallengeFields(challengeId, updates, { currentData: data });

  if (currentRoundIndex === bracket.length - 1) {
    const completedMatch = bracket[currentRoundIndex]?.matches[matchIndex];
    if (completedMatch) {
      try {
        await invokeApplyMatchStats({ challengeId });
      } catch (e) {
        console.error('applyMatchStats failed (tournament admin)', e);
      }
    }
  }

  // Mark dispute resolved (best-effort; disputeId may be missing for older conflicts)
  if (disputeId) {
    try {
      await updateDoc(doc(db, 'tournament_disputes', disputeId), {
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        resolvedByUid: adminUid || null,
        resolvedByEmail: adminEmail || null,
        winnerWallet,
      } as any);
    } catch (e) {
      console.warn('⚠️ Failed to mark tournament dispute resolved (non-critical):', e);
    }
  }
};

/**
 * Submit a tournament match result
 * Only advances bracket when both players have submitted matching results
 */
export const submitTournamentMatchResult = async (
  challengeId: string,
  matchId: string,
  playerWallet: string,
  didWin: boolean
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }

    const data = snap.data() as ChallengeData;
    const tournament = data.tournament;
    
    if (!tournament || !tournament.bracket) {
      throw new Error('Tournament bracket not found');
    }

    const bracket = deepCloneBracket(tournament.bracket);
    let matchFound = false;
    let currentRoundIndex = -1;
    let matchIndex = -1;
    let match: BracketMatch | null = null;

    // Find the match
    for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
      const round = bracket[roundIdx];
      for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
        const m = round.matches[matchIdx];
        if (m.id === matchId) {
          // Create a mutable copy to avoid const assignment issues
          match = { ...m };
          matchFound = true;
          currentRoundIndex = roundIdx;
          matchIndex = matchIdx;
          // Update the bracket array with the mutable match
          bracket[roundIdx].matches[matchIdx] = match;
          break;
        }
      }
      if (matchFound) break;
    }

    if (!matchFound || !match) {
      throw new Error('Match not found in bracket');
    }

    // Verify player is in this match
    const isPlayer1 = match.player1?.toLowerCase() === playerWallet.toLowerCase();
    const isPlayer2 = match.player2?.toLowerCase() === playerWallet.toLowerCase();
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Player is not a participant in this match');
    }

    // CRITICAL: Check if match is already completed - prevent duplicate processing
    if (match.status === 'completed') {
      console.log('⚠️ Match already completed - skipping duplicate submission');
      return; // Idempotent: already processed
    }

    // Check if player has already submitted their result
    const existingResult = isPlayer1 ? match.player1Result : match.player2Result;
    
    // Record player's submission (even if already submitted, to ensure we have latest data)
    const result: 'win' | 'loss' = didWin ? 'win' : 'loss';
    if (isPlayer1) {
      match.player1Result = result;
    } else {
      match.player2Result = result;
    }

    // Check if both players have submitted
    let bothSubmitted = match.player1Result !== undefined && match.player2Result !== undefined;
    
    console.log('🔍 Submission check:', {
      matchId,
      isPlayer1,
      existingResult,
      player1Result: match.player1Result,
      player2Result: match.player2Result,
      bothSubmitted,
      matchStatus: match.status
    });
    
    // CRITICAL FIX: Auto-determine winner if player submitted "I lost" (concede)
    // Same logic as standard challenges - if one player concedes, opponent wins automatically
    // MUST check this BEFORE the early return for existing submissions
    if (!bothSubmitted && (match.player1Result === 'loss' || match.player2Result === 'loss')) {
      // One player submitted loss - automatically mark opponent as winner
      const opponentWallet = isPlayer1 ? match.player2 : match.player1;
      const opponentResult = isPlayer1 ? match.player2Result : match.player1Result;
      
      console.log('🔍 Auto-complete check:', {
        playerWallet: playerWallet.slice(0, 8),
        isPlayer1,
        player1Result: match.player1Result,
        player2Result: match.player2Result,
        opponentWallet: opponentWallet?.slice(0, 8),
        opponentResult,
        bothSubmitted,
        isFinal: currentRoundIndex === bracket.length - 1
      });
      
      if (opponentWallet && opponentResult === undefined) {
        // Opponent hasn't submitted yet - automatically mark them as winner
        console.log(`🎯 Player ${playerWallet.slice(0, 8)}... submitted loss - automatically marking ${opponentWallet.slice(0, 8)}... as winner`);
        
        // CRITICAL: Ensure match is in-progress before auto-completing
        // This ensures the other player can see the match before it completes
        if (match.status !== 'in-progress' && match.status !== 'ready') {
          if (match.player1 && match.player2) {
            match.status = 'in-progress';
            if (!match.startedAt) {
              match.startedAt = Timestamp.now();
            }
            console.log('✅ Match status set to in-progress before auto-completion');
          }
        }
        
        // Add automatic win result for opponent
        if (isPlayer1) {
          match.player2Result = 'win';
        } else {
          match.player1Result = 'win';
        }
        
        // Now both players have "submitted" (one manually, one auto), process completion
        bothSubmitted = true;
        console.log('✅ Auto-marked opponent as winner - processing match completion', {
          player1Result: match.player1Result,
          player2Result: match.player2Result,
          isFinal: currentRoundIndex === bracket.length - 1
        });
        // Continue to process completion below - don't return here
      } else {
        // Opponent already submitted or not found - just save and wait
        console.log('⚠️ Auto-complete skipped:', {
          opponentWallet: opponentWallet?.slice(0, 8),
          opponentResult,
          reason: opponentResult !== undefined ? 'opponent already submitted' : 'opponent not found'
        });
        const updates: any = {
          'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
          updatedAt: serverTimestamp(),
        };
        await writeChallengeFields(challengeId, updates);
        console.log('✅ Match result submitted, waiting for opponent...', {
          player1Result: match.player1Result,
          player2Result: match.player2Result
        });
        return;
      }
    }
    
    // Update the bracket array with the modified match before re-checking
    if (matchFound && currentRoundIndex >= 0 && matchIndex >= 0) {
      bracket[currentRoundIndex].matches[matchIndex] = match;
    }
    
    // Re-check bothSubmitted after auto-complete (it may have changed)
    const finalBothSubmitted = match.player1Result !== undefined && match.player2Result !== undefined;
    
    // If both players have submitted (either manually or via auto-complete), process completion
    if (!finalBothSubmitted) {
      // Only one player has submitted - just save the result and wait
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        updatedAt: serverTimestamp(),
      };
      await writeChallengeFields(challengeId, updates);
      console.log('✅ Match result submitted, waiting for opponent...', {
        player1Result: match.player1Result,
        player2Result: match.player2Result
      });
      return;
    }
    
    // CRITICAL: Ensure match is in-progress before processing completion
    // This ensures both players can see the submit button before match completes
    if (match.status !== 'in-progress' && match.status !== 'ready') {
      if (match.player1 && match.player2) {
        match.status = 'in-progress';
        if (!match.startedAt) {
          match.startedAt = Timestamp.now();
        }
        console.log('✅ Match status set to in-progress before processing completion');
      }
    }
    
    // CRITICAL: Both players have submitted (either manually or via auto-complete) - MUST process completion
    console.log('✅ Both players submitted! Processing match completion...', {
      player1: match.player1,
      player2: match.player2,
      player1Result: match.player1Result,
      player2Result: match.player2Result,
      matchStatus: match.status,
      isFinal: currentRoundIndex === bracket.length - 1
    });

    // Both players have submitted - check if results match
    const player1Won = match.player1Result === 'win';
    const player2Won = match.player2Result === 'win';

    // Determine winner based on submissions
    let winnerWallet: string | null = null;
    if (player1Won && !player2Won && match.player1) {
      // Player1 claims win, Player2 claims loss - Player1 wins
      winnerWallet = match.player1;
    } else if (player2Won && !player1Won && match.player2) {
      // Player2 claims win, Player1 claims loss - Player2 wins
      winnerWallet = match.player2;
    } else if (player1Won && player2Won) {
      // Both claim win - conflict => disputed match
      const dispute: Omit<TournamentMatchDispute, 'id'> = {
        challengeId,
        matchId,
        round: match.round,
        slot: match.slot,
        player1: match.player1 || '',
        player2: match.player2 || '',
        player1Result: 'win',
        player2Result: 'win',
        createdAt: Timestamp.now(),
        status: 'open',
      };
      const disputeRef = await addDoc(collection(db, 'tournament_disputes'), dispute as any);
      match.status = 'disputed';
      match.disputeId = disputeRef.id;
      match.disputedAt = Timestamp.now();
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        updatedAt: serverTimestamp(),
      };
      await writeChallengeFields(challengeId, updates);
      await postChallengeSystemMessage(challengeId, `🔴 Tournament match ${matchId} is disputed (both players claimed win). Admin review required.`);
      return;
    } else if (!player1Won && !player2Won) {
      // Both claim loss - conflict => disputed match
      const dispute: Omit<TournamentMatchDispute, 'id'> = {
        challengeId,
        matchId,
        round: match.round,
        slot: match.slot,
        player1: match.player1 || '',
        player2: match.player2 || '',
        player1Result: 'loss',
        player2Result: 'loss',
        createdAt: Timestamp.now(),
        status: 'open',
      };
      const disputeRef = await addDoc(collection(db, 'tournament_disputes'), dispute as any);
      match.status = 'disputed';
      match.disputeId = disputeRef.id;
      match.disputedAt = Timestamp.now();
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        updatedAt: serverTimestamp(),
      };
      await writeChallengeFields(challengeId, updates);
      await postChallengeSystemMessage(challengeId, `🔴 Tournament match ${matchId} is disputed (both players claimed loss). Admin review required.`);
      return;
    }

    if (!winnerWallet) {
      throw new Error('Could not determine winner from submissions');
    }

    // CRITICAL: Ensure match is in-progress before completing (for UI consistency)
    // This ensures the submit button was visible to both players
    if (match.status !== 'in-progress' && match.status !== 'ready') {
      console.warn('⚠️ Match status was not in-progress/ready before completion:', match.status);
      // Set to in-progress if it wasn't already (shouldn't happen, but safety check)
      if (match.player1 && match.player2) {
        match.status = 'in-progress';
        if (!match.startedAt) {
          match.startedAt = Timestamp.now();
        }
        console.log('✅ Match status set to in-progress before completion');
      }
    }
    
    // Mark match as completed
    match.winner = winnerWallet;
    match.status = 'completed';
    match.completedAt = Timestamp.now();

    // Advance winner to next round
    const currentRound = bracket[currentRoundIndex];
    if (!currentRound) {
      throw new Error('Current round not found');
    }

    // Check if this is the final round
    if (currentRoundIndex === bracket.length - 1) {
      // This is the final - tournament is complete
      console.log('🏆 Final round match completed! Determining champion...', {
        winnerWallet,
        currentRoundIndex,
        bracketLength: bracket.length
      });
      
      // CRITICAL: Double-check tournament isn't already completed (race condition guard)
      const finalSnap = await getDoc(challengeRef);
      if (finalSnap.exists()) {
        const finalData = finalSnap.data() as ChallengeData;
        const finalTournament = finalData.tournament;
        if (finalTournament?.stage === 'completed' || finalData.status === 'completed') {
          console.log('⚠️ Tournament already completed - skipping duplicate completion');
          return; // Idempotent: already completed
        }
      }
      
      // Calculate prize pool for champion
      const entryFee = data.entryFee || 0;
      const participantSlots =
        data.maxPlayers ?? bracket[0]?.matches?.length ?? 2;
      const totalPrize = entryFee * participantSlots;
      const platformFee = totalPrize * 0.05;
      const prizePool = totalPrize - platformFee;
      
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        'tournament.champion': winnerWallet,
        'tournament.stage': 'completed',
        'tournament.completedAt': serverTimestamp(), // Record when tournament was completed
        'tournament.currentRound': bracket.length, // Ensure currentRound is set to final round
        'status': 'completed',
        'resolutionType': 'auto',
        'winner': winnerWallet,
        'prizePool': prizePool,
        'canClaim': true, // Enable prize claiming for the champion
        'needsPayout': true,
        'payoutTriggered': false,
        'payoutStatus': 'pending',
        updatedAt: serverTimestamp(),
      };

      await writeChallengeFields(challengeId, updates);
      console.log('✅ Tournament completed! Champion:', winnerWallet, '- Reward claiming enabled');
      console.log('💰 Prize pool:', prizePool, 'USDFG');
      console.log('📊 Final tournament state:', {
        champion: winnerWallet,
        stage: 'completed',
        currentRound: bracket.length
      });
      try {
        await invokeApplyMatchStats({ challengeId });
      } catch (e) {
        console.error('applyMatchStats failed (tournament auto)', e);
      }
      return;
    }

    // Advance to next round
    const nextRound = bracket[currentRoundIndex + 1];
    if (!nextRound) {
      throw new Error('Next round not found');
    }

    // Calculate which slot in the next round this winner should go to
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];
    
    if (!nextMatch) {
      throw new Error('Next round match not found');
    }

    // Determine if winner goes to player1 or player2 slot
    if (matchIndex % 2 === 0) {
      nextMatch.player1 = winnerWallet;
    } else {
      nextMatch.player2 = winnerWallet;
    }

    // Check if all matches in current round are completed
    const allMatchesCompleted = currentRound.matches.every(m => m.status === 'completed');
    
    // Update tournament state
    const updates: any = {
      'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
      updatedAt: serverTimestamp(),
    };

    // If both players are set in next match, mark it as ready and activate it
    if (nextMatch.player1 && nextMatch.player2) {
      const nextRoundNumber = currentRound.roundNumber + 1;
      
      // CRITICAL: If this is the final round, set to in-progress immediately
      if (nextRoundNumber === bracket.length) {
        nextMatch.status = 'in-progress';
        if (!nextMatch.startedAt) {
          nextMatch.startedAt = Timestamp.now();
        }
        console.log(`✅ Final round match ${nextMatch.id} set to in-progress (both players set)`);
        
        // Also ensure currentRound is updated if not already
        if (tournament.currentRound < nextRoundNumber) {
          updates['tournament.currentRound'] = nextRoundNumber;
          updates['tournament.stage'] = 'round_in_progress';
          console.log(`✅ Updated currentRound to final round: ${nextRoundNumber}`);
        }
      } else {
        // Non-final round: set to ready first, will be activated when round advances
        nextMatch.status = 'ready';
        if (nextRoundNumber === tournament.currentRound) {
          nextMatch.status = 'in-progress';
          nextMatch.startedAt = Timestamp.now();
          console.log(`✅ Activated match in round ${nextRoundNumber} to in-progress`);
        }
      }
    }

    // If all matches in current round are done, advance to next round
    if (allMatchesCompleted) {
      const nextRoundNumber = currentRound.roundNumber + 1;
      updates['tournament.currentRound'] = nextRoundNumber;
      updates['tournament.stage'] = 'round_in_progress';
      console.log(`✅ Advancing to round ${nextRoundNumber} (final: ${nextRoundNumber === bracket.length})`);
      
      // Activate next round matches - this sets status to 'in-progress' if both players are set
      const updatedBracket = activateRoundMatches(bracket, nextRoundNumber);
      updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket: updatedBracket }).bracket;
      
      // CRITICAL: If final round match has both players, ensure it's in-progress
      if (nextRoundNumber === bracket.length) {
        const finalRound = updatedBracket.find(r => r.roundNumber === nextRoundNumber);
        if (finalRound) {
          for (const match of finalRound.matches) {
            if (match.player1 && match.player2 && match.status !== 'completed') {
              match.status = 'in-progress';
              if (!match.startedAt) {
                match.startedAt = Timestamp.now();
              }
              console.log(`✅ Final round match ${match.id} set to in-progress`);
            }
          }
          updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket: updatedBracket }).bracket;
        }
      }
    }
    
    // CRITICAL FIX: Also check if we're already in a situation where Round 1 is done but currentRound wasn't updated
    // This handles existing tournaments that are stuck in this state
    // ALSO fix if final round has both players but status is "ready" - should be "in-progress"
    if (tournament.currentRound === 1 && bracket.length >= 2) {
      const round1 = bracket.find(r => r.roundNumber === 1);
      const round2 = bracket.find(r => r.roundNumber === 2);
      if (round1 && round2) {
        const round1AllCompleted = round1.matches.every(m => m.status === 'completed');
        const round2HasBothPlayers = round2.matches.some(m => m.player1 && m.player2);
        const round2MatchReady = round2.matches.some(m => m.player1 && m.player2 && (m.status === 'ready' || m.status === 'in-progress'));
        
        // Fix if Round 1 is complete OR if Round 2 has both players set (even if Round 1 isn't complete yet)
        if ((round1AllCompleted || round2HasBothPlayers) && round2MatchReady) {
          console.log('🔧 Fixing stuck tournament: Round 2 ready but currentRound not updated');
          updates['tournament.currentRound'] = 2;
          updates['tournament.stage'] = 'round_in_progress';
          
          // Ensure final round matches are in-progress
          for (const match of round2.matches) {
            if (match.player1 && match.player2 && match.status !== 'completed') {
              match.status = 'in-progress';
              if (!match.startedAt) {
                match.startedAt = Timestamp.now();
              }
              console.log(`✅ Fixed final round match ${match.id} to in-progress`);
            }
          }
          updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket }).bracket;
        }
      }
    }
    
    // CRITICAL FIX: Also check if final round match is "ready" but should be "in-progress"
    // This can happen even if currentRound is correct
    if (bracket.length >= 2) {
      const finalRound = bracket.find(r => r.roundNumber === bracket.length);
      if (finalRound) {
        let needsUpdate = false;
        for (const match of finalRound.matches) {
          if (match.player1 && match.player2 && match.status === 'ready') {
            match.status = 'in-progress';
            if (!match.startedAt) {
              match.startedAt = Timestamp.now();
            }
            needsUpdate = true;
            console.log(`✅ Fixed final round match ${match.id} from ready to in-progress`);
          }
        }
        if (needsUpdate) {
          updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket }).bracket;
        }
      }
    }

    await writeChallengeFields(challengeId, updates);
    console.log('✅ Both players submitted - winner advanced to next round:', winnerWallet);
    console.log('✅ Tournament state updated:', {
      currentRound: updates['tournament.currentRound'] || tournament.currentRound,
      stage: updates['tournament.stage'] || tournament.stage,
      bracketLength: bracket.length
    });
  } catch (error) {
    console.error('❌ Error submitting tournament match result:', error);
    throw error;
  }
};

/**
 * Join a tournament by adding a player to the tournament and filling the next available bracket slot
 */
/**
 * After paid tournament fills, call with Connection to verify escrow (joiner deposits) then set status active.
 */
export async function verifyPaidTournamentEscrowAndActivate(
  challengeId: string,
  connection: import('@solana/web3.js').Connection
): Promise<boolean> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return false;

  const data = snap.data() as ChallengeData;
  const entryFee = Number(data.entryFee ?? 0);
  if (entryFee <= CHALLENGE_CONFIG.MIN_ENTRY_FEE) return false;

  const format = data.format || (data.tournament ? 'tournament' : 'standard');
  if (format !== 'tournament' || !data.tournament) return false;

  const maxPlayers = data.tournament.maxPlayers || data.maxPlayers || 0;
  const players = Array.isArray(data.players) ? data.players : [];
  if (!maxPlayers || players.length < maxPlayers) return false;

  const pda = typeof data.pda === 'string' ? data.pda.trim() : '';
  if (!pda || pda.length < 32) {
    throw new Error('Paid tournament cannot activate without challenge PDA');
  }

  const { PublicKey } = await import('@solana/web3.js');
  const { getAccount } = await import('@solana/spl-token');
  const { PROGRAM_ID, USDFG_MINT, SEEDS } = await import('../chain/config');

  const challengePk = new PublicKey(pda);
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengePk.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );

  const escrowAcct = await getAccount(connection, escrowTokenAccountPDA);
  const escrowLamports = Number(escrowAcct.amount);
  const joinerSlots = Math.max(0, players.length - 1);
  const minLamports = Math.floor(entryFee * Math.pow(10, 9)) * joinerSlots;
  if (escrowLamports < minLamports) {
    throw new Error(
      `Tournament escrow underfunded: need at least ${(minLamports / Math.pow(10, 9)).toFixed(9)} USDFG from joiners, have ${(escrowLamports / Math.pow(10, 9)).toFixed(9)} USDFG`
    );
  }

  if (data.status === 'active') return true;

  await writeChallengeFields(
    challengeId,
    { status: 'active', updatedAt: serverTimestamp() },
    { currentData: data }
  );
  return true;
}

export const joinTournament = async (
  challengeId: string,
  playerWallet: string
): Promise<{ becameFull: boolean }> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }

    const data = snap.data() as ChallengeData;
    
    // Verify it's a tournament
    const format = data.format || (data.tournament ? 'tournament' : 'standard');
    if (format !== 'tournament') {
      throw new Error('This is not a tournament challenge');
    }

    const tournament = data.tournament;
    if (!tournament) {
      throw new Error('Tournament data not found');
    }

    // Check if tournament is in waiting_for_players stage
    if (tournament.stage !== 'waiting_for_players') {
      throw new Error(`Tournament is not accepting new players. Current stage: ${tournament.stage}`);
    }

    // Get current players
    const currentPlayers = Array.isArray(data.players) ? data.players : [];
    const maxPlayers = tournament.maxPlayers || currentPlayers.length;

    // Check if player is already in tournament
    const isAlreadyPlayer = currentPlayers.some(
      (p: string) => p && p.toLowerCase() === playerWallet.toLowerCase()
    );
    if (isAlreadyPlayer) {
      throw new Error('You are already in this tournament');
    }

    // Check if tournament is full
    if (currentPlayers.length >= maxPlayers) {
      throw new Error('Tournament is full');
    }

    // Check if creator is trying to join their own tournament
    const isCreator = data.creator.toLowerCase() === playerWallet.toLowerCase();
    if (isCreator) {
      throw new Error('Cannot join your own tournament');
    }

    // Add player to players array
    const updatedPlayers = [...currentPlayers, playerWallet];

    // Find next empty slot in bracket and fill it
    const bracket = deepCloneBracket(tournament.bracket);
    const firstRound = bracket[0];
    if (!firstRound) {
      throw new Error('Tournament bracket not found');
    }

    let slotFilled = false;
    for (const match of firstRound.matches) {
      if (!match.player1) {
        match.player1 = playerWallet;
        slotFilled = true;
        break;
      } else if (!match.player2) {
        match.player2 = playerWallet;
        slotFilled = true;
        break;
      }
    }

    if (!slotFilled) {
      throw new Error('No available slots in tournament bracket');
    }

    // Update match status if both players are now set
    firstRound.matches.forEach(match => {
      const hasBoth = Boolean(match.player1 && match.player2);
      if (hasBoth && match.status === 'waiting') {
        match.status = 'ready';
      }
    });

    // Check if tournament is now full
    const isFull = updatedPlayers.length >= maxPlayers;
    const newStage: TournamentStage = isFull ? 'round_in_progress' : 'waiting_for_players';

    // If tournament is full, activate first round matches
    let finalBracket = bracket;
    if (isFull) {
      finalBracket = activateRoundMatches(bracket, 1);
    }

    // Update tournament state
    const updatedTournament: TournamentState = {
      ...tournament,
      bracket: sanitizeTournamentState({ ...tournament, bracket: finalBracket }).bracket,
      stage: newStage,
    };

    // Update challenge document
    const updates: any = {
      players: updatedPlayers,
      'tournament.bracket': updatedTournament.bracket,
      'tournament.stage': updatedTournament.stage,
      updatedAt: serverTimestamp(),
    };

    // Paid tournaments: escrow must be verified on-chain before status becomes active (see verifyPaidTournamentEscrowAndActivate).
    const entryFee = Number(data.entryFee ?? 0);
    const isPaid = entryFee > CHALLENGE_CONFIG.MIN_ENTRY_FEE;
    if (isFull && !isPaid) {
      updates.status = 'active';
    }

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      actingWallet: playerWallet,
    });
    console.log(`✅ Player ${playerWallet.slice(0, 8)}... joined tournament. ${updatedPlayers.length}/${maxPlayers} players`);
    return { becameFull: isFull };
  } catch (error) {
    console.error('❌ Error joining tournament:', error);
    throw error;
  }
};

/**
 * DEV/TEST ONLY: Fill a 16-player tournament bracket with the creator + 15 test wallet addresses.
 * Use this to test the full bracket flow without 16 real players.
 * Only the challenge creator should call this; typically gated by isCreator in the UI.
 */
export const devFillTournamentWithTestPlayers = async (
  challengeId: string,
  creatorWallet: string,
  testPlayerAddresses: string[]
): Promise<void> => {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) throw new Error('Challenge not found');

  const data = snap.data() as ChallengeData;
  const entryFeeDev = Number(data.entryFee ?? 0);
  if (entryFeeDev > CHALLENGE_CONFIG.MIN_ENTRY_FEE) {
    throw new Error('devFillTournamentWithTestPlayers is only allowed for free (entry fee ~ 0) tournaments');
  }
  const tournament = data.tournament;
  const format = data.format || (data.tournament ? 'tournament' : 'standard');
  if (format !== 'tournament' || !tournament?.bracket) {
    throw new Error('This is not a tournament or bracket is missing');
  }
  if (tournament.stage !== 'waiting_for_players') {
    throw new Error('Tournament is not in waiting_for_players stage');
  }
  const creator = (data.creator || '').toLowerCase();
  if (creator !== creatorWallet.toLowerCase()) {
    throw new Error('Only the challenge creator can fill test players');
  }

  const maxPlayers = tournament.maxPlayers || 16;
  if (testPlayerAddresses.length !== maxPlayers - 1) {
    throw new Error(`Provide exactly ${maxPlayers - 1} test addresses for a ${maxPlayers}-player tournament`);
  }

  const players = [creatorWallet, ...testPlayerAddresses];
  const bracket = deepCloneBracket(tournament.bracket);
  const seededBracket = seedPlayersIntoBracket(bracket, players);
  const finalBracket = activateRoundMatches(seededBracket, 1);

  await writeChallengeFields(
    challengeId,
    {
      players,
      'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket: finalBracket }).bracket,
      'tournament.stage': 'round_in_progress',
      status: 'active',
      updatedAt: serverTimestamp(),
    },
    { currentData: data }
  );
  console.log(`✅ [DEV] Filled tournament with ${players.length} test players (creator + ${testPlayerAddresses.length} test)`);
};

/**
 * Advance a tournament bracket winner to the next round
 * Marks the current match as completed and moves the winner to the next round's match
 * @deprecated Use submitTournamentMatchResult instead. Exposed for dev/testing (Set winner without both submissions).
 */
export const advanceBracketWinner = async (
  challengeId: string,
  matchId: string,
  winnerWallet: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }

    const data = snap.data() as ChallengeData;
    const tournament = data.tournament;
    
    if (!tournament || !tournament.bracket) {
      throw new Error('Tournament bracket not found');
    }

    const bracket = deepCloneBracket(tournament.bracket);
    let matchFound = false;
    let currentRoundIndex = -1;
    let matchIndex = -1;

    // Find the match and mark it as completed
    for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
      const round = bracket[roundIdx];
      for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
        const match = round.matches[matchIdx];
        if (match.id === matchId) {
          // Verify the winner is actually in this match
          const isPlayer1 = match.player1?.toLowerCase() === winnerWallet.toLowerCase();
          const isPlayer2 = match.player2?.toLowerCase() === winnerWallet.toLowerCase();
          
          if (!isPlayer1 && !isPlayer2) {
            throw new Error('Winner is not a participant in this match');
          }

          // Mark match as completed
          match.winner = winnerWallet;
          match.status = 'completed';
          match.completedAt = Timestamp.now();
          
          matchFound = true;
          currentRoundIndex = roundIdx;
          matchIndex = matchIdx;
          break;
        }
      }
      if (matchFound) break;
    }

    if (!matchFound) {
      throw new Error('Match not found in bracket');
    }

    // Advance winner to next round
    const currentRound = bracket[currentRoundIndex];
    if (!currentRound) {
      throw new Error('Current round not found');
    }

    // Check if this is the final round
    if (currentRoundIndex === bracket.length - 1) {
      // This is the final - tournament is complete
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        'tournament.champion': winnerWallet,
        'tournament.stage': 'completed',
        'tournament.completedAt': serverTimestamp(), // Record when tournament was completed
        'status': 'completed',
        'resolutionType': 'auto',
        'canClaim': true, // Enable prize claiming for the champion
        updatedAt: serverTimestamp(),
        ...escrowTournamentClaimGatePatch(data),
      };

      await writeChallengeFields(challengeId, updates);
      console.log('✅ Tournament completed! Champion:', winnerWallet, '- Reward claiming enabled');
      const completedMatch = currentRound.matches[matchIndex];
      if (completedMatch) {
        try {
          await invokeApplyMatchStats({ challengeId });
        } catch (e) {
          console.error('applyMatchStats failed (tournament complete)', e);
        }
      }
      return;
    }

    // Advance to next round
    const nextRound = bracket[currentRoundIndex + 1];
    if (!nextRound) {
      throw new Error('Next round not found');
    }

    // Calculate which slot in the next round this winner should go to
    // In a bracket, match 0 winner goes to slot 0, match 1 winner goes to slot 1, etc.
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];
    
    if (!nextMatch) {
      throw new Error('Next round match not found');
    }

    // Determine if winner goes to player1 or player2 slot
    // Even match indices (0, 2, 4...) go to player1, odd (1, 3, 5...) go to player2
    if (matchIndex % 2 === 0) {
      nextMatch.player1 = winnerWallet;
    } else {
      nextMatch.player2 = winnerWallet;
    }

    // If both players are set, mark the next match as ready
    if (nextMatch.player1 && nextMatch.player2) {
      nextMatch.status = 'ready';
    }

    // Check if all matches in current round are completed
    const allMatchesCompleted = currentRound.matches.every(m => m.status === 'completed');
    
    // Update tournament state
    const updates: any = {
      'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
      updatedAt: serverTimestamp(),
    };

    // If all matches in current round are done, advance to next round
    if (allMatchesCompleted) {
      const nextRoundNumber = currentRound.roundNumber + 1;
      updates['tournament.currentRound'] = nextRoundNumber;
      updates['tournament.stage'] = 'round_in_progress';
      
      // Activate next round matches
      const updatedBracket = activateRoundMatches(bracket, nextRoundNumber);
      updates['tournament.bracket'] = sanitizeTournamentState({ ...tournament, bracket: updatedBracket }).bracket;
    }

    await writeChallengeFields(challengeId, updates);
    console.log('✅ Winner advanced to next round:', winnerWallet);
  } catch (error) {
    console.error('❌ Error advancing bracket winner:', error);
    throw error;
  }
};

/**
 * Mark a tournament match loser as eliminated
 * This is called when a player submits a loss
 */
export const markTournamentMatchLoser = async (
  challengeId: string,
  matchId: string,
  loserWallet: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }

    const data = snap.data() as ChallengeData;
    const tournament = data.tournament;
    
    if (!tournament || !tournament.bracket) {
      throw new Error('Tournament bracket not found');
    }

    const bracket = deepCloneBracket(tournament.bracket);
    let matchFound = false;

    // Find the match and verify the loser is in it
    for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
      const round = bracket[roundIdx];
      for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
        const match = round.matches[matchIdx];
        if (match.id === matchId) {
          // Verify the loser is actually in this match
          const isPlayer1 = match.player1?.toLowerCase() === loserWallet.toLowerCase();
          const isPlayer2 = match.player2?.toLowerCase() === loserWallet.toLowerCase();
          
          if (!isPlayer1 && !isPlayer2) {
            throw new Error('Loser is not a participant in this match');
          }

          // If match is already completed, don't do anything
          if (match.status === 'completed') {
            console.log('Match already completed, skipping loser mark');
            return;
          }

          // Match will be completed when winner submits via advanceBracketWinner
          // For now, we just log that loser submitted
          matchFound = true;
          break;
        }
      }
      if (matchFound) break;
    }

    if (!matchFound) {
      throw new Error('Match not found in bracket');
    }

    // Update tournament state (bracket will be updated when winner submits)
    const updates: any = {
      'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
      updatedAt: serverTimestamp(),
    };

    await writeChallengeFields(challengeId, updates);
    console.log('✅ Loser marked in tournament match:', loserWallet);
  } catch (error) {
    console.error('❌ Error marking tournament match loser:', error);
    throw error;
  }
};

export type LockNotificationStatus = 'pending' | 'accepted' | 'cancelled' | 'completed';

export interface LockNotification {
  id: string;
  matchId: string;
  initiator?: string;
  target?: string;
  initiatorDisplayName?: string;
  targetDisplayName?: string;
  participants?: string[];
  status: LockNotificationStatus;
  lastActionBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type ChallengeNotificationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ChallengeNotification {
  id: string;
  challengeId: string;
  creator: string;
  targetPlayer: string;
  creatorDisplayName?: string;
  targetDisplayName?: string;
  challengeTitle?: string;
  entryFee?: number;
  prizePool?: number;
  status: ChallengeNotificationStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Challenge operations
export const addChallenge = async (challengeData: Omit<ChallengeData, 'id' | 'createdAt'>) => {
  try {
    const creatorUid = await ensureFirebaseSignedIn();
    const creatorWallet = challengeData.creator;
    const creatorKey = normalizeWinnerWallet(creatorWallet);
    const playerRef = doc(db, 'player_stats', creatorKey);
    const playerSnap = await getDoc(playerRef);
    
    const initialPlayers = Array.isArray(challengeData.players)
      ? challengeData.players
      : [challengeData.creator];

    const challengePayload: any = {
      ...challengeData,
      createdAt: Timestamp.now(),
      players: initialPlayers,
    };

    Object.keys(challengePayload).forEach((key) => {
      if (challengePayload[key] === undefined) {
        delete challengePayload[key];
      }
    });

    const resolvedFormat: 'standard' | 'tournament' =
      challengePayload.format === 'tournament' || challengePayload.tournament
        ? 'tournament'
        : 'standard';
    challengePayload.format = resolvedFormat;

    const resolvedMaxPlayers =
      challengePayload.maxPlayers ||
      (resolvedFormat === 'tournament'
        ? challengePayload.tournament?.maxPlayers || 8
        : 2);
    challengePayload.maxPlayers = resolvedMaxPlayers;

    if (resolvedFormat === 'tournament') {
      const tournamentState = ensureTournamentState(
        challengePayload.tournament,
        resolvedMaxPlayers
      );
      tournamentState.bracket = seedPlayersIntoBracket(
        tournamentState.bracket,
        challengePayload.players
      );
      tournamentState.stage = 'waiting_for_players';
      tournamentState.currentRound = 1;
      challengePayload.tournament = sanitizeTournamentState(tournamentState);
    } else {
      delete challengePayload.tournament;
    }

    // Validate required fields before adding
    if (!challengePayload.creator) {
      throw new Error("Creator wallet is required");
    }
    if (challengePayload.entryFee === undefined || challengePayload.entryFee === null) {
      throw new Error("Challenge amount is required");
    }
    if (!challengePayload.status) {
      throw new Error("Status is required");
    }
    if (!challengePayload.createdAt) {
      throw new Error("CreatedAt timestamp is required");
    }

    challengePayload.creatorWallet = challengePayload.creator;
    challengePayload.createdByUid = creatorUid;
    challengePayload.playersUid = initialPlayers.map((w) =>
      creatorUid && walletEq(w, challengePayload.creator) ? creatorUid : null
    );
    
    console.log("🔥 Adding challenge to Firestore with payload:", {
      creator: challengePayload.creator,
      entryFee: challengePayload.entryFee,
      status: challengePayload.status,
      format: challengePayload.format,
      maxPlayers: challengePayload.maxPlayers,
      hasTournament: !!challengePayload.tournament
    });
    
    const docRef = await addDoc(collection(db, "challenges"), challengePayload);
    console.log('CHALLENGE WRITE:', {
      challengeId: docRef.id,
      uid: creatorUid,
      wallet: creatorWallet,
    });
    
    // OG First 2.1K (server decides eligibility + writes player_stats) — best-effort; never blocks create
    if (!playerSnap.exists()) {
      const r = await invokeUpdatePlayerMeta({
        wallet: creatorWallet,
        awardOgFirst1kIfEligible: true,
      });
      if (!r.skipped && r.ok && import.meta.env.DEV) {
        console.log(
          `🏆 OG First 2.1K handled on server for ${creatorWallet.slice(0, 8)}... (callable ok=${r.ok})`
        );
      }
    }
    
    // If challenge has a targetPlayer, create a notification
    if (challengeData.targetPlayer) {
      try {
        // Get creator display name
        const creatorStats = await getDoc(playerRef);
        const creatorDisplayName = creatorStats.exists() ? creatorStats.data()?.displayName : undefined;
        
        // Get target player display name
        const targetPlayerRef = doc(db, 'player_stats', challengeData.targetPlayer);
        const targetPlayerStats = await getDoc(targetPlayerRef);
        const targetDisplayName = targetPlayerStats.exists() ? targetPlayerStats.data()?.displayName : undefined;
        
        await upsertChallengeNotification({
          challengeId: docRef.id,
          creator: creatorWallet,
          targetPlayer: challengeData.targetPlayer,
          creatorDisplayName,
          targetDisplayName,
          challengeTitle: challengeData.title,
          entryFee: challengeData.entryFee,
          prizePool: challengeData.prizePool,
          status: 'pending',
        });
        console.log(`✅ Challenge notification sent to ${challengeData.targetPlayer.slice(0, 8)}...`);
      } catch (error) {
        console.error('❌ Failed to create challenge notification:', error);
        // Don't throw - challenge was created successfully
      }
    }
    
    console.log('✅ Challenge created with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Error creating challenge:', error);
    
    // Log detailed error information
    if (error?.code) {
      console.error('❌ Firebase error code:', error.code);
    }
    if (error?.message) {
      console.error('❌ Error message:', error.message);
    }
    if (error?.details) {
      console.error('❌ Error details:', error.details);
    }
    
    // Provide more helpful error messages
    if (error?.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore rules.');
    } else if (error?.code === 'invalid-argument') {
      throw new Error('Invalid challenge data. Please check all required fields.');
    } else if (error?.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to create challenge. Please try again.');
    }
  }
};

export const updateChallenge = async (challengeId: string, updates: Partial<ChallengeData>) => {
  try {
    await writeChallengeFields(challengeId, updates as Record<string, any>);
    console.log('✅ Challenge updated:', challengeId);
  } catch (error) {
    console.error('❌ Error updating challenge:', error);
    throw error;
  }
};

export const updateChallengeStatus = async (challengeId: string, status: 'pending_waiting_for_opponent' | 'creator_confirmation_required' | 'creator_funded' | 'active' | 'awaiting_auto_resolution' | 'completed' | 'cancelled' | 'disputed' | 'expired') => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    // Get current status to check if dispute is being resolved
    const currentSnap = await getDoc(challengeRef);
    const wasDisputed = currentSnap.exists() && currentSnap.data()?.status === 'disputed';
    const isResolvingDispute = wasDisputed && (status === 'completed' || status === 'cancelled');
    
    await writeChallengeFields(challengeId, { 
      status,
      updatedAt: Timestamp.now()
    });
    console.log('✅ Challenge status updated:', challengeId, 'to', status);
    
    // If resolving a dispute, clean up chat messages (no longer needed for evidence)
    if (isResolvingDispute) {
      console.log('🔧 Dispute resolved - cleaning up chat messages for:', challengeId);
      try {
        await cleanupChatMessages(challengeId);
        console.log('✅ Chat messages cleaned up after dispute resolution');
      } catch (error) {
        console.error('⚠️ Failed to cleanup chat after dispute resolution (non-critical):', error);
        // Don't throw - status update succeeded, cleanup is secondary
      }
    }
  } catch (error) {
    console.error('❌ Error updating challenge status:', error);
    throw error;
  }
};

export const deleteChallenge = async (challengeId: string) => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    await deleteDoc(challengeRef);
    console.log('✅ Challenge deleted:', challengeId);
  } catch (error) {
    console.error('❌ Error deleting challenge:', error);
    throw error;
  }
};

const NON_DISMISSIBLE_PRE_FUND_STATUSES = new Set([
  'creator_funded',
  'active',
  'completed',
  'disputed',
  'awaiting_auto_resolution',
]);

function hasFundedOnChainPda(data: ChallengeData): boolean {
  const pda = data.pda;
  if (!pda || typeof pda !== 'string') return false;
  const trimmed = pda.trim();
  return trimmed.length >= 32 && !trimmed.startsWith('founder_');
}

/** Pre-fund challenge the creator may remove (status update — client delete is rules-denied). */
export function canDismissPreFundChallenge(
  data: ChallengeData,
  options?: { allowPendingCancel?: boolean }
): boolean {
  if (hasFundedOnChainPda(data)) return false;
  const status = data.status;
  if (NON_DISMISSIBLE_PRE_FUND_STATUSES.has(status)) return false;
  if (status === 'cancelled') return false;

  const now = Date.now();
  if (status === 'expired') return true;
  if (status === 'creator_confirmation_required') {
    return !!(data.creatorFundingDeadline && data.creatorFundingDeadline.toMillis() < now);
  }
  if (status === 'pending_waiting_for_opponent') {
    if (options?.allowPendingCancel) return true;
    const exp = data.expirationTimer;
    return !!(exp && exp.toMillis() < now);
  }
  return false;
}

/** Mark an expired/unfunded challenge as cancelled so it leaves live lists (no deleteDoc). */
export async function dismissPreFundChallenge(
  challengeId: string,
  actingWallet?: string | null,
  options?: { allowPendingCancel?: boolean }
): Promise<boolean> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return false;
  const data = snap.data() as ChallengeData;

  if (data.status === 'cancelled') return true;

  if (!canDismissPreFundChallenge(data, options)) {
    throw new Error('This challenge cannot be removed in its current state.');
  }

  await writeChallengeFields(
    challengeId,
    {
      status: 'cancelled',
      pendingJoiner: null,
      challenger: null,
      opponentWallet: deleteField(),
      opponentUid: deleteField(),
      creatorFundingDeadline: null,
      joinerFundingDeadline: null,
      updatedAt: Timestamp.now(),
    },
    { currentData: data, actingWallet: actingWallet ?? null, skipParticipantHybridMerge: true }
  );

  console.log('✅ Pre-fund challenge dismissed (cancelled):', challengeId);
  return true;
}

/** Join intent bound on a creator_confirmation_required doc (pending joiner or opponent wallet). */
export function hasCreatorFundingJoinerBound(data: ChallengeData): boolean {
  const pending = data.pendingJoiner;
  if (pending != null && String(pending).trim() !== '') return true;
  const opponent = data.opponentWallet;
  return opponent != null && String(opponent).trim() !== '';
}

function isExpiredCreatorFundingDoc(data: ChallengeData): boolean {
  if (data.status !== 'creator_confirmation_required') return false;
  const deadline = data.creatorFundingDeadline;
  return !!(deadline && deadline.toMillis() < Date.now());
}

/** Creator or bound joiner on a pre-fund challenge (Firestore rules participant). */
export function canActOnChallengeAsParticipant(
  data: ChallengeData,
  actingWallet: string | null | undefined
): boolean {
  if (!actingWallet) return false;
  const w = actingWallet.toLowerCase();
  if (data.creator?.toLowerCase() === w) return true;
  if (data.challenger?.toLowerCase() === w) return true;
  if (data.pendingJoiner?.toLowerCase() === w) return true;
  if (data.opponentWallet?.toLowerCase() === w) return true;
  return false;
}

/**
 * Auto-cancel unfunded creator_confirmation_required when funding deadline passed and a joiner exists.
 * Uses dismissPreFundChallenge() as the sole write path (canDismiss + hasFundedOnChainPda guards).
 */
export async function autoCancelExpiredCreatorFunding(
  challengeId: string,
  actingWallet: string | null | undefined
): Promise<boolean> {
  if (!actingWallet) return false;

  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return false;
  const data = snap.data() as ChallengeData;

  if (data.status === 'cancelled') return true;
  if (!isExpiredCreatorFundingDoc(data)) return false;
  if (!hasCreatorFundingJoinerBound(data)) return false;
  if (!canActOnChallengeAsParticipant(data, actingWallet)) return false;
  if (!canDismissPreFundChallenge(data)) return false;

  try {
    await dismissPreFundChallenge(challengeId, actingWallet);
  } catch (error) {
    console.warn('Auto-cancel skipped:', challengeId, error);
    return false;
  }

  if (data.targetPlayer) {
    try {
      await upsertChallengeNotification({
        challengeId,
        creator: data.creator,
        targetPlayer: data.targetPlayer,
        challengeTitle: data.title,
        entryFee: data.entryFee,
        prizePool: data.prizePool,
        status: 'expired',
      });
    } catch (notifyError) {
      console.warn('Failed to update challenge notification after auto-cancel:', notifyError);
    }
  }

  console.log('✅ Auto-cancelled abandoned creator funding:', challengeId);
  return true;
}

/**
 * One-time repair: completed docs created before 02d51f7f7 may have create-time expiresAt.
 * Rewrites expiresAt to completion + 2h (public activity feed only).
 */
export async function repairLegacyCompletedActivityExpiresAt(
  challengeId: string
): Promise<boolean> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return false;

  const data = snap.data() as ChallengeData;
  const input = { ...data, rawData: data };
  if (!isLegacyCreateTimeExpiresAt(input)) return false;

  const effectiveMs = getCompletedActivityExpiresAtMs(input);
  if (effectiveMs == null) return false;

  const currentMs = data.expiresAt?.toMillis?.() ?? null;
  if (currentMs != null && Math.abs(currentMs - effectiveMs) < 60_000) {
    return false;
  }

  await writeChallengeFields(
    challengeId,
    {
      expiresAt: Timestamp.fromMillis(effectiveMs),
      updatedAt: Timestamp.now(),
    },
    { currentData: data, skipParticipantHybridMerge: true }
  );

  if (import.meta.env.DEV) {
    console.log('[repair] legacy completed expiresAt', challengeId, effectiveMs);
  }
  return true;
}

// Real-time listeners
export const listenToChallenges = (callback: (challenges: ChallengeData[]) => void) => {
  const q = query(collection(db, "challenges"), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('🔄 Real-time update: Received', challenges.length, 'challenges');
    callback(challenges);
  }, (error) => {
    console.error('❌ Firestore listener error:', error);
  });
};

export const listenToUserChallenges = (userId: string, callback: (challenges: ChallengeData[]) => void) => {
  const q = query(
    collection(db, "challenges"), 
    where('creator', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('🔄 User challenges update:', challenges.length, 'challenges');
    callback(challenges);
  }, (error) => {
    console.error('❌ User challenges listener error:', error);
  });
};

/**
 * Real-time listener for recent challenges (e.g. live activity ticker).
 * Returns up to maxCount challenges ordered by createdAt desc.
 */
export const listenToRecentChallenges = (
  maxCount: number,
  callback: (challenges: ChallengeData[]) => void,
  onError?: (error: unknown) => void
) => {
  const q = query(
    collection(db, 'challenges'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    callback(challenges);
  }, (error) => {
    console.error('❌ Recent challenges listener error:', error);
    onError?.(error);
  });
};

// One-time fetch operations
export const fetchChallenges = async (): Promise<ChallengeData[]> => {
  try {
    const q = query(
      collection(db, "challenges"),
      orderBy("createdAt", "desc"),
      limit(RECENT_CHALLENGES_FEED_LIMIT)
    );
    const snapshot = await getDocs(q);
    
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('📦 Fetched', challenges.length, 'challenges');
    return challenges;
  } catch (error) {
    console.error('❌ Error fetching challenges:', error);
    throw error;
  }
};

export const fetchChallengeById = async (challengeId: string): Promise<ChallengeData | null> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snapshot = await getDocs(query(collection(db, "challenges"), where('__name__', '==', challengeId)));
    
    if (snapshot.empty) {
      console.log('❌ Challenge not found:', challengeId);
      return null;
    }
    
    const challenge = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as ChallengeData;
    
    return challenge;
  } catch (error) {
    console.error('❌ Error fetching challenge:', error);
    return null;
  }
};

// Express intent to join challenge - NO PAYMENT REQUIRED
// Moves challenge to creator_confirmation_required state
export const expressJoinIntent = async (challengeId: string, wallet: string, isFounderChallenge: boolean = false, isTeam?: boolean) => {
  try {
    const joinerUid = await ensureFirebaseSignedIn();
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    let data = snap.data() as ChallengeData;
    
    // If status is creator_funded, user needs to fund, not express intent
    if (data.status === 'creator_funded') {
      const challenger = data.challenger;
      if (challenger && challenger.toLowerCase() === wallet.toLowerCase()) {
        throw new Error("Challenge is already funded by creator. Please use the 'Fund Challenge' button to fund your entry and start the match.");
      } else {
      throw new Error(`Challenge is not waiting for opponent. Current status: ${data.status}`);
      }
    }
    
    // Check if creator is trying to join their own challenge (BEFORE status check)
    // BUT: Allow creator to join if deadline expired (even if not yet reverted)
    const isCreator = data.creator.toLowerCase() === wallet.toLowerCase();
    const deadlineExpired = data.creatorFundingDeadline && data.creatorFundingDeadline.toMillis() < Date.now();
    
    if (isCreator) {
      if (deadlineExpired && data.status === 'creator_confirmation_required') {
        const result = await handleExpiredCreatorFundingDeadline(challengeId, wallet);
        const updatedSnap = await getDoc(challengeRef);
        if (updatedSnap.exists()) {
          data = updatedSnap.data() as ChallengeData;
        }
        if (result === 'cancelled') {
          throw new Error('Funding deadline expired. This challenge was cancelled.');
        }
        if (result === 'reverted') {
          console.log('✅ Challenge auto-reverted, creator can now rejoin');
        } else if (data.status === 'pending_waiting_for_opponent') {
          console.log('✅ Challenge already reverted after deadline, creator can now rejoin');
        } else if (!deadlineExpired) {
          throw new Error("Cannot join your own challenge");
        } else {
          throw new Error("Challenge state mismatch. Please refresh and try again.");
        }
      } else if (deadlineExpired && data.status === 'pending_waiting_for_opponent') {
        // Deadline expired and already reverted - creator can rejoin
        console.log('✅ Challenge already reverted after deadline, creator can rejoin');
      } else if (!deadlineExpired) {
        // Deadline not expired - creator cannot join
        throw new Error("Cannot join your own challenge");
      } else {
        // Deadline expired but status is something else - state mismatch
        throw new Error("Challenge state mismatch. Please refresh and try again.");
      }
    }
    
    // Validate challenge is in pending state (after possible auto-revert for creators)
    if (data.status !== 'pending_waiting_for_opponent') {
      throw new Error(`Challenge is not waiting for opponent. Current status: ${data.status}. The challenge may have been reverted. Please refresh and try again.`);
    }
    
    // Check if challenge expired
    if (data.expirationTimer && data.expirationTimer.toMillis() < Date.now()) {
      throw new Error("Challenge has expired");
    }
    
    // Handle team challenges
    if (data.challengeType === 'team' && data.teamOnly === true) {
      const challengerTeam = await getTeamByMember(wallet);
      if (!challengerTeam) {
        throw new Error("This challenge is only open to teams. You must be part of a team to join.");
      }
      const teamKey = challengerTeam.teamKey;
      if (teamKey !== wallet) {
        throw new Error("Only the team key holder can join team challenges. You are a team member, not the key holder.");
      }
      wallet = teamKey;
      isTeam = true;
    } else if (data.challengeType === 'team' && data.teamOnly === false) {
      const challengerTeam = await getTeamByMember(wallet);
      if (challengerTeam) {
        if (challengerTeam.teamKey !== wallet) {
          throw new Error("Only the team key holder can join challenges. You are a team member, not the key holder.");
        }
        wallet = challengerTeam.teamKey;
        isTeam = true;
      }
    }
    
    // Also check if challenger field is set (should be cleared on revert, but double-check)
    if (data.challenger && data.challenger.toLowerCase() === wallet.toLowerCase() && data.status !== 'pending_waiting_for_opponent') {
      throw new Error("You are already part of this challenge");
    }

    // Calculate creator funding deadline (5 minutes from now)
    const creatorFundingDeadline = Timestamp.fromDate(new Date(Date.now() + (5 * 60 * 1000)));

    // Update challenge to express join intent - NO PAYMENT.
    // Deterministic key set (no hybrid merge) so it matches isJoinIntentUpdate() allowlist exactly.
    const updates: any = {
      status: 'creator_confirmation_required',
      pendingJoiner: wallet,
      opponentWallet: wallet,
      opponentUid: joinerUid,
      creatorFundingDeadline,
      updatedAt: serverTimestamp(),
    };

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      actingWallet: wallet,
      actingUid: joinerUid,
      skipParticipantHybridMerge: true,
    });
    
    // CRITICAL: Verify the update was applied
    const verifySnap = await getDoc(challengeRef);
    if (verifySnap.exists()) {
      const verifiedData = verifySnap.data() as ChallengeData;
      console.log('✅ Join intent expressed - Status updated to:', verifiedData.status, 'Pending joiner:', verifiedData.pendingJoiner);
      
      // Double-check the status was actually updated
      if (verifiedData.status !== 'creator_confirmation_required') {
        console.error('❌ Status update failed! Expected creator_confirmation_required, got:', verifiedData.status);
        // Force update again
        await writeChallengeFields(challengeId, { status: 'creator_confirmation_required' });
      }
    }

    // Update challenge notification status if this was a targeted challenge
    if (data.targetPlayer && data.targetPlayer.toLowerCase() === wallet.toLowerCase()) {
      try {
        await upsertChallengeNotification({
          challengeId,
          creator: data.creator,
          targetPlayer: data.targetPlayer,
          status: 'accepted',
        });
        console.log('✅ Challenge notification updated to accepted');
      } catch (error) {
        console.error('❌ Failed to update challenge notification:', error);
        // Don't throw - challenge was joined successfully
      }
    }

    console.log('✅ Join intent expressed successfully (NO PAYMENT):', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error expressing join intent:', error);
    throw error;
  }
};

// Legacy function - kept for backwards compatibility
/** @deprecated Use expressJoinIntent() instead */
export const joinChallenge = expressJoinIntent;

/**
 * Creator funds escrow after joiner expressed intent
 * Moves challenge to creator_funded state
 */
export const creatorFund = async (challengeId: string, wallet: string) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
    // If already funded, return success (idempotent operation)
    if (data.status === 'creator_funded') {
      console.log('✅ Challenge already funded - skipping update (idempotent)');
      return true;
    }
    
    // Validate challenge is in creator_confirmation_required state
    if (data.status !== 'creator_confirmation_required') {
      throw new Error(`Challenge is not waiting for creator funding. Current status: ${data.status}`);
    }
    
    // CRITICAL: Validate that someone has expressed join intent
    if (!data.pendingJoiner) {
      throw new Error("No one has expressed intent to join this challenge yet. Creator can only fund after someone joins.");
    }
    
    // Validate caller is the creator
    if (data.creator.toLowerCase() !== wallet.toLowerCase()) {
      throw new Error("Only the challenge creator can fund the challenge");
    }
    
    // Check if deadline expired
    if (data.creatorFundingDeadline && data.creatorFundingDeadline.toMillis() < Date.now()) {
      throw new Error("Creator funding deadline has expired");
    }
    
    // Calculate joiner funding deadline (5 minutes from now)
    const joinerFundingDeadline = Timestamp.fromDate(new Date(Date.now() + (5 * 60 * 1000)));

    // Update challenge to creator_funded state
    const updates: any = {
      status: 'creator_funded',
      challenger: data.pendingJoiner, // Move pendingJoiner to challenger
      pendingJoiner: null, // Clear pending joiner
      fundedByCreatorAt: Timestamp.now(),
      joinerFundingDeadline,
      updatedAt: serverTimestamp(),
    };

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      actingWallet: wallet,
    });
    
    console.log('✅ Creator funded successfully:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error in creator funding:', error);
    throw error;
  }
};

/**
 * Joiner funds escrow after creator funded
 * Moves challenge to active state
 */
export const joinerFund = async (challengeId: string, wallet: string) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
    // Validate challenge is in creator_funded state
    if (data.status !== 'creator_funded') {
      throw new Error(`Challenge is not waiting for joiner funding. Current status: ${data.status}`);
    }

    // Validate caller is the challenger
    if (!data.challenger || data.challenger.toLowerCase() !== wallet.toLowerCase()) {
      throw new Error("Only the challenger can fund the challenge");
    }
    
    // Check if deadline expired
    if (data.joinerFundingDeadline && data.joinerFundingDeadline.toMillis() < Date.now()) {
      throw new Error("Joiner funding deadline has expired");
    }
    
    const format = data.format || (data.tournament ? 'tournament' : 'standard');
    const maxPlayers = data.maxPlayers || (format === 'tournament' ? data.tournament?.maxPlayers || 8 : 2);
    
    // Now add challenger to players array and activate challenge
    // CRITICAL: Ensure players array includes both creator and challenger
    // If players array exists but is empty, or doesn't include creator, rebuild it
    let newPlayers: string[];
    if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      // Players array exists and has data - add challenger if not already included
      if (!isParticipantWallet(data.players, wallet)) {
        newPlayers = [...data.players, wallet];
      } else {
        newPlayers = data.players;
      }
    } else {
      // Players array is empty or missing - create with both creator and challenger
      newPlayers = [data.creator, wallet];
    }
    
    // Ensure creator is always in the array (in case it was missing)
    if (!newPlayers.some((p) => walletsEqual(p, data.creator))) {
      newPlayers = [data.creator, ...newPlayers];
    }
    
    // Ensure challenger is in the array
    if (!isParticipantWallet(newPlayers, wallet)) {
      newPlayers = [...newPlayers, wallet];
    }
    
    const isFull = newPlayers.length >= maxPlayers;

    const updates: any = {
      status: 'active',
      fundedByJoinerAt: Timestamp.now(),
      players: newPlayers,
      updatedAt: serverTimestamp(),
    };

    if (format === 'tournament') {
      const tournamentState = ensureTournamentState(data.tournament, maxPlayers);
      tournamentState.bracket = seedPlayersIntoBracket(tournamentState.bracket, newPlayers);
      tournamentState.stage = isFull ? 'round_in_progress' : 'waiting_for_players';
      tournamentState.currentRound = tournamentState.currentRound || 1;

      if (isFull) {
        tournamentState.bracket = activateRoundMatches(tournamentState.bracket, tournamentState.currentRound);
      }

      updates.tournament = sanitizeTournamentState(tournamentState);
    }

    const warmupOn =
      data.warmupEnabled === true && format !== 'tournament';

    if (isFull && warmupOn) {
      updates.warmupStatus = 'active';
      updates.officialMatchStatus = 'waiting_ready';
      updates.warmupCompleteBy = {};
      updates.officialReadyBy = {};
      updates.warmupStartedAt = Timestamp.now();
      console.log('🎯 Warm-Up phase started — official match clock not started yet');
    } else if (isFull) {
      updates.warmupStatus = 'disabled';
      updates.resultDeadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
      updates.officialMatchStatus = 'live';
      updates.officialMatchStartedAt = Timestamp.now();
      console.log('⏰ Challenge is full! Result submission phase started (2-hour deadline)');
    }

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      actingWallet: wallet,
    });
    
    console.log('✅ Joiner funded successfully. Challenge is now ACTIVE:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error in joiner funding:', error);
    throw error;
  }
};

const OFFICIAL_MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

function mergeWalletAck(
  existing: Record<string, boolean> | undefined,
  wallet: string
): Record<string, boolean> {
  const next = { ...(existing || {}) };
  next[normalizeWinnerWallet(wallet)] = true;
  return next;
}

/**
 * Mark a participant's warm-up phase complete. When both have acknowledged, unlock official ready phase.
 */
export async function acknowledgeWarmupComplete(
  challengeId: string,
  wallet: string
): Promise<void> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) {
    throw new Error('Challenge not found');
  }

  const data = snap.data() as ChallengeData;
  if (data.status !== 'active' && data.status !== 'in-progress') {
    throw new Error('Warm-Up is only available during an active challenge');
  }
  if (!data.warmupEnabled) {
    throw new Error('This challenge does not have Warm-Up enabled');
  }
  const roster = getEffectiveChallengeRoster(data);
  if (!isParticipantWallet(roster, wallet)) {
    throw new Error('Only participants can complete Warm-Up');
  }

  const warmupCompleteBy = mergeWalletAck(data.warmupCompleteBy, wallet);
  const updates: Record<string, unknown> = {
    warmupCompleteBy,
    updatedAt: serverTimestamp(),
  };

  if (bothPlayersHaveWarmupAck(roster, warmupCompleteBy)) {
    updates.warmupStatus = 'completed';
    updates.officialMatchStatus = 'waiting_ready';
    updates.officialReadyBy = data.officialReadyBy || {};
  } else if (data.warmupStatus === 'waiting') {
    updates.warmupStatus = 'active';
  }

  await writeChallengeFields(challengeId, updates, {
    currentData: data,
    actingWallet: wallet,
  });
}

function bothPlayersHaveWarmupAck(
  roster: string[],
  warmupCompleteBy: Record<string, boolean>
): boolean {
  if (roster.length !== 2) return false;
  return roster.every((w) => warmupCompleteBy[normalizeWinnerWallet(w)] === true);
}

function bothPlayersHaveOfficialReady(
  roster: string[],
  officialReadyBy: Record<string, boolean>
): boolean {
  if (roster.length !== 2) return false;
  return roster.every((w) => officialReadyBy[normalizeWinnerWallet(w)] === true);
}

/**
 * Mark a participant ready for the official match. Starts official clock when both are ready.
 */
export async function acknowledgeOfficialMatchReady(
  challengeId: string,
  wallet: string
): Promise<void> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) {
    throw new Error('Challenge not found');
  }

  const data = snap.data() as ChallengeData;
  if (data.status !== 'active' && data.status !== 'in-progress') {
    throw new Error('Official match can only start from an active challenge');
  }
  if (!data.warmupEnabled) {
    throw new Error('This challenge does not use the Warm-Up flow');
  }
  const warmupDone =
    data.warmupStatus === 'completed' ||
    data.warmupStatus === 'skipped';
  if (!warmupDone) {
    throw new Error('Both players must complete Warm-Up first');
  }
  if (data.officialMatchStatus !== 'waiting_ready') {
    throw new Error('Official match is not waiting for ready confirmations');
  }

  const roster = getEffectiveChallengeRoster(data);
  if (!isParticipantWallet(roster, wallet)) {
    throw new Error('Only participants can ready up for the official match');
  }

  const officialReadyBy = mergeWalletAck(data.officialReadyBy, wallet);

  if (bothPlayersHaveOfficialReady(roster, officialReadyBy)) {
    await startOfficialMatch(challengeId, { currentData: data, actingWallet: wallet, officialReadyBy });
    return;
  }

  await writeChallengeFields(
    challengeId,
    { officialReadyBy, updatedAt: serverTimestamp() },
    { currentData: data, actingWallet: wallet }
  );
}

/**
 * Start the official scored match: sets deadline and officialMatchStatus live.
 * Only this function should set resultDeadline for warm-up challenges.
 */
export async function startOfficialMatch(
  challengeId: string,
  ctx?: {
    currentData?: ChallengeData;
    actingWallet?: string;
    officialReadyBy?: Record<string, boolean>;
  }
): Promise<void> {
  const challengeRef = doc(db, 'challenges', challengeId);
  let data = ctx?.currentData;
  if (!data) {
    const snap = await getDoc(challengeRef);
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }
    data = snap.data() as ChallengeData;
  }

  if (data.officialMatchStatus === 'live' && data.resultDeadline) {
    return;
  }

  const now = Timestamp.now();
  const updates: Record<string, unknown> = {
    officialMatchStatus: 'live',
    officialMatchStartedAt: now,
    resultDeadline: Timestamp.fromDate(new Date(Date.now() + OFFICIAL_MATCH_DURATION_MS)),
    updatedAt: serverTimestamp(),
  };
  if (ctx?.officialReadyBy) {
    updates.officialReadyBy = ctx.officialReadyBy;
  }

  await writeChallengeFields(challengeId, updates, {
    currentData: data,
    actingWallet: ctx?.actingWallet,
  });

  console.log('⏰ Official match live — result deadline started:', challengeId);
}

/**
 * Auto-revert challenge if creator funding deadline expired
 * Reverts to pending_waiting_for_opponent state
 */
export const revertCreatorTimeout = async (challengeId: string): Promise<boolean> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as ChallengeData;
    if (!data) return false;
    const status = data.status;
    if (status !== "creator_confirmation_required" && status !== "creator_funded") {
      console.log("Skipping revert — invalid state:", status);
      return false;
    }
    if (data.creatorFundingDeadline && Date.now() < data.creatorFundingDeadline.toMillis()) {
      console.log("Skipping revert — deadline not reached");
      return false;
    }
    // Only revert if NO join ever happened
    if (
      data.pendingJoiner !== null ||
      (data as any).opponentWallet !== undefined
    ) {
      console.log("Skipping revert — join detected");
      return false;
    }
    
    // Revert to pending state - clear ALL joiner-related fields to allow new users to join
    const updates: any = {
      status: 'pending_waiting_for_opponent',
      pendingJoiner: null,
      challenger: null, // Clear challenger field to allow new users to join
      creatorFundingDeadline: null,
      updatedAt: serverTimestamp(),
      opponentWallet: deleteField(),
      opponentUid: deleteField(),
    };

    // Critical: re-check latest doc to avoid stale reads overriding a valid join
    const latestSnap = await getDoc(challengeRef);
    const latest = latestSnap.data() as ChallengeData | undefined;
    if (!latest) return false;
    if (
      latest.pendingJoiner !== null ||
      (latest as any).opponentWallet !== undefined
    ) {
      console.log("Abort revert — fresh data shows join");
      return false;
    }

    // Final safety guard: ensure status hasn't changed since initial read
    if (latest.status !== "creator_confirmation_required") {
      console.log("Abort revert — status changed");
      return false;
    }

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      skipParticipantHybridMerge: true,
    });

    console.log('✅ Creator timeout - challenge reverted to pending:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error reverting creator timeout:', error);
    return false;
  }
};

/**
 * Creator funding deadline elapsed: cancel when joiner bound, else revert to open matchmaking.
 * Participant-gated for the cancel path (Firestore rules).
 */
export async function handleExpiredCreatorFundingDeadline(
  challengeId: string,
  actingWallet?: string | null
): Promise<'cancelled' | 'reverted' | false> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return false;
  const data = snap.data() as ChallengeData;

  if (!isExpiredCreatorFundingDoc(data)) return false;

  if (hasCreatorFundingJoinerBound(data)) {
    const cancelled = await autoCancelExpiredCreatorFunding(challengeId, actingWallet);
    return cancelled ? 'cancelled' : false;
  }

  const reverted = await revertCreatorTimeout(challengeId);
  return reverted ? 'reverted' : false;
}

/**
 * Auto-revert or cancel when joiner funding deadline expired (creator_funded, challenger bound).
 * Participant-gated (Firestore rules). On-chain escrow refund requires creator cancelChallenge separately.
 */
export const revertJoinerTimeout = async (
  challengeId: string,
  actingWallet?: string | null
): Promise<boolean> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);

    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as ChallengeData;
    if (data.status !== 'creator_funded') {
      return false;
    }
    if (!data.challenger) {
      return false;
    }
    if (!data.joinerFundingDeadline || data.joinerFundingDeadline.toMillis() > Date.now()) {
      return false;
    }
    if (actingWallet && !canActOnChallengeAsParticipant(data, actingWallet)) {
      return false;
    }

    const latestSnap = await getDoc(challengeRef);
    const latest = latestSnap.data() as ChallengeData | undefined;
    if (!latest) return false;
    if (latest.status !== 'creator_funded') {
      return false;
    }
    if (!latest.joinerFundingDeadline || latest.joinerFundingDeadline.toMillis() > Date.now()) {
      return false;
    }

    const fundedOnChain = hasFundedOnChainPda(latest);
    const updates: Record<string, unknown> = {
      status: fundedOnChain ? 'cancelled' : 'pending_waiting_for_opponent',
      challenger: null,
      pendingJoiner: null,
      joinerFundingDeadline: null,
      creatorFundingDeadline: null,
      fundedByCreatorAt: null,
      updatedAt: serverTimestamp(),
      players: [latest.creator],
      opponentWallet: deleteField(),
      opponentUid: deleteField(),
    };
    if (fundedOnChain) {
      updates.cancelledReason = 'joiner_funding_timeout';
    }
    if (latest.createdByUid) {
      updates.playersUid = [latest.createdByUid];
    }

    await writeChallengeFields(challengeId, updates, {
      currentData: data,
      skipParticipantHybridMerge: true,
    });

    console.log(
      '✅ Joiner funding deadline handled:',
      challengeId,
      fundedOnChain ? 'cancelled (creator may cancel on-chain for refund)' : 'reverted to pending'
    );
    return true;
  } catch (error) {
    console.error('❌ Error reverting joiner timeout:', error);
    return false;
  }
};

/** Participant-gated joiner funding deadline handler (Scenario C). */
export async function handleExpiredJoinerFundingDeadline(
  challengeId: string,
  actingWallet?: string | null
): Promise<boolean> {
  return revertJoinerTimeout(challengeId, actingWallet);
}

/**
 * Record actual USDFG transfer given to player from Founder Challenge
 * This should be called when the actual token transfer happens (from admin/backend)
 * 
 * @param wallet - Player wallet address
 * @param challengeId - Challenge ID
 * @param amount - Actual USDFG amount transferred (from on-chain transaction)
 * @param txSignature - Solana transaction signature (optional, for verification)
 */
export async function recordFounderChallengeReward(
  wallet: string,
  challengeId: string,
  amount: number,
  txSignature?: string
): Promise<void> {
  try {
    // Record in founder_rewards collection (tracks actual USDFG given)
    await addDoc(collection(db, 'founder_rewards'), {
      wallet,
      challengeId,
      amount, // Actual USDFG transferred
      txSignature: txSignature || null, // Optional: Solana transaction signature
      timestamp: Timestamp.now(),
    });
    
    // Update cached total stats (increment by amount)
    const statsRef = doc(db, 'stats', 'total_rewarded');
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const currentData = statsSnap.data();
      await updateDoc(statsRef, {
        total: (currentData.total || 0) + amount,
        lastUpdated: Timestamp.now(),
      });
    } else {
      // Create stats document if it doesn't exist
      await setDoc(statsRef, {
        total: amount,
        lastUpdated: Timestamp.now(),
      });
    }

    await invokeUpdatePlayerMeta({
      wallet,
      founderEarnedDelta: amount,
    });

    // Update challenge to mark reward as transferred and set actual challenge reward
    const founderPayoutSig =
      txSignature && looksLikeSolanaTxSignature(String(txSignature).trim())
        ? String(txSignature).trim()
        : 'founder-off-chain';
    await writeChallengeFields(
      challengeId,
      {
        payoutSignature: founderPayoutSig,
        payoutTriggered: true,
        prizeClaimedAt: Timestamp.now(),
        prizePool: amount, // Update with actual amount transferred
        payoutTimestamp: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { actingWallet: wallet }
    );

    console.log(`✅ Recorded Founder Challenge reward: ${wallet.slice(0,8)}... received ${amount} USDFG from challenge ${challengeId}${txSignature ? ` (tx: ${txSignature.slice(0,8)}...)` : ''}`);
  } catch (error) {
    console.error('❌ Error recording Founder Challenge reward:', error);
    throw error; // Throw so caller knows if tracking failed
  }
}

// Real-time active challenge functions
export function listenActiveForCreator(creator: string, cb: (active: any[]) => void) {
  const q = query(collection(db, "challenges"), where("creator", "==", creator), where("status", "in", ["active", "pending_waiting_for_opponent", "creator_confirmation_required", "creator_funded"]));
  return onSnapshot(q, (snap) => {
    const active = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('🔒 Active challenges for creator:', active.length);
    cb(active);
  });
}

export async function addChallengeDoc(data: any) {
  const uid = await ensureFirebaseSignedIn();
  const creator = data.creator || data.creatorWallet;
  const players = Array.isArray(data.players) && data.players.length ? data.players : creator ? [creator] : [];
  const payload: Record<string, any> = {
    ...data,
    status: data.status ?? 'pending_waiting_for_opponent',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  if (creator) {
    payload.creatorWallet = creator;
    payload.createdByUid = uid;
    payload.playersUid = players.map((w: string) => (walletEq(w, creator) ? uid : null));
  }
  const docRef = await addDoc(collection(db, "challenges"), payload);
  console.log('CHALLENGE WRITE:', { challengeId: docRef.id, uid, wallet: creator ?? null });
  console.log('✅ Challenge document created with ID:', docRef.id);
  return docRef.id;
}

// ============================================
// RESULT SUBMISSION SYSTEM
// ============================================

function challengeHasResultForWallet(data: ChallengeData, wallet: string): boolean {
  const r = data.results;
  if (!r) return false;
  return Object.keys(r).some((k) => walletsEqual(k, wallet) && r[k] != null);
}

/** Roster-aligned key for `results` map (must match submitChallengeResult writes). */
export function canonicalPlayerKey(players: string[], wallet: string): string {
  const hit = players.find((p) => walletsEqual(p, wallet));
  return hit || wallet;
}

/** Two roster wallets for finalize/repair — falls back to creator + challenger when `players` is missing or wrong length. */
export function getEffectiveChallengeRoster(data: ChallengeData): string[] {
  const raw = Array.isArray(data.players)
    ? data.players.filter((p): p is string => typeof p === 'string' && !!p)
    : [];
  if (raw.length === 2) {
    return raw;
  }
  const creator =
    (typeof data.creator === 'string' && data.creator) ||
    (typeof (data as { creatorWallet?: string }).creatorWallet === 'string' &&
      (data as { creatorWallet?: string }).creatorWallet) ||
    '';
  const challenger =
    (typeof data.challenger === 'string' && data.challenger) ||
    (typeof data.opponentWallet === 'string' && data.opponentWallet) ||
    '';
  if (creator && challenger && !walletsEqual(creator, challenger)) {
    return [creator, challenger];
  }
  return raw;
}

export function bothPlayersHaveCanonicalResults(
  data: ChallengeData,
  roster?: string[]
): boolean {
  const players = roster ?? getEffectiveChallengeRoster(data);
  if (players.length !== 2) return false;
  const results = (data.results || {}) as Record<string, unknown>;
  return players.every((p) => results[canonicalPlayerKey(players, p)] !== undefined);
}

const repairFinalizeCooldownMs = 60_000;
const lastRepairFinalizeAt = new Map<string, number>();

/**
 * Self-heal: both canonical results present but challenge never left active/in-progress.
 * Safe to call from snapshots; no-ops when finalize is not applicable.
 */
/** Read-only snapshot of fields needed to debug stuck active + both-results states. */
export async function getChallengeFinalizeDiagnostics(
  challengeId: string
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, 'challenges', challengeId));
  if (!snap.exists()) return null;
  const d = snap.data() as ChallengeData;
  const roster = getEffectiveChallengeRoster(d);
  const results = (d.results || {}) as Record<string, unknown>;
  const toIso = (v: unknown) =>
    v && typeof v === 'object' && 'toMillis' in (v as object)
      ? new Date((v as Timestamp).toMillis()).toISOString()
      : v ?? null;
  return {
    status: d.status ?? null,
    players: d.players ?? null,
    effectiveRoster: roster,
    results,
    canonicalResults: roster.map((w) => ({
      wallet: w,
      key: canonicalPlayerKey(roster, w),
      hasResult: results[canonicalPlayerKey(roster, w)] !== undefined,
    })),
    winner: d.winner ?? null,
    lossReportedBy: d.lossReportedBy ?? null,
    provisionalWinner: d.provisionalWinner ?? null,
    resolveAfter: toIso(d.resolveAfter),
    needsPayout: d.needsPayout ?? null,
    canClaim: d.canClaim ?? null,
    disputedBy: d.disputedBy ?? null,
    updatedAt: toIso(d.updatedAt),
    bothCanonicalReady: bothPlayersHaveCanonicalResults(d, roster),
  };
}

export async function repairChallengeFinalizationIfNeeded(
  challengeId: string
): Promise<boolean> {
  const now = Date.now();
  if (now - (lastRepairFinalizeAt.get(challengeId) ?? 0) < repairFinalizeCooldownMs) {
    return false;
  }
  lastRepairFinalizeAt.set(challengeId, now);

  const challengeRef = doc(db, 'challenges', challengeId);
  const resSnap = await getDoc(challengeRef);
  if (!resSnap.exists()) {
    return false;
  }

  const resData = resSnap.data() as ChallengeData;
  const roster = getEffectiveChallengeRoster(resData);
  const status = resData.status;

  const statusOk =
    status === 'active' ||
    status === 'in-progress' ||
    status === 'awaiting_auto_resolution';

  if (
    !statusOk ||
    roster.length !== 2 ||
    !bothPlayersHaveCanonicalResults(resData, roster) ||
    resData.winner != null ||
    resData.disputedBy
  ) {
    if (import.meta.env.DEV && statusOk && roster.length === 2) {
      console.log('[repairFinalize] skip', challengeId, {
        hasBothResults: bothPlayersHaveCanonicalResults(resData, roster),
        winner: resData.winner,
        disputedBy: resData.disputedBy,
        playersFieldLen: Array.isArray(resData.players) ? resData.players.length : 0,
      });
    }
    return false;
  }

  console.warn(
    '[repairFinalize] both results present but challenge not completed — running determineWinner',
    challengeId
  );

  const dataForWinner: ChallengeData = {
    ...resData,
    players: roster,
  };

  if (
    !Array.isArray(resData.players) ||
    resData.players.length !== 2 ||
    !resData.players.every((p, i) => walletsEqual(p, roster[i]))
  ) {
    try {
      await writeChallengeFields(
        challengeId,
        { players: roster, updatedAt: Timestamp.now() },
        { currentData: resData, skipParticipantHybridMerge: false }
      );
    } catch (e) {
      console.warn('[repairFinalize] could not patch players array', challengeId, e);
    }
  }

  await determineWinner(challengeId, dataForWinner);
  return true;
}

/**
 * If both roster players have canonical `results` entries but the doc is not finalized,
 * run determineWinner (self-heal: e.g. active + stale provisional fields after partial flows).
 */
async function tryFinalCanonicalResolution(
  challengeId: string,
  challengeRef: ReturnType<typeof doc>
): Promise<void> {
  const resSnap = await getDoc(challengeRef);
  if (!resSnap.exists()) {
    return;
  }
  const resData = resSnap.data() as ChallengeData;
  const rosterF = getEffectiveChallengeRoster(resData);
  const resultsF = (resData.results || {}) as Record<string, any>;
  if (rosterF.length !== 2) {
    return;
  }

  const canonicalA = canonicalPlayerKey(rosterF, rosterF[0]);
  const canonicalB = canonicalPlayerKey(rosterF, rosterF[1]);
  const hasA = resultsF[canonicalA] !== undefined;
  const hasB = resultsF[canonicalB] !== undefined;

  const statusOk =
    resData.status === 'active' ||
    resData.status === 'in-progress' ||
    resData.status === 'awaiting_auto_resolution';

  const canFinalize =
    statusOk &&
    hasA &&
    hasB &&
    resData.winner == null &&
    !resData.disputedBy;

  if (!canFinalize) {
    return;
  }

  if (import.meta.env.DEV) {
    console.log('tryFinalCanonicalResolution → determineWinner', challengeId);
  }
  await determineWinner(challengeId, { ...resData, players: rosterF });
}

/**
 * Submit a player's result for a challenge
 * @param challengeId - The challenge ID
 * @param wallet - The player's wallet address
 * @param didWin - Whether the player won (true) or lost (false)
 * @param proofImageData - Optional base64 image data URL as proof
 */
export const submitChallengeResult = async (
  challengeId: string,
  wallet: string,
  didWin: boolean,
  proofImageData?: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);

    // AUDIT LOG POLICY:
    // - challenge_submissions MUST remain ephemeral
    // - TTL is enforced via expiresAt field + Firestore TTL setting
    // - NEVER increase TTL beyond short debugging window (1h–24h max)
    // - DO NOT use audit logs for analytics or long-term storage
    const AUDIT_TTL_MS = 60 * 60 * 1000; // 1 hour max

    const logSubmissionAudit = (keySelf: string, auditDidWin: boolean) => {
      const auditRef = doc(collection(db, "challenge_submissions"));
      setDoc(auditRef, {
        challengeId,
        wallet,
        walletLower: wallet.toLowerCase(),
        canonicalKey: keySelf,
        canonicalKeyLower: keySelf.toLowerCase(),
        didWin: auditDidWin,
        submittedAt: Timestamp.now(),
        type: "submission",
        source: "client",
        clientId: crypto.randomUUID(),
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + AUDIT_TTL_MS),
      }).catch((err) => {
        console.warn("Audit log failed", err);
      });
    };

    const logDuplicateBlockedAudit = (keySelf: string) => {
      const auditRef = doc(collection(db, "challenge_submissions"));
      setDoc(auditRef, {
        challengeId,
        wallet,
        walletLower: wallet.toLowerCase(),
        canonicalKey: keySelf,
        canonicalKeyLower: keySelf.toLowerCase(),
        attemptedDidWin: didWin,
        type: "duplicate_blocked",
        timestamp: Timestamp.now(),
        clientId: crypto.randomUUID(),
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + AUDIT_TTL_MS),
      }).catch((err) => {
        console.warn("Audit log failed", err);
      });
    };

    const txResult = await runTransaction(db, async (tx) => {
      const snap = await tx.get(challengeRef);

      if (!snap.exists()) {
        throw new Error("Challenge not found");
      }

      const data = snap.data() as ChallengeData;
      const players = data.players || [];

      // Verify player is part of this challenge
      if (!players.length || !isParticipantWallet(players, wallet)) {
        throw new Error("You are not part of this challenge");
      }

      if (data.warmupEnabled === true && data.officialMatchStatus !== 'live') {
        throw new Error(
          'Official match has not started. Complete Warm-Up and confirm ready for the official match.'
        );
      }

      const keySelf = canonicalPlayerKey(players, wallet);
      const currentResults = (data.results || {}) as Record<string, any>;

      // 🔒 ATOMIC GUARD: block duplicates (including any legacy/non-canonical keys)
      if (currentResults[keySelf] !== undefined || challengeHasResultForWallet(data, wallet)) {
        console.warn("Duplicate submission blocked (atomic)");
        return { kind: "duplicate" as const, keySelf };
      }

      // 2-player loss: single atomic write (results + provisional) — race-safe, idempotent
      const canAtomicProvisionalLoss =
        !didWin &&
        players.length === 2 &&
        (data.status === "active" || data.status === "in-progress") &&
        !data.lossReportedBy;

      if (canAtomicProvisionalLoss) {
        const st = data.status;
        if (st === "completed" || st === "disputed" || st === "cancelled" || st === "expired") {
          throw new Error(`Cannot submit result: challenge is ${st}`);
        }
        if (st === "awaiting_auto_resolution") {
          throw new Error(
            "This challenge is already awaiting resolution from a loss report. Please refresh and try again."
          );
        }
        if (data.lossReportedBy) {
          throw new Error("A loss has already been reported for this challenge.");
        }
        if (st !== "active" && st !== "in-progress") {
          throw new Error(`Cannot submit loss in status: ${st}`);
        }

        const opponentWallet = players.find((p: string) => !walletsEqual(p, wallet));
        if (!opponentWallet) {
          throw new Error("Could not resolve opponent wallet");
        }

        const nowTs = Timestamp.now();
        const updatedResults = {
          ...currentResults,
          [keySelf]: {
            didWin: false,
            submittedAt: nowTs,
            ...(proofImageData && { proofImageData }),
          },
        };

        tx.update(challengeRef, {
          results: updatedResults,
          status: "awaiting_auto_resolution",
          provisionalWinner: opponentWallet,
          lossReportedBy: keySelf,
          resolveAfter: Timestamp.fromMillis(nowTs.toMillis() + 120000),
          updatedAt: nowTs,
          resolutionMeta: {
            type: "loss_auto_resolution",
            triggeredBy: wallet,
            triggeredAt: nowTs,
          },
        });

        return { kind: "provisional_loss" as const, keySelf };
      }

      // All other paths: atomic single-write result submission (first write wins)
      const nowTs = Timestamp.now();
      const updatedResults = {
        ...currentResults,
        [keySelf]: {
          didWin,
          submittedAt: nowTs,
          ...(proofImageData && { proofImageData }),
        },
      };

      tx.update(challengeRef, {
        results: updatedResults,
        updatedAt: nowTs,
      });

      return { kind: "submitted" as const, keySelf, didWin };
    });

    if (txResult.kind === "duplicate") {
      logDuplicateBlockedAudit(txResult.keySelf);
      await tryFinalCanonicalResolution(challengeId, challengeRef);
      return;
    }
    if (txResult.kind === "provisional_loss") {
      logSubmissionAudit(txResult.keySelf, false);
      if (import.meta.env.DEV) {
        console.log("Result submitted (provisional loss, atomic):", { challengeId, wallet });
      }
      await tryFinalCanonicalResolution(challengeId, challengeRef);
      return;
    }

    logSubmissionAudit(txResult.keySelf, txResult.didWin);
    if (import.meta.env.DEV) {
      console.log("Result submitted:", { challengeId, wallet, didWin });
    }

    // CRITICAL FIX: Re-fetch from Firestore to get the actual current state
    // Don't use local results object - it might be stale
      const updatedSnap = await getDoc(challengeRef);
      const updatedData = updatedSnap.data() as ChallengeData;

    if (updatedData.status === 'awaiting_auto_resolution') {
      const currentResults = updatedData.results || {};
      const currentPlayers = getEffectiveChallengeRoster(updatedData);
      const bothSubmitted = bothPlayersHaveCanonicalResults(updatedData, currentPlayers);
      if (bothSubmitted) {
        await writeChallengeFields(
          challengeId,
          {
            status: 'active',
            provisionalWinner: deleteField(),
            lossReportedBy: deleteField(),
            resolveAfter: deleteField(),
            resolutionMeta: deleteField(),
            updatedAt: Timestamp.now(),
          },
          { currentData: updatedData, actingWallet: wallet }
        );
        const finalSnap = await getDoc(challengeRef);
        const finalData = finalSnap.data() as ChallengeData | undefined;
        if (
          !finalData ||
          finalData.status === 'completed' ||
          finalData.winner != null ||
          finalData.disputedBy
        ) {
          if (import.meta.env.DEV) {
            console.log('Skipping determineWinner — already resolved or disputed');
          }
        } else {
          await determineWinner(challengeId, {
            ...finalData,
            players: getEffectiveChallengeRoster(finalData),
          });
        }
      }
      await tryFinalCanonicalResolution(challengeId, challengeRef);
      return;
    }

    const currentPlayers = getEffectiveChallengeRoster(updatedData);

    // Only determine winner if BOTH roster players have submitted (canonical keys only).
    const bothSubmitted = bothPlayersHaveCanonicalResults(updatedData, currentPlayers);

    if (bothSubmitted) {
      if (import.meta.env.DEV) {
        console.log('Both players submitted; calling determineWinner', challengeId);
      }
      if (
        updatedData.status === 'completed' ||
        updatedData.status === 'disputed' ||
        updatedData.winner != null ||
        updatedData.disputedBy
      ) {
        if (import.meta.env.DEV) {
          console.log('Skipping determineWinner — already resolved or disputed');
        }
      } else {
        await determineWinner(challengeId, {
          ...updatedData,
          players: currentPlayers,
        });
      }
    } else if (import.meta.env.DEV) {
      console.log('⏳ Waiting for opponent to submit result...', challengeId);
    }

    await tryFinalCanonicalResolution(challengeId, challengeRef);
  } catch (error) {
    console.error('❌ Error submitting result:', error);
    throw error;
  }
};

/**
 * Clean up chat messages for a challenge
 * Exported so it can be called when admin resolves disputes
 */
export async function cleanupChatMessages(challengeId: string): Promise<void> {
  try {
    console.log('🗑️ Cleaning up chat messages for resolved challenge:', challengeId);
    const chatQuery = query(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'));
    const chatSnapshot = await getDocs(chatQuery);
    const chatDeletePromises = chatSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages after dispute resolution:`, challengeId);
  } catch (error) {
    console.error('❌ Error cleaning up chat messages:', error);
    throw error;
  }
}

/**
 * Clean up chat messages and voice signals for a challenge
 * Only deletes for normal completions - keeps chat for disputes (needed for evidence)
 * This balances data minimization with dispute resolution needs
 * 
 * Legal compliance: Chat kept temporarily for dispute resolution (legitimate business purpose),
 * then deleted after resolution to minimize data retention
 */
async function cleanupChallengeData(challengeId: string, isDispute: boolean = false): Promise<void> {
  try {
    console.log('🗑️ Cleaning up challenge data for:', challengeId, isDispute ? '(DISPUTE - keeping chat)' : '(Normal completion - deleting chat)');

    await deleteVoiceSignalsDocument(challengeId);

    try {
      const voiceStateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
      await deleteDoc(voiceStateRef).catch(() => {});
      const micRequestsRef = collection(db, 'challenge_lobbies', challengeId, 'mic_requests');
      const micSnap = await getDocs(micRequestsRef);
      await Promise.all(micSnap.docs.map((d) => deleteDoc(d.ref))).catch(() => {});
    } catch (_) {}

    if (!isDispute) {
      const chatQuery = query(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'));
      const chatSnapshot = await getDocs(chatQuery);
      const chatDeletePromises = chatSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
      await Promise.all(chatDeletePromises);
      console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for challenge:`, challengeId);
    } else {
      console.log('📋 Keeping chat messages for dispute resolution:', challengeId);
    }
  } catch (error) {
    console.error('❌ Error cleaning up challenge data:', error);
  }
}

const hasAnyProofImageData = (results?: Record<string, any>) =>
  !!results &&
  Object.values(results).some((r: any) => r && r.proofImageData != null);

/** Remove proof images from `results` after completion (shallow copy per entry; does not mutate source). */
const stripProofImageDataFromResults = (results?: Record<string, any>) => {
  if (!results) return results;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(results)) {
    if (!v) {
      out[k] = v;
      continue;
    }
    const { proofImageData, ...rest } = v;
    out[k] = { ...rest };
  }
  return out;
};

/**
 * Determine winner based on submitted results
 * Logic:
 * - One YES, One NO → YES player wins (clear winner)
 * - Both YES → Dispute (both claim victory, requires review)
 * - Both NO → Both forfeit (suspicious collusion, both lose challenge amounts as penalty)
 */
async function determineWinner(challengeId: string, data: ChallengeData): Promise<void> {
  try {
    const results = (data.results || {}) as Record<string, any>;
    const roster = getEffectiveChallengeRoster(data);

    if (roster.length !== 2) {
      if (import.meta.env.DEV) {
        console.log('determineWinner skipped: roster length', roster.length, challengeId);
      }
      return;
    }

    const walletA = roster[0];
    const walletB = roster[1];
    const playerAKey = canonicalPlayerKey(roster, walletA);
    const playerBKey = canonicalPlayerKey(roster, walletB);
    const playerAResult = results[playerAKey];
    const playerBResult = results[playerBKey];

    if (!playerAResult || !playerBResult) {
      console.warn('determineWinner: waiting for both canonical player submissions', challengeId);
      return;
    }

    const playerAWon = playerAResult.didWin === true;
    const playerBWon = playerBResult.didWin === true;

    if (import.meta.env.DEV) {
      console.log('determineWinner', challengeId, { playerAWon, playerBWon });
    }

    // Case 1: Both claim they won → Dispute (KEEP CHAT for evidence)
    if (playerAWon && playerBWon) {
      await writeChallengeFields(
        challengeId,
        {
          status: 'disputed',
          winner: null,
          updatedAt: Timestamp.now(),
        },
        { currentData: data }
      );
      console.log('🔴 DISPUTE: Both players claim they won');
      // Keep chat messages for dispute resolution - admin may need them
      await cleanupChallengeData(challengeId, true); // true = isDispute
      return;
    }

    // Case 2: Both claim they lost → FORFEIT (delete chat - no dispute)
    if (!playerAWon && !playerBWon) {
      await writeChallengeFields(
        challengeId,
        {
          status: 'completed',
          winner: 'forfeit', // Special value: both players forfeit, no refund
          resolutionType: 'forfeit',
          ...(hasAnyProofImageData(data.results as Record<string, any>)
            ? {
                results: stripProofImageDataFromResults(
                  data.results as Record<string, any>
                ) as ChallengeData['results'],
              }
            : {}),
          updatedAt: Timestamp.now(),
        },
        { currentData: data }
      );
      console.log('⚠️ FORFEIT: Both players claim they lost - Suspicious collusion detected, both lose challenge amounts');
      // Delete chat - no dispute, no need to keep
      await cleanupChallengeData(challengeId, false); // false = not dispute
      try {
        await invokeApplyMatchStats({ challengeId });
      } catch (e) {
        console.error('applyMatchStats failed (both-forfeit)', e);
      }
      return;
    }

    // Case 3: Clear winner (one YES, one NO) - DELETE CHAT (no dispute)
    const winnerKey = playerAWon ? playerAKey : playerBKey;
    const loserKey = playerAWon ? playerBKey : playerAKey;
    
    await writeChallengeFields(
      challengeId,
      {
        status: 'completed',
        winner: normalizeWinnerWallet(winnerKey),
        resolutionType: 'auto',
        lossReportedBy: deleteField(),
        provisionalWinner: deleteField(),
        resolveAfter: deleteField(),
        resolutionMeta: deleteField(),
        updatedAt: Timestamp.now(),
      },
      { currentData: data }
    );
    console.log('🏆 WINNER DETERMINED:', challengeId, winnerKey);
    // Delete chat messages - clear winner, no dispute resolution needed
    await cleanupChallengeData(challengeId, false); // false = not dispute
    
    // Calculate challenge reward if not stored (for backward compatibility with old challenges)
    let prizePool = data.prizePool;
    if (!prizePool || prizePool === 0) {
      const entryFee = data.entryFee || 0;
      const totalPrize = entryFee * 2;
      const platformFee = totalPrize * 0.05;
      prizePool = totalPrize - platformFee;
      console.log(`⚠️ Challenge reward not found in challenge data, calculated from challenge amount: ${entryFee} USDFG → ${prizePool} USDFG`);
    }
    
    const postWinSnap = await getDoc(doc(db, 'challenges', challengeId));
    const postWinData = postWinSnap.data() as ChallengeData;
    let statsOk = true;
    if (postWinData.statsApplied !== true) {
      try {
        const r = await invokeApplyMatchStats({ challengeId });
        statsOk = r.ok;
      } catch (e) {
        console.error('applyMatchStats failed (clear winner)', e);
        statsOk = false;
      }
    }

    // Mark challenge as ready for winner to claim (Player pays gas, not admin!)
    await writeChallengeFields(
      challengeId,
      {
        status: 'completed', // Keep status as completed!
        ...payoutClaimReadyFields(),
        ...(hasAnyProofImageData(postWinData.results as Record<string, any>)
          ? {
              results: stripProofImageDataFromResults(
                postWinData.results as Record<string, any>
              ) as ChallengeData['results'],
            }
          : {}),
        updatedAt: Timestamp.now(),
      },
      { currentData: postWinData }
    );
    
  } catch (error) {
    console.error('❌ Error determining winner:', error);
    throw error;
  }
}

/**
 * Sync Firestore challenge status with on-chain status
 * This helps prevent showing "Join Challenge" for already joined challenges
 */
export const syncChallengeStatus = async (challengeId: string, challengePDA: string): Promise<void> => {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const { getRpcEndpoint } = await import('../chain/rpc');
    const connection = new Connection(getRpcEndpoint(), 'confirmed');
    
    const accountInfo = await connection.getAccountInfo(new PublicKey(challengePDA));
    if (!accountInfo || !accountInfo.data) {
      console.log('Challenge not found on-chain:', challengePDA);
      return;
    }
    
    // Parse the challenge data to get on-chain status
    const data = accountInfo.data;
    const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator (8), creator (32), challenger Option (33), entry_fee (8), then status
    
    let onChainStatus: string;
    switch (statusByte) {
      case 0: // PendingWaitingForOpponent
        onChainStatus = 'pending_waiting_for_opponent';
        break;
      case 1: // CreatorConfirmationRequired
        onChainStatus = 'creator_confirmation_required';
        break;
      case 2: // CreatorFunded
        onChainStatus = 'creator_funded';
        break;
      case 3: // Active (was InProgress)
        onChainStatus = 'active';
        break;
      case 4: // Completed
        onChainStatus = 'completed';
        break;
      case 5: // Cancelled
        onChainStatus = 'cancelled';
        break;
      case 6: // Disputed
        onChainStatus = 'disputed';
        break;
      default:
        console.log('Unknown on-chain status:', statusByte);
        return;
    }
    
    // Update Firestore if status differs
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (snap.exists()) {
      const currentData = snap.data();
      const currentStatus = currentData.status as string | undefined;

      // Post-result / terminal states are authoritative in Firestore. The on-chain status byte
      // only encodes pending/confirm/funded/active/completed/cancelled/disputed and does NOT
      // represent these local states, so a background chain read must never revert them.
      // Reverting awaiting_auto_resolution -> active blocks auto-resolution and hides the Claim button.
      const PROTECTED_LOCAL_STATUSES = [
        'awaiting_auto_resolution',
        'completed',
        'disputed',
        'cancelled',
        'expired',
      ];
      if (currentStatus && PROTECTED_LOCAL_STATUSES.includes(currentStatus)) {
        console.log(
          `⏭️  Skipping sync: local status '${currentStatus}' is authoritative; not overwriting with chain '${onChainStatus}'`
        );
        return;
      }

      // Don't overwrite 'completed' status with 'active' from on-chain
      // This happens because Firestore marks as completed when both submit, but on-chain is still Active
      if (currentStatus === 'completed' && onChainStatus === 'active') {
        console.log(`⏭️  Skipping sync: Firestore is 'completed', on-chain is 'active' (waiting for claim)`);
        return;
      }
      
      // Never downgrade join/fund states due to stale chain reads.
      if (currentStatus === "creator_confirmation_required" && onChainStatus === "pending_waiting_for_opponent") {
        console.log("Skipping downgrade from join state");
        return;
      }
      if (currentStatus === "creator_funded" && onChainStatus !== "active") {
        console.log("Skipping downgrade from funded state");
        return;
      }

      const statusOrder: Record<string, number> = {
        pending_waiting_for_opponent: 0,
        creator_confirmation_required: 1,
        creator_funded: 2,
        active: 3,
        completed: 4,
      };
      const currentRank = currentStatus ? statusOrder[currentStatus] : undefined;
      const chainRank = statusOrder[onChainStatus];
      // Only allow forward progression for known statuses.
      if (currentRank !== undefined && chainRank !== undefined && chainRank <= currentRank) {
        return;
      }

      const updates: any = {};

      if (currentStatus !== onChainStatus) {
        updates.status = onChainStatus;
      }

      // Do not infer payoutTriggered / prizeClaimedAt from the on-chain status byte alone — it can
      // desync from actual SPL movement. Payout flags are set only by claimChallengePrize (or repair paths).

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = Timestamp.now();
        await writeChallengeFields(challengeId, updates, {
          currentData: currentData as ChallengeData,
        });
        console.log(`🔄 Synced challenge fields from chain:`, {
          challengeId,
          fromStatus: currentData.status,
          toStatus: updates.status ?? currentData.status,
          payoutTriggered: updates.payoutTriggered ?? currentData.payoutTriggered,
        });
      }
    }
  } catch (error) {
    console.error('❌ Error syncing challenge status:', error);
  }
};

/**
 * Start result submission phase when challenge goes in-progress
 * Sets a 2-hour deadline for result submission
 */
export const startResultSubmissionPhase = async (challengeId: string): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    if (!snap.exists()) {
      throw new Error('Challenge not found');
    }
    const data = snap.data() as ChallengeData;
    if (data.status !== 'active') {
      throw new Error(`startResultSubmissionPhase requires status active; got ${data.status}`);
    }
    if (isWarmupPhaseBlockingSubmit(data)) {
      console.log(
        '⏸️ startResultSubmissionPhase skipped: warm-up enabled and official match is not live yet'
      );
      return;
    }
    const deadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));

    await writeChallengeFields(
      challengeId,
      {
        resultDeadline: deadline,
        updatedAt: Timestamp.now(),
      },
      { currentData: data }
    );

    console.log('⏰ Result submission phase started. Deadline:', deadline.toDate());
  } catch (error) {
    console.error('❌ Error starting result submission phase:', error);
    throw error;
  }
};

/**
 * Check if result submission deadline has passed
 * If only one player submitted, they win by default
 * If no one submitted, challenge goes to dispute
 */
export const checkResultDeadline = async (challengeId: string): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) return;
    
    const data = snap.data() as ChallengeData;
    
    if (!data.resultDeadline || data.status !== 'active') return;
    if (data.warmupEnabled === true && data.officialMatchStatus !== 'live') return;
    
    const now = Timestamp.now();
    const deadlinePassed = now.toMillis() > data.resultDeadline.toMillis();
    
    if (!deadlinePassed) return;
    
    const results = data.results || {};
    const submittedCount = Object.keys(results).length;
    
    // Case 1: No one submitted → FORFEIT (no refund to prevent exploitation)
    if (submittedCount === 0) {
      await writeChallengeFields(
        challengeId,
        {
          status: 'completed',
          winner: 'forfeit', // Special value indicating both players forfeited
          resolutionType: 'forfeit',
          ...(hasAnyProofImageData(data.results as Record<string, any>)
            ? {
                results: stripProofImageDataFromResults(
                  data.results as Record<string, any>
                ) as ChallengeData['results'],
              }
            : {}),
          updatedAt: Timestamp.now(),
        },
        { currentData: data }
      );
      console.log('⚠️ DEADLINE PASSED: No results submitted - FORFEIT (no refund)');
      try {
        await invokeApplyMatchStats({ challengeId });
      } catch (e) {
        console.error('applyMatchStats failed (deadline forfeit)', e);
      }
      return;
    }
    
    // Case 2: Only one player submitted → Determine winner based on their claim
    if (submittedCount === 1) {
      const submittedWallet = Object.keys(results)[0];
      const didTheyClaimWin = results[submittedWallet].didWin;
      
      if (didTheyClaimWin) {
        // They claimed they won → They win by default
        await writeChallengeFields(
          challengeId,
          {
            status: 'completed',
            winner: normalizeWinnerWallet(submittedWallet),
            resolutionType: 'auto',
            ...payoutClaimReadyFields(),
            ...(hasAnyProofImageData(data.results as Record<string, any>)
              ? {
                  results: stripProofImageDataFromResults(
                    data.results as Record<string, any>
                  ) as ChallengeData['results'],
                }
              : {}),
            updatedAt: Timestamp.now(),
          },
          { currentData: data }
        );
        console.log('🏆 DEADLINE PASSED: Winner by default (opponent no-show):', submittedWallet);
        const afterSnap = await getDoc(challengeRef);
        const afterData = afterSnap.data() as ChallengeData;
        if (afterData.statsApplied !== true && data.players?.some((p: string) => !walletsEqual(p, submittedWallet))) {
          try {
            await invokeApplyMatchStats({ challengeId });
          } catch (e) {
            console.error('applyMatchStats failed (deadline default win)', e);
          }
        }
      } else {
        // They claimed they lost → The OTHER player wins by default
        const opponentWallet = data.players?.find((p: string) => !walletsEqual(p, submittedWallet));
        const winnerField = opponentWallet ? normalizeWinnerWallet(opponentWallet) : 'tie';
        await writeChallengeFields(
          challengeId,
          {
            status: 'completed',
            winner: winnerField,
            resolutionType: winnerField === 'tie' ? 'forfeit' : 'auto',
            ...(winnerField !== 'tie' && payoutClaimReadyFields()),
            ...(hasAnyProofImageData(data.results as Record<string, any>)
              ? {
                  results: stripProofImageDataFromResults(
                    data.results as Record<string, any>
                  ) as ChallengeData['results'],
                }
              : {}),
            updatedAt: Timestamp.now(),
          },
          { currentData: data }
        );
        console.log('🏆 DEADLINE PASSED: Opponent wins (player admitted defeat, opponent no-show):', opponentWallet);
        const afterSnapForStats = await getDoc(challengeRef);
        const afterDataForStats = afterSnapForStats.data() as ChallengeData | undefined;
        if (afterDataForStats?.statsApplied !== true) {
          try {
            await invokeApplyMatchStats({ challengeId });
          } catch (e) {
            console.error('applyMatchStats failed (deadline opponent win / tie)', e);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking result deadline:', error);
    throw error;
  }
};

/**
 * Request to cancel an in-progress challenge
 * Requires mutual agreement from both players
 */
export const requestCancelChallenge = async (
  challengeId: string,
  walletAddress: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeSnap = await getDoc(challengeRef);
    
    if (!challengeSnap.exists()) {
      throw new Error('Challenge not found');
    }
    
    const challenge = challengeSnap.data() as ChallengeData;
    
    // Check if user is a participant
    if (!isParticipantWallet(challenge.players, walletAddress)) {
      throw new Error('Only participants can request cancellation');
    }
    
    // Get current cancel requests
    const cancelRequests = challenge.cancelRequests || [];
    
    if (cancelRequests.some((w) => walletsEqual(w, walletAddress))) {
      console.log('⚠️ User already requested cancellation - checking chat for notification');
      const chatQuery = query(
        collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'),
        where('sender', '==', 'SYSTEM'),
      );
      const chatSnap = await getDocs(chatQuery);
      const hasSystemMessage = chatSnap.docs.some((d) =>
        d.data().text?.includes('requested to cancel'),
      );
      if (!hasSystemMessage) {
        const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
        await addDoc(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'), {
          text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
          sender: 'SYSTEM',
          timestamp: Timestamp.now(),
        });
      }
      return;
    }
    
    // Add this user's cancel request
    const newCancelRequests = [...cancelRequests, walletAddress];
    
    // If both players agreed (all players requested cancel)
    if (challenge.players && newCancelRequests.length === challenge.players.length) {
      console.log('✅ Both players agreed to cancel - Cancelling challenge and refunding');
      await writeChallengeFields(
        challengeId,
        {
          status: 'cancelled',
          cancelRequests: newCancelRequests,
          winner: 'cancelled',
          updatedAt: Timestamp.now(),
        },
        { currentData: challenge, actingWallet: walletAddress }
      );
      
      await addDoc(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'), {
        text: '🤝 Both players agreed to cancel. Challenge cancelled, challenge amounts will be returned.',
        sender: 'SYSTEM',
        timestamp: Timestamp.now(),
      });
    } else {
      // Just one player requested so far
      console.log('⏳ Cancel requested, waiting for other player to agree');
      await writeChallengeFields(
        challengeId,
        {
          cancelRequests: newCancelRequests,
          updatedAt: Timestamp.now(),
        },
        { currentData: challenge, actingWallet: walletAddress }
      );
      
      const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
      await addDoc(collection(db, 'challenge_lobbies', challengeId, 'challenge_chats'), {
        text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
        sender: 'SYSTEM',
        timestamp: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('❌ Error requesting cancel:', error);
    throw error;
  }
};

// ============================================
// PLAYER STATS TRACKING
// ============================================

// Basic profanity filter (simple word list - can be expanded)
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 
  'dick', 'cock', 'pussy', 'nigger', 'nigga', 'fag', 'faggot',
  'retard', 'retarded', 'nazi', 'hitler'
];

function sanitizeDisplayName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  
  const lowerName = name.toLowerCase();
  
  // Check if name contains blocked words
  for (const word of BLOCKED_WORDS) {
    if (lowerName.includes(word)) {
      console.log('⚠️ Blocked inappropriate username:', name);
      return undefined; // Return undefined to use wallet address instead
    }
  }
  
  // Trim whitespace and limit length
  const sanitized = name.trim().slice(0, 20);
  
  return sanitized || undefined;
}

export interface PlayerStats {
  wallet: string;
  displayName?: string; // Player's chosen username (from creatorTag)
  country?: string; // Player's country code (e.g., "US", "GB", "CA")
  profileImage?: string; // Profile image URL from Firebase Storage
  wins: number;
  losses: number;
  winRate: number;
  totalEarned: number;
  gamesPlayed: number;
  lastActive: Timestamp;
  // Trust score fields
  trustScore?: number; // Review-derived average (0-10); written by trust review flows only
  behaviorTrustScore?: number; // Gameplay / behavioral trust; written by stat update flows only
  /** Computed on read in getPlayerStats / leaderboard helpers; not stored in Firestore */
  displayTrustScore?: number;
  trustReviews?: number; // Number of trust reviews received
  disputesWon?: number;
  disputesLost?: number;
  forfeits?: number;
  cleanWins?: number;
  /** Lightweight skill progression; default 100 when missing */
  skillScore?: number;
  // Special trophies
  ogFirst1k?: boolean; // OG First 2.1K Members trophy - automatically awarded if joined before 2100 users (represents 21M token supply)
  founderChallenge?: boolean; // Founder Challenge trophy - awarded when player participates in a Founder Challenge
  gameStats: {
    [game: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
  categoryStats: {
    [category: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
}

/** Blended trust for UI only; not persisted. */
export function computeDisplayTrustScore(
  stats: Pick<PlayerStats, 'trustScore' | 'behaviorTrustScore'>
): number {
  const ts = stats.trustScore;
  const bt = stats.behaviorTrustScore;
  return ts != null && bt != null
    ? ts * 0.5 + bt * 0.5
    : ts ?? bt ?? 5;
}

function withDisplayTrust(stats: PlayerStats): PlayerStats {
  return { ...stats, displayTrustScore: computeDisplayTrustScore(stats) };
}

// Team Stats Interface - Elite Esports Teams
export interface TeamStats {
  teamId: string; // Unique team ID (wallet address of team key holder)
  teamName: string; // Team name
  teamKey: string; // Main wallet that controls the team (team owner)
  teamImage?: string; // Team logo/image URL (base64 stored in Firestore)
  members: string[]; // Array of member wallet addresses (up to 69)
  wins: number;
  losses: number;
  winRate: number;
  totalEarned: number;
  gamesPlayed: number;
  lastActive: Timestamp;
  createdAt: Timestamp;
  // Team trust score (average of all members)
  trustScore?: number;
  behaviorTrustScore?: number;
  forfeits?: number;
  trustReviews?: number;
  /** Team skill progression; same rules as PlayerStats.skillScore; default 100 when missing */
  skillScore?: number;
  // Team game stats
  gameStats: {
    [game: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
  categoryStats: {
    [category: string]: {
      wins: number;
      losses: number;
      earned: number;
    }
  };
}

/**
 * Get player stats by wallet address.
 * Tries lowercase doc id if not found so profile works regardless of URL casing.
 */
export async function getPlayerStats(wallet: string): Promise<PlayerStats | null> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);

    if (playerSnap.exists()) {
      return withDisplayTrust(playerSnap.data() as PlayerStats);
    }

    const walletLower = wallet.toLowerCase();
    if (walletLower !== wallet) {
      const fallbackRef = doc(db, 'player_stats', walletLower);
      const fallbackSnap = await getDoc(fallbackRef);
      if (fallbackSnap.exists()) {
        return withDisplayTrust(fallbackSnap.data() as PlayerStats);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    return null;
  }
}

export interface PlayerEarningByChallenge {
  challengeId: string;
  title?: string;
  game?: string;
  amount: number;
  completedAt: Date;
  format?: 'standard' | 'tournament';
}

/**
 * Fetch challenges where the player won, for "earnings per challenge" on profile.
 * Returns completed challenges only, sorted by completion time (newest first).
 * Queries both wallet and wallet.toLowerCase() so profile works regardless of URL casing.
 */
export async function getPlayerEarningsByChallenge(wallet: string, limitCount: number = 50): Promise<PlayerEarningByChallenge[]> {
  try {
    const challengesRef = collection(db, 'challenges');
    const walletLower = wallet.toLowerCase();
    const seenIds = new Set<string>();
    const items: PlayerEarningByChallenge[] = [];

    const addFromSnap = (snap: { forEach: (fn: (d: { id: string; data: () => unknown }) => void) => void }) => {
      snap.forEach((d) => {
        if (seenIds.has(d.id)) return;
        const data = d.data() as ChallengeData;
        if (data.status !== 'completed') return;
        const amount = data.prizePool ?? 0;
        const ts = data.payoutTimestamp ?? (data as { updatedAt?: Timestamp }).updatedAt ?? data.createdAt;
        const completedAt = ts?.toMillis?.() ? new Date(ts.toMillis()) : new Date(0);
        seenIds.add(d.id);
        items.push({
          challengeId: d.id,
          title: data.title,
          game: data.game,
          amount,
          completedAt,
          format: data.format,
        });
      });
    };

    const q1 = query(challengesRef, where('winner', '==', wallet), limit(limitCount * 2));
    addFromSnap(await getDocs(q1));

    if (walletLower !== wallet) {
      const q2 = query(challengesRef, where('winner', '==', walletLower), limit(limitCount * 2));
      addFromSnap(await getDocs(q2));
    }

    items.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    return items.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Error fetching player earnings by challenge:', error);
    return [];
  }
}

/**
 * Update player's lastActive timestamp when they connect/view the page
 * This ensures they show as "online" in the stats
 */
export async function updatePlayerLastActive(wallet: string): Promise<void> {
  await invokeUpdatePlayerMeta({ wallet, touchLastActive: true });
}

/**
 * Get total USDFG rewarded from cached stats document
 * Uses a single document to avoid querying all founder_rewards records
 */
export async function getTotalUSDFGRewarded(): Promise<number> {
  try {
    const statsRef = doc(db, 'stats', 'total_rewarded');
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      return data.total || 0;
    }
    
    // If stats document doesn't exist yet, calculate from founder_rewards and create it
    const rewardsCollection = collection(db, 'founder_rewards');
    const snapshot = await getDocs(rewardsCollection);
    
    let total = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      total += data.amount || 0;
    });
    
    // Create cached stats document for future reads
    await setDoc(statsRef, {
      total,
      lastUpdated: Timestamp.now(),
    });
    
    return total;
  } catch (error) {
    console.error('❌ Error getting total USDFG rewarded:', error);
    return 0; // Return 0 on error
  }
}

/**
 * Get count of players who are currently online (active in last 10 minutes)
 */
export async function getPlayersOnlineCount(): Promise<number> {
  try {
    const tenMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000));
    const statsCollection = collection(db, 'player_stats');
    const q = query(
      statsCollection,
      where('lastActive', '>=', tenMinutesAgo)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting players online count:', error);
    return 0;
  }
}

/**
 * Ensure a Firestore user document exists for lobby locking features.
 * Creates the document with a null currentLock if it does not already exist.
 */
export async function ensureUserLockDocument(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const userRef = doc(userLocksCollection, userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        currentLock: null,
        createdAt: serverTimestamp(),
        lockUpdatedAt: serverTimestamp(),
      });
    } else if (!('currentLock' in (snapshot.data() || {}))) {
      await setDoc(userRef, {
        currentLock: null,
        lockUpdatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('❌ Error ensuring user lock document:', error);
  }
}

/**
 * Set or clear the current lock target for a user in the lobby.
 */
export async function setUserCurrentLock(userId: string, opponentId: string | null): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to set current lock');
  }

  try {
    const normalizedOpponentId = opponentId ? opponentId.toLowerCase() : null;
    const userRef = doc(userLocksCollection, userId);
    await setDoc(userRef, {
      currentLock: normalizedOpponentId,
      lockUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('❌ Error setting user currentLock:', error);
    throw error;
  }
}

interface UpsertLockNotificationInput {
  matchId: string;
  status: LockNotificationStatus;
  initiator?: string;
  target?: string;
  initiatorDisplayName?: string;
  targetDisplayName?: string;
  lastActionBy: string;
}

export async function upsertLockNotification({
  matchId,
  status,
  initiator,
  target,
  initiatorDisplayName,
  targetDisplayName,
  lastActionBy,
}: UpsertLockNotificationInput): Promise<void> {
  if (!matchId) {
    throw new Error('matchId is required for lock notification');
  }

  try {
    const notificationRef = doc(lockNotificationsCollection, matchId);
    const payload: Record<string, any> = {
      matchId,
      status,
      lastActionBy,
      updatedAt: serverTimestamp(),
    };

    if (initiator) {
      payload.initiator = initiator;
    }
    if (target) {
      payload.target = target;
    }
    if (initiatorDisplayName !== undefined) {
      payload.initiatorDisplayName = initiatorDisplayName;
    }
    if (targetDisplayName !== undefined) {
      payload.targetDisplayName = targetDisplayName;
    }
    if (initiator && target) {
      payload.participants = [initiator.toLowerCase(), target.toLowerCase()];
    }
    if (status === 'pending') {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(notificationRef, payload, { merge: true });
  } catch (error) {
    console.error('❌ Error upserting lock notification:', error);
    throw error;
  }
}

/**
 * One-time fetch of lock notifications for a wallet (no listener).
 * Use for manual refresh or when leaderboard/friendly section is open.
 */
export async function getLockNotificationsForWallet(wallet: string): Promise<LockNotification[]> {
  if (!wallet) return [];
  try {
    const walletLower = wallet.toLowerCase();
    const q = query(
      lockNotificationsCollection,
      where('participants', 'array-contains', walletLower)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        matchId: data.matchId,
        initiator: data.initiator,
        target: data.target,
        initiatorDisplayName: data.initiatorDisplayName,
        targetDisplayName: data.targetDisplayName,
        participants: data.participants,
        status: data.status,
        lastActionBy: data.lastActionBy,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    });
  } catch (error) {
    console.error('❌ Error fetching lock notifications:', error);
    return [];
  }
}

/**
 * Create or update a challenge notification
 */
export async function upsertChallengeNotification({
  challengeId,
  creator,
  targetPlayer,
  creatorDisplayName,
  targetDisplayName,
  challengeTitle,
  entryFee,
  prizePool,
  status,
}: {
  challengeId: string;
  creator: string;
  targetPlayer: string;
  creatorDisplayName?: string;
  targetDisplayName?: string;
  challengeTitle?: string;
  entryFee?: number;
  prizePool?: number;
  status: ChallengeNotificationStatus;
}): Promise<void> {
  if (!challengeId || !creator || !targetPlayer) {
    throw new Error('challengeId, creator, and targetPlayer are required');
  }

  try {
    // Create notification ID from challengeId and targetPlayer
    const notificationId = `${challengeId}_${targetPlayer.toLowerCase()}`;
    const notificationRef = doc(db, 'challenge_notifications', notificationId);
    
    const payload: Record<string, any> = {
      challengeId,
      creator,
      targetPlayer: targetPlayer.toLowerCase(),
      status,
      updatedAt: serverTimestamp(),
    };

    if (creatorDisplayName !== undefined) {
      payload.creatorDisplayName = creatorDisplayName;
    }
    if (targetDisplayName !== undefined) {
      payload.targetDisplayName = targetDisplayName;
    }
    if (challengeTitle !== undefined) {
      payload.challengeTitle = challengeTitle;
    }
    if (entryFee !== undefined) {
      payload.entryFee = entryFee;
    }
    if (prizePool !== undefined) {
      payload.prizePool = prizePool;
    }

    const notificationSnap = await getDoc(notificationRef);
    if (notificationSnap.exists()) {
      await updateDoc(notificationRef, payload);
    } else {
      await setDoc(notificationRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }

    console.log(`✅ Challenge notification ${status} for ${targetPlayer.slice(0, 8)}...`);
  } catch (error) {
    console.error('❌ Error upserting challenge notification:', error);
    throw error;
  }
}

/**
 * REMOVED: listenToChallengeNotifications (realtime listener for UI only).
 * Users see new challenges via listenToChallenges; use "Check your challenges" / refresh instead.
 */

/**
 * Clear the lock state for two users after a friendly match resolves.
 */
export async function clearMutualLock(userA: string, userB: string): Promise<void> {
  if (!userA || !userB) {
    throw new Error('Both user IDs are required to clear mutual lock');
  }

  try {
    const batch = writeBatch(db);
    const userARef = doc(userLocksCollection, userA);
    const userBRef = doc(userLocksCollection, userB);

    batch.set(userARef, {
      currentLock: null,
      lockUpdatedAt: serverTimestamp(),
    }, { merge: true });

    batch.set(userBRef, {
      currentLock: null,
      lockUpdatedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();
  } catch (error) {
    console.error('❌ Error clearing mutual lock:', error);
    throw error;
  }
}

/**
 * REMOVED: listenToAllUserLocks (full users collection listener — too expensive).
 * Lock state is now derived from lock_notifications via getLockNotificationsForWallet
 * when needed (e.g. on mount or manual refresh). See getLockNotificationsForWallet.
 */

/**
 * Record a friendly match submission. Stores each player's self-reported outcome.
 */
export async function recordFriendlyMatchResult(params: {
  matchId: string;
  reporter: string;
  opponent: string;
  didWin: boolean;
  proofProvided: boolean;
}): Promise<void> {
  if (!params.matchId) {
    throw new Error('matchId is required to record friendly match result');
  }

  try {
    const matchRef = doc(db, 'friendly_matches', params.matchId);
    const matchSnap = await getDoc(matchRef);
    const timestamp = serverTimestamp();
    const players = [params.reporter, params.opponent].filter(Boolean).sort();

    const payload: Record<string, any> = {
      matchId: params.matchId,
      players,
      updatedAt: timestamp,
      [`submissions.${params.reporter}`]: {
        didWin: params.didWin,
        proofProvided: params.proofProvided,
        submittedAt: timestamp,
      }
    };

    if (!matchSnap.exists()) {
      payload.createdAt = timestamp;
    }

    await setDoc(matchRef, payload, { merge: true });
  } catch (error) {
    console.error('❌ Error recording friendly match result:', error);
    throw error;
  }
}

/**
 * Update player display name in Firestore
 */
/**
 * Store a trust review in Firestore and update the reviewed player's trust score
 */
export async function storeTrustReview(
  reviewer: string,
  opponent: string,
  challengeId: string,
  review: {
    honesty: number;
    fairness: number;
    sportsmanship: number;
    tags: string[];
    trustScore10: number;
    comment?: string;
  }
): Promise<void> {
  try {
    const reviewerLower = reviewer.toLowerCase();
    const opponentLower = opponent.toLowerCase();
    
    // Check if a review already exists for this reviewer + opponent + challenge combination
    const reviewsRef = collection(db, 'trust_reviews');
    const existingReviewQuery = query(
      reviewsRef,
      where('reviewer', '==', reviewerLower),
      where('opponent', '==', opponentLower),
      where('challengeId', '==', challengeId)
    );
    
    const existingSnapshot = await getDocs(existingReviewQuery);
    
    if (!existingSnapshot.empty) {
      console.warn(`⚠️ Trust review already exists for challenge ${challengeId.slice(0, 8)}... by ${reviewer.slice(0, 8)}... for ${opponent.slice(0, 8)}...`);
      console.warn(`   Skipping duplicate review. Reviews are one per challenge.`);
      return; // Skip duplicate review - one review per challenge
    }
    
    // Clean review object - remove undefined fields (Firestore doesn't allow undefined)
    const cleanReview: any = {
      honesty: review.honesty,
      fairness: review.fairness,
      sportsmanship: review.sportsmanship,
      tags: review.tags,
      trustScore10: review.trustScore10
    };
    
    // Only include comment if it exists and is not empty
    if (review.comment && review.comment.trim()) {
      cleanReview.comment = review.comment.trim();
    }
    
    // Store the review in Firestore
    await addDoc(collection(db, 'trust_reviews'), {
      reviewer: reviewerLower,
      opponent: opponentLower,
      challengeId,
      review: cleanReview,
      timestamp: Timestamp.now()
    });
    
    console.log(`✅ Trust review stored for ${opponent.slice(0, 8)}... by ${reviewer.slice(0, 8)}... (challenge: ${challengeId.slice(0, 8)}...)`);
    
    // Trust score sync is best-effort (e.g. Secure Token refresh may be blocked on some origins)
    try {
      await updatePlayerTrustScore(opponent);
    } catch (scoreError) {
      console.error(
        `❌ Trust review saved but trust score sync failed for ${opponent.slice(0, 8)}...:`,
        scoreError
      );
    }
  } catch (error) {
    console.error('❌ Error storing trust review:', error);
    throw error;
  }
}

/**
 * Update a player's trust score in Firestore based on all their reviews
 */
export async function updatePlayerTrustScore(wallet: string): Promise<void> {
  try {
    console.log(`🔄 Recalculating trust score for ${wallet.slice(0, 8)}... (server)`);
    const res = await invokeUpdateTrustScore({ wallet });
    console.log(
      `✅ Trust score sync for ${wallet.slice(0, 8)}...: ${res.trustScore ?? '?'}/10 (${res.trustReviews ?? '?'} reviews)`
    );
  } catch (error) {
    console.error(`❌ Error updating player trust score for ${wallet.slice(0, 8)}...:`, error);
    throw error;
  }
}

export async function updatePlayerDisplayName(wallet: string, displayName: string): Promise<void> {
  try {
    const sanitized = sanitizeDisplayName(displayName);
    if (!sanitized) {
      console.warn('⚠️ Display name failed sanitization:', displayName);
      return;
    }
    await invokeUpdatePlayerProfile({ wallet, displayName: sanitized });
    console.log(`✅ Updated display name for ${wallet}: "${sanitized}"`);
  } catch (error) {
    console.error('❌ Error updating display name:', error);
    throw error;
  }
}

/**
 * Update player's country in Firestore
 */
export async function updatePlayerCountry(wallet: string, countryCode: string | null): Promise<void> {
  try {
    await invokeUpdatePlayerProfile({
      wallet,
      country: countryCode,
    });
    if (countryCode) {
      console.log(`✅ Updated country for ${wallet}: ${countryCode}`);
    } else {
      console.log(`✅ Removed country for ${wallet}`);
    }
  } catch (error) {
    console.error('❌ Error updating country:', error);
    throw error;
  }
}

/**
 * Upload profile image as base64 stored in Firestore (FREE - uses Firestore free tier)
 * Firestore free tier: 1GB storage = ~20,000 profile images at 50KB each
 */
export async function uploadProfileImage(wallet: string, imageFile: File): Promise<string> {
  try {
    // Compress image first to reduce size (~50KB target)
    const compressedFile = await compressImage(imageFile);
    
    // Convert to base64 data URL
    const base64 = await fileToBase64(compressedFile);
    
    console.log(`✅ Profile image compressed and ready for ${wallet} (${Math.round(base64.length / 1024)}KB)`);
    
    // Return base64 data URL - will be stored in Firestore
    // Firestore free tier: 1GB = plenty for profile images
    return base64;
  } catch (error) {
    console.error('❌ Error processing profile image:', error);
    throw error;
  }
}

/**
 * Convert File to base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image to reduce file size (target: ~50KB)
 */
async function compressImage(file: File, maxSizeKB: number = 50): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions (max 400x400 for profile images)
        const maxDimension = 400;
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if compression fails
            }
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Update player's profile image URL in Firestore
 */
export async function updatePlayerProfileImage(wallet: string, imageURL: string | null): Promise<void> {
  try {
    await invokeUpdatePlayerProfile({
      wallet,
      profileImage: imageURL,
    });
    if (imageURL) {
      console.log(`✅ Updated profile image for ${wallet}`);
    } else {
      console.log(`✅ Removed profile image for ${wallet}`);
    }
  } catch (error) {
    console.error('❌ Error updating profile image:', error);
    throw error;
  }
}

/**
 * Upload team image as base64 stored in Firestore (FREE - uses Firestore free tier)
 * Separate from individual player profile images
 */
export async function uploadTeamImage(teamKey: string, imageFile: File): Promise<string> {
  try {
    // Compress image first to reduce size (~50KB target)
    const compressedFile = await compressImage(imageFile);
    
    // Convert to base64 data URL
    const base64 = await fileToBase64(compressedFile);
    
    console.log(`✅ Team image compressed and ready for ${teamKey} (${Math.round(base64.length / 1024)}KB)`);
    
    // Return base64 data URL - will be stored in Firestore
    return base64;
  } catch (error) {
    console.error('❌ Error processing team image:', error);
    throw error;
  }
}

/**
 * Update team's image URL in Firestore
 */
export async function updateTeamImage(teamKey: string, imageURL: string | null): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamKey);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      if (imageURL) {
        await updateDoc(teamRef, {
          teamImage: imageURL
        });
        console.log(`✅ Updated team image for ${teamKey}`);
      } else {
        // Remove teamImage field from Firestore
        await updateDoc(teamRef, {
          teamImage: null
        });
        console.log(`✅ Removed team image for ${teamKey}`);
      }
    } else {
      throw new Error("Team does not exist");
    }
  } catch (error) {
    console.error('❌ Error updating team image:', error);
    throw error;
  }
}

/**
 * Create a new team
 */
export async function createTeam(teamKey: string, teamName: string): Promise<string> {
  try {
    const teamRef = doc(db, 'teams', teamKey);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      throw new Error("Team already exists with this wallet");
    }
    
    const newTeam: TeamStats = {
      teamId: teamKey,
      teamName: teamName.trim(),
      teamKey: teamKey,
      members: [teamKey], // Team key holder is first member
      wins: 0,
      losses: 0,
      winRate: 0,
      totalEarned: 0,
      gamesPlayed: 0,
      lastActive: Timestamp.now(),
      createdAt: Timestamp.now(),
      trustScore: 0,
      trustReviews: 0,
      gameStats: {},
      categoryStats: {}
    };
    
    await setDoc(teamRef, newTeam);
    console.log(`✅ Created team: ${teamName} (${teamKey})`);
    return teamKey;
  } catch (error) {
    console.error('❌ Error creating team:', error);
    throw error;
  }
}

/**
 * Join a team
 */
export async function joinTeam(teamId: string, memberWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const teamData = teamSnap.data() as TeamStats;
    
    if (teamData.members.includes(memberWallet)) {
      throw new Error("Already a member of this team");
    }
    
    if (teamData.members.length >= 69) {
      throw new Error("Team is full (69 members max)");
    }
    
    await updateDoc(teamRef, {
      members: arrayUnion(memberWallet),
      lastActive: Timestamp.now()
    });
    
    console.log(`✅ ${memberWallet} joined team: ${teamData.teamName}`);
  } catch (error) {
    console.error('❌ Error joining team:', error);
    throw error;
  }
}

/**
 * Leave a team
 */
export async function leaveTeam(teamId: string, memberWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const teamData = teamSnap.data() as TeamStats;
    
    if (teamData.teamKey === memberWallet) {
      throw new Error("Team key holder cannot leave. If you need to transfer leadership, share the wallet seed phrase with another team member.");
    }
    
    if (!teamData.members.includes(memberWallet)) {
      throw new Error("Not a member of this team");
    }
    
    await updateDoc(teamRef, {
      members: teamData.members.filter(m => m !== memberWallet),
      lastActive: Timestamp.now()
    });
    
    console.log(`✅ ${memberWallet} left team: ${teamData.teamName}`);
  } catch (error) {
    console.error('❌ Error leaving team:', error);
    throw error;
  }
}

/**
 * Remove a member from a team (team key holder only)
 */
export async function removeTeamMember(teamId: string, memberWallet: string, requesterWallet: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }

    const teamData = teamSnap.data() as TeamStats;

    if (teamData.teamKey !== requesterWallet) {
      throw new Error("Only the team key holder can remove members");
    }

    if (memberWallet === teamData.teamKey) {
      throw new Error("Team key holder cannot be removed");
    }

    if (!teamData.members.includes(memberWallet)) {
      throw new Error("Player is not a member of this team");
    }

    await updateDoc(teamRef, {
      members: arrayRemove(memberWallet),
      lastActive: Timestamp.now()
    });

    console.log(`✅ ${memberWallet} was removed from team: ${teamData.teamName} by ${requesterWallet}`);
  } catch (error) {
    console.error('❌ Error removing team member:', error);
    throw error;
  }
}

/**
 * Get team stats by team ID
 */
export async function getTeamStats(teamId: string): Promise<TeamStats | null> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return null;
    }
    
    return teamSnap.data() as TeamStats;
  } catch (error) {
    console.error('❌ Error fetching team stats:', error);
    return null;
  }
}

/**
 * Get team by member wallet
 */
export async function getTeamByMember(memberWallet: string): Promise<TeamStats | null> {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('members', 'array-contains', memberWallet));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data() as TeamStats;
  } catch (error) {
    console.error('❌ Error fetching team by member:', error);
    return null;
  }
}

/**
 * Get top teams for leaderboard
 */
export async function getTopTeams(limitCount: number = 10, sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned'): Promise<TeamStats[]> {
  try {
    const teamsRef = collection(db, 'teams');
    let q;
    
    switch (sortBy) {
      case 'wins':
        q = query(teamsRef, orderBy('wins', 'desc'), limit(limitCount));
        break;
      case 'winRate':
        q = query(teamsRef, orderBy('winRate', 'desc'), limit(limitCount));
        break;
      case 'totalEarned':
      default:
        q = query(teamsRef, orderBy('totalEarned', 'desc'), limit(limitCount));
        break;
    }
    
    const querySnapshot = await getDocs(q);
    const teams: TeamStats[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as TeamStats;
      // Ensure trustScore is always a number (default to 0 if undefined)
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      teams.push(data);
    });
    
    return teams;
  } catch (error) {
    console.error('❌ Error fetching top teams:', error);
    return [];
  }
}

export async function getLeaderboardTeams(
  limitCount?: number,
  sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned',
  includeAll: boolean = false
): Promise<TeamStats[]> {
  if (!includeAll) {
    return getTopTeams(limitCount ?? 10, sortBy);
  }
  try {
    const teamsRef = collection(db, 'teams');
    const snapshot = await getDocs(teamsRef);
    const teams: TeamStats[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as TeamStats;
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      if (data.wins === undefined) {
        data.wins = 0;
      }
      if (data.losses === undefined) {
        data.losses = 0;
      }
      if (data.totalEarned === undefined) {
        data.totalEarned = 0;
      }
      if (data.winRate === undefined) {
        data.winRate = 0;
      }
      teams.push(data);
    });

    teams.sort((a, b) => {
      const aValue = (a as any)[sortBy] ?? 0;
      const bValue = (b as any)[sortBy] ?? 0;
      return bValue - aValue;
    });

    if (limitCount && limitCount > 0) {
      return teams.slice(0, limitCount);
    }
    return teams;
  } catch (error) {
    console.error('❌ Error fetching leaderboard teams:', error);
    return [];
  }
}

/**
 * Get top players for leaderboard
 */
export async function getTopPlayers(limitCount: number = 10, sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned'): Promise<PlayerStats[]> {
  try {
    console.log(`📊 Fetching top ${limitCount} players (sorted by ${sortBy})...`);
    const statsCollection = collection(db, 'player_stats');
    
    // Simple query without where clause to avoid compound index requirement
    const q = query(
      statsCollection,
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const players: PlayerStats[] = [];
    
    snapshot.forEach((doc) => {
      const raw = doc.data() as PlayerStats;
      const data = withDisplayTrust(raw);
      const displayName = data.displayName ? `"${data.displayName}"` : '(no display name)';
      const trustReviews = data.trustReviews || 0;
      const dTrust = data.displayTrustScore ?? computeDisplayTrustScore(data);
      console.log(`   Player: ${data.wallet.slice(0, 8)}... - Name: ${displayName} - ${data.totalEarned} USDFG - ${data.winRate}% WR - Display trust: ${dTrust}/10 (${trustReviews} reviews)`);
      
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      
      players.push(data);
    });
    
    console.log(`✅ Fetched ${players.length} players total`);
    return players;
  } catch (error) {
    console.error('❌ Error fetching top players:', error);
    console.error('   Error details:', error);
    return [];
  }
}

export async function getLeaderboardPlayers(
  limitCount?: number,
  sortBy: 'wins' | 'winRate' | 'totalEarned' = 'totalEarned',
  includeAll: boolean = false
): Promise<PlayerStats[]> {
  if (!includeAll) {
    return getTopPlayers(limitCount ?? 10, sortBy);
  }
  try {
    const statsCollection = collection(db, 'player_stats');
    const snapshot = await getDocs(statsCollection);
    const players: PlayerStats[] = [];

    snapshot.forEach((doc) => {
      const raw = doc.data() as PlayerStats;
      const data = withDisplayTrust(raw);
      if (data.trustScore === undefined) {
        data.trustScore = 0;
      }
      if (data.trustReviews === undefined) {
        data.trustReviews = 0;
      }
      if (data.wins === undefined) {
        data.wins = 0;
      }
      if (data.losses === undefined) {
        data.losses = 0;
      }
      if (data.totalEarned === undefined) {
        data.totalEarned = 0;
      }
      if (data.winRate === undefined) {
        data.winRate = 0;
      }
      if (data.gamesPlayed === undefined) {
        data.gamesPlayed = 0;
      }
      players.push(data);
    });

    players.sort((a, b) => {
      const aValue = (a as any)[sortBy] ?? 0;
      const bValue = (b as any)[sortBy] ?? 0;
      return bValue - aValue;
    });

    if (limitCount && limitCount > 0) {
      return players.slice(0, limitCount);
    }
    return players;
  } catch (error) {
    console.error('❌ Error fetching leaderboard players:', error);
    return [];
  }
}

/**
 * Check if a user has already submitted a trust review for a specific challenge
 */
export async function hasUserReviewedChallenge(reviewer: string, challengeId: string): Promise<boolean> {
  try {
    const reviewsRef = collection(db, 'trust_reviews');
    const reviewQuery = query(
      reviewsRef,
      where('reviewer', '==', reviewer.toLowerCase()),
      where('challengeId', '==', challengeId)
    );
    
    const snapshot = await getDocs(reviewQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ Error checking if user has reviewed challenge:', error);
    return false; // On error, assume not reviewed (allows review to be submitted)
  }
}

/**
 * Recalculate trust scores for all players (useful for fixing integrity stats)
 * This will update all players' trust scores based on their reviews in Firestore
 */
export async function recalculateAllTrustScores(): Promise<void> {
  try {
    console.log('🔄 Recalculating trust scores for all players...');
    const statsCollection = collection(db, 'player_stats');
    const snapshot = await getDocs(statsCollection);
    
    let updated = 0;
    let skipped = 0;
    
    for (const doc of snapshot.docs) {
      const wallet = doc.id;
      try {
        await updatePlayerTrustScore(wallet);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update trust score for ${wallet.slice(0, 8)}...:`, error);
        skipped++;
      }
    }
    
    console.log(`✅ Recalculated trust scores: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error('❌ Error recalculating all trust scores:', error);
    throw error;
  }
}

// ============================================
// PLAYER-PAID PAYOUT SYSTEM
// ============================================

/** Read payout status; legacy completed + needsPayout docs without payoutStatus count as pending. */
function readEffectivePayoutStatus(
  data: ChallengeData
): 'pending' | 'processing' | 'paid' | undefined {
  const raw = (data as { rawData?: Partial<ChallengeData> }).rawData;
  const explicit = data.payoutStatus ?? raw?.payoutStatus;
  if (explicit === 'pending' || explicit === 'processing' || explicit === 'paid') {
    return explicit;
  }
  if (data.needsPayout === true && data.status === 'completed') {
    return 'pending';
  }
  return undefined;
}

/** Fields required whenever escrow payout is claimable (legacy docs may omit payoutStatus). */
function payoutClaimReadyFields(): {
  needsPayout: true;
  payoutTriggered: false;
  canClaim: true;
  payoutStatus: 'pending';
} {
  return {
    needsPayout: true,
    payoutTriggered: false,
    canClaim: true,
    payoutStatus: 'pending',
  };
}

/** Age of payout lock in ms; null if unset or not parseable (callers may treat as unknown/stale). */
function payoutLockAgeMs(data: ChallengeData): number | null {
  const at = data.payoutAttemptedAt;
  if (at == null) return null;
  try {
    if (typeof (at as Timestamp).toMillis === 'function') {
      const t = (at as Timestamp).toMillis();
      if (typeof t !== 'number' || Number.isNaN(t)) return null;
      const age = Date.now() - t;
      return Number.isFinite(age) ? age : null;
    }
    const raw = at as { seconds?: number; _seconds?: number };
    const sec = raw.seconds ?? raw._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      return Date.now() - sec * 1000;
    }
  } catch {
    return null;
  }
  return null;
}

function challengeHasValidPayoutWinner(data: ChallengeData): boolean {
  return (
    !!data.winner &&
    data.winner !== 'forfeit' &&
    data.winner !== 'tie'
  );
}

function ensureWinnerInRoster(data: ChallengeData): void {
  const roster = data.players || [];
  const inRoster = roster.some((p) => walletsEqual(p, data.winner));
  if (!inRoster) {
    throw new Error('❌ Winner is not a valid participant.');
  }
}

/** Outcome from {@link claimChallengePrize} (no silent soft-returns). */
export type ClaimPrizeResult =
  | { status: 'success'; signature?: string }
  | { status: 'stale_retry'; outcome: 'success'; signature?: string }
  | { status: 'stale_retry'; outcome: 'error'; message: string }
  | { status: 'already_claimed'; signature?: string }
  | { status: 'in_flight'; isStale?: boolean }
  | { status: 'cooldown' }
  | { status: 'not_available'; message?: string }
  | { status: 'error'; message: string; walletRejected?: boolean };

function isWalletUserRejection(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('rejected the request') ||
    msg.includes('approval denied') ||
    msg.includes('transaction cancelled') ||
    msg.includes('transaction canceled') ||
    msg.includes('request rejected') ||
    (msg.includes('sign') && msg.includes('reject'))
  );
}

function wrapStaleRetryResult(
  recoveredFromStale: boolean,
  base: ClaimPrizeResult
): ClaimPrizeResult {
  if (!recoveredFromStale) return base;
  if (base.status === 'success') {
    return { status: 'stale_retry', outcome: 'success', signature: base.signature };
  }
  if (base.status === 'error') {
    return {
      status: 'stale_retry',
      outcome: 'error',
      message: base.message,
    };
  }
  return base;
}

/** Escrow tournaments need `needsPayout` so the payout transaction guard matches `canClaim`. */
function escrowTournamentClaimGatePatch(data: ChallengeData): {
  needsPayout: true;
  payoutTriggered: false;
  payoutStatus: 'pending';
} | Record<string, never> {
  const raw = (data as { rawData?: Partial<ChallengeData> }).rawData;
  const entryFee = Number(data.entryFee ?? raw?.entryFee ?? 0);
  const creator = (data.creator || raw?.creator || '').toLowerCase();
  const isFree = entryFee === 0 || entryFee < 0.000000001;
  const founderPR = Number(data.founderParticipantReward ?? raw?.founderParticipantReward ?? 0);
  const founderWB = Number(data.founderWinnerBonus ?? raw?.founderWinnerBonus ?? 0);
  const isAdminCreator = creator === ADMIN_WALLET.toString().toLowerCase();
  const isFounderTournament =
    isAdminCreator && isFree && (founderPR > 0 || founderWB > 0);
  const pda = typeof data.pda === 'string' && data.pda.trim() !== '';
  if (!pda || isFounderTournament) {
    return {};
  }
  return {
    needsPayout: true,
    payoutTriggered: false,
    payoutStatus: 'pending',
  };
}

/**
 * Claim reward for a completed challenge (WINNER ONLY)
 * 
 * Winner determines automatically, but winner must claim their reward themselves.
 * This way the WINNER pays the gas fee (~$0.0005), not the platform admin.
 * 
 * @param challengeId - Firestore challenge ID
 * @param winnerWallet - Winner's wallet (must sign transaction)
 * @param connection - Solana connection
 */
export async function claimChallengePrize(
  challengeId: string,
  winnerWallet: any,
  connection: any
): Promise<ClaimPrizeResult> {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);

    if (!snap.exists()) {
      return { status: 'error', message: '❌ Challenge not found in Firestore' };
    }

    let data = snap.data() as ChallengeData;

    const payoutSigRaw = data.payoutSignature;
    const hasPayoutSignature =
      payoutSigRaw != null && String(payoutSigRaw).trim() !== '';

    if (hasPayoutSignature) {
      const sigTrim = String(payoutSigRaw).trim();
      if (looksLikeSolanaTxSignature(sigTrim) && (!data.payoutTriggered || !data.prizeClaimedAt)) {
        const acting = typeof data.winner === 'string' ? data.winner : undefined;
        await writeChallengeFields(
          challengeId,
          {
            payoutTriggered: true,
            prizeClaimedAt: data.prizeClaimedAt ?? Timestamp.now(),
            payoutTimestamp: data.payoutTimestamp ?? Timestamp.now(),
            payoutStatus: 'paid',
            needsPayout: false,
            payoutLastError: deleteField(),
            payoutErrorAt: deleteField(),
            payoutLockOwner: deleteField(),
            updatedAt: Timestamp.now(),
          },
          { currentData: data, actingWallet: acting }
        );
      }
      return {
        status: 'already_claimed',
        signature: sigTrim.length > 0 ? sigTrim : undefined,
      };
    }

    if (data.payoutTriggered === true) {
      return { status: 'already_claimed' };
    }

    if (data.prizeClaimedAt) {
      return { status: 'already_claimed' };
    }

    if (readEffectivePayoutStatus(data) === 'paid') {
      return { status: 'already_claimed' };
    }

    const isCompleted = data.status === 'completed';
    if (!isCompleted) {
      return { status: 'not_available', message: 'Challenge is not completed yet.' };
    }

    const hasValidWinner = challengeHasValidPayoutWinner(data);
    if (!hasValidWinner) {
      return { status: 'error', message: '❌ No valid winner for payout.' };
    }

    try {
      ensureWinnerInRoster(data);
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }

    const rawData = (data as any).rawData as Partial<ChallengeData> | undefined;
    const format = data.format ?? rawData?.format;
    const isTournament =
      format === 'tournament' ||
      data.tournament != null ||
      rawData?.tournament != null;

    if (!isTournament) {
      const isAdminResolved =
        !!(data as any).resolvedBy &&
        isCompleted &&
        hasValidWinner;

      const payoutReady =
        data.needsPayout === true ||
        isAdminResolved;
      if (!payoutReady) {
        return {
          status: 'not_available',
          message: 'Prize payout is not enabled for this challenge yet.',
        };
      }
    }

    const entryFee = data.entryFee || rawData?.entryFee || 0;
    const creatorWallet = data.creator || rawData?.creator || '';
    const isFree = entryFee === 0 || entryFee < 0.000000001;
    const isAdminCreator = creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const founderParticipantReward =
      data.founderParticipantReward ?? rawData?.founderParticipantReward ?? 0;
    const founderWinnerBonus = data.founderWinnerBonus ?? rawData?.founderWinnerBonus ?? 0;

    let isFounderTournament = false;
    if (isTournament) {
      isFounderTournament =
        isAdminCreator &&
        isFree &&
        (founderParticipantReward > 0 || founderWinnerBonus > 0);
    }

    if (isFounderTournament) {
      return {
        status: 'not_available',
        message:
          '🏆 This is a Founder Tournament. Rewards are distributed by the platform after the tournament concludes. No action is required from you.',
      };
    }

    const isFounderChallenge = !isTournament && !data.pda && (isFree || isAdminCreator);

    if (isFounderChallenge) {
      return {
        status: 'not_available',
        message:
          '🏆 This is a Founder Challenge. Rewards are transferred manually by the founder after the challenge completes. Please contact the founder to receive your reward.',
      };
    }

    let challengePDA = data.pda;
    if (!challengePDA) {
      return {
        status: 'error',
        message:
          '❌ Challenge has no on-chain PDA. This challenge was created before the PDA field was added. Please create a new challenge to use the claim reward functionality.',
      };
    }

    if (!winnerWallet || !winnerWallet.publicKey) {
      return { status: 'error', message: '❌ Wallet not connected' };
    }

    const callerAddress = winnerWallet.publicKey.toString();
    if (!walletsEqual(callerAddress, data.winner)) {
      return { status: 'error', message: '❌ Only the winner can claim the reward' };
    }

    if (!isTournament) {
      const isAdminResolved =
        !!(data as any).resolvedBy &&
        isCompleted &&
        hasValidWinner;

      const claimableNonTournament =
        data.needsPayout === true ||
        isAdminResolved;
      if (!claimableNonTournament) {
        return {
          status: 'not_available',
          message: 'Prize payout is not enabled for this challenge yet.',
        };
      }
    } else {
      const isAdminResolved = !!(data as any).resolvedBy;
      const claimable =
        data.canClaim === true ||
        (isAdminResolved && isCompleted) ||
        (isCompleted && hasValidWinner);
      if (!claimable) {
        return {
          status: 'not_available',
          message: 'Challenge is not ready for claim yet.',
        };
      }
    }

    const preChainSnap = await getDoc(challengeRef);
    if (!preChainSnap.exists()) {
      return { status: 'error', message: '❌ Challenge not found in Firestore' };
    }
    data = preChainSnap.data() as ChallengeData;

    if (!challengeHasValidPayoutWinner(data)) {
      return { status: 'error', message: '❌ No valid winner for payout.' };
    }

    try {
      ensureWinnerInRoster(data);
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }

    if (
      data.needsPayout === true &&
      data.status === 'completed' &&
      data.payoutStatus !== 'pending' &&
      data.payoutStatus !== 'processing' &&
      data.payoutStatus !== 'paid'
    ) {
      await updateDoc(challengeRef, {
        payoutStatus: 'pending',
        updatedAt: Timestamp.now(),
      });
      data = { ...data, payoutStatus: 'pending' };
    }

    const noPayoutSig =
      data.payoutSignature == null || String(data.payoutSignature).trim() === '';

    const STALE_MS = 2 * 60 * 1000;
    let recoveredFromStale = false;
    const lockAgePre = payoutLockAgeMs(data);
    const payoutStatusPre = readEffectivePayoutStatus(data);
    const stalePreTx =
      payoutStatusPre === 'processing' &&
      noPayoutSig &&
      (lockAgePre === null || lockAgePre > STALE_MS);

    if (stalePreTx) {
      recoveredFromStale = true;
      console.warn('Payout: resetting stale processing lock (pre-transaction)', challengeId);
      await updateDoc(challengeRef, {
        payoutStatus: 'pending',
        payoutLockOwner: deleteField(),
        payoutAttemptedAt: deleteField(),
      });
      const nextData: ChallengeData = {
        ...data,
        payoutStatus: 'pending',
      };
      delete (nextData as unknown as Record<string, unknown>).payoutLockOwner;
      delete (nextData as unknown as Record<string, unknown>).payoutAttemptedAt;
      data = nextData;
      console.warn('Payout: stale pre-transaction reset complete', challengeId, {
        payoutStatus: readEffectivePayoutStatus(data),
        needsPayout: data.needsPayout,
      });
    }

    const concurrentSig =
      data.payoutSignature != null && String(data.payoutSignature).trim() !== '';
    if (concurrentSig || data.payoutTriggered === true) {
      return { status: 'already_claimed' };
    }

    if (readEffectivePayoutStatus(data) === 'paid') {
      return { status: 'already_claimed' };
    }

    const ERROR_SPAM_WINDOW_MS = 1000;
    const COOLDOWN_MS = 3000;

    if (data.payoutErrorAt) {
      let sinceError = Date.now() - data.payoutErrorAt.toMillis();
      if (sinceError < 0) sinceError = 0;

      if (
        sinceError < ERROR_SPAM_WINDOW_MS &&
        data.payoutAttemptedAt &&
        sinceError < 300
      ) {
        return { status: 'cooldown' };
      }
    } else {
      const cdAge = payoutLockAgeMs(data);
      if (cdAge !== null && cdAge >= 0 && cdAge < COOLDOWN_MS) {
        return { status: 'cooldown' };
      }
    }

    const lockOwner = crypto.randomUUID();
    const recoveryState = { fromStale: recoveredFromStale };
    let lockResult: 'done' | 'in_flight' | 'locked';
    console.warn('Payout: entering lock transaction', challengeId, {
      recoveredFromStale: recoveryState.fromStale,
      payoutStatus: readEffectivePayoutStatus(data),
    });
    try {
      lockResult = await runTransaction(db, async (tx) => {
        const txSnap = await tx.get(challengeRef);
        if (!txSnap.exists()) {
          throw new Error('❌ Challenge not found in Firestore');
        }
        const d = txSnap.data() as ChallengeData;
        const dPayoutStatus = readEffectivePayoutStatus(d);

        const hasSig =
          d.payoutSignature != null && String(d.payoutSignature).trim() !== '';

        if (hasSig) {
          if (dPayoutStatus !== 'paid') {
            tx.update(challengeRef, {
              payoutStatus: 'paid',
            });
          }
          return 'done' as const;
        }

        if (dPayoutStatus === 'paid') {
          return 'done' as const;
        }

        const ageMs = payoutLockAgeMs(d);

        const staleProcessingReset =
          dPayoutStatus === 'processing' &&
          !hasSig &&
          (ageMs === null || ageMs > STALE_MS);

        if (!d.needsPayout) {
          throw new Error('Payout not available or already processed');
        }

        if (
          dPayoutStatus === 'processing' &&
          !hasSig &&
          !staleProcessingReset &&
          !recoveryState.fromStale
        ) {
          return 'in_flight' as const;
        }

        if (staleProcessingReset) {
          recoveryState.fromStale = true;
          console.warn(
            'Payout: stale processing lock — re-acquiring in one write',
            challengeId
          );
        }

        // Single update per document per transaction (Firestore merges multiple updates
        // unreliably; stale recovery must not write pending in a separate tx.update).
        tx.update(challengeRef, {
          payoutStatus: 'processing',
          payoutAttemptedAt: serverTimestamp(),
          payoutLockOwner: lockOwner,
          updatedAt: serverTimestamp(),
        });
        return 'locked' as const;
      });
    } catch (txErr: unknown) {
      const txMsg = txErr instanceof Error ? txErr.message : String(txErr);
      if (txMsg.includes('Payout not available or already processed')) {
        return {
          status: 'not_available',
          message: 'Payout is not available yet.',
        };
      }
      console.warn('Payout: lock transaction failed', challengeId, txMsg);
      return { status: 'error', message: txMsg };
    }

    console.warn('Payout: lock transaction finished', challengeId, { lockResult });

    if (lockResult === 'done') {
      return { status: 'already_claimed' };
    }
    if (lockResult === 'in_flight') {
      console.warn('Payout: lock in_flight (another claim holds processing)', challengeId);
      const ageNow = payoutLockAgeMs(data);
      const staleNow =
        readEffectivePayoutStatus(data) === 'processing' &&
        noPayoutSig &&
        (ageNow === null || ageNow > STALE_MS);
      return { status: 'in_flight', isStale: staleNow };
    }

    recoveredFromStale = recoveryState.fromStale;

    const logPostLockState = (label: string, d: ChallengeData) => {
      const docLock = d.payoutLockOwner;
      const owns = typeof docLock === 'string' && docLock === lockOwner;
      console.warn(`Payout: post-lock ${label}`, challengeId, {
        claimLockOwner: lockOwner,
        docPayoutLockOwner: docLock ?? null,
        ownsLock: owns,
        payoutStatus: d.payoutStatus ?? null,
        effectivePayoutStatus: readEffectivePayoutStatus(d),
      });
      return owns;
    };

    let postLockSnap = await getDoc(challengeRef);
    if (!postLockSnap.exists()) {
      return { status: 'error', message: '❌ Challenge not found in Firestore' };
    }
    data = postLockSnap.data() as ChallengeData;
    let ownsLock = logPostLockState('read', data);

    if (!ownsLock) {
      await new Promise((r) => setTimeout(r, 150));
      postLockSnap = await getDoc(challengeRef);
      if (!postLockSnap.exists()) {
        return { status: 'error', message: '❌ Challenge not found in Firestore' };
      }
      data = postLockSnap.data() as ChallengeData;
      ownsLock = logPostLockState('retry', data);
    }

    const postLockSig =
      data.payoutSignature != null && String(data.payoutSignature).trim() !== '';
    if (
      postLockSig ||
      data.payoutTriggered === true ||
      readEffectivePayoutStatus(data) === 'paid'
    ) {
      return { status: 'already_claimed' };
    }

    if (!ownsLock) {
      const foreignLock =
        typeof data.payoutLockOwner === 'string' &&
        data.payoutLockOwner.length > 0 &&
        data.payoutLockOwner !== lockOwner;
      if (foreignLock) {
        const ageMismatch = payoutLockAgeMs(data);
        const staleMismatch =
          readEffectivePayoutStatus(data) === 'processing' &&
          !postLockSig &&
          (ageMismatch === null || ageMismatch > STALE_MS);
        console.warn(
          'Payout: returning in_flight — another payoutLockOwner holds the lock',
          challengeId,
          { claimLockOwner: lockOwner, docPayoutLockOwner: data.payoutLockOwner }
        );
        return { status: 'in_flight', isStale: staleMismatch };
      }
      console.warn(
        'Payout: post-lock read missed owner after locked tx — trusting transaction',
        challengeId,
        { claimLockOwner: lockOwner, docPayoutLockOwner: data.payoutLockOwner ?? null }
      );
    }

    console.warn('Payout: entering resolveChallenge (lock held by this claim)', challengeId);

    try {
      const isAdminResolvedDispute = !!(data as any).resolvedBy;
      const winnerCanonical = callerAddress;

      if (isAdminResolvedDispute) {
        const { resolveAdminChallengeOnChain } = await import('../chain/contract');
        const signature = await resolveAdminChallengeOnChain(
          winnerWallet,
          connection,
          challengeId,
          data.winner!
        );
        await writeChallengeFields(
          challengeId,
          {
            payoutSignature: signature,
            payoutTriggered: true,
            prizeClaimedAt: Timestamp.now(),
            payoutTimestamp: Timestamp.now(),
            payoutStatus: 'paid',
            needsPayout: false,
            payoutLastError: deleteField(),
            payoutErrorAt: deleteField(),
            payoutLockOwner: deleteField(),
            adminResolutionTx: signature,
            updatedAt: Timestamp.now(),
          },
          { currentData: data, actingWallet: callerAddress }
        );
        const explorerUrl = looksLikeSolanaTxSignature(signature)
          ? getExplorerTxUrl(signature)
          : null;
        if (explorerUrl) {
          await postChallengeSystemMessage(challengeId, `🏆 Reward claimed on-chain: ${explorerUrl}`);
        }
        console.log('✅ Reward claimed (admin-resolved)', challengeId);
        return wrapStaleRetryResult(recoveredFromStale, { status: 'success', signature });
      }

      const { resolveChallenge } = await import('../chain/contract');
      console.warn('Payout: calling resolveChallenge (wallet should open)', challengeId, {
        challengePDA,
        winner: winnerCanonical,
      });
      let signature: string;
      try {
        signature = await resolveChallenge(
          winnerWallet,
          connection,
          challengePDA,
          winnerCanonical
        );
      } catch (contractError: any) {
        if (
          contractError.message?.includes('ChallengeExpired') ||
          contractError.message?.includes('6005') ||
          contractError.logs?.some(
            (log: string) => log.includes('ChallengeExpired') || log.includes('Challenge has expired')
          )
        ) {
          console.error(
            '⚠️ Old contract version detected - still has expiration check. Please redeploy with updated contract.'
          );
          try {
            const s = await getDoc(challengeRef);
            if (s.exists()) {
              const doc = s.data() as ChallengeData;
              const hasS =
                doc.payoutSignature != null && String(doc.payoutSignature).trim() !== '';
              if (doc.payoutLockOwner === lockOwner && !hasS) {
                await updateDoc(challengeRef, {
                  payoutStatus: 'pending',
                  payoutLastError: 'ChallengeExpired_contract_inner',
                  payoutErrorAt: Timestamp.now(),
                  payoutLockOwner: deleteField(),
                  payoutAttemptedAt: deleteField(),
                });
              }
            }
          } catch (rb0) {
            console.error('claim rollback failed (ChallengeExpired inner)', rb0);
          }
          return wrapStaleRetryResult(recoveredFromStale, {
            status: 'error',
            message:
              '❌ Old contract version detected. Please contact support to redeploy the contract without expiration check for reward claims.',
          });
        }
        throw contractError;
      }

      const completionPatch =
        signature === 'already-processed'
          ? {
              payoutSignature: 'already-processed',
              payoutTriggered: true,
              prizeClaimedAt: Timestamp.now(),
              payoutTimestamp: Timestamp.now(),
              payoutStatus: 'paid',
              needsPayout: false,
              payoutLastError: deleteField(),
              payoutErrorAt: deleteField(),
              payoutLockOwner: deleteField(),
              updatedAt: Timestamp.now(),
            }
          : {
              payoutSignature: signature,
              payoutTriggered: true,
              prizeClaimedAt: Timestamp.now(),
              payoutTimestamp: Timestamp.now(),
              payoutStatus: 'paid',
              needsPayout: false,
              payoutLastError: deleteField(),
              payoutErrorAt: deleteField(),
              payoutLockOwner: deleteField(),
              updatedAt: Timestamp.now(),
            };

      await writeChallengeFields(challengeId, completionPatch, {
        currentData: data,
        actingWallet: callerAddress,
      });

      const explorerUrl =
        typeof signature === 'string' && looksLikeSolanaTxSignature(signature)
          ? getExplorerTxUrl(signature)
          : null;
      if (explorerUrl) {
        await postChallengeSystemMessage(challengeId, `🏆 Reward claimed on-chain: ${explorerUrl}`);
      }

      console.log('✅ REWARD CLAIMED!');
      console.log('   Transaction:', signature);
      console.log('   Winner received:', data.prizePool, 'USDFG');
      return wrapStaleRetryResult(recoveredFromStale, { status: 'success', signature });
    } catch (err) {
      const walletRejected = isWalletUserRejection(err);
      console.error('Claim payout failed:', challengeId, err instanceof Error ? err.message : String(err));
      const rbSnap = await getDoc(challengeRef);
      if (rbSnap.exists()) {
        const d = rbSnap.data() as ChallengeData;
        const docHasSig =
          d.payoutSignature != null && String(d.payoutSignature).trim() !== '';
        const canRollback = d.payoutLockOwner === lockOwner && !docHasSig;
        if (!canRollback) {
          if (import.meta.env.DEV) {
            console.warn('claim rollback skipped', challengeId, {
              reason:
                d.payoutLockOwner !== lockOwner
                  ? 'lock_owner_mismatch'
                  : 'payout_signature_present',
            });
          }
        } else {
          try {
            const rollbackError = walletRejected
              ? 'wallet_rejected'
              : String(err ?? 'unknown_error');
            await updateDoc(challengeRef, {
              payoutStatus: 'pending',
              payoutLastError: rollbackError,
              payoutErrorAt: Timestamp.now(),
              payoutLockOwner: deleteField(),
              payoutAttemptedAt: deleteField(),
            });
          } catch (rbErr) {
            console.error('claim rollback write failed', challengeId, rbErr);
          }
        }
      } else {
        console.warn('claim rollback skipped — challenge doc missing', challengeId);
      }
      const msg = walletRejected
        ? 'Transaction was rejected in your wallet. You can try claiming again.'
        : err instanceof Error
          ? err.message
          : String(err);
      if (
        msg.includes('ChallengeExpired') ||
        msg.includes('6005') ||
        msg.includes('challenge has expired') ||
        msg.includes('Challenge has expired')
      ) {
        return {
          status: 'error',
          message:
            '⚠️ Old contract version detected. The contract needs to be redeployed to remove the expiration check for reward claims. Please contact support.',
        };
      }
      if (
        msg.includes('already been processed') ||
        msg.includes('already processed') ||
        msg.includes('already claimed') ||
        msg.includes('Reward already claimed')
      ) {
        return {
          status: 'already_claimed',
          signature: 'already-processed',
        };
      }
      return wrapStaleRetryResult(recoveredFromStale, {
        status: 'error',
        message: msg,
        walletRejected,
      });
    }
  } catch (error) {
    console.error('❌ Error claiming reward:', error);
    const walletRejected = isWalletUserRejection(error);
    const message = walletRejected
      ? 'Transaction was rejected in your wallet. You can try claiming again.'
      : error instanceof Error
        ? error.message
        : String(error);
    return { status: 'error', message, walletRejected };
  }
}

/**
 * Record that a user saw the Founder Tournament "no action required" message.
 * Hides the Claim button for that user.
 */
export async function acknowledgeFounderTournamentPayout(
  challengeId: string,
  wallet: string
): Promise<void> {
  const normalized = wallet.toLowerCase();
  await writeChallengeFields(
    challengeId,
    {
      founderPayoutAcknowledgedBy: arrayUnion(normalized),
      updatedAt: serverTimestamp(),
    },
    { actingWallet: wallet }
  );
}

/**
 * Mark that the founder has sent the airdrop for this Founder Tournament.
 * Hides the Claim button for all participants and removes from unclaimed list.
 */
export async function markFounderPayoutSent(challengeId: string): Promise<void> {
  await writeChallengeFields(challengeId, {
    founderPayoutSentAt: serverTimestamp(),
    payoutTriggered: true,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// FREE USDFG CLAIM SYSTEM - REMOVED
// ============================================
// This feature was replaced with Founder Challenges
// Free claim functions removed as they are no longer used

// ============================================
// ADMIN DISPUTE RESOLUTION SYSTEM
// ============================================

/**
 * Check if current user is an admin
 * @param uid - Firebase Auth UID
 * @returns true if user exists in admins collection and is active
 */
export const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    
    if (!adminSnap.exists()) {
      return false;
    }
    
    const adminData = adminSnap.data();
    return adminData.active !== false; // Default to true if not set
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

/**
 * Get all disputed challenges
 * @returns Array of challenges with status 'disputed'
 */
export const getDisputedChallenges = async (): Promise<ChallengeData[]> => {
  try {
    const q = query(
      collection(db, 'challenges'),
      where('status', '==', 'disputed'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
  } catch (error) {
    console.error('❌ Error fetching disputed challenges:', error);
    throw error;
  }
};

/**
 * Listen to disputed challenges in real-time
 * @param callback - Function called when disputed challenges change
 * @returns Unsubscribe function
 */
export const listenToDisputedChallenges = (
  callback: (challenges: ChallengeData[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'challenges'),
    where('status', '==', 'disputed'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    callback(challenges);
  });
};

export type DisputeResult = 'created' | 'already_disputed' | 'not_allowed';

/**
 * Escalate to manual admin review during the provisional auto-resolution window.
 * Only allowed while `status === 'awaiting_auto_resolution'`.
 */
export async function triggerChallengeDispute(
  challengeId: string,
  wallet: string,
  reason?: string
): Promise<DisputeResult> {
  const normalizedWallet = normalizeWinnerWallet(wallet);
  const trimmed =
    typeof reason === 'string'
      ? reason.trim().slice(0, 300)
      : '';

  const challengeRef = doc(db, 'challenges', challengeId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(challengeRef);
    const d = snap.exists() ? (snap.data() as ChallengeData) : undefined;

    if (!d) {
      throw new Error('Challenge not found');
    }

    if (d.status !== 'awaiting_auto_resolution') {
      return 'not_allowed';
    }

    if (!d.players || !isParticipantWallet(d.players, wallet)) {
      throw new Error('Not a participant');
    }

    const COOLDOWN_MS = 10 * 1000;

    if (
      d.disputedAt &&
      Date.now() - d.disputedAt.toMillis() < COOLDOWN_MS
    ) {
      return 'already_disputed';
    }

    if (d.disputedBy) {
      return 'already_disputed';
    }

    const now = Timestamp.now();
    tx.update(challengeRef, {
      status: 'disputed',
      disputedBy: normalizedWallet,
      disputedAt: now,
      disputeReason: trimmed || null,
      updatedAt: now,
    });
    return 'created';
  });
}

/**
 * Resolve a disputed challenge as admin
 * @param challengeId - Challenge ID
 * @param winnerWallet - Wallet address of the winner
 * @param adminUid - Firebase Auth UID of admin resolving
 * @param adminEmail - Admin email for audit log
 * @param onChainTx - Optional transaction signature from smart contract
 * @param notes - Optional admin notes
 */
export const resolveAdminChallenge = async (
  challengeId: string,
  winnerWallet: string,
  adminUid: string,
  adminEmail: string,
  onChainTx?: string,
  notes?: string
): Promise<void> => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeSnap = await getDoc(challengeRef);
    
    if (!challengeSnap.exists()) {
      throw new Error('Challenge not found');
    }
    
    const challengeData = challengeSnap.data() as ChallengeData;
    
    // Verify challenge is in dispute
    if (challengeData.status !== 'disputed') {
      throw new Error(`Challenge is not in dispute. Current status: ${challengeData.status}`);
    }
    
    // Verify winner is one of the players (normalized casing)
    const players = challengeData.players || [];
    if (!isParticipantWallet(players, winnerWallet)) {
      throw new Error('Winner must be one of the challenge participants');
    }
    
    // Update challenge (include canClaim in first write so winner can claim even if stats update fails)
    await writeChallengeFields(
      challengeId,
      {
        status: 'completed',
        winner: normalizeWinnerWallet(winnerWallet),
        resolutionType: 'admin',
        resolvedBy: adminUid,
        resolvedAt: Timestamp.now(),
        adminResolutionTx: onChainTx || null,
        updatedAt: Timestamp.now(),
        ...payoutClaimReadyFields(),
        ...(hasAnyProofImageData(challengeData.results as Record<string, any>)
          ? {
              results: stripProofImageDataFromResults(
                challengeData.results as Record<string, any>
              ) as ChallengeData['results'],
            }
          : {}),
        payoutLastError: deleteField(),
        payoutErrorAt: deleteField(),
        payoutLockOwner: deleteField(),
        payoutAttemptedAt: deleteField(),
      },
      { currentData: challengeData, actingWallet: winnerWallet, actingUid: adminUid }
    );

    // Audit log requires Firebase Auth admin (DisputeConsole). Skip when resolving from lobby (Solana wallet only).
    const isLobbyResolve = adminUid === 'lobby' || (typeof adminEmail === 'string' && adminEmail.startsWith('wallet:'));
    if (!isLobbyResolve) {
      await addDoc(collection(db, 'admin_audit_log'), {
        adminUid,
        adminEmail,
        challengeId,
        winner: normalizeWinnerWallet(winnerWallet),
        action: 'resolve_dispute',
        timestamp: Timestamp.now(),
        onChainTx: onChainTx || null,
        notes: notes || null,
      });
    }

    const loser = players.find(p => !walletsEqual(p, winnerWallet));

    const afterSnap = await getDoc(challengeRef);
    const afterData = afterSnap.data() as ChallengeData;
    if (afterData.statsApplied !== true && loser) {
      try {
        await invokeApplyMatchStats({ challengeId });
      } catch (e) {
        console.error('applyMatchStats failed (admin resolve)', e);
      }
    }

    console.log(`✅ Admin resolved dispute: Challenge ${challengeId}, Winner: ${winnerWallet}`);
  } catch (error) {
    console.error('❌ Error resolving admin challenge:', error);
    throw error;
  }
};

// --- Spectator mic request (Firestore-backed lobby voice) ---
const MAX_VOICE_SPEAKERS = 2;

/** Create or reset a spectator mic request (pending). */
export async function createMicRequest(challengeId: string, wallet: string): Promise<void> {
  if (!challengeId || !wallet) return;
  const ref = doc(db, 'challenge_lobbies', challengeId, 'mic_requests', wallet.toLowerCase());
  await setDoc(ref, {
    status: 'pending',
    requestedAt: serverTimestamp(),
  });
}

/** Approve a spectator mic request; adds to speaker list only if fewer than MAX_VOICE_SPEAKERS. Returns true if added. */
export async function approveMicRequest(
  challengeId: string,
  wallet: string,
  respondedBy: string,
): Promise<boolean> {
  if (!challengeId || !wallet) return false;
  const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
  const requestRef = doc(db, 'challenge_lobbies', challengeId, 'mic_requests', wallet.toLowerCase());
  const snap = await getDoc(stateRef);
  const list: string[] = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
  if (list.length >= MAX_VOICE_SPEAKERS) return false;
  const lower = wallet.toLowerCase();
  if (list.some((w: string) => w.toLowerCase() === lower)) {
    await updateDoc(requestRef, { status: 'approved', respondedAt: serverTimestamp(), respondedBy });
    return true;
  }
  await setDoc(stateRef, { speakerWallets: [...list, wallet] }, { merge: true });
  await setDoc(requestRef, { status: 'approved', respondedAt: serverTimestamp(), respondedBy }, { merge: true });
  return true;
}

/** Approve a spectator mic request by replacing an active speaker. Removed speaker loses mic (listen-only). */
export async function approveMicRequestReplace(
  challengeId: string,
  requesterWallet: string,
  replaceWallet: string,
  respondedBy: string,
): Promise<void> {
  if (!challengeId || !requesterWallet || !replaceWallet) return;
  const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
  const requestRef = doc(db, 'challenge_lobbies', challengeId, 'mic_requests', requesterWallet.toLowerCase());
  const snap = await getDoc(stateRef);
  const list: string[] = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
  const next = list.filter((w: string) => w.toLowerCase() !== replaceWallet.toLowerCase());
  if (next.length === list.length) return;
  const requesterLower = requesterWallet.toLowerCase();
  if (next.some((w: string) => w.toLowerCase() === requesterLower)) {
    await setDoc(requestRef, { status: 'approved', respondedAt: serverTimestamp(), respondedBy }, { merge: true });
    return;
  }
  await setDoc(stateRef, { speakerWallets: [...next, requesterWallet] }, { merge: true });
  await setDoc(requestRef, { status: 'approved', respondedAt: serverTimestamp(), respondedBy }, { merge: true });
}

/** Deny a spectator mic request. */
export async function denyMicRequest(
  challengeId: string,
  wallet: string,
  respondedBy: string,
): Promise<void> {
  if (!challengeId || !wallet) return;
  const requestRef = doc(db, 'challenge_lobbies', challengeId, 'mic_requests', wallet.toLowerCase());
  await setDoc(requestRef, { status: 'denied', respondedAt: serverTimestamp(), respondedBy }, { merge: true });
}

/** Add wallet to speaker list if under cap. Call when participant or approved spectator connects. */
export async function addSpeaker(challengeId: string, wallet: string): Promise<boolean> {
  if (!challengeId || !wallet) return false;
  const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
  const snap = await getDoc(stateRef);
  const list: string[] = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
  if (list.length >= MAX_VOICE_SPEAKERS) return false;
  const lower = wallet.toLowerCase();
  if (list.some((w: string) => w.toLowerCase() === lower)) return true;
  await setDoc(stateRef, { speakerWallets: [...list, wallet] }, { merge: true });
  return true;
}

/** Remove wallet from speaker list. Call when participant or approved spectator disconnects. */
export async function removeSpeaker(challengeId: string, wallet: string): Promise<void> {
  if (!challengeId || !wallet) return;
  const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
  const snap = await getDoc(stateRef);
  const list: string[] = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
  const next = list.filter((w: string) => w.toLowerCase() !== wallet.toLowerCase());
  if (next.length === 0) await deleteDoc(stateRef);
  else await setDoc(stateRef, { speakerWallets: next }, { merge: true });
}

export { MAX_VOICE_SPEAKERS };
