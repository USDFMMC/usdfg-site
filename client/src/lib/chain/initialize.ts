/**
 * Initialize the USDFG Smart Contract
 * 
 * ✅ ORACLE REMOVED - No initialization needed!
 * The smart contract no longer requires admin state or price oracle initialization.
 */

import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { PROGRAM_ID, SEEDS } from './config';
import { BN } from '@coral-xyz/anchor';

/**
 * Check if the smart contract is initialized
 * Since we removed the oracle, we always return true
 */
export async function isSmartContractInitialized(
  connection: Connection
): Promise<boolean> {
  console.log('✅ Smart contract is ready (no oracle initialization needed)');
  return true;
}

/**
 * Initialize the smart contract
 * Since we removed the oracle, this is a no-op
 */
export async function initializeSmartContract(
  wallet: any,
  connection: Connection
): Promise<void> {
  console.log('✅ Smart contract initialization skipped (oracle removed)');
  return;
}

/**
 * Update the price oracle (still needed for deployed contract)
 */
export async function updatePriceOracle(wallet: any, connection: Connection): Promise<void> {
  try {
    console.log('🔄 Updating price oracle...');
    
    const admin = wallet.publicKey;
    if (!admin) {
      throw new Error('Wallet not connected!');
    }

    // Derive admin state PDA
    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );

    // Derive price oracle PDA
    const [priceOraclePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.PRICE_ORACLE],
      PROGRAM_ID
    );

    // Create instruction data for update_price
    const instructionData = Buffer.alloc(8 + 8); // discriminator + price
    // Correct discriminator for "global:update_price"
    instructionData.writeUInt32LE(0x0a0a0a0a, 0); // Lower 32 bits: 0x0a0a0a0a
    instructionData.writeUInt32LE(0x6d6a6d0a, 4); // Upper 32 bits: 0x6d6a6d0a
    
    // Set price to 0.15 USD (15 cents)
    const price = 0.15;
    const priceBN = new BN(Math.floor(price * 100)); // Convert to cents
    priceBN.toArrayLike(Buffer, 'le', 8).copy(instructionData, 8);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
        { pubkey: adminStatePDA, isSigner: false, isWritable: false },
        { pubkey: admin, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = admin;

    const signedTransaction = await wallet.signTransaction(transaction);
    await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(signedTransaction.signature);

    console.log('✅ Price oracle updated successfully');
  } catch (error) {
    console.error('❌ Error updating price oracle:', error);
    throw error;
  }
}