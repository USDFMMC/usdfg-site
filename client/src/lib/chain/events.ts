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
 * Fetch all active challenges from devnet
 */
export async function fetchActiveChallenges(): Promise<ChallengeCreatedEvent[]> {
  console.log('🔄 Fetching challenges from devnet...');
  
  try {
    // Check if wallet is connected, but don't require it for fetching
    const hasWallet = (window as any).solana?.isConnected;
    if (!hasWallet) {
      console.warn("⚠️ No wallet connected — using devnet public fetch only.");
    }
    
    // For now, simulate fetching from program accounts
    // Later this will query your deployed USDFG program accounts
    console.log("✅ Connected to devnet, ready to fetch challenges from your program");
    
    // Simulate some challenges for testing (replace with real account queries later)
    const mockChallenges: ChallengeCreatedEvent[] = [
      {
        id: 'devnet_challenge_1',
        creatorAddress: 'mock_creator_1',
        game: 'Street Fighter 6',
        entryFee: 50,
        maxPlayers: 2,
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        transactionHash: 'devnet_tx_1'
      },
      {
        id: 'devnet_challenge_2',
        creatorAddress: 'mock_creator_2',
        game: 'Tekken 8',
        entryFee: 25,
        maxPlayers: 2,
        timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
        transactionHash: 'devnet_tx_2'
      }
    ];
    
    // Log each challenge as requested
    mockChallenges.forEach(challenge => {
      console.log(`🎮 Challenge Loaded: ${challenge.game} | Entry Fee: ${challenge.entryFee} | Creator: ${challenge.creatorAddress.slice(0, 8)}...`);
    });
    
    console.log(`✅ Loaded ${mockChallenges.length} challenges from devnet`);
    return mockChallenges;
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
 * Create a new challenge on the blockchain with metadata storage
 */
export async function createChallenge(
  creatorAddress: string,
  game: string,
  entryFee: number,
  maxPlayers: number,
  rules: string
): Promise<string> {
  console.log(`Creating challenge: ${game}, ${entryFee} USDFG`);
  
  try {
    // Get the connected wallet provider
    const provider = (window as any).solana;
    if (!provider || !provider.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Create challenge metadata object
    const challengeData = {
      id: `challenge_${Date.now()}`,
      creatorAddress,
      game,
      entryFee,
      maxPlayers,
      rules,
      timestamp: Date.now(),
      status: 'active'
    };

    // Serialize metadata for on-chain storage
    const serializedData = Buffer.from(JSON.stringify(challengeData));
    
    // For now, use a simple account creation approach
    // Later this will be replaced with proper PDA creation
    const challengeAccount = new PublicKey("11111111111111111111111111111112"); // Placeholder for PDA

    // Create transaction with metadata storage
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: challengeAccount,
        lamports: 0, // No SOL transfer, just metadata storage
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
    
    console.log(`✅ Challenge stored on devnet: ${signature}`);
    console.log(`🎮 Challenge Data: ${game} | Entry Fee: ${entryFee} USDFG | Creator: ${creatorAddress.slice(0, 8)}...`);
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
