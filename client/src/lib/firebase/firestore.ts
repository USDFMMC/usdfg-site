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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Test Firestore connection
export async function testFirestoreConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, "challenges"));
    console.log("✅ Firestore connected. Challenges found:", querySnapshot.size);
    return true;
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
    return false;
  }
}

// Collection references
const usersCollection = collection(db, 'users');
const lockNotificationsCollection = collection(db, 'lock_notifications');

// Optimized Challenge Data - Minimal Collection
export interface ChallengeData {
  id?: string;
  creator: string;                    // Creator wallet (or team key for team challenges)
  challenger?: string;                // Challenger wallet (if accepted) or team key
  targetPlayer?: string;               // Optional: specific player to challenge (for direct challenges)
  entryFee: number;                   // Entry fee amount
  // NEW STATE MACHINE - No legacy status values
  status: 'pending_waiting_for_opponent' | 'creator_confirmation_required' | 'creator_funded' | 'active' | 'completed' | 'cancelled' | 'disputed';
  pendingJoiner?: string;             // Wallet that expressed join intent (in creator_confirmation_required state)
  createdAt: Timestamp;               // Creation time
  expiresAt: Timestamp;               // Expiration time (legacy - use expirationTimer)
  expirationTimer?: Timestamp;        // TTL for pending challenges (60 minutes)
  creatorFundingDeadline?: Timestamp; // Deadline for creator to fund (5 minutes after join intent)
  joinerFundingDeadline?: Timestamp;  // Deadline for joiner to fund (5 minutes after creator funds)
  fundedByCreatorAt?: Timestamp;      // When creator funded escrow
  fundedByJoinerAt?: Timestamp;       // When joiner funded escrow
  winner?: string;                    // Winner wallet (if completed) or team key
  challengeType?: 'solo' | 'team';    // Challenge type - solo or team (defaults to solo for backward compatibility)
  teamOnly?: boolean;                 // For team challenges: true = only teams can accept, false = open to anyone (defaults to false)
  // Result submission fields
  results?: {
    [wallet: string]: {
      didWin: boolean;
      submittedAt: Timestamp;
    }
  };
  resultDeadline?: Timestamp;         // 2 hours after match starts
  // UI fields (minimal for display)
  players?: string[];                 // Array of player wallets
  maxPlayers?: number;                // Maximum players allowed
  format?: 'standard' | 'tournament'; // Challenge format. Default = standard (1v1)
  tournament?: TournamentState;       // Tournament metadata when format === 'tournament'
  // Prize claim fields
  canClaim?: boolean;                 // Whether winner can claim prize
  payoutTriggered?: boolean;          // Whether prize has been claimed
  payoutSignature?: string;            // Transaction signature of prize claim
  payoutTimestamp?: Timestamp;        // When prize was claimed
  pda?: string;                       // Challenge PDA for smart contract
  prizePool?: number;                 // Total challenge reward amount
  // UI display fields
  title?: string;                     // Challenge title (contains game info)
  game?: string;                      // Game name for display
  category?: string;                  // Game category for filtering
  platform?: string;                  // Platform (PS5, PC, Xbox, etc.) for display
  // REMOVED: rules, mode, creatorTag, solanaAccountId, cancelRequests
  // These are not needed for leaderboard and increase storage costs unnecessarily
}

export type TournamentStage = 'waiting_for_players' | 'round_in_progress' | 'awaiting_results' | 'completed';
export type BracketMatchStatus = 'waiting' | 'ready' | 'in-progress' | 'completed';

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

        return sanitizedMatch;
      }),
    })),
  };

  if (state.champion) {
    sanitized.champion = state.champion;
  }

  return sanitized;
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
          match = m;
          matchFound = true;
          currentRoundIndex = roundIdx;
          matchIndex = matchIdx;
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

    // Record player's submission
    const result: 'win' | 'loss' = didWin ? 'win' : 'loss';
    if (isPlayer1) {
      match.player1Result = result;
    } else {
      match.player2Result = result;
    }

    // Check if both players have submitted
    const bothSubmitted = match.player1Result !== undefined && match.player2Result !== undefined;

    if (!bothSubmitted) {
      // Only one player has submitted - just save the result and wait
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(challengeRef, updates);
      console.log('✅ Match result submitted, waiting for opponent...');
      return;
    }

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
      // Both claim win - conflict, need dispute resolution
      throw new Error('Both players claim victory. Dispute resolution required.');
    } else if (!player1Won && !player2Won) {
      // Both claim loss - conflict, need dispute resolution
      throw new Error('Both players claim loss. Dispute resolution required.');
    }

    if (!winnerWallet) {
      throw new Error('Could not determine winner from submissions');
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
      const updates: any = {
        'tournament.bracket': sanitizeTournamentState({ ...tournament, bracket }).bracket,
        'tournament.champion': winnerWallet,
        'tournament.stage': 'completed',
        'status': 'completed',
        'canClaim': true, // Enable prize claiming for the champion
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(challengeRef, updates);
      console.log('✅ Tournament completed! Champion:', winnerWallet, '- Prize claiming enabled');
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

    await updateDoc(challengeRef, updates);
    console.log('✅ Both players submitted - winner advanced to next round:', winnerWallet);
  } catch (error) {
    console.error('❌ Error submitting tournament match result:', error);
    throw error;
  }
};

/**
 * Advance a tournament bracket winner to the next round
 * Marks the current match as completed and moves the winner to the next round's match
 * @deprecated Use submitTournamentMatchResult instead
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
        'status': 'completed',
        'canClaim': true, // Enable prize claiming for the champion
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(challengeRef, updates);
      console.log('✅ Tournament completed! Champion:', winnerWallet, '- Prize claiming enabled');
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

    await updateDoc(challengeRef, updates);
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

    await updateDoc(challengeRef, updates);
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
    // Check if creator is eligible for OG First 2.1K trophy (only when creating their first challenge)
    const creatorWallet = challengeData.creator;
    const playerRef = doc(db, 'player_stats', creatorWallet);
    const playerSnap = await getDoc(playerRef);
    
    let shouldAwardOgFirst1k = false;
    
    // Only award if player doesn't exist yet (first challenge creation)
    if (!playerSnap.exists()) {
      // Count total users BEFORE adding this one
      const statsCollection = collection(db, 'player_stats');
      const allUsersSnapshot = await getDocs(statsCollection);
      const totalUsersBefore = allUsersSnapshot.size;
      shouldAwardOgFirst1k = totalUsersBefore < 2100; // Represents USDFG's 21M token supply
      
      if (shouldAwardOgFirst1k) {
        console.log(`🏆 OG First 2.1K Trophy eligible for ${creatorWallet.slice(0, 8)}... (Total users: ${totalUsersBefore})`);
      }
    }
    
    const challengePayload: any = {
      ...challengeData,
      createdAt: Timestamp.now(),
      players: [challengeData.creator], // Creator is first player
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
    
    console.log("🔥 Adding challenge to Firestore with payload:", {
      creator: challengePayload.creator,
      entryFee: challengePayload.entryFee,
      status: challengePayload.status,
      format: challengePayload.format,
      maxPlayers: challengePayload.maxPlayers,
      hasTournament: !!challengePayload.tournament
    });
    
    const docRef = await addDoc(collection(db, "challenges"), challengePayload);
    
    // If eligible, create/update player stats with trophy flag
    if (shouldAwardOgFirst1k) {
      const newStats: any = {
        wallet: creatorWallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        ogFirst1k: true, // Award the trophy!
        gameStats: {},
        categoryStats: {}
      };
      // Note: displayName will be set on first challenge completion (only include if it exists)
      
      await setDoc(playerRef, newStats);
      console.log(`🏆 OG First 2.1K Trophy awarded to ${creatorWallet.slice(0, 8)}... for creating their first challenge!`);
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
    const challengeRef = doc(db, 'challenges', challengeId);
    await updateDoc(challengeRef, updates);
    console.log('✅ Challenge updated:', challengeId);
  } catch (error) {
    console.error('❌ Error updating challenge:', error);
    throw error;
  }
};

export const updateChallengeStatus = async (challengeId: string, status: 'pending_waiting_for_opponent' | 'creator_confirmation_required' | 'creator_funded' | 'active' | 'completed' | 'cancelled' | 'disputed') => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    // Get current status to check if dispute is being resolved
    const currentSnap = await getDoc(challengeRef);
    const wasDisputed = currentSnap.exists() && currentSnap.data()?.status === 'disputed';
    const isResolvingDispute = wasDisputed && (status === 'completed' || status === 'cancelled');
    
    await updateDoc(challengeRef, { 
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

// One-time fetch operations
export const fetchChallenges = async (): Promise<ChallengeData[]> => {
  try {
    const q = query(collection(db, "challenges"), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeData[];
    
    console.log('📦 Fetched', challenges.length, 'challenges');
    return challenges;
  } catch (error) {
    console.error('❌ Error fetching challenges:', error);
    return [];
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
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
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
        // Deadline expired and status is still creator_confirmation_required - auto-revert first
        try {
          await revertCreatorTimeout(challengeId);
          // Single re-fetch after revert (optimized - removed redundant checks)
          const updatedSnap = await getDoc(challengeRef);
          if (updatedSnap.exists()) {
            data = updatedSnap.data() as ChallengeData;
            console.log('✅ Challenge auto-reverted, creator can now rejoin');
          } else {
            throw new Error("Challenge not found after revert. Please refresh and try again.");
          }
        } catch (revertError: any) {
          console.error('Failed to auto-revert challenge:', revertError);
          // Single check if already reverted (optimized)
          const currentSnap = await getDoc(challengeRef);
          if (currentSnap.exists()) {
            const currentData = currentSnap.data() as ChallengeData;
            if (currentData.status === 'pending_waiting_for_opponent') {
              data = currentData;
              console.log('✅ Challenge already reverted, creator can now rejoin');
            } else {
              throw new Error("Challenge state mismatch. Please refresh and try again.");
            }
          } else {
            throw new Error("Challenge not found. Please refresh and try again.");
          }
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
    
    // Check if already expressed intent (only if challenge is still in creator_confirmation_required state)
    // If challenge was reverted, pendingJoiner should be null, so this check allows re-joining
    // BUT: Allow retry if PDA exists (means user needs to express on-chain intent)
    const challengePDA = data.pda;
    if (data.status === 'creator_confirmation_required' && data.pendingJoiner && data.pendingJoiner.toLowerCase() === wallet.toLowerCase()) {
      // If PDA exists, user can retry to express on-chain intent
      if (challengePDA) {
        // Don't throw error - allow retry for on-chain express intent
        // The frontend will handle calling on-chain express intent
        console.log('⚠️ User already expressed intent in Firestore, but PDA exists - allowing retry for on-chain express intent');
      } else {
        throw new Error("You have already expressed intent to join this challenge. Waiting for creator to create challenge on-chain.");
      }
    }
    
    // Also check if challenger field is set (should be cleared on revert, but double-check)
    if (data.challenger && data.challenger.toLowerCase() === wallet.toLowerCase() && data.status !== 'pending_waiting_for_opponent') {
      throw new Error("You are already part of this challenge");
    }

    // Calculate creator funding deadline (5 minutes from now)
    const creatorFundingDeadline = Timestamp.fromDate(new Date(Date.now() + (5 * 60 * 1000)));

    // Update challenge to express join intent - NO PAYMENT
    const updates: any = {
      status: 'creator_confirmation_required',
      pendingJoiner: wallet,
      creatorFundingDeadline,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(challengeRef, updates);

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

    await updateDoc(challengeRef, updates);
    
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
    const newPlayers = data.players ? [...data.players, wallet] : [data.creator, wallet];
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

    if (isFull) {
      // Set deadline to 2 hours from now for result submission
      updates.resultDeadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
      console.log('⏰ Challenge is full! Result submission phase started (2-hour deadline)');
      }

    await updateDoc(challengeRef, updates);
    
    console.log('✅ Joiner funded successfully. Challenge is now ACTIVE:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error in joiner funding:', error);
    throw error;
  }
};

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
    
    // Only revert if in creator_confirmation_required state and deadline passed
    if (data.status !== 'creator_confirmation_required') {
      return false;
    }
    
    if (!data.creatorFundingDeadline || data.creatorFundingDeadline.toMillis() > Date.now()) {
      return false; // Deadline not expired yet
    }
    
    // Revert to pending state - clear ALL joiner-related fields to allow new users to join
    const updates: any = {
      status: 'pending_waiting_for_opponent',
      pendingJoiner: null,
      challenger: null, // Clear challenger field to allow new users to join
      creatorFundingDeadline: null,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(challengeRef, updates);

    console.log('✅ Creator timeout - challenge reverted to pending:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error reverting creator timeout:', error);
    return false;
  }
};

/**
 * Auto-refund creator and revert challenge if joiner funding deadline expired
 * Reverts to pending_waiting_for_opponent state
 */
export const revertJoinerTimeout = async (challengeId: string): Promise<boolean> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as ChallengeData;
    
    // Only revert if in creator_funded state and deadline passed
    if (data.status !== 'creator_funded') {
      return false;
    }
    
    if (!data.joinerFundingDeadline || data.joinerFundingDeadline.toMillis() > Date.now()) {
      return false; // Deadline not expired yet
    }
    
    // Note: On-chain refund happens via auto_refund_joiner_timeout contract function
    // This Firestore function just reverts the state
    
    // Revert to pending state
    const updates: any = {
      status: 'pending_waiting_for_opponent',
      challenger: null,
      pendingJoiner: null,
      joinerFundingDeadline: null,
      fundedByCreatorAt: null,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(challengeRef, updates);
    
    console.log('✅ Joiner timeout - challenge reverted to pending (creator refunded on-chain):', challengeId);
    return true;
      } catch (error) {
    console.error('❌ Error reverting joiner timeout:', error);
    return false;
  }
};

/**
 * Auto-delete expired pending challenges after 60 minutes (saves Firebase storage)
 */
export const expirePendingChallenge = async (challengeId: string): Promise<boolean> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
      
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as ChallengeData;
    
    // Only delete if in pending_waiting_for_opponent state
    if (data.status !== 'pending_waiting_for_opponent') {
      return false;
    }
    
    if (!data.expirationTimer || data.expirationTimer.toMillis() > Date.now()) {
      return false; // Not expired yet
    }
    
    // Delete expired challenge immediately to save Firebase storage
    await cleanupExpiredChallenge(challengeId);
    
    console.log('✅ Pending challenge expired and deleted:', challengeId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting expired pending challenge:', error);
    return false;
  }
};

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

    // Update player stats (totalEarned) with actual amount
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      const currentStats = playerSnap.data() as PlayerStats;
      await updateDoc(playerRef, {
        totalEarned: (currentStats.totalEarned || 0) + amount,
        lastActive: Timestamp.now(),
      });
    } else {
      // Create new player stats
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: amount,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {},
      });
    }

    // Update challenge to mark prize as transferred and set actual challenge reward
    const challengeRef = doc(db, 'challenges', challengeId);
    await updateDoc(challengeRef, {
      payoutTriggered: true,
      prizePool: amount, // Update with actual amount transferred
      payoutTimestamp: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

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
  const docRef = await addDoc(collection(db, "challenges"), {
    ...data,
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('✅ Challenge document created with ID:', docRef.id);
  return docRef.id;
}

// Auto-cleanup for completed challenges (delete after 24 hours)
export async function cleanupCompletedChallenge(id: string) {
  try {
    // First, clean up all chat messages for this challenge
    console.log('🗑️ Cleaning up chat messages for challenge:', id);
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', id)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    // Delete all chat messages
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for challenge:`, id);
    
    // Then delete the challenge document
    const challengeRef = doc(db, "challenges", id);
    await deleteDoc(challengeRef);
    console.log('🗑️ Completed challenge cleaned up:', id);
  } catch (error) {
    console.error('❌ Failed to cleanup completed challenge:', error);
  }
}

// Auto-cleanup for expired challenges (delete immediately)
export async function cleanupExpiredChallenge(id: string) {
  try {
    console.log('🗑️ Starting complete cleanup for expired challenge:', id);
    
    // 1. Clean up all chat messages for this challenge
    console.log('🗑️ Cleaning up chat messages for expired challenge:', id);
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', id)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
    await Promise.all(chatDeletePromises);
    console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for expired challenge:`, id);
    
    // 2. Delete voice signals if any
    try {
      const voiceSignalRef = doc(db, 'voice_signals', id);
      const voiceSignalSnap = await getDoc(voiceSignalRef);
      if (voiceSignalSnap.exists()) {
        await deleteDoc(voiceSignalRef);
        console.log('🗑️ Deleted voice signals for expired challenge:', id);
      }
    } catch (voiceError) {
      console.log('ℹ️ No voice signals to delete for challenge:', id);
    }
    
    // 3. Delete challenge notifications
    try {
      const notificationQuery = query(
        collection(db, 'challenge_notifications'),
        where('challengeId', '==', id)
      );
      const notificationSnapshot = await getDocs(notificationQuery);
      const notificationDeletePromises = notificationSnapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db, 'challenge_notifications', docSnapshot.id))
      );
      await Promise.all(notificationDeletePromises);
      console.log(`🗑️ Deleted ${notificationSnapshot.size} challenge notifications for expired challenge:`, id);
    } catch (notificationError) {
      console.log('ℹ️ No challenge notifications to delete for challenge:', id);
    }
    
    // 4. Finally, delete the challenge document itself
    const challengeRef = doc(db, "challenges", id);
    await deleteDoc(challengeRef);
    console.log('✅ Expired challenge and all related data cleaned up:', id);
  } catch (error) {
    console.error('❌ Failed to cleanup expired challenge:', error);
    throw error;
  }
}

// Legacy function - now redirects to cleanup
export async function archiveChallenge(id: string) {
  console.log('⚠️ archiveChallenge is deprecated, using cleanup instead');
  await cleanupCompletedChallenge(id);
}

// ============================================
// RESULT SUBMISSION SYSTEM
// ============================================

/**
 * Submit a player's result for a challenge
 * @param challengeId - The challenge ID
 * @param wallet - The player's wallet address
 * @param didWin - Whether the player won (true) or lost (false)
 */
export const submitChallengeResult = async (
  challengeId: string,
  wallet: string,
  didWin: boolean
): Promise<void> => {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error("Challenge not found");
    }

    const data = snap.data() as ChallengeData;
    
    // Verify player is part of this challenge
    if (!data.players || !data.players.includes(wallet)) {
      throw new Error("You are not part of this challenge");
    }

    // Check if player already submitted
    if (data.results && data.results[wallet]) {
      throw new Error("You have already submitted your result");
    }

    // Add result
    const results = data.results || {};
    results[wallet] = {
      didWin,
      submittedAt: Timestamp.now(),
    };

    await updateDoc(challengeRef, {
      results,
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Result submitted:', { challengeId, wallet, didWin });

    // NEW: If player submitted "I lost", automatically mark opponent as winner
    if (!didWin && data.players && data.players.length === 2) {
      const opponentWallet = data.players.find((p: string) => p !== wallet);
      
      if (opponentWallet && !results[opponentWallet]) {
        // Opponent hasn't submitted yet - automatically mark them as winner
        console.log(`🎯 Player ${wallet.slice(0, 8)}... submitted loss - automatically marking ${opponentWallet.slice(0, 8)}... as winner`);
        
        // Add automatic win result for opponent
        results[opponentWallet] = {
          didWin: true,
          submittedAt: Timestamp.now(),
          autoDetermined: true // Flag to indicate this was auto-determined
        };
        
        await updateDoc(challengeRef, {
          results,
          updatedAt: Timestamp.now(),
        });
        
        console.log('✅ Auto-marked opponent as winner');
        
        // Now both players have "submitted" (one manually, one auto), determine winner
        const updatedSnap = await getDoc(challengeRef);
        const updatedData = updatedSnap.data() as ChallengeData;
        await determineWinner(challengeId, updatedData);
        return; // Exit early since we've already determined winner
      }
    }

    // Check if both players have submitted
    if (Object.keys(results).length === data.maxPlayers) {
      console.log('🎯 Both players submitted! Determining winner...');
      // Re-fetch the updated data to pass to determineWinner
      const updatedSnap = await getDoc(challengeRef);
      const updatedData = updatedSnap.data() as ChallengeData;
      await determineWinner(challengeId, updatedData);
    }
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
    
    const chatQuery = query(
      collection(db, 'challenge_chats'),
      where('challengeId', '==', challengeId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    
    const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
    );
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
    
    // Always delete voice signals (not needed after challenge ends)
    try {
      const voiceSignalRef = doc(db, 'voice_signals', challengeId);
      await deleteDoc(voiceSignalRef);
      console.log('🗑️ Deleted voice signals for challenge:', challengeId);
    } catch (error: any) {
      // Voice signal may not exist, ignore error
      if (error.code !== 'not-found') {
        console.log('⚠️ Could not delete voice signals (may not exist):', error);
      }
    }
    
    // Only delete chat messages if NOT a dispute (need chat for dispute resolution)
    if (!isDispute) {
      const chatQuery = query(
        collection(db, 'challenge_chats'),
        where('challengeId', '==', challengeId)
      );
      const chatSnapshot = await getDocs(chatQuery);
      
      const chatDeletePromises = chatSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'challenge_chats', docSnapshot.id))
      );
      await Promise.all(chatDeletePromises);
      console.log(`🗑️ Deleted ${chatSnapshot.size} chat messages for challenge:`, challengeId);
    } else {
      console.log('📋 Keeping chat messages for dispute resolution:', challengeId);
      console.log('   Note: Chat will be auto-deleted after dispute is resolved by admin');
    }
    
    console.log('✅ Challenge data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up challenge data:', error);
    // Don't throw - cleanup failure shouldn't block winner determination
  }
}

/**
 * Determine winner based on submitted results
 * Logic:
 * - One YES, One NO → YES player wins (clear winner)
 * - Both YES → Dispute (both claim victory, requires review)
 * - Both NO → Both forfeit (suspicious collusion, both lose challenge amounts as penalty)
 */
async function determineWinner(challengeId: string, data: ChallengeData): Promise<void> {
  try {
    const results = data.results || {};
    const players = Object.keys(results);
    
    console.log('🎯 Determining winner for challenge:', challengeId);
    console.log('📊 Results:', results);
    console.log('👥 Players who submitted:', players);
    
    if (players.length !== 2) {
      console.log('⏳ Waiting for both players to submit results');
      return;
    }

    const player1 = players[0];
    const player2 = players[1];
    const player1Won = results[player1].didWin;
    const player2Won = results[player2].didWin;
    
    console.log(`Player 1 (${player1.slice(0,8)}...): didWin=${player1Won}`);
    console.log(`Player 2 (${player2.slice(0,8)}...): didWin=${player2Won}`);

    const challengeRef = doc(db, "challenges", challengeId);

    // Case 1: Both claim they won → Dispute (KEEP CHAT for evidence)
    if (player1Won && player2Won) {
      await updateDoc(challengeRef, {
        status: 'disputed',
        winner: null,
        updatedAt: Timestamp.now(),
      });
      console.log('🔴 DISPUTE: Both players claim they won');
      // Keep chat messages for dispute resolution - admin may need them
      await cleanupChallengeData(challengeId, true); // true = isDispute
      return;
    }

    // Case 2: Both claim they lost → FORFEIT (delete chat - no dispute)
    if (!player1Won && !player2Won) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'forfeit', // Special value: both players forfeit, no refund
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ FORFEIT: Both players claim they lost - Suspicious collusion detected, both lose challenge amounts');
      // Delete chat - no dispute, no need to keep
      await cleanupChallengeData(challengeId, false); // false = not dispute
      return;
    }

    // Case 3: Clear winner (one YES, one NO) - DELETE CHAT (no dispute)
    const winner = player1Won ? player1 : player2;
    const loser = player1Won ? player2 : player1;
    
    await updateDoc(challengeRef, {
      status: 'completed',
      winner,
      updatedAt: Timestamp.now(),
    });
    console.log('🏆 WINNER DETERMINED:', winner);
    // Delete chat messages - clear winner, no dispute resolution needed
    await cleanupChallengeData(challengeId, false); // false = not dispute
    console.log('📊 Updating stats...');
    
    // Check if this is a team challenge
    const isTeamChallenge = data.challengeType === 'team';
    
    // Calculate challenge reward if not stored (for backward compatibility with old challenges)
    let prizePool = data.prizePool;
    if (!prizePool || prizePool === 0) {
      // Calculate from challenge amount: 2x challenge amount minus 5% platform fee
      const entryFee = data.entryFee || 0;
      const totalPrize = entryFee * 2;
      const platformFee = totalPrize * 0.05; // 5% platform fee
      prizePool = totalPrize - platformFee;
      console.log(`⚠️ Challenge reward not found in challenge data, calculated from challenge amount: ${entryFee} USDFG → ${prizePool} USDFG`);
    }
    
    console.log('   Game:', data.game, 'Category:', data.category, 'Prize:', prizePool, 'Type:', isTeamChallenge ? 'Team' : 'Solo');
    
    // Update stats (player or team)
    if (isTeamChallenge) {
      // Update team stats for team challenges
      console.log('   Updating winner team stats:', winner);
      await updateTeamStats(winner, 'win', prizePool, data.game || 'Unknown', data.category || 'Sports');
      console.log('   Updating loser team stats:', loser);
      await updateTeamStats(loser, 'loss', 0, data.game || 'Unknown', data.category || 'Sports');
    } else {
      // Update player stats for solo challenges
      // Get display names from challenge data and sanitize
      const rawWinnerName = winner === data.creator ? data.creatorTag : undefined;
      const rawLoserName = loser === data.creator ? data.creatorTag : undefined;
      
      const winnerDisplayName = sanitizeDisplayName(rawWinnerName);
      const loserDisplayName = sanitizeDisplayName(rawLoserName);
      
      console.log('   Updating winner stats:', winner, 'as', winnerDisplayName || 'Anonymous');
      await updatePlayerStats(winner, 'win', prizePool, data.game || 'Unknown', data.category || 'Sports', winnerDisplayName);
      console.log('   Updating loser stats:', loser, 'as', loserDisplayName || 'Anonymous');
      await updatePlayerStats(loser, 'loss', 0, data.game || 'Unknown', data.category || 'Sports', loserDisplayName);
    }
    
    // Mark challenge as ready for winner to claim (Player pays gas, not admin!)
    await updateDoc(challengeRef, {
      status: 'completed', // Keep status as completed!
      needsPayout: true,
      payoutTriggered: false,
      canClaim: true,
      updatedAt: Timestamp.now(),
    });
    
    console.log('💰 Challenge reward ready for claim:', prizePool, 'USDFG to', winner);
    console.log('✅ Winner can now claim their prize (they pay gas, not you!)');
    
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
    const connection = new Connection('https://api.devnet.solana.com');
    
    const accountInfo = await connection.getAccountInfo(new PublicKey(challengePDA));
    if (!accountInfo || !accountInfo.data) {
      console.log('Challenge not found on-chain:', challengePDA);
      return;
    }
    
    // Parse the challenge data to get on-chain status
    const data = accountInfo.data;
    const statusByte = data[8 + 32 + 33 + 8]; // Skip discriminator (8), creator (32), challenger Option (33), entry_fee (8), then status
    
    let firestoreStatus: string;
    switch (statusByte) {
      case 0: // PendingWaitingForOpponent
        firestoreStatus = 'pending_waiting_for_opponent';
        break;
      case 1: // CreatorConfirmationRequired
        firestoreStatus = 'creator_confirmation_required';
        break;
      case 2: // CreatorFunded
        firestoreStatus = 'creator_funded';
        break;
      case 3: // Active (was InProgress)
        firestoreStatus = 'active';
        break;
      case 4: // Completed
        firestoreStatus = 'completed';
        break;
      case 5: // Cancelled
        firestoreStatus = 'cancelled';
        break;
      case 6: // Disputed
        firestoreStatus = 'disputed';
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
      
      // Don't overwrite 'completed' status with 'active' from on-chain
      // This happens because Firestore marks as completed when both submit, but on-chain is still Active
      if (currentData.status === 'completed' && firestoreStatus === 'active') {
        console.log(`⏭️  Skipping sync: Firestore is 'completed', on-chain is 'active' (waiting for claim)`);
        return;
      }
      
      if (currentData.status !== firestoreStatus) {
        await updateDoc(challengeRef, {
          status: firestoreStatus,
          updatedAt: Timestamp.now(),
        });
        console.log(`🔄 Synced challenge status: ${currentData.status} → ${firestoreStatus}`);
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
    const challengeRef = doc(db, "challenges", challengeId);
    
    // Set deadline to 2 hours from now
    const deadline = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
    
    await updateDoc(challengeRef, {
      resultDeadline: deadline,
      status: 'active',
      updatedAt: Timestamp.now(),
    });
    
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
    
    const now = Timestamp.now();
    const deadlinePassed = now.toMillis() > data.resultDeadline.toMillis();
    
    if (!deadlinePassed) return;
    
    const results = data.results || {};
    const submittedCount = Object.keys(results).length;
    
    // Case 1: No one submitted → FORFEIT (no refund to prevent exploitation)
    if (submittedCount === 0) {
      await updateDoc(challengeRef, {
        status: 'completed',
        winner: 'forfeit', // Special value indicating both players forfeited
        updatedAt: Timestamp.now(),
      });
      console.log('⚠️ DEADLINE PASSED: No results submitted - FORFEIT (no refund)');
      return;
    }
    
    // Case 2: Only one player submitted → Determine winner based on their claim
    if (submittedCount === 1) {
      const submittedWallet = Object.keys(results)[0];
      const didTheyClaimWin = results[submittedWallet].didWin;
      
      if (didTheyClaimWin) {
        // They claimed they won → They win by default
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: submittedWallet,
          updatedAt: Timestamp.now(),
        });
        console.log('🏆 DEADLINE PASSED: Winner by default (opponent no-show):', submittedWallet);
      } else {
        // They claimed they lost → The OTHER player wins by default
        const opponentWallet = data.players.find((p: string) => p !== submittedWallet);
        await updateDoc(challengeRef, {
          status: 'completed',
          winner: opponentWallet || 'tie',
          updatedAt: Timestamp.now(),
        });
        console.log('🏆 DEADLINE PASSED: Opponent wins (player admitted defeat, opponent no-show):', opponentWallet);
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
    if (!challenge.players.includes(walletAddress)) {
      throw new Error('Only participants can request cancellation');
    }
    
    // Get current cancel requests
    const cancelRequests = challenge.cancelRequests || [];
    
    // If user already requested, check if we need to resend notification
    if (cancelRequests.includes(walletAddress)) {
      console.log('⚠️ User already requested cancellation - checking chat for notification');
      
      // Check if system message was already sent
      console.log('🔍 Checking for existing system messages...');
      const chatQuery = query(
        collection(db, 'challenge_chats'),
        where('challengeId', '==', challengeId),
        where('sender', '==', 'SYSTEM')
      );
      const chatSnap = await getDocs(chatQuery);
      console.log('📊 System messages in DB:', chatSnap.size);
      chatSnap.docs.forEach(doc => {
        console.log('  -', doc.data().text);
      });
      
      const hasSystemMessage = chatSnap.docs.some(doc => 
        doc.data().text?.includes('requested to cancel')
      );
      
      if (!hasSystemMessage) {
        // Send system message if it wasn't sent before
        console.log('📨 Resending system message to chat (was missing)');
        const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
        const chatDoc = await addDoc(collection(db, 'challenge_chats'), {
          challengeId,
          text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
          sender: 'SYSTEM',
          timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for immediate visibility
        });
        console.log('✅ System message sent to chat:', chatDoc.id);
      } else {
        console.log('✅ System message already exists in chat (found "requested to cancel")');
      }
      
      return;
    }
    
    // Add this user's cancel request
    const newCancelRequests = [...cancelRequests, walletAddress];
    
    // If both players agreed (all players requested cancel)
    if (newCancelRequests.length === challenge.players.length) {
      console.log('✅ Both players agreed to cancel - Cancelling challenge and refunding');
      await updateDoc(challengeRef, {
        status: 'cancelled',
        cancelRequests: newCancelRequests,
        winner: 'cancelled',
        updatedAt: Timestamp.now(),
      });
      
      // Send system message to chat
      await addDoc(collection(db, 'challenge_chats'), {
        challengeId,
        text: '🤝 Both players agreed to cancel. Challenge cancelled, challenge amounts will be returned.',
        sender: 'SYSTEM',
        timestamp: Timestamp.now(),
      });
    } else {
      // Just one player requested so far
      console.log('⏳ Cancel requested, waiting for other player to agree');
      await updateDoc(challengeRef, {
        cancelRequests: newCancelRequests,
        updatedAt: Timestamp.now(),
      });
      
      // Send system message to chat notifying opponent
      const shortWallet = walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4);
      console.log('📨 Sending system message to chat:', challengeId);
      const chatDoc = await addDoc(collection(db, 'challenge_chats'), {
        challengeId,
        text: `🚫 ${shortWallet} requested to cancel the challenge. Click "Agree to Cancel" button if you agree.`,
        sender: 'SYSTEM',
        timestamp: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for immediate visibility
      });
      console.log('✅ System message sent to chat:', chatDoc.id);
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
  trustScore?: number; // Average trust score (0-10)
  trustReviews?: number; // Number of trust reviews received
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
  trustReviews?: number;
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
 * Calculate trust score for a player from Firestore
 */
async function calculateTrustScore(wallet: string): Promise<{ trustScore: number; trustReviews: number }> {
  try {
    const walletLower = wallet.toLowerCase();
    const reviewsRef = collection(db, 'trust_reviews');
    const q = query(
      reviewsRef,
      where('opponent', '==', walletLower)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`   📊 No trust reviews found for ${wallet.slice(0, 8)}... (searched for: ${walletLower})`);
      return { trustScore: 0, trustReviews: 0 };
    }
    
    let totalScore = 0;
    let reviewCount = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const score = data.review?.trustScore10 || 0;
      totalScore += score;
      reviewCount++;
      console.log(`   📊 Found review ${reviewCount}: score ${score}/10 from ${data.reviewer?.slice(0, 8)}...`);
    });
    
    const averageScore = totalScore / reviewCount;
    const trustScore = Math.round(averageScore * 10) / 10; // Round to 1 decimal
    
    console.log(`   ✅ Calculated trust score for ${wallet.slice(0, 8)}...: ${trustScore}/10 from ${reviewCount} reviews`);
    
    return {
      trustScore,
      trustReviews: reviewCount
    };
  } catch (error: any) {
    // If it's a permission error, log it but don't fail - just return 0
    if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
      console.warn(`   ⚠️ Permission denied when calculating trust score for ${wallet.slice(0, 8)}... - Firestore rules may need to be updated`);
      console.warn(`   ⚠️ This is non-fatal - player stats will be updated without trust score`);
    } else {
      console.error(`❌ Error calculating trust score for ${wallet.slice(0, 8)}...:`, error);
    }
    return { trustScore: 0, trustReviews: 0 };
  }
}

/**
 * Calculate trust score from Firestore (synchronous fallback for backward compatibility)
 */
function calculateTrustScoreSync(wallet: string): { trustScore: number; trustReviews: number } {
  try {
    // Try localStorage as fallback (for backward compatibility)
    const trustReviews = JSON.parse(localStorage.getItem('trustReviews') || '[]');
    
    // Filter reviews for this specific player
    const playerReviews = trustReviews.filter((review: any) => 
      review.opponent && review.opponent.toLowerCase() === wallet.toLowerCase()
    );
    
    if (playerReviews.length === 0) {
      return { trustScore: 0, trustReviews: 0 };
    }
    
    // Calculate average trust score
    const totalScore = playerReviews.reduce((sum: number, review: any) => {
      return sum + (review.review?.trustScore10 || 0);
    }, 0);
    
    const averageScore = totalScore / playerReviews.length;
    
    return {
      trustScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      trustReviews: playerReviews.length
    };
  } catch (error) {
    console.error('❌ Error calculating trust score:', error);
    return { trustScore: 0, trustReviews: 0 };
  }
}

/**
 * Update player stats after a challenge completes
 */
async function updatePlayerStats(
  wallet: string,
  result: 'win' | 'loss',
  amountEarned: number,
  game: string,
  category: string,
  displayName?: string
): Promise<void> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);

    // Calculate trust score for this player from Firestore
    // If calculation fails due to permissions, use 0 as fallback
    let trustScore = 0;
    let trustReviews = 0;
    try {
      const result = await calculateTrustScore(wallet);
      trustScore = result.trustScore;
      trustReviews = result.trustReviews;
    } catch (error) {
      // If trust score calculation fails, continue with 0
      // This prevents the entire stats update from failing
      console.warn(`   ⚠️ Trust score calculation failed for ${wallet.slice(0, 8)}..., using 0 as fallback`);
    }

    if (!playerSnap.exists()) {
      // Create new player stats
      // Note: OG First 1k trophy is awarded when creating first challenge, not here
      const newStats: any = {
        wallet,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        winRate: result === 'win' ? 100 : 0,
        totalEarned: amountEarned,
        gamesPlayed: 1,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        ogFirst1k: false, // Trophy is awarded at challenge creation, not completion
        gameStats: {
          [game]: {
            wins: result === 'win' ? 1 : 0,
            losses: result === 'loss' ? 1 : 0,
            earned: amountEarned
          }
        },
        categoryStats: {
          [category]: {
            wins: result === 'win' ? 1 : 0,
            losses: result === 'loss' ? 1 : 0,
            earned: amountEarned
          }
        }
      };
      
      // Only include displayName if it exists (Firestore doesn't allow undefined)
      if (displayName) {
        newStats.displayName = displayName;
      }
      
      await setDoc(playerRef, newStats);
      console.log(`✅ Created new player stats: ${wallet} - ${result} (+${amountEarned} USDFG) - Trust: ${trustScore}/10 (${trustReviews} reviews) - ${displayName || 'Anonymous'}`);
    } else {
      // Update existing player stats
      const currentStats = playerSnap.data() as PlayerStats;
      const newWins = currentStats.wins + (result === 'win' ? 1 : 0);
      const newLosses = currentStats.losses + (result === 'loss' ? 1 : 0);
      const newGamesPlayed = currentStats.gamesPlayed + 1;
      const newWinRate = (newWins / newGamesPlayed) * 100;

      // Update game-specific stats
      const gameStats = currentStats.gameStats || {};
      if (!gameStats[game]) {
        gameStats[game] = { wins: 0, losses: 0, earned: 0 };
      }
      gameStats[game].wins += result === 'win' ? 1 : 0;
      gameStats[game].losses += result === 'loss' ? 1 : 0;
      gameStats[game].earned += amountEarned;

      // Update category-specific stats
      const categoryStats = currentStats.categoryStats || {};
      if (!categoryStats[category]) {
        categoryStats[category] = { wins: 0, losses: 0, earned: 0 };
      }
      categoryStats[category].wins += result === 'win' ? 1 : 0;
      categoryStats[category].losses += result === 'loss' ? 1 : 0;
      categoryStats[category].earned += amountEarned;

      const updateData: any = {
        wins: newWins,
        losses: newLosses,
        winRate: Math.round(newWinRate * 10) / 10, // Round to 1 decimal
        totalEarned: currentStats.totalEarned + amountEarned,
        gamesPlayed: newGamesPlayed,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        gameStats,
        categoryStats
      };
      
      // 🔒 LOCKED: Username can only be set once on first challenge
      // If player doesn't have a displayName yet, set it now (first time only)
      if (displayName && !currentStats.displayName) {
        updateData.displayName = displayName;
        console.log(`🔒 Username locked for ${wallet}: "${displayName}"`);
      }
      
      await updateDoc(playerRef, updateData);

      console.log(`✅ Updated player stats: ${wallet} - ${result} (+${amountEarned} USDFG) - Trust: ${trustScore}/10 (${trustReviews} reviews)`);
    }
  } catch (error) {
    console.error('❌ Error updating player stats:', error);
    // Don't throw - stats update failure shouldn't block challenge completion
  }
}

/**
 * Get player stats by wallet address
 */
export async function getPlayerStats(wallet: string): Promise<PlayerStats | null> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) {
      return null;
    }
    
    return playerSnap.data() as PlayerStats;
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    return null;
  }
}

/**
 * Update player's lastActive timestamp when they connect/view the page
 * This ensures they show as "online" in the stats
 */
export async function updatePlayerLastActive(wallet: string): Promise<void> {
  try {
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      // Update existing player's lastActive
      await updateDoc(playerRef, {
        lastActive: Timestamp.now(),
      });
    } else {
      // Create new player stats with current timestamp
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {},
      });
    }
  } catch (error) {
    console.error('❌ Error updating player lastActive:', error);
    // Don't throw - this is a background update, shouldn't block the app
  }
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
    const userRef = doc(db, 'users', userId);
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
    const userRef = doc(db, 'users', userId);
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
    if (status === 'pending_waiting_for_opponent' || status === 'creator_confirmation_required' || status === 'creator_funded') {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(notificationRef, payload, { merge: true });
  } catch (error) {
    console.error('❌ Error upserting lock notification:', error);
    throw error;
  }
}

export function listenToLockNotifications(
  wallet: string,
  callback: (notifications: LockNotification[]) => void
): () => void {
  if (!wallet) {
    return () => undefined;
  }

  const walletLower = wallet.toLowerCase();
  const notificationsQuery = query(
    lockNotificationsCollection,
    where('participants', 'array-contains', walletLower)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications: LockNotification[] = snapshot.docs.map((docSnap) => {
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

      callback(notifications);
    },
    (error) => {
      console.error('❌ Error listening to lock notifications:', error);
    }
  );
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
 * Listen to challenge notifications for a specific player
 */
export function listenToChallengeNotifications(
  wallet: string,
  callback: (notifications: ChallengeNotification[]) => void
): () => void {
  if (!wallet) {
    return () => undefined;
  }

  const walletLower = wallet.toLowerCase();
  const notificationsQuery = query(
    collection(db, 'challenge_notifications'),
    where('targetPlayer', '==', walletLower),
    where('status', '==', 'pending_waiting_for_opponent')
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications: ChallengeNotification[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          challengeId: data.challengeId,
          creator: data.creator,
          targetPlayer: data.targetPlayer,
          creatorDisplayName: data.creatorDisplayName,
          targetDisplayName: data.targetDisplayName,
          challengeTitle: data.challengeTitle,
          entryFee: data.entryFee,
          prizePool: data.prizePool,
          status: data.status,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });

      callback(notifications);
    },
    (error) => {
      console.error('❌ Error listening to challenge notifications:', error);
    }
  );
}

/**
 * Clear the lock state for two users after a friendly match resolves.
 */
export async function clearMutualLock(userA: string, userB: string): Promise<void> {
  if (!userA || !userB) {
    throw new Error('Both user IDs are required to clear mutual lock');
  }

  try {
    const batch = writeBatch(db);
    const userARef = doc(db, 'users', userA);
    const userBRef = doc(db, 'users', userB);

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
 * Listen to all lobby locks so the client can react to mutual lock pairs.
 */
export function listenToAllUserLocks(
  callback: (locks: Record<string, string | null>) => void
): () => void {
  return onSnapshot(usersCollection, (snapshot) => {
    const locks: Record<string, string | null> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawLock = (data?.currentLock ?? null) as string | null;
      locks[docSnap.id] = rawLock ? rawLock.toLowerCase() : null;
    });

    callback(locks);
  }, (error) => {
    console.error('❌ Error listening to user locks:', error);
  });
}

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
    
    // Update the opponent's trust score in player_stats
    await updatePlayerTrustScore(opponent);
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
    console.log(`🔄 Recalculating trust score for ${wallet.slice(0, 8)}...`);
    const { trustScore, trustReviews } = await calculateTrustScore(wallet);
    
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      const currentData = playerSnap.data() as PlayerStats;
      const currentTrustScore = currentData.trustScore || 0;
      const currentTrustReviews = currentData.trustReviews || 0;
      
      // Only update if the score has changed
      if (currentTrustScore !== trustScore || currentTrustReviews !== trustReviews) {
        await updateDoc(playerRef, {
          trustScore,
          trustReviews
        });
        console.log(`✅ Updated trust score for ${wallet.slice(0, 8)}...: ${currentTrustScore} → ${trustScore}/10 (${currentTrustReviews} → ${trustReviews} reviews)`);
      } else {
        console.log(`   ℹ️ Trust score unchanged for ${wallet.slice(0, 8)}...: ${trustScore}/10 (${trustReviews} reviews)`);
      }
    } else {
      // Player doesn't exist yet, create with trust score
      await setDoc(playerRef, {
        wallet,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore,
        trustReviews,
        gameStats: {},
        categoryStats: {}
      });
      console.log(`✅ Created player stats with trust score for ${wallet.slice(0, 8)}...: ${trustScore}/10 (${trustReviews} reviews)`);
    }
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
    
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      await updateDoc(playerRef, {
        displayName: sanitized
      });
      console.log(`✅ Updated display name for ${wallet}: "${sanitized}"`);
    } else {
      // Player doesn't exist yet, create with display name
      await setDoc(playerRef, {
        wallet,
        displayName: sanitized,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalEarned: 0,
        gamesPlayed: 0,
        lastActive: Timestamp.now(),
        trustScore: 0,
        trustReviews: 0,
        gameStats: {},
        categoryStats: {}
      });
      console.log(`✅ Created player stats with display name for ${wallet}: "${sanitized}"`);
    }
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
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      if (countryCode) {
        await updateDoc(playerRef, {
          country: countryCode
        });
        console.log(`✅ Updated country for ${wallet}: ${countryCode}`);
      } else {
        // Remove country if null
        await updateDoc(playerRef, {
          country: null
        });
        console.log(`✅ Removed country for ${wallet}`);
      }
    } else {
      // Player doesn't exist yet, create with country
      if (countryCode) {
        await setDoc(playerRef, {
          wallet,
          country: countryCode,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          lastActive: Timestamp.now(),
          trustScore: 0,
          trustReviews: 0,
          gameStats: {},
          categoryStats: {}
        });
        console.log(`✅ Created player stats with country for ${wallet}: ${countryCode}`);
      }
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
    const playerRef = doc(db, 'player_stats', wallet);
    const playerSnap = await getDoc(playerRef);
    
    if (playerSnap.exists()) {
      if (imageURL) {
        await updateDoc(playerRef, {
          profileImage: imageURL
        });
        console.log(`✅ Updated profile image for ${wallet}`);
      } else {
        // Remove profileImage field from Firestore
        await updateDoc(playerRef, {
          profileImage: null
        });
        console.log(`✅ Removed profile image for ${wallet}`);
      }
    } else {
      // Player doesn't exist yet, create with profile image
      if (imageURL) {
        await setDoc(playerRef, {
          wallet,
          profileImage: imageURL,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarned: 0,
          gamesPlayed: 0,
          lastActive: Timestamp.now(),
          trustScore: 0,
          trustReviews: 0,
          gameStats: {},
          categoryStats: {}
        });
        console.log(`✅ Created player stats with profile image for ${wallet}`);
      }
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
 * Update team stats after a challenge completes
 */
export async function updateTeamStats(
  teamId: string,
  result: 'win' | 'loss',
  amountEarned: number,
  game: string,
  category: string
): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      throw new Error("Team not found");
    }
    
    const currentStats = teamSnap.data() as TeamStats;
    const newWins = result === 'win' ? currentStats.wins + 1 : currentStats.wins;
    const newLosses = result === 'loss' ? currentStats.losses + 1 : currentStats.losses;
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newWinRate = newGamesPlayed > 0 ? (newWins / newGamesPlayed) * 100 : 0;
    const newTotalEarned = currentStats.totalEarned + amountEarned;
    
    // Update game stats
    const currentGameStats = currentStats.gameStats[game] || { wins: 0, losses: 0, earned: 0 };
    const newGameStats = {
      ...currentStats.gameStats,
      [game]: {
        wins: result === 'win' ? currentGameStats.wins + 1 : currentGameStats.wins,
        losses: result === 'loss' ? currentGameStats.losses + 1 : currentGameStats.losses,
        earned: currentGameStats.earned + amountEarned
      }
    };
    
    // Update category stats
    const currentCategoryStats = currentStats.categoryStats[category] || { wins: 0, losses: 0, earned: 0 };
    const newCategoryStats = {
      ...currentStats.categoryStats,
      [category]: {
        wins: result === 'win' ? currentCategoryStats.wins + 1 : currentCategoryStats.wins,
        losses: result === 'loss' ? currentCategoryStats.losses + 1 : currentCategoryStats.losses,
        earned: currentCategoryStats.earned + amountEarned
      }
    };
    
    await updateDoc(teamRef, {
      wins: newWins,
      losses: newLosses,
      winRate: newWinRate,
      totalEarned: newTotalEarned,
      gamesPlayed: newGamesPlayed,
      lastActive: Timestamp.now(),
      gameStats: newGameStats,
      categoryStats: newCategoryStats
    });
    
    console.log(`✅ Updated team stats: ${teamId} - ${result} (+${amountEarned} USDFG)`);
  } catch (error) {
    console.error('❌ Error updating team stats:', error);
    throw error;
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
      const data = doc.data() as PlayerStats;
      const displayName = data.displayName ? `"${data.displayName}"` : '(no display name)';
      const trustScore = data.trustScore !== undefined ? data.trustScore : 0;
      const trustReviews = data.trustReviews || 0;
      console.log(`   Player: ${data.wallet.slice(0, 8)}... - Name: ${displayName} - ${data.totalEarned} USDFG - ${data.winRate}% WR - Trust: ${trustScore}/10 (${trustReviews} reviews)`);
      
      // Ensure trustScore is always a number (default to 0 if undefined)
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

/**
 * Claim prize for a completed challenge (WINNER ONLY)
 * 
 * Winner determines automatically, but winner must claim their prize themselves.
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
): Promise<void> {
  try {
    console.log('🏆 Claiming prize for challenge:', challengeId);
    
    // Get challenge data from Firestore
    const challengeRef = doc(db, 'challenges', challengeId);
    const snap = await getDoc(challengeRef);
    
    if (!snap.exists()) {
      throw new Error('❌ Challenge not found in Firestore');
    }
    
    const data = snap.data() as ChallengeData;
    
    // Validate challenge is ready for claim
    if (data.status !== 'completed') {
      throw new Error('❌ Challenge is not completed');
    }
    
    if (!data.winner || data.winner === 'forfeit' || data.winner === 'tie') {
      throw new Error('❌ No valid winner to pay out');
    }
    
    // Check if this is a Founder Challenge (no PDA, entryFee is 0, creator is ADMIN_WALLET)
    const entryFee = data.entryFee || 0;
    const creatorWallet = data.creator || '';
    const isFree = entryFee === 0 || entryFee < 0.000000001;
    
    // Import ADMIN_WALLET to check if creator is admin
    const { ADMIN_WALLET } = await import('../chain/config');
    const isAdmin = creatorWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
    const isFounderChallenge = !data.pda && (isFree || isAdmin);
    
    if (isFounderChallenge) {
      // Founder Challenge prizes are transferred manually by the founder, not via smart contract
      throw new Error('🏆 This is a Founder Challenge. Prizes are transferred manually by the founder after the challenge completes. Please contact the founder to receive your prize.');
    }
    
    // If no PDA, try to derive it from the challenge data
    let challengePDA = data.pda;
    if (!challengePDA) {
      console.log('⚠️ No PDA found, attempting to derive from challenge data...');
      
      // For existing challenges without PDA, we need to manually add it
      // This is a temporary fix for challenges created before PDA field was added
      console.log('🔧 Attempting to fix missing PDA for existing challenge...');
      
      // Try to find the PDA by looking up the challenge on-chain
      // For now, we'll need to manually add the PDA to the challenge document
      throw new Error('❌ Challenge has no on-chain PDA. This challenge was created before the PDA field was added. Please create a new challenge to use the claim prize functionality.');
    }
    
    if (!data.canClaim) {
      throw new Error('❌ Challenge is not ready for claim yet');
    }
    
    // Validate caller is the winner
    if (!winnerWallet || !winnerWallet.publicKey) {
      throw new Error('❌ Wallet not connected');
    }
    
    const callerAddress = winnerWallet.publicKey.toString();
    if (callerAddress !== data.winner) {
      throw new Error('❌ Only the winner can claim the prize');
    }
    
    // Prevent duplicate claims
    if (data.payoutTriggered) {
      throw new Error('⚠️  Prize already claimed');
    }
    
    console.log('✅ Validation passed - calling smart contract...');
    console.log('   Winner:', data.winner);
    console.log('   Challenge Reward:', data.prizePool, 'USDFG');
    console.log('   Challenge PDA:', challengePDA);
    
    // ✅ REMOVED: Expiration check for prize claims
    // Winners can claim prizes ANYTIME after challenge completion (no expiration).
    // Once both players submit results and challenge is completed in Firestore,
    // the winner should be able to claim their prize whenever they want.
    // The dispute_timer only prevents joining expired challenges, not claiming prizes.
    
    // Import the resolveChallenge function
    const { resolveChallenge } = await import('../chain/contract');
    
    // Call smart contract (winner pays gas!)
    console.log('🚀 Winner calling smart contract to release escrow...');
    console.log('   Note: Prize claims have NO expiration - winners can claim anytime!');
    
    try {
      const signature = await resolveChallenge(
        winnerWallet,
        connection,
        challengePDA,
        data.winner
      );
    
      // Update Firestore to mark prize as claimed
      await updateDoc(challengeRef, {
        payoutTriggered: true,
        prizeClaimedAt: Timestamp.now(), // Mark as claimed for unclaimed prize filter
        payoutSignature: signature,
        payoutTimestamp: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log('✅ PRIZE CLAIMED!');
      console.log('   Transaction:', signature);
      console.log('   Winner received:', data.prizePool, 'USDFG');
    } catch (contractError: any) {
      // Handle specific smart contract errors
      // Note: ChallengeExpired should no longer occur for prize claims since we removed the check
      // But keep this handler for backwards compatibility with old deployed contracts
      if (contractError.message?.includes('ChallengeExpired') || 
          contractError.message?.includes('6005') ||
          contractError.logs?.some((log: string) => log.includes('ChallengeExpired') || log.includes('Challenge has expired'))) {
        console.error('⚠️ Old contract version detected - still has expiration check. Please redeploy with updated contract.');
        const expiredError = new Error('❌ Old contract version detected. Please contact support to redeploy the contract without expiration check for prize claims.');
        expiredError.name = 'ChallengeExpired';
        throw expiredError;
      }
      throw contractError;
    }
    
  } catch (error) {
    console.error('❌ Error claiming prize:', error);
    throw error;
  }
}

// ============================================
// FREE USDFG CLAIM SYSTEM - REMOVED
// ============================================
// This feature was replaced with Founder Challenges
// Free claim functions removed as they are no longer used
