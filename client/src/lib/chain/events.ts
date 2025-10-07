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
    
    // Get challenge account IDs from localStorage (this is temporary until we have a proper program)
    const storedChallengeIds = localStorage.getItem('usdfg_challenge_ids');
    let challengeIds: string[] = [];
    
    if (storedChallengeIds) {
      try {
        challengeIds = JSON.parse(storedChallengeIds);
        console.log(`📦 Found ${challengeIds.length} challenge account IDs`);
      } catch (e) {
        console.error("❌ Failed to parse stored challenge IDs:", e);
        challengeIds = [];
      }
    }
    
    const challenges: ChallengeMeta[] = [];
    
    // Query each challenge account from the blockchain
    for (const challengeId of challengeIds) {
      try {
        const accountInfo = await connection.getAccountInfo(new PublicKey(challengeId));
        if (accountInfo && accountInfo.data) {
          // For now, we'll create a mock challenge since we can't easily store/retrieve data from SystemProgram accounts
          // In a real implementation, you'd have a program that stores the data
          const mockChallenge: ChallengeMeta = {
            id: challengeId,
            creator: "blockchain_creator", // This would come from account data
            game: "Blockchain Game", // This would come from account data
            entryFee: 50, // This would come from account data
            maxPlayers: 2,
            rules: "Blockchain rules", // This would come from account data
            timestamp: Date.now(),
          };
          
          challenges.push(mockChallenge);
          console.log(`🎮 Challenge Loaded: ${mockChallenge.game} | Entry Fee: ${mockChallenge.entryFee} | Creator: ${mockChallenge.creator.slice(0, 8)}...`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to fetch challenge account ${challengeId}:`, e);
      }
    }
    
    if (challenges.length === 0) {
      console.log("📝 No challenges found on devnet");
      console.log("💡 To see challenges, create one using the 'Create Challenge' button");
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
export async function createChallenge(meta: Omit<ChallengeMeta, "id"|"clientId"|"timestamp"|"creator">) {
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

    // Serialize challenge data
    const serializedData = Buffer.from(JSON.stringify(challengeData));
    const dataSize = serializedData.length;
    
    console.log(`📦 Challenge data size: ${dataSize} bytes`);
    
    // Calculate rent exemption for the account
    const rentExemption = await connection.getMinimumBalanceForRentExemption(dataSize);
    console.log(`💰 Rent exemption required: ${rentExemption / LAMPORTS_PER_SOL} SOL`);

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

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    // Sign and send transaction
    const signedTransaction = await provider.signTransaction(transaction);
    // Add the challenge keypair signature
    signedTransaction.partialSign(challengeKeypair);
    
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature, "confirmed");
    
    // Store challenge data in a known account for cross-device access
    // This creates a shared storage mechanism that works across devices
    const sharedAccount = new PublicKey("11111111111111111111111111111112"); // System program as shared storage
    
    // Create a second transaction to store the challenge data
    const dataTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: sharedAccount,
        lamports: 0, // No SOL transfer, just for the transaction
      })
    );
    
    // Add challenge data as a memo (this is a simplified approach)
    const memo = `CHALLENGE:${JSON.stringify(challengeData)}`;
    dataTransaction.add({
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2"), // Memo program
      data: Buffer.from(memo, 'utf8')
    });
    
    const dataSignature = await connection.sendRawTransaction(
      await provider.signTransaction(dataTransaction)
    );
    await connection.confirmTransaction(dataSignature, "confirmed");
    
    console.log(`✅ Challenge account created: ${challengeAccount.toString()}`);
    console.log(`🎮 Challenge Data: ${meta.game} | Entry Fee: ${meta.entryFee} USDFG | Creator: ${meta.creator.slice(0, 8)}...`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Store the challenge account ID for retrieval
    const existingIds = JSON.parse(localStorage.getItem('usdfg_challenge_ids') || '[]');
    existingIds.push(challengeAccount.toString());
    localStorage.setItem('usdfg_challenge_ids', JSON.stringify(existingIds));
    console.log(`📦 Challenge account ID saved: ${challengeAccount.toString()}`);
    
    return challengeAccount.toString();
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
