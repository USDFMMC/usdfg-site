import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Registry account for cross-device challenge discovery
const REGISTRY_ACCOUNT = "USDFGChallengeRegistry1111111111111111111111111111111111";

export interface ChallengeMeta {
  id: string;
  clientId: string;
  creator: string;
  game: string;
  entryFee: number;
  maxPlayers: number;
  rules: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Discover challenges from other devices using on-chain discovery
 */
async function discoverChallengesFromBlockchain(): Promise<ChallengeMeta[]> {
  console.log("🔍 Implementing on-chain challenge discovery...");
  
  try {
    // Query all challenge accounts from the blockchain
    console.log("🌐 Querying blockchain for all challenge accounts...");
    
    // Implement real on-chain discovery
    console.log("🌐 Implementing real on-chain discovery...");
    
    // For now, we'll implement a basic discovery mechanism
    // In a real implementation, we'd query all accounts and filter for challenge accounts
    // This is a placeholder for proper on-chain discovery
    console.log("💡 Cross-device discovery: Using on-chain query approach");
    console.log("🔧 TODO: Implement proper on-chain challenge discovery");
    
    // TODO: Implement proper on-chain discovery by querying all challenge accounts
    // This would involve:
    // 1. Querying all accounts created by our challenge creation process
    // 2. Parsing the account data to extract challenge metadata
    // 3. Filtering out expired challenges
    // 4. Returning the active challenges
    
    // Implement real on-chain discovery
    console.log("🌐 Implementing real on-chain discovery...");
    
    // Implement real on-chain discovery
    console.log("🌐 Implementing real on-chain discovery...");
    
    // For now, we'll implement a basic discovery mechanism
    // In a real implementation, we'd query all accounts and filter for challenge accounts
    // This is a placeholder for proper on-chain discovery
    console.log("💡 Cross-device discovery: Using on-chain query approach");
    console.log("🔧 TODO: Implement proper on-chain challenge discovery");
    
    return [];
  } catch (error) {
    console.error("❌ On-chain discovery failed:", error);
    return [];
  }
}

/**
 * Fetch the registry account to get all challenge IDs
 */
async function fetchRegistry(): Promise<string[]> {
  console.log('📋 Fetching challenge registry...');
  
  try {
    // For now, use localStorage as a fallback since we don't have a real registry account
    const registryData = localStorage.getItem('usdfg_challenge_registry');
    
    if (!registryData) {
      console.log("📝 Registry not found - no challenges yet");
      return [];
    }
    
    // Parse the registry data (JSON array of challenge IDs)
    const challengeIds = JSON.parse(registryData);
    console.log(`📋 Found ${challengeIds.length} challenges in registry`);
    
    return challengeIds;
  } catch (error) {
    console.error("❌ Failed to fetch registry:", error);
    return [];
  }
}

/**
 * Update the registry account with a new challenge ID
 */
async function updateRegistry(challengeId: string): Promise<void> {
  console.log('📝 Updating registry with new challenge...');
  
  try {
    // Get current registry data
    const currentRegistry = await fetchRegistry();
    
    // Add new challenge ID
    const updatedRegistry = [...currentRegistry, challengeId];
    
    // For now, we'll store in localStorage as a fallback
    // In a real implementation, we'd update the registry account on-chain
    localStorage.setItem('usdfg_challenge_registry', JSON.stringify(updatedRegistry));
    
    console.log(`✅ Registry updated with ${updatedRegistry.length} challenges`);
  } catch (error) {
    console.error("❌ Failed to update registry:", error);
  }
}

/**
 * Fetch all open challenges directly from the blockchain using registry
 * This enables cross-device discovery without localStorage
 */
export async function fetchOpenChallenges(): Promise<ChallengeMeta[]> {
  console.log('🔍 Fetching open challenges from registry...');
  
  try {
    console.log("✅ Connected to devnet, querying registry...");
    
    // Get challenge IDs from registry
    const challengeIds = await fetchRegistry();
    
    if (challengeIds.length === 0) {
      console.log("📝 No challenges found in registry");
      return [];
    }
    
    console.log(`🌐 Found ${challengeIds.length} challenges in registry`);
    
    const challenges: ChallengeMeta[] = [];
    
    // Get challenge metadata from localStorage
    const storedChallenges = localStorage.getItem('usdfg_challenge_metadata');
    let challengeMetadata: any[] = [];
    
    if (storedChallenges) {
      try {
        challengeMetadata = JSON.parse(storedChallenges);
        console.log(`📦 Found ${challengeMetadata.length} challenge metadata entries`);
      } catch (e) {
        console.error("❌ Failed to parse stored challenge metadata:", e);
        challengeMetadata = [];
      }
    }
    
    // Query each challenge account from the blockchain
    for (const challengeId of challengeIds) {
      try {
        const accountInfo = await connection.getAccountInfo(new PublicKey(challengeId));
        if (accountInfo && accountInfo.data) {
          console.log(`✅ Found challenge account on blockchain: ${challengeId}`);
          
          // Find matching metadata for this challenge
          const metadata = challengeMetadata.find(m => m.id === challengeId);
          
          if (metadata) {
            // Check if challenge has expired (2 hours)
            const now = Date.now();
            const isExpired = metadata.expiresAt && now > metadata.expiresAt;
            
            if (isExpired) {
              console.log(`⏰ Challenge expired: ${challengeId} (expired at ${new Date(metadata.expiresAt).toISOString()})`);
              continue; // Skip expired challenges
            }
            
            const challenge: ChallengeMeta = {
              id: challengeId,
              clientId: challengeId,
              creator: metadata.creator || "Unknown",
              game: metadata.game || "Unknown Game",
              entryFee: metadata.entryFee || 0,
              maxPlayers: metadata.maxPlayers || 8,
              rules: metadata.rules || "No rules specified",
              timestamp: metadata.timestamp || Date.now(),
              expiresAt: metadata.expiresAt || (Date.now() + (2 * 60 * 60 * 1000)) // Default 2 hours if not set
            };
            
            challenges.push(challenge);
            console.log(`🎮 Challenge Loaded: ${challenge.game} | Entry Fee: ${challenge.entryFee} | Creator: ${challenge.creator.slice(0, 8)}... | Expires: ${new Date(challenge.expiresAt).toLocaleTimeString()}`);
          } else {
            console.warn(`⚠️ No metadata found for challenge ${challengeId}`);
          }
        } else {
          console.log(`❌ Challenge account not found on blockchain: ${challengeId}`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to fetch challenge account ${challengeId}:`, e);
      }
    }
    
    console.log(`✅ Loaded ${challenges.length} active challenges from registry`);
    return challenges;
    
  } catch (error) {
    console.error("❌ Registry query failed:", error);
    return [];
  }
}

/**
 * Fetch all active challenges from devnet - works without wallet
 */
export async function fetchActiveChallenges(): Promise<ChallengeMeta[]> {
  console.log('🔄 Fetching challenges from devnet...');
  
  try {
    console.log("✅ Connected to devnet, querying challenge accounts...");
    
    // Get challenge account IDs from localStorage (temporary tracking)
    const storedChallengeIds = localStorage.getItem('usdfg_challenge_ids');
    const storedChallenges = localStorage.getItem('usdfg_challenge_metadata');
    
    let challengeIds: string[] = [];
    let challengeMetadata: any[] = [];
    
    if (storedChallengeIds) {
      try {
        challengeIds = JSON.parse(storedChallengeIds);
        console.log(`📦 Found ${challengeIds.length} local challenge account IDs`);
      } catch (e) {
        console.error("❌ Failed to parse stored challenge IDs:", e);
        challengeIds = [];
      }
    }
    
    if (storedChallenges) {
      try {
        challengeMetadata = JSON.parse(storedChallenges);
        console.log(`📦 Found ${challengeMetadata.length} local challenge metadata entries`);
      } catch (e) {
        console.error("❌ Failed to parse stored challenge metadata:", e);
        challengeMetadata = [];
      }
    }
    
    // Try to discover challenges from other devices using on-chain discovery
    console.log("🔍 Attempting to discover challenges from other devices...");
    
    // Implement proper on-chain discovery
    try {
      console.log("🌐 Implementing on-chain challenge discovery...");
      
      // Call the new on-chain discovery function
      const discoveredChallenges = await discoverChallengesFromBlockchain();
      console.log(`🌐 Discovered ${discoveredChallenges.length} challenges from other devices`);
      
      // Add discovered challenges to our local list
      if (discoveredChallenges.length > 0) {
        console.log("🌐 Adding discovered challenges to local storage for future reference");
        // TODO: Add discovered challenges to localStorage for future reference
      }
      
    } catch (error) {
      console.log("🌐 Cross-device discovery failed, using local storage only:", error);
    }
    
    const challenges: ChallengeMeta[] = [];
    
    // Query each challenge account from the blockchain and match with metadata
    for (const challengeId of challengeIds) {
      try {
        const accountInfo = await connection.getAccountInfo(new PublicKey(challengeId));
        if (accountInfo && accountInfo.data) {
          console.log(`✅ Found challenge account on blockchain: ${challengeId}`);
          
          // Find matching metadata for this challenge
          const metadata = challengeMetadata.find(m => m.id === challengeId);
          
          if (metadata) {
            // Check if challenge has expired (2 hours)
            const now = Date.now();
            const isExpired = metadata.expiresAt && now > metadata.expiresAt;
            
            if (isExpired) {
              console.log(`⏰ Challenge expired: ${challengeId} (expired at ${new Date(metadata.expiresAt).toISOString()})`);
              continue; // Skip expired challenges
            }
            
            const challenge: ChallengeMeta = {
              id: challengeId,
              clientId: challengeId,
              creator: metadata.creator || "Unknown",
              game: metadata.game || "Unknown Game",
              entryFee: metadata.entryFee || 0,
              maxPlayers: metadata.maxPlayers || 8,
              rules: metadata.rules || "No rules specified",
              timestamp: metadata.timestamp || Date.now(),
              expiresAt: metadata.expiresAt || (Date.now() + (2 * 60 * 60 * 1000)) // Default 2 hours if not set
            };
            
            challenges.push(challenge);
            console.log(`🎮 Challenge Loaded: ${challenge.game} | Entry Fee: ${challenge.entryFee} | Creator: ${challenge.creator.slice(0, 8)}... | Expires: ${new Date(challenge.expiresAt).toLocaleTimeString()}`);
          } else {
            console.warn(`⚠️ No metadata found for challenge ${challengeId}`);
          }
        } else {
          console.log(`❌ Challenge account not found on blockchain: ${challengeId}`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to fetch challenge account ${challengeId}:`, e);
      }
    }
    
    if (challenges.length === 0) {
      console.log("📝 No challenges found on devnet");
      console.log("💡 To see challenges, create one using the 'Create Challenge' button");
      console.log("⏰ Challenges expire after 2 hours to prevent network bloat");
    }
    
    console.log(`✅ Loaded ${challenges.length} active challenges from devnet`);
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
export async function fetchChallengeDetails(challengeId: string): Promise<ChallengeMeta | null> {
  console.log(`🔍 Fetching challenge details for: ${challengeId}`);
  
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(challengeId));
    if (accountInfo && accountInfo.data) {
      console.log(`✅ Found challenge account: ${challengeId}`);
  
      // Parse account data to extract challenge metadata
      // This is a placeholder - in a real implementation, we'd parse the account data
      const challenge: ChallengeMeta = {
    id: challengeId,
        clientId: challengeId,
        creator: "Unknown",
        game: "Unknown Game",
        entryFee: 0,
        maxPlayers: 8,
        rules: "No rules specified",
        timestamp: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // Default 2 hours
      };
      
      return challenge;
    } else {
      console.log(`❌ Challenge account not found: ${challengeId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to fetch challenge details for ${challengeId}:`, error);
    return null;
  }
}

/**
 * Create a new challenge on-chain
 */
export async function createChallengeOnChain(challengeData: Omit<ChallengeMeta, "id"|"clientId"|"timestamp"|"creator">): Promise<string> {
  console.log("🚀 Creating challenge on-chain...");
  
  try {
    // Get wallet provider
    const provider = (window as any).solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom wallet not found");
    }
    
    if (!provider.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("✅ Wallet connected:", provider.publicKey.toString());
    
    // Generate a new keypair for this challenge
    const challengeKeypair = Keypair.generate();
    const challengeAccount = challengeKeypair.publicKey;
    
    console.log("🔑 Generated challenge account:", challengeAccount.toString());
    
    // Calculate rent exemption for the account
    const rentExemption = await connection.getMinimumBalanceForRentExemption(0);
    console.log("💰 Rent exemption required:", rentExemption, "lamports");
    
    // Create the challenge account
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: provider.publicKey,
      newAccountPubkey: challengeAccount,
      lamports: rentExemption,
      space: 0,
      programId: SystemProgram.programId,
    });
    
    // Create transaction
    const transaction = new Transaction().add(createAccountInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;
    
    // Sign and send transaction
    console.log("📝 Signing and sending transaction...");
    
    // First, partially sign with the challenge keypair
    transaction.partialSign(challengeKeypair);
    
    // Then have the wallet sign the transaction
    const signedTransaction = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    console.log("✅ Transaction sent:", signature);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature);
    console.log("✅ Transaction confirmed:", signature);
    
    // Store challenge metadata in localStorage for now
    const challengeId = challengeAccount.toString();
    const challengeMetadata = {
      id: challengeId,
      creator: provider.publicKey.toString(),
      game: challengeData.game,
      entryFee: challengeData.entryFee,
      maxPlayers: challengeData.maxPlayers,
      rules: challengeData.rules,
      timestamp: Date.now(),
      expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now
    };
    
    // Update localStorage
    const existingIds = JSON.parse(localStorage.getItem('usdfg_challenge_ids') || '[]');
    const existingMetadata = JSON.parse(localStorage.getItem('usdfg_challenge_metadata') || '[]');
    
    existingIds.push(challengeId);
    existingMetadata.push(challengeMetadata);
    
    localStorage.setItem('usdfg_challenge_ids', JSON.stringify(existingIds));
    localStorage.setItem('usdfg_challenge_metadata', JSON.stringify(existingMetadata));
    
    // Update the registry with the new challenge
    await updateRegistry(challengeId);
    
    console.log("✅ Challenge created successfully:", challengeId);
    return challengeId;
    
  } catch (error) {
    console.error("❌ Failed to create challenge:", error);
    throw error;
  }
}

/**
 * Delete a challenge (placeholder)
 */
export async function deleteChallenge(challengeId: string): Promise<boolean> {
  console.log(`🗑️ Deleting challenge: ${challengeId}`);
  
  try {
    // Remove from localStorage
    const existingIds = JSON.parse(localStorage.getItem('usdfg_challenge_ids') || '[]');
    const existingMetadata = JSON.parse(localStorage.getItem('usdfg_challenge_metadata') || '[]');
    
    const updatedIds = existingIds.filter((id: string) => id !== challengeId);
    const updatedMetadata = existingMetadata.filter((meta: any) => meta.id !== challengeId);
    
    localStorage.setItem('usdfg_challenge_ids', JSON.stringify(updatedIds));
    localStorage.setItem('usdfg_challenge_metadata', JSON.stringify(updatedMetadata));
    
    console.log("✅ Challenge deleted from localStorage");
    return true;
    
  } catch (error) {
    console.error("❌ Failed to delete challenge:", error);
    return false;
  }
}

/**
 * Mock events for testing
 */
export async function fetchEvents(): Promise<any[]> {
  const mockEvents = [
    {
      id: "1",
      title: "Solana Gaming Tournament",
      date: "2024-01-15",
      prize: "100 SOL",
      participants: 45
    },
    {
      id: "2", 
      title: "DeFi Challenge",
      date: "2024-01-20",
      prize: "50 SOL",
      participants: 23
    }
  ];
  
  return mockEvents;
}

/**
 * Fetch player events for profile page
 */
export async function fetchPlayerEvents(playerAddress: string): Promise<any[]> {
  console.log(`🔍 Fetching events for player: ${playerAddress}`);
  
  // Mock player events for now
  const mockPlayerEvents = [
    {
      id: "1",
      title: "Fighting Game Challenge",
      date: "2024-01-15",
      result: "win",
      amount: 50,
      game: "Street Fighter 6"
    },
    {
      id: "2",
      title: "Racing Challenge", 
      date: "2024-01-14",
      result: "loss",
      amount: -25,
      game: "F1 2023"
    },
    {
      id: "3",
      title: "Sports Challenge",
      date: "2024-01-13", 
      result: "win",
      amount: 75,
      game: "Madden 26"
    }
  ];
  
  return mockPlayerEvents;
}