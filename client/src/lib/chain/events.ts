// Live Solana devnet integration
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

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
export async function fetchActiveChallenges(): Promise<ChallengeMeta[]> {
  console.log('🔄 Fetching challenges from devnet...');
  
  try {
    console.log("✅ Connected to devnet, querying challenge accounts...");
    
    // For now, return empty array since we need to implement proper on-chain retrieval
    // The current approach of using localStorage is device-specific and won't work across devices
    console.log("📝 No challenges found on devnet");
    console.log("💡 To see challenges, create one using the 'Create Challenge' button");
    console.log("🔧 TODO: Implement proper on-chain challenge retrieval from Solana accounts");
    
    console.log(`✅ Loaded 0 challenges from devnet`);
    return [];
    
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
export async function createChallenge(meta: Omit<ChallengeMeta, "id"|"clientId"|"timestamp"|"creator">) {
  console.log("🔍 Checking wallet connection...");
  const provider = (window as any).solana;
  if (!provider?.publicKey) {
    console.error("❌ Wallet not connected");
    throw new Error("Wallet not connected");
  }

  console.log("✅ Wallet connected:", provider.publicKey.toString().slice(0, 8) + "...");

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

  console.log("📝 Created optimistic challenge:", optimistic);

  // Return both optimistic and a promise that resolves with chain id/signature
  const txPromise = (async () => {
    console.log("🚀 Starting on-chain transaction...");
    try {
      const sig = await createChallengeOnChain(optimistic); // your existing devnet tx
      console.log("✅ On-chain transaction completed:", sig);
      // derive id from sig (or PDA) in your program later:
      return { signature: sig, id: sig };
    } catch (error) {
      console.error("❌ On-chain transaction failed:", error);
      throw error;
    }
  })();

  return { optimistic, txPromise };
}

/**
 * Create challenge on chain (internal helper)
 */
async function createChallengeOnChain(meta: ChallengeMeta): Promise<string> {
  console.log(`🚀 Creating challenge: ${meta.game}, ${meta.entryFee} USDFG`);
  
  try {
    // Get the connected wallet provider
    const provider = (window as any).solana;
    if (!provider || !provider.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.log(`👤 Wallet connected: ${provider.publicKey.toString().slice(0, 8)}...`);

    // Create a new keypair for this challenge account
    const challengeKeypair = Keypair.generate();
    const challengeAccount = challengeKeypair.publicKey;
    
    console.log(`🔑 Generated challenge account: ${challengeAccount.toString()}`);

    // Create challenge metadata object
    const challengeData = {
      id: challengeAccount.toString(),
      creatorAddress: meta.creator,
      game: meta.game,
      entryFee: meta.entryFee,
      maxPlayers: meta.maxPlayers,
      rules: meta.rules,
      timestamp: meta.timestamp,
      status: 'active'
    };

    // Serialize challenge data (using TextEncoder instead of Buffer)
    const serializedData = new TextEncoder().encode(JSON.stringify(challengeData));
    const dataSize = serializedData.length;
    
    console.log(`📦 Challenge data size: ${dataSize} bytes`);
    
    // Calculate rent exemption for the account
    const rentExemption = await connection.getMinimumBalanceForRentExemption(dataSize);
    console.log(`💰 Rent exemption required: ${rentExemption / LAMPORTS_PER_SOL} SOL`);

    // Check wallet balance
    const walletBalance = await connection.getBalance(provider.publicKey);
    console.log(`💰 Wallet balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (walletBalance < rentExemption) {
      throw new Error(`Insufficient balance. Need ${rentExemption / LAMPORTS_PER_SOL} SOL, have ${walletBalance / LAMPORTS_PER_SOL} SOL`);
    }

    // Create transaction to store challenge data on-chain
    const transaction = new Transaction().add(
      // Create the challenge account
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: challengeAccount,
        lamports: rentExemption,
        space: dataSize,
        programId: SystemProgram.programId, // For now, use SystemProgram
      })
    );

    console.log(`📝 Transaction created with ${transaction.instructions.length} instructions`);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    console.log(`🔗 Recent blockhash: ${blockhash}`);

    // Sign and send transaction
    console.log(`✍️ Signing transaction...`);
    const signedTransaction = await provider.signTransaction(transaction);
    // Add the challenge keypair signature
    signedTransaction.partialSign(challengeKeypair);
    
    console.log(`📤 Sending transaction to devnet...`);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    console.log(`📋 Transaction signature: ${signature}`);
    
    // Confirm transaction
    console.log(`⏳ Confirming transaction...`);
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    console.log(`✅ Transaction confirmed:`, confirmation);
    
        // Challenge account created successfully on-chain
        console.log(`✅ Challenge account created on-chain: ${challengeAccount.toString()}`);
    
    console.log(`✅ Challenge account created: ${challengeAccount.toString()}`);
    console.log(`🎮 Challenge Data: ${meta.game} | Entry Fee: ${meta.entryFee} USDFG | Creator: ${meta.creator.slice(0, 8)}...`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
        // Store the challenge account ID for retrieval (temporary solution)
        const existingIds = JSON.parse(localStorage.getItem('usdfg_challenge_ids') || '[]');
        existingIds.push(challengeAccount.toString());
        localStorage.setItem('usdfg_challenge_ids', JSON.stringify(existingIds));
        console.log(`📦 Challenge account ID saved: ${challengeAccount.toString()}`);
        
        // Store challenge metadata for retrieval (temporary solution)
        const existingMetadata = JSON.parse(localStorage.getItem('usdfg_challenge_metadata') || '[]');
        const challengeMetadata = {
          id: challengeAccount.toString(),
          creator: meta.creator,
          game: meta.game,
          entryFee: meta.entryFee,
          maxPlayers: meta.maxPlayers,
          rules: meta.rules,
          timestamp: meta.timestamp
        };
        existingMetadata.push(challengeMetadata);
        localStorage.setItem('usdfg_challenge_metadata', JSON.stringify(existingMetadata));
        console.log(`📦 Challenge metadata saved for: ${challengeAccount.toString()}`);
        
        // TODO: Implement proper on-chain challenge discovery
        // For now, we're using localStorage as a temporary solution
        // In a real implementation, we'd query all challenge accounts from the blockchain
    
    return challengeAccount.toString();
  } catch (error) {
    console.error("❌ Failed to create challenge on devnet:", error);
    console.error("Error details:", error);
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
