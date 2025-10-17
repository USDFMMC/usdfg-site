/**
 * Initialize the USDFG Smart Contract
 * 
 * The smart contract requires admin state initialization before it can function.
 * This is needed for the resolve_challenge function to work properly.
 */

import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { PROGRAM_ID, ADMIN_WALLET } from './config';

/**
 * Check if the smart contract is initialized
 * Checks if admin state exists
 */
export async function isSmartContractInitialized(
  connection: Connection
): Promise<boolean> {
  try {
    // Check if admin state exists
    const [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin')],
      PROGRAM_ID
    );
    
    const adminAccount = await connection.getAccountInfo(adminPDA);
    const isInitialized = adminAccount !== null;
    
    if (isInitialized) {
      console.log('✅ Smart contract already initialized');
    } else {
      console.log('❌ Smart contract not initialized - admin state missing');
    }
    
    return isInitialized;
  } catch (error) {
    console.log('❌ Error checking admin state:', error);
    return false;
  }
}

/**
 * Initialize the smart contract admin state
 * This is required for the smart contract to function properly
 */
export async function initializeSmartContract(
  wallet: any,
  connection: Connection
): Promise<void> {
  console.log('🔧 Initializing smart contract admin state...');
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }
  
  // Check if already initialized
  const isInitialized = await isSmartContractInitialized(connection);
  if (isInitialized) {
    console.log('✅ Smart contract already initialized');
    return;
  }
  
  // Derive admin PDA
  const [adminPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('admin')],
    PROGRAM_ID
  );
  
  console.log('🔧 Creating initialize instruction...');
  
  // Calculate discriminator for initialize function
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const discriminator = Buffer.from('global:initialize', 'utf8');
  const discriminatorHash = Buffer.from(sha256(discriminator)).slice(0, 8);
  
  // Create instruction data: discriminator + admin pubkey (32 bytes)
  const instructionData = Buffer.alloc(8 + 32);
  discriminatorHash.copy(instructionData, 0);
  ADMIN_WALLET.toBuffer().copy(instructionData, 8);
  
  // Create instruction
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: adminPDA, isSigner: false, isWritable: true }, // admin_state
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    data: instructionData,
  });
  
  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;
  
  console.log('🔧 Signing transaction...');
  const signedTransaction = await wallet.signTransaction(transaction);
  
  console.log('🚀 Sending initialization transaction...');
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  
  console.log('⏳ Confirming transaction...');
  try {
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Smart contract initialized!');
    console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (confirmError: any) {
    // Handle "already processed" error for initialization
    if (confirmError.message?.includes('This transaction has already been processed') ||
        confirmError.message?.includes('already been processed')) {
      console.log('✅ Smart contract already initialized (transaction was processed)');
      return;
    }
    throw confirmError;
  }
}