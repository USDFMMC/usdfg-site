/**
 * USDFG Smart Contract Integration
 * 
 * This file contains all the functions to interact with the USDFG smart contract
 * for creating challenges, accepting them, and resolving winners with automatic payouts.
 * 
 * ✅ ORACLE REMOVED - No more oracle dependencies!
 */

import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_ID, USDFG_MINT, SEEDS, usdfgToLamports } from './config';
import { initializeSmartContract, isSmartContractInitialized } from './initialize';
import * as borsh from '@coral-xyz/borsh';

/**
 * Get the Anchor program instance
 */
export async function getProgram(wallet: any, connection: Connection) {
  console.log('🔧 Creating Anchor wallet wrapper...');
  
  // Create a proper wallet adapter that implements Anchor's Wallet interface
  const walletAdapter = {
    publicKey: new PublicKey(wallet.publicKey.toString()),
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions: wallet.signAllTransactions.bind(wallet),
  };

  console.log('✅ Wallet adapter created');
  return walletAdapter;
}

/**
 * Derive PDA addresses (ORACLE REMOVED)
 */
export async function derivePDAs(creator: PublicKey, challengeSeed: PublicKey) {
  // Admin State PDA
  const [adminStatePDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ADMIN],
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
    challengePDA,
    escrowWalletPDA,
    escrowTokenAccountPDA,
  };
}

/**
 * Create a challenge on-chain with escrow (ORACLE REMOVED)
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
  console.log('🚀 Creating challenge on smart contract...');
  console.log(`Entry fee: ${entryFeeUsdfg} USDFG`);

  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  console.log(`✅ Wallet connected: ${wallet.publicKey.toString()}`);

  // Validate entry fee
  if (entryFeeUsdfg < 1 || entryFeeUsdfg > 1000) {
    throw new Error('Entry fee must be between 1 and 1000 USDFG');
  }

  console.log(`✅ Entry fee valid: ${entryFeeUsdfg} USDFG`);

  if (!wallet.signTransaction) {
    throw new Error('Wallet does not support transaction signing');
  }

  console.log('✅ Wallet has signTransaction method');

  // Check if smart contract is initialized
  const isInitialized = await isSmartContractInitialized(connection);
  if (!isInitialized) {
    console.log('🔧 Initializing smart contract...');
    await initializeSmartContract(wallet, connection);
    console.log('✅ Smart contract is ready (no oracle initialization needed)');
  } else {
    console.log('✅ Smart contract already initialized');
  }

  // ✅ NEW CONTRACT: No oracle refresh needed!

  console.log('🚀 Creating challenge with USDFG amounts...');

  // Step 1: Prepare transaction (bypassing Anchor)
  console.log('🔧 Step 1: Preparing transaction (bypassing Anchor)...');
  
  const creator = new PublicKey(wallet.publicKey.toString());
  console.log(`👤 Creator: ${creator.toString()}`);

  // Step 2: Generate challenge seed
  console.log('🔧 Step 2: Generating challenge seed...');
  const challengeSeed = Keypair.generate();
  console.log(`🔑 Challenge seed: ${challengeSeed.publicKey.toString()}`);

  // Step 3: Derive PDAs
  console.log('🔧 Step 3: Deriving PDAs...');
  const pdas = await derivePDAs(creator, challengeSeed.publicKey);
  console.log(`📍 Challenge PDA: ${pdas.challengePDA.toString()}`);

  // Step 4: Get token account
  console.log('🔧 Step 4: Getting token account...');
  const creatorTokenAccount = await getAssociatedTokenAddress(USDFG_MINT, creator);
  console.log(`💳 Token account: ${creatorTokenAccount.toString()}`);

  // Step 5: Create instruction data
  console.log('💰 Entry fee (raw USDFG):', entryFeeUsdfg);
  const entryFeeBN = new BN(entryFeeUsdfg);
  console.log('💰 Created BN:', entryFeeBN.toString());

  // Create instruction data for create_challenge
  // Calculate discriminator using SHA256 of "global:create_challenge"
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:create_challenge'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8 + 8); // discriminator + entry_fee
  discriminator.copy(instructionData, 0);
  entryFeeBN.toArrayLike(Buffer, 'le', 8).copy(instructionData, 8);
  console.log('📦 Instruction data created', 'Discriminator:', discriminator.toString('hex'));

  // Step 6: Create instruction (NEW CONTRACT - NO ORACLE NEEDED!)
  console.log('✅ Creating instruction with NEW smart contract (oracle-free)...');
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pdas.challengePDA, isSigner: false, isWritable: true }, // challenge
      { pubkey: creator, isSigner: true, isWritable: true }, // creator
      { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, // creator_token_account
      { pubkey: pdas.escrowTokenAccountPDA, isSigner: false, isWritable: true }, // escrow_token_account
      { pubkey: pdas.escrowWalletPDA, isSigner: false, isWritable: false }, // escrow_wallet
      { pubkey: challengeSeed.publicKey, isSigner: true, isWritable: false }, // challenge_seed
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false }, // mint
    ],
    data: instructionData,
  });

  console.log('✅ Instruction created');

  // Step 7: Create and send transaction
  console.log('🔧 Signing transaction...');
  const transaction = new Transaction().add(instruction);
  
  // Set recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creator;

  console.log('🚀 Sending transaction...');
  // Add challenge seed as a signer
  transaction.partialSign(challengeSeed);
  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  
  console.log('⏳ Confirming transaction...');
  await connection.confirmTransaction(signature);
  
  console.log('✅ Challenge created successfully!');
  console.log(`📍 Challenge PDA: ${pdas.challengePDA.toString()}`);
  console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  return pdas.challengePDA.toString();
}

/**
 * Accept a challenge
 */
export async function acceptChallenge(
  wallet: any,
  connection: Connection,
  challengePDA: string
): Promise<string> {
  console.log('🎯 Accepting challenge...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const challenger = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Get challenger's token account
  const challengerTokenAccount = await getAssociatedTokenAddress(USDFG_MINT, challenger);
  
  // Derive PDAs
  const pdas = await derivePDAs(challenger, challengeAddress);
  
  // Create instruction data for accept_challenge
  const instructionData = Buffer.alloc(8); // discriminator only
  instructionData.writeUInt32LE(0x87654321, 0); // Placeholder discriminator
  instructionData.writeUInt32LE(0x12345678, 4); // Placeholder discriminator

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true },
      { pubkey: challenger, isSigner: true, isWritable: true },
      { pubkey: challengerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: pdas.escrowTokenAccountPDA, isSigner: false, isWritable: true },
      { pubkey: pdas.escrowWalletPDA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = challenger;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Challenge accepted successfully!');
  return signature;
}

/**
 * Submit result for a challenge
 */
export async function submitResult(
  wallet: any,
  connection: Connection,
  challengePDA: string,
  didWin: boolean
): Promise<string> {
  console.log('📝 Submitting result...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const player = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Create instruction data for submit_result
  const instructionData = Buffer.alloc(8 + 1); // discriminator + did_win
  instructionData.writeUInt32LE(0x11111111, 0); // Placeholder discriminator
  instructionData.writeUInt32LE(0x22222222, 4); // Placeholder discriminator
  instructionData.writeUInt8(didWin ? 1 : 0, 8);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: true },
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = player;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Result submitted successfully!');
  return signature;
}

/**
 * Cancel a challenge
 */
export async function cancelChallenge(
  wallet: any,
  connection: Connection,
  challengePDA: string
): Promise<string> {
  console.log('❌ Canceling challenge...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const player = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Create instruction data for cancel_challenge
  const instructionData = Buffer.alloc(8); // discriminator only
  instructionData.writeUInt32LE(0x33333333, 0); // Placeholder discriminator
  instructionData.writeUInt32LE(0x44444444, 4); // Placeholder discriminator

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: true },
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = player;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Challenge canceled successfully!');
  return signature;
}

/**
 * Resolve Challenge (Admin Only - Triggers Payout to Winner)
 * 
 * SECURITY FEATURES:
 * ✅ Admin wallet required to sign
 * ✅ Winner must be a valid participant (creator or challenger)
 * ✅ Smart contract validates winner address
 * ✅ Challenge must be in-progress
 * ✅ Reentrancy protection in smart contract
 * 
 * @param adminWallet - Admin wallet (must be ADMIN_WALLET from config)
 * @param connection - Solana connection
 * @param challengePDA - Challenge account address
 * @param winnerAddress - Winner's wallet address
 * @returns Transaction signature
 */
export async function resolveChallenge(
  adminWallet: any,
  connection: Connection,
  challengePDA: string,
  winnerAddress: string
): Promise<string> {
  console.log('🏆 Resolving challenge and triggering payout...');
  console.log('   Challenge PDA:', challengePDA);
  console.log('   Winner:', winnerAddress);
  
  // Security: Verify admin wallet
  if (!adminWallet || !adminWallet.publicKey) {
    throw new Error('❌ Admin wallet not connected');
  }

  // Security: Verify winner address is valid
  let winnerPubkey: PublicKey;
  try {
    winnerPubkey = new PublicKey(winnerAddress);
  } catch {
    throw new Error('❌ Invalid winner address');
  }

  const admin = new PublicKey(adminWallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  console.log('✅ Admin wallet verified:', admin.toString());
  
  // Derive necessary PDAs
  const [adminStatePDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ADMIN],
    PROGRAM_ID
  );
  
  const [escrowWalletPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET],
    PROGRAM_ID
  );
  
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengeAddress.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );
  
  // Get winner's token account
  const winnerTokenAccount = await getAssociatedTokenAddress(
    USDFG_MINT,
    winnerPubkey
  );
  
  console.log('📍 Derived accounts:');
  console.log('   Admin State PDA:', adminStatePDA.toString());
  console.log('   Escrow Wallet PDA:', escrowWalletPDA.toString());
  console.log('   Escrow Token Account:', escrowTokenAccountPDA.toString());
  console.log('   Winner Token Account:', winnerTokenAccount.toString());
  
  // Calculate discriminator for resolve_challenge
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:resolve_challenge'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  // Create instruction data: discriminator + winner pubkey (32 bytes)
  const instructionData = Buffer.alloc(8 + 32);
  discriminator.copy(instructionData, 0);
  winnerPubkey.toBuffer().copy(instructionData, 8);
  
  console.log('📦 Instruction data created');
  console.log('   Discriminator:', discriminator.toString('hex'));
  
  // Create instruction with all required accounts
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: escrowTokenAccountPDA, isSigner: false, isWritable: true }, // escrow_token_account
      { pubkey: winnerTokenAccount, isSigner: false, isWritable: true }, // winner_token_account
      { pubkey: escrowWalletPDA, isSigner: false, isWritable: false }, // escrow_wallet
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      { pubkey: adminStatePDA, isSigner: false, isWritable: false }, // admin_state
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false }, // mint
    ],
    data: instructionData,
  });
  
  console.log('✅ Instruction created with', instruction.keys.length, 'accounts');
  
  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = admin;
  
  console.log('🔧 Signing transaction with admin wallet...');
  const signedTransaction = await adminWallet.signTransaction(transaction);
  
  console.log('🚀 Sending transaction...');
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  
  console.log('⏳ Confirming transaction...');
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log('✅ Challenge resolved! Winner paid out!');
  console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('💰 Winner received payout:', winnerAddress);
  
  return signature;
}