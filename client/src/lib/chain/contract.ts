/**
 * USDFG Smart Contract Integration
 * 
 * This file contains all the functions to interact with the USDFG smart contract
 * for creating challenges, accepting them, and resolving winners with automatic payouts.
 */

import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_ID, USDFG_MINT, SEEDS, usdfgToLamports } from './config';
import IDL from './usdfg_smart_contract.json';
import { initializeSmartContract, isSmartContractInitialized } from './initialize';

/**
 * Get the Anchor program instance
 */
export async function getProgram(wallet: any, connection: Connection) {
  // Create a proper AnchorWallet wrapper
  // The issue is that wallet.publicKey from useWallet() is already a PublicKey object
  // but Anchor expects it in a specific format
  const anchorWallet = {
    publicKey: new PublicKey(wallet.publicKey.toString()), // Re-create PublicKey from string
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions: wallet.signAllTransactions 
      ? wallet.signAllTransactions.bind(wallet)
      : async (txs: Transaction[]) => {
          const signed = [];
          for (const tx of txs) {
            signed.push(await wallet.signTransaction(tx));
          }
          return signed;
        },
  };
  
  const provider = new AnchorProvider(connection, anchorWallet as any, {
    commitment: 'confirmed',
  });
  
  return new Program(IDL as any, PROGRAM_ID, provider);
}

/**
 * Derive PDA addresses
 */
export async function derivePDAs(creator: PublicKey, challengeSeed: PublicKey) {
  // Admin State PDA
  const [adminStatePDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ADMIN],
    PROGRAM_ID
  );

  // Price Oracle PDA
  const [priceOraclePDA] = PublicKey.findProgramAddressSync(
    [SEEDS.PRICE_ORACLE],
    PROGRAM_ID
  );

  // Challenge PDA
  const [challengePDA] = PublicKey.findProgramAddressSync(
    [SEEDS.CHALLENGE, creator.toBuffer(), challengeSeed.toBuffer()],
    PROGRAM_ID
  );

  // Escrow Wallet PDA
  const [escrowWalletPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET],
    PROGRAM_ID
  );

  // Escrow Token Account PDA
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengePDA.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );

  return {
    adminStatePDA,
    priceOraclePDA,
    challengePDA,
    escrowWalletPDA,
    escrowTokenAccountPDA,
  };
}

/**
 * Create a challenge on-chain with escrow
 * 
 * @param wallet - Connected wallet
 * @param connection - Solana connection
 * @param entryFeeUsdfg - Entry fee in USDFG tokens (e.g., 10 for 10 USDFG)
 * @returns Challenge PDA address
 */
export async function createChallenge(
  wallet: any,
  connection: Connection,
  entryFeeUsdfg: number
): Promise<string> {
  try {
    console.log('🚀 Creating challenge on smart contract...');
    console.log('   Entry fee:', entryFeeUsdfg, 'USDFG');
    
    // ✅ GUARD 1: Validate wallet
    if (!wallet?.publicKey) {
      throw new Error('❌ Wallet not connected. Please connect your wallet first.');
    }
    console.log('✅ Wallet connected:', wallet.publicKey.toString());
    
    // ✅ GUARD 2: Validate entry fee
    if (!entryFeeUsdfg || entryFeeUsdfg <= 0) {
      throw new Error('❌ Invalid entry fee. Must be greater than 0.');
    }
    console.log('✅ Entry fee valid:', entryFeeUsdfg, 'USDFG');
    
    // ✅ GUARD 3: Ensure wallet has required methods
    if (!wallet.signTransaction) {
      throw new Error('❌ Wallet does not support transaction signing.');
    }
    console.log('✅ Wallet has signTransaction method');
    
    // Check if smart contract is initialized, if not, initialize it
    try {
      const isInitialized = await isSmartContractInitialized(connection);
      if (!isInitialized) {
        console.log('⚠️ Smart contract not initialized. Initializing now...');
        await initializeSmartContract(wallet, connection);
        console.log('✅ Smart contract initialized!');
      } else {
        console.log('✅ Smart contract already initialized');
      }
    } catch (initError) {
      console.error('❌ Error checking/initializing smart contract:', initError);
      throw new Error('Smart contract initialization failed. Please contact support.');
    }

    console.log('🔧 Step 1: Getting program...');
    const program = await getProgram(wallet, connection);
    console.log('✅ Program obtained');
    
    // Re-create PublicKey to ensure proper format
    const creator = new PublicKey(wallet.publicKey.toString());
    console.log('👤 Creator (re-created):', creator.toString());

    // Generate a unique seed for this challenge
    console.log('🔧 Step 2: Generating challenge seed...');
    const challengeSeed = Keypair.generate();
    console.log('🔑 Challenge seed:', challengeSeed.publicKey.toString());

    // Derive all PDAs
    console.log('🔧 Step 3: Deriving PDAs...');
    const pdas = await derivePDAs(creator, challengeSeed.publicKey);
    console.log('📍 Challenge PDA:', pdas.challengePDA.toString());

    // Get creator's token account
    console.log('🔧 Step 4: Getting token account...');
    const creatorTokenAccount = await getAssociatedTokenAddress(
      USDFG_MINT,
      creator
    );
    console.log('💳 Token account:', creatorTokenAccount.toString());

    // Convert USDFG to lamports (smallest unit)
    const lamports = usdfgToLamports(entryFeeUsdfg);
    console.log('💰 Entry fee in lamports:', lamports);
    console.log('💰 BN type check:', typeof BN, BN);
    
    const entryFeeLamports = new BN(lamports);
    console.log('💰 Created BN:', entryFeeLamports, 'has _bn?', entryFeeLamports._bn);

    // Create challenge transaction
    const tx = await program.methods
      .createChallenge(entryFeeLamports)
      .accounts({
        challenge: pdas.challengePDA,
        creator: creator,
        creatorTokenAccount: creatorTokenAccount,
        escrowTokenAccount: pdas.escrowTokenAccountPDA,
        escrowWallet: pdas.escrowWalletPDA,
        challengeSeed: challengeSeed.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        priceOracle: pdas.priceOraclePDA,
        adminState: pdas.adminStatePDA,
        mint: USDFG_MINT,
      })
      .signers([challengeSeed])
      .rpc();

    console.log('✅ Challenge created! Transaction:', tx);
    console.log('📦 Challenge address:', pdas.challengePDA.toString());

    return pdas.challengePDA.toString();
  } catch (error) {
    console.error('❌ Error creating challenge:', error);
    throw error;
  }
}

/**
 * Accept a challenge (join it)
 * 
 * @param wallet - Connected wallet
 * @param connection - Solana connection
 * @param challengeAddress - Challenge PDA address
 * @returns Transaction signature
 */
export async function acceptChallenge(
  wallet: any,
  connection: Connection,
  challengeAddress: string
): Promise<string> {
  try {
    console.log('🎮 Accepting challenge:', challengeAddress);

    const program = await getProgram(wallet, connection);
    const challenger = wallet.publicKey;
    const challengePDA = new PublicKey(challengeAddress);

    // Fetch challenge data to get entry fee and creator
    const challengeAccount = await program.account.challenge.fetch(challengePDA);
    console.log('📊 Challenge data:', challengeAccount);

    // Derive PDAs
    const [escrowWalletPDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ESCROW_WALLET],
      PROGRAM_ID
    );

    const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ESCROW_WALLET, challengePDA.toBuffer(), USDFG_MINT.toBuffer()],
      PROGRAM_ID
    );

    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );

    // Get challenger's token account
    const challengerTokenAccount = await getAssociatedTokenAddress(
      USDFG_MINT,
      challenger
    );

    // Accept challenge transaction
    const tx = await program.methods
      .acceptChallenge()
      .accounts({
        challenge: challengePDA,
        challenger: challenger,
        challengerTokenAccount: challengerTokenAccount,
        escrowTokenAccount: escrowTokenAccountPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        adminState: adminStatePDA,
        escrowWallet: escrowWalletPDA,
        mint: USDFG_MINT,
      })
      .rpc();

    console.log('✅ Challenge accepted! Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Error accepting challenge:', error);
    throw error;
  }
}

/**
 * Resolve a challenge and payout winner automatically
 * 
 * @param wallet - Connected wallet (must be admin or authorized)
 * @param connection - Solana connection
 * @param challengeAddress - Challenge PDA address
 * @param winnerAddress - Winner's wallet address
 * @returns Transaction signature
 */
export async function resolveChallenge(
  wallet: any,
  connection: Connection,
  challengeAddress: string,
  winnerAddress: string
): Promise<string> {
  try {
    console.log('🏆 Resolving challenge:', challengeAddress);
    console.log('   Winner:', winnerAddress);

    const program = await getProgram(wallet, connection);
    const challengePDA = new PublicKey(challengeAddress);
    const winner = new PublicKey(winnerAddress);

    // Derive PDAs
    const [escrowWalletPDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ESCROW_WALLET],
      PROGRAM_ID
    );

    const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ESCROW_WALLET, challengePDA.toBuffer(), USDFG_MINT.toBuffer()],
      PROGRAM_ID
    );

    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );

    // Get winner's token account
    const winnerTokenAccount = await getAssociatedTokenAddress(
      USDFG_MINT,
      winner
    );

    // Resolve challenge transaction (auto-pays winner 2x entry fee)
    const tx = await program.methods
      .resolveChallenge(winner)
      .accounts({
        challenge: challengePDA,
        escrowTokenAccount: escrowTokenAccountPDA,
        winnerTokenAccount: winnerTokenAccount,
        escrowWallet: escrowWalletPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        adminState: adminStatePDA,
        mint: USDFG_MINT,
      })
      .rpc();

    console.log('✅ Challenge resolved! Winner paid automatically. Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Error resolving challenge:', error);
    throw error;
  }
}

/**
 * Get challenge data from on-chain
 */
export async function getChallengeData(
  connection: Connection,
  challengeAddress: string
) {
  try {
    const program = await getProgram({ publicKey: PublicKey.default }, connection);
    const challengePDA = new PublicKey(challengeAddress);
    const challengeAccount = await program.account.challenge.fetch(challengePDA);
    return challengeAccount;
  } catch (error) {
    console.error('❌ Error fetching challenge data:', error);
    return null;
  }
}

/**
 * Check if user has enough USDFG tokens
 */
export async function checkUsdfgBalance(
  connection: Connection,
  walletAddress: string,
  requiredAmount: number
): Promise<boolean> {
  try {
    const wallet = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(USDFG_MINT, wallet);
    
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    const balance = accountInfo.value.uiAmount || 0;
    
    console.log(`💰 USDFG Balance: ${balance} (required: ${requiredAmount})`);
    return balance >= requiredAmount;
  } catch (error) {
    console.error('❌ Error checking USDFG balance:', error);
    return false;
  }
}

