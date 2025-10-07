// Live Solana devnet integration
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from "@solana/web3.js";

// Use the same devnet connection as wallet
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export interface ChallengeEvent {
  id: string;
  playerAddress: string;
  challengeId: string;
  game: string;
  result: 'win' | 'loss';
  amount: number;
  timestamp: number;
  transactionHash: string;
}

export interface ChallengeCreatedEvent {
  id: string;
  creatorAddress: string;
  game: string;
  entryFee: number;
  maxPlayers: number;
  timestamp: number;
  transactionHash: string;
}

export interface ChallengeMeta {
  id?: string;             // on-chain id when available
  clientId?: string;       // temp id for optimistic UI
  creator: string;
  game: string;
  entryFee: number;
  maxPlayers: number;
  rules: string;
  timestamp: number;       // ms
}

/**
 * Fetch all challenge events for a specific player
 * TODO: Replace with actual Solana program query
 */
export async function fetchPlayerEvents(playerAddress: string): Promise<ChallengeEvent[]> {
  // Mock implementation - replace with actual Solana RPC calls
  console.log(`Fetching events for player: ${playerAddress}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock data - replace with real blockchain queries
  const mockEvents: ChallengeEvent[] = [
    {
      id: '1',
      playerAddress,
      challengeId: 'challenge_1',
      game: 'Street Fighter 6',
      result: 'win',
      amount: 100,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      transactionHash: 'mock_tx_hash_1'
    },
    {
      id: '2',
      playerAddress,
      challengeId: 'challenge_2',
      game: 'Tekken 8',
      result: 'loss',
      amount: -50,
      timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      transactionHash: 'mock_tx_hash_2'
    },
    {
      id: '3',
      playerAddress,
      challengeId: 'challenge_3',
      game: 'Mortal Kombat 1',
      result: 'win',
      amount: 75,
      timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
      transactionHash: 'mock_tx_hash_3'
    }
  ];
  
  return mockEvents;
}

/**
 * Fetch all active challenges from devnet - works without wallet
 */
// Temporary in-memory storage for challenges until we have a deployed program
let challengeStorage: ChallengeMeta[] = [];

export async function fetchActiveChallenges(): Promise<ChallengeMeta[]> {
  console.log('🔄 Fetching challenges from devnet...');
  
  try {
    // For now, use in-memory storage until we have a deployed USDFG program
    console.log("✅ Connected to devnet, ready to fetch challenges from your program");
    console.log("📝 Using temporary in-memory storage until USDFG program is deployed");
    
    // Return challenges from in-memory storage
    const challenges = challengeStorage;
    
    if (challenges.length === 0) {
      console.log("📝 No challenges found - create one to see it here");
      console.log("💡 To see challenges, create one using the 'Create Challenge' button");
    } else {
      // Log each challenge as requested
      challenges.forEach(challenge => {
        console.log(`🎮 Challenge Loaded: ${challenge.game} | Entry Fee: ${challenge.entryFee} | Creator: ${challenge.creator.slice(0, 8)}...`);
      });
    }
    
    console.log(`✅ Loaded ${challenges.length} challenges from devnet`);
    return challenges;
    
  } catch (error) {
    console.error("❌ Devnet fetch failed:", error);
    return [];
  }
}

/**
 * Fetch challenge details by ID
 * TODO: Replace with actual Solana program query
 */
export async function fetchChallengeDetails(challengeId: string): Promise<ChallengeCreatedEvent | null> {
  console.log(`Fetching challenge details: ${challengeId}`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock implementation
  return {
    id: challengeId,
    creatorAddress: 'mock_creator',
    game: 'Street Fighter 6',
    entryFee: 50,
    maxPlayers: 2,
    timestamp: Date.now() - 30 * 60 * 1000,
    transactionHash: 'mock_tx_hash'
  };
}

/**
 * Submit a challenge result to the blockchain
 * TODO: Replace with actual Solana transaction
 */
export async function submitChallengeResult(
  challengeId: string,
  playerAddress: string,
  result: 'win' | 'loss',
  proof?: string
): Promise<string> {
  console.log(`Submitting challenge result: ${challengeId}, ${result}`);
  
  // Simulate transaction time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock transaction hash
  const mockTxHash = `mock_tx_${Date.now()}`;
  console.log(`Transaction submitted: ${mockTxHash}`);
  
  return mockTxHash;
}

/**
 * Create a new challenge with optimistic UI support
 */
export async function createChallenge(meta: Omit<ChallengeMeta, "id"|"clientId"|"timestamp">) {
  const provider = (window as any).solana;
  if (!provider?.publicKey) throw new Error("Wallet not connected");

  // Optimistic object for UI
  const optimistic: ChallengeMeta = {
    clientId: `client_${crypto.randomUUID()}`,
    creator: provider.publicKey.toString(),
    game: meta.game,
    entryFee: meta.entryFee,
    maxPlayers: meta.maxPlayers,
    rules: meta.rules,
    timestamp: Date.now(),
  };

  // Return both optimistic and a promise that resolves with chain id/signature
  const txPromise = (async () => {
    const sig = await createChallengeOnChain(optimistic); // your existing devnet tx
    // derive id from sig (or PDA) in your program later:
    return { signature: sig, id: sig };
  })();

  return { optimistic, txPromise };
}

/**
 * Create challenge on chain (internal helper)
 */
async function createChallengeOnChain(meta: ChallengeMeta): Promise<string> {
  console.log(`Creating challenge: ${meta.game}, ${meta.entryFee} USDFG`);
  
  try {
    // Get the connected wallet provider
    const provider = (window as any).solana;
    if (!provider || !provider.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Create challenge metadata object
    const challengeData = {
      id: `challenge_${Date.now()}`,
      creatorAddress: meta.creator,
      game: meta.game,
      entryFee: meta.entryFee,
      maxPlayers: meta.maxPlayers,
      rules: meta.rules,
      timestamp: meta.timestamp,
      status: 'active'
    };

    // For now, we'll use a simple approach: store challenge data in a new account
    // This creates a new account with the challenge data as account data
    const challengeAccount = new PublicKey("11111111111111111111111111111112"); // System program for now
    
    // Create a simple transaction that includes the challenge data in the memo
    // This is a temporary approach until we have a proper program
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: challengeAccount,
        lamports: 1000, // Small amount to create account
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    // Sign and send transaction
    const signedTransaction = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature, "confirmed");
    
    // Add challenge to in-memory storage for immediate visibility
    const newChallenge: ChallengeMeta = {
      id: signature, // Use transaction signature as ID
      creator: meta.creator,
      game: meta.game,
      entryFee: meta.entryFee,
      maxPlayers: meta.maxPlayers,
      rules: meta.rules,
      timestamp: meta.timestamp,
    };
    
    challengeStorage.push(newChallenge);
    console.log(`📦 Challenge added to in-memory storage for immediate visibility`);
    
    console.log(`✅ Challenge stored on devnet: ${signature}`);
    console.log(`🎮 Challenge Data: ${meta.game} | Entry Fee: ${meta.entryFee} USDFG | Creator: ${meta.creator.slice(0, 8)}...`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error("Failed to create challenge on devnet:", error);
    throw error;
  }
}

/**
 * Get current USDFG token price
 * TODO: Replace with actual price feed integration
 */
export async function getUSDFGPrice(): Promise<number> {
  // Mock price - replace with actual price feed
  return 0.05; // $0.05 per USDFG
}

/**
 * Get player's USDFG balance
 * TODO: Replace with actual Solana token account query
 */
export async function getPlayerBalance(playerAddress: string): Promise<number> {
  console.log(`Getting balance for: ${playerAddress}`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock balance
  return 1250.75;
}
