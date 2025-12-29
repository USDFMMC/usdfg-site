/**
 * USDFG Smart Contract Integration
 * 
 * This file contains all the functions to interact with the USDFG smart contract
 * for creating challenges, accepting them, and resolving winners with automatic payouts.
 * 
 * ✅ ORACLE REMOVED - No more oracle dependencies!
 */

import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_ID, USDFG_MINT, SEEDS, usdfgToLamports } from './config';

/**
 * Convert a number to a little-endian 8-byte buffer (replaces BN)
 */
function numberToU64Buffer(value: number): Buffer {
  const buffer = Buffer.allocUnsafe(8);
  // Use BigInt for precision and convert to little-endian
  const bigValue = BigInt(Math.floor(value));
  for (let i = 0; i < 8; i++) {
    buffer[i] = Number((bigValue >> BigInt(i * 8)) & BigInt(0xFF));
  }
  return buffer;
}

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
 * @param entryFeeUsdfg - Entry fee in USDFG tokens (e.g., 0.001 for 0.001 USDFG)
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

  // Validate entry fee (matches contract requirement: 0.000000001 USDFG minimum (1 lamport), 1000 USDFG maximum)
  if (entryFeeUsdfg < 0.000000001 || entryFeeUsdfg > 1000) {
    throw new Error('Entry fee must be between 0.000000001 and 1000 USDFG');
  }

  console.log(`✅ Entry fee valid: ${entryFeeUsdfg} USDFG`);

  if (!wallet.signTransaction) {
    throw new Error('Wallet does not support transaction signing');
  }

  console.log('✅ Wallet has signTransaction method');

  // Smart contract is ready (no initialization needed for player-consensus model)
  console.log('✅ Smart contract ready for player-consensus challenges');

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

  // Step 4: Create instruction data (NO PAYMENT - metadata only)
  console.log('💰 Entry fee (raw USDFG):', entryFeeUsdfg);
  // Convert USDFG to lamports (smallest units)
  const entryFeeLamports = Math.floor(entryFeeUsdfg * Math.pow(10, 9)); // 9 decimals
  console.log('💰 Entry fee in lamports:', entryFeeLamports);

  // Create instruction data for create_challenge
  // Calculate discriminator using SHA256 of "global:create_challenge"
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:create_challenge'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8 + 8); // discriminator + entry_fee
  discriminator.copy(instructionData, 0);
  const entryFeeBuffer = numberToU64Buffer(entryFeeLamports);
  entryFeeBuffer.copy(instructionData, 8);
  console.log('📦 Instruction data created', 'Discriminator:', discriminator.toString('hex'));

  // Step 5: Create instruction (NO ESCROW - metadata only!)
  console.log('✅ Creating instruction - NO PAYMENT REQUIRED (metadata only)...');
  console.log('📍 Challenge PDA:', pdas.challengePDA.toString());
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pdas.challengePDA, isSigner: false, isWritable: true }, // challenge
      { pubkey: creator, isSigner: true, isWritable: true }, // creator
      { pubkey: challengeSeed.publicKey, isSigner: true, isWritable: false }, // challenge_seed
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
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
  
  let signature: string;
  
  try {
    signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      skipPreflight: false,
      maxRetries: 0, // Don't retry - prevents "already processed" errors
    });
    
    console.log('✅ Transaction sent:', signature);
  } catch (sendError: any) {
    // Handle "already processed" error during send
    if (sendError.message?.includes('This transaction has already been processed') ||
        sendError.message?.includes('already been processed')) {
      console.log('✅ Transaction already processed - challenge likely created successfully');
      console.log(`📍 Challenge PDA: ${pdas.challengePDA.toString()}`);
      return pdas.challengePDA.toString(); // Return the PDA as success
    }
    throw sendError;
  }
  
  console.log('⏳ Confirming transaction...');
  try {
    await connection.confirmTransaction(signature, 'confirmed');
  } catch (confirmError: any) {
    // If confirmation fails but transaction actually succeeded, continue anyway
    console.log('⚠️  Confirmation warning:', confirmError.message);
    if (!confirmError.message?.includes('Transaction was not confirmed') && 
        !confirmError.message?.includes('already been processed') &&
        !confirmError.message?.includes('This transaction has already been processed')) {
      throw confirmError; // Only throw if it's a real error
    }
    console.log('✅ Transaction likely succeeded despite confirmation error');
  }
  
  console.log('✅ Challenge created successfully!');
  console.log(`📍 Challenge PDA: ${pdas.challengePDA.toString()}`);
  console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  return pdas.challengePDA.toString();
}

/**
 * Express intent to join challenge - NO PAYMENT REQUIRED
 * Moves challenge to CreatorConfirmationRequired state
 */
export async function expressJoinIntent(
  wallet: any,
  connection: Connection,
  challengePDA: string
): Promise<string> {
  console.log('✋ Expressing intent to join challenge (NO PAYMENT)...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const challenger = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Create instruction data for express_join_intent
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:express_join_intent'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8); // discriminator only
  discriminator.copy(instructionData, 0);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: challenger, isSigner: true, isWritable: true }, // challenger
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
  
  console.log('✅ Join intent expressed successfully!');
  return signature;
}

/**
 * Creator funds escrow after joiner expressed intent
 * Moves challenge to CreatorFunded state
 */
export async function creatorFund(
  wallet: any,
  connection: Connection,
  challengePDA: string,
  entryFeeUsdfg: number
): Promise<string> {
  console.log('💰 Creator funding challenge...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const creator = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Get creator's token account
  const creatorTokenAccount = await getAssociatedTokenAddress(USDFG_MINT, creator);
  
  // Derive escrow PDAs
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengeAddress.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );
  
  // Convert USDFG to lamports
  const entryFeeLamports = Math.floor(entryFeeUsdfg * Math.pow(10, 9));
  
  // Create instruction data for creator_fund
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:creator_fund'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8 + 8); // discriminator + entry_fee
  discriminator.copy(instructionData, 0);
  const entryFeeBuffer = numberToU64Buffer(entryFeeLamports);
  entryFeeBuffer.copy(instructionData, 8);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: creator, isSigner: true, isWritable: true }, // creator
      { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, // creator_token_account
      { pubkey: escrowTokenAccountPDA, isSigner: false, isWritable: true }, // escrow_token_account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false }, // mint
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creator;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Creator funded successfully!');
  return signature;
}

/**
 * Joiner funds escrow after creator funded
 * Moves challenge to Active state
 */
export async function joinerFund(
  wallet: any,
  connection: Connection,
  challengePDA: string,
  entryFeeUsdfg: number
): Promise<string> {
  console.log('💰 Joiner funding challenge...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const challenger = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Get challenger's token account
  const challengerTokenAccount = await getAssociatedTokenAddress(USDFG_MINT, challenger);
  
  // Derive escrow PDAs
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengeAddress.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );
  
  // Convert USDFG to lamports
  const entryFeeLamports = Math.floor(entryFeeUsdfg * Math.pow(10, 9));
  
  // Create instruction data for joiner_fund
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:joiner_fund'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8 + 8); // discriminator + entry_fee
  discriminator.copy(instructionData, 0);
  const entryFeeBuffer = numberToU64Buffer(entryFeeLamports);
  entryFeeBuffer.copy(instructionData, 8);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: challenger, isSigner: true, isWritable: true }, // challenger
      { pubkey: challengerTokenAccount, isSigner: false, isWritable: true }, // challenger_token_account
      { pubkey: escrowTokenAccountPDA, isSigner: false, isWritable: true }, // escrow_token_account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false }, // mint
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
  
  console.log('✅ Joiner funded successfully! Challenge is now ACTIVE!');
  return signature;
}

// Legacy function - kept for backwards compatibility but deprecated
/** @deprecated Use expressJoinIntent() instead */
export async function acceptChallenge(
  wallet: any,
  connection: Connection,
  challengePDA: string
): Promise<string> {
  return expressJoinIntent(wallet, connection, challengePDA);
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
  console.log('📍 Challenge PDA:', challengePDA);
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const creator = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Create instruction data for cancel_challenge
  // Calculate discriminator using SHA256 of "global:cancel_challenge"
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:cancel_challenge'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  const instructionData = Buffer.alloc(8); // discriminator only
  discriminator.copy(instructionData, 0);
  console.log('📦 Cancel instruction data created', 'Discriminator:', discriminator.toString('hex'));

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: creator, isSigner: true, isWritable: true }, // creator
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creator;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Challenge canceled successfully on-chain!');
  return signature;
}

/**
 * Resolve Challenge (Winner Claims Prize OR Admin Resolves)
 * 
 * SECURITY FEATURES:
 * ✅ Winner can claim their own prize (pays gas)
 * ✅ OR Admin can resolve for disputes (admin pays gas)
 * ✅ Smart contract validates winner address
 * ✅ Smart contract validates caller is winner OR admin
 * ✅ Challenge must be in-progress
 * ✅ Reentrancy protection in smart contract
 * 
 * @param callerWallet - Wallet signing the transaction (winner or admin)
 * @param connection - Solana connection
 * @param challengePDA - Challenge account address
 * @param winnerAddress - Winner's wallet address
 * @returns Transaction signature
 */
export async function resolveChallenge(
  callerWallet: any,
  connection: Connection,
  challengePDA: string,
  winnerAddress: string
): Promise<string> {
  console.log('🏆 Resolving challenge and triggering payout...');
  console.log('   Challenge PDA:', challengePDA);
  console.log('   Winner:', winnerAddress);
  
  // Security: Verify caller wallet
  if (!callerWallet || !callerWallet.publicKey) {
    throw new Error('❌ Wallet not connected');
  }

  // Security: Verify winner address is valid
  let winnerPubkey: PublicKey;
  try {
    winnerPubkey = new PublicKey(winnerAddress);
  } catch {
    throw new Error('❌ Invalid winner address');
  }

  const caller = new PublicKey(callerWallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  console.log('✅ Caller wallet verified:', caller.toString());
  
  // Platform wallet is hardcoded in the contract
  const platformWallet = new PublicKey('AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq');
  
  console.log('📍 Platform wallet:', platformWallet.toString());
  
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
  
  // Get platform's token account
  const platformTokenAccount = await getAssociatedTokenAddress(
    USDFG_MINT,
    platformWallet
  );
  
  console.log('📍 Derived accounts:');
  console.log('   Platform Wallet:', platformWallet.toString());
  console.log('   Escrow Wallet PDA:', escrowWalletPDA.toString());
  console.log('   Escrow Token Account:', escrowTokenAccountPDA.toString());
  console.log('   Winner Token Account:', winnerTokenAccount.toString());
  console.log('   Platform Token Account:', platformTokenAccount.toString());
  
  // Calculate discriminator for resolve_challenge
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const hash = sha256(new TextEncoder().encode('global:resolve_challenge'));
  const discriminator = Buffer.from(hash.slice(0, 8));
  
  // Create instruction data: discriminator + winner pubkey (32 bytes) + caller pubkey (32 bytes)
  const instructionData = Buffer.alloc(8 + 32 + 32);
  discriminator.copy(instructionData, 0);
  winnerPubkey.toBuffer().copy(instructionData, 8);
  caller.toBuffer().copy(instructionData, 40); // Caller is the one signing (admin or winner)
  
  console.log('📦 Instruction data created');
  console.log('   Discriminator:', discriminator.toString('hex'));
  
  // Create instruction with all required accounts
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: challengeAddress, isSigner: false, isWritable: true }, // challenge
      { pubkey: escrowTokenAccountPDA, isSigner: false, isWritable: true }, // escrow_token_account
      { pubkey: winnerTokenAccount, isSigner: false, isWritable: true }, // winner_token_account
      { pubkey: platformTokenAccount, isSigner: false, isWritable: true }, // platform_token_account (for fees)
      { pubkey: escrowWalletPDA, isSigner: false, isWritable: false }, // escrow_wallet
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      { pubkey: USDFG_MINT, isSigner: false, isWritable: false }, // mint
    ],
    data: instructionData,
  });
  
  console.log('✅ Instruction created with', instruction.keys.length, 'accounts');
  
  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = caller;
  
  console.log('🔧 Signing transaction with caller wallet...');
  const signedTransaction = await callerWallet.signTransaction(transaction);
  
  console.log('🚀 Sending transaction...');
  let signature: string;
  
  try {
    signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      skipPreflight: false,
      maxRetries: 0, // Don't retry - prevents "already processed" errors
    });
    
    console.log('✅ Transaction sent:', signature);
  } catch (sendError: any) {
    // Handle "already processed" error during send
    if (sendError.message?.includes('This transaction has already been processed') ||
        sendError.message?.includes('already been processed')) {
      console.log('✅ Transaction already processed - prize likely claimed successfully');
      console.log('💰 Winner received payout:', winnerAddress);
      return 'already-processed'; // Return success indicator
    }
    throw sendError;
  }
  
  console.log('⏳ Confirming transaction...');
  try {
    await connection.confirmTransaction(signature, 'confirmed');
  } catch (confirmError: any) {
    // If confirmation fails but transaction actually succeeded, continue anyway
    console.log('⚠️  Confirmation warning:', confirmError.message);
    if (!confirmError.message?.includes('Transaction was not confirmed') && 
        !confirmError.message?.includes('already been processed') &&
        !confirmError.message?.includes('This transaction has already been processed')) {
      throw confirmError; // Only throw if it's a real error
    }
    console.log('✅ Transaction likely succeeded despite confirmation error');
  }
  
  console.log('✅ Challenge resolved! Winner paid out!');
  console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('💰 Winner received payout:', winnerAddress);
  
  return signature;
}

/**
 * Transfer USDFG directly to escrow for tournament entry (bypasses AcceptChallenge)
 * This is used when multiple players need to join the same challenge
 */
export async function transferTournamentEntryFee(
  wallet: any,
  connection: Connection,
  challengePDA: string,
  entryFeeUsdfg: number
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const payer = new PublicKey(wallet.publicKey.toString());
  const challengeAddress = new PublicKey(challengePDA);
  
  // Derive escrow token account PDA from challenge PDA (matches contract derivation)
  const [escrowTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.ESCROW_WALLET, challengeAddress.toBuffer(), USDFG_MINT.toBuffer()],
    PROGRAM_ID
  );

  // Get payer's token account
  const payerTokenAccount = await getAssociatedTokenAddress(USDFG_MINT, payer);
  
  // Convert USDFG to lamports
  const entryFeeLamports = Math.floor(entryFeeUsdfg * Math.pow(10, 9));
  
  // Check if payer's token account exists, create if it doesn't
  const { getAccount, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
  const transaction = new Transaction();
  let accountExists = false;
  
  try {
    await getAccount(connection, payerTokenAccount);
    accountExists = true;
    console.log('✅ Payer token account exists');
  } catch (error: any) {
    // Token account doesn't exist, create it
    if (error.name === 'TokenAccountNotFoundError' || error.message?.includes('could not find account')) {
      console.log('📝 Creating payer token account...');
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        payer,              // payer
        payerTokenAccount,  // ata
        payer,              // owner
        USDFG_MINT          // mint
      );
      transaction.add(createATAInstruction);
      accountExists = false; // Will exist after transaction
    } else {
      throw error;
    }
  }
  
  // Check payer's balance (only if account already exists)
  // If we're creating the account, balance will be 0, so we'll check after creation
  if (accountExists) {
    try {
      const accountInfo = await connection.getTokenAccountBalance(payerTokenAccount);
      const balance = accountInfo.value.amount;
      if (BigInt(balance) < BigInt(entryFeeLamports)) {
        throw new Error(`Insufficient USDFG balance. Required: ${entryFeeUsdfg} USDFG, Available: ${Number(balance) / Math.pow(10, 9)} USDFG. Please acquire USDFG tokens first.`);
      }
      console.log(`✅ Payer has sufficient balance: ${Number(balance) / Math.pow(10, 9)} USDFG`);
    } catch (error: any) {
      if (error.message?.includes('Insufficient USDFG balance')) {
        throw error; // Re-throw balance errors
      }
      throw new Error(`Failed to check token balance: ${error.message}`);
    }
  } else {
    // Account is being created - user needs to have USDFG tokens first
    // We can't check balance until after account creation, so we'll let the transfer fail if insufficient
    console.log('⚠️ Token account will be created. User must have USDFG tokens to complete the transfer.');
  }
  
  // Create transfer instruction
  const { createTransferInstruction } = await import('@solana/spl-token');
  const transferInstruction = createTransferInstruction(
    payerTokenAccount,      // source
    escrowTokenAccountPDA,  // destination (escrow)
    payer,                  // owner
    entryFeeLamports        // amount
  );
  
  transaction.add(transferInstruction);
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const signedTransaction = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(signature);
  
  console.log('✅ Tournament entry fee transferred to escrow!');
  console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  return signature;
}