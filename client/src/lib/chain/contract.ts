/**
 * USDFG Smart Contract Integration
 * 
 * This file contains all the functions to interact with the USDFG smart contract
 * for creating challenges, accepting them, and resolving winners with automatic payouts.
 */

import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_ID, USDFG_MINT, SEEDS, usdfgToLamports } from './config';
import { initializeSmartContract, isSmartContractInitialized, updatePriceOracle } from './initialize';
import * as borsh from '@coral-xyz/borsh';

/**
 * Get the Anchor program instance
 */
export async function getProgram(wallet: any, connection: Connection) {
  console.log('🔧 Creating Anchor wallet wrapper...');
  
  // Create a proper Wallet class that implements Anchor's Wallet interface
  class WalletAdapter implements Wallet {
    constructor(public payer: Keypair) {}
    
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      return wallet.signTransaction(tx);
    }
    
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      if (wallet.signAllTransactions) {
        return wallet.signAllTransactions(txs);
      }
      const signed: T[] = [];
      for (const tx of txs) {
        signed.push(await this.signTransaction(tx));
      }
      return signed;
    }
    
    get publicKey(): PublicKey {
      return new PublicKey(wallet.publicKey.toString());
    }
  }
  
  // Create a dummy keypair (not used for signing, just for the Wallet interface)
  const dummyKeypair = Keypair.generate();
  const anchorWallet = new WalletAdapter(dummyKeypair);
  
  console.log('✅ Wallet wrapper created, publicKey:', anchorWallet.publicKey.toString());
  
  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
  });
  
  console.log('✅ Provider created');
  console.log('🔧 Creating Program with IDL...');
  console.log('   Program ID:', PROGRAM_ID.toString());
  console.log('   IDL version:', (IDL as any).version);
  
  try {
    const program = new Program(IDL as any, PROGRAM_ID, provider);
    console.log('✅ Program created successfully');
    return program;
  } catch (error) {
    console.error('❌ Error creating Program:', error);
    throw error;
  }
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
      
      // Try to update price oracle (only works if you're the admin)
      // If you're not the admin, that's OK - we'll just use the existing oracle price
      try {
        console.log('🔄 Attempting to refresh price oracle...');
        await updatePriceOracle(wallet, connection);
        console.log('✅ Price oracle refreshed!');
      } catch (oracleError: any) {
        // Not the admin - that's fine, we'll use the existing oracle
        if (oracleError.message?.includes('AccountNotSigner') || oracleError.message?.includes('Unauthorized')) {
          console.log('⚠️ Not admin - skipping oracle update (will use existing price)');
        } else {
          console.warn('⚠️ Could not update oracle:', oracleError.message);
        }
      }
    } catch (initError) {
      console.error('❌ Error checking/initializing smart contract:', initError);
      throw new Error('Smart contract initialization failed. Please contact support.');
    }

    console.log('🔧 Step 1: Preparing transaction (bypassing Anchor)...');
    
    // Re-create PublicKey to ensure proper format
    const creator = new PublicKey(wallet.publicKey.toString());
    console.log('👤 Creator:', creator.toString());

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

    // ⚠️ IMPORTANT: Smart contract expects raw USDFG amount (e.g. 1000), NOT lamports!
    // The contract has MAX_ENTRY_FEE_USDFG = 1000, so it's checking the raw number
    // The contract will handle the token transfer internally using the correct decimals
    console.log('💰 Entry fee (raw USDFG):', entryFeeUsdfg);
    
    const entryFeeAmount = new BN(entryFeeUsdfg);
    console.log('💰 Created BN:', entryFeeAmount.toString());

    // Create instruction data manually (discriminator + entry_fee)
    // The discriminator for "create_challenge" is the first 8 bytes of sha256("global:create_challenge")
    const discriminator = Buffer.from([0xaa, 0xf4, 0x2f, 0x01, 0x01, 0x0f, 0xad, 0xef]);
    const entryFeeBuffer = Buffer.alloc(8);
    entryFeeAmount.toArrayLike(Buffer, 'le', 8).copy(entryFeeBuffer);
    
    const instructionData = Buffer.concat([discriminator, entryFeeBuffer]);
    console.log('📦 Instruction data created');

    // Create the instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: pdas.challengePDA, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: pdas.escrowTokenAccountPDA, isSigner: false, isWritable: true },
        { pubkey: pdas.escrowWalletPDA, isSigner: false, isWritable: false },
        { pubkey: challengeSeed.publicKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: pdas.priceOraclePDA, isSigner: false, isWritable: false },
        { pubkey: pdas.adminStatePDA, isSigner: false, isWritable: false },
        { pubkey: USDFG_MINT, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    console.log('✅ Instruction created');

    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = creator;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    console.log('🔧 Signing transaction...');
    const signedTx = await wallet.signTransaction(transaction);
    
    // Add challengeSeed signature
    signedTx.partialSign(challengeSeed);
    
    console.log('🚀 Sending transaction...');
    const txSignature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log('⏳ Confirming transaction...');
    await connection.confirmTransaction(txSignature, 'confirmed');

    console.log('✅ Challenge created! Transaction:', txSignature);
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

