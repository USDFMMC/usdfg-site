import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { createHash } from 'crypto'; // Node.js crypto for SHA256

// Configuration
const PROGRAM_ID = new PublicKey('BRY2pCUWF4hq6cxz6Sm4BwG9NdurVqrgMneXA97JX8wu');
const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');
const RPC_URL = 'https://api.devnet.solana.com';

async function initializeNewContract() {
  console.log('🚀 Initializing NEW USDFG Smart Contract...');
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('✅ Connected to Solana devnet');

  // Derive admin PDA
  const [adminPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('admin')],
    PROGRAM_ID
  );
  console.log('🔍 Checking admin state...');
  console.log('   Admin PDA:', adminPDA.toString());

  const adminAccount = await connection.getAccountInfo(adminPDA);
  if (adminAccount) {
    console.log('✅ Admin state already initialized. No action needed.');
    return;
  }
  
  // Create initialize instruction
  console.log('🔧 Creating initialize instruction...');
  
  // Calculate discriminator for initialize function
  const discriminator = Buffer.from('global:initialize', 'utf8');
  const discriminatorHash = createHash('sha256').update(discriminator).digest().slice(0, 8);
  
  // Create instruction data: discriminator + admin pubkey (32 bytes)
  const instructionData = Buffer.alloc(8 + 32);
  discriminatorHash.copy(instructionData, 0);
  ADMIN_WALLET.toBuffer().copy(instructionData, 8);
  
  // This script cannot sign the transaction directly as it doesn't have the admin's private key.
  // It prepares the instruction for manual signing.
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: adminPDA, isSigner: false, isWritable: true }, // admin_state
      { pubkey: ADMIN_WALLET, isSigner: true, isWritable: true }, // payer (admin wallet must sign)
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    data: instructionData,
  });

  console.log('📦 Instruction created');
  console.log('   Program ID:', PROGRAM_ID.toString());
  console.log('   Admin PDA:', adminPDA.toString());
  console.log('   Admin Wallet:', ADMIN_WALLET.toString());
  console.log('⚠️  Manual step required:');
  console.log('   1. The admin wallet needs to sign this transaction');
  console.log('   2. You can do this through the frontend or Solana CLI');
  console.log('   3. Or use a wallet that has access to the admin private key');
  console.log('✅ Smart contract initialization ready!');
  console.log('   Admin PDA:', adminPDA.toString());
  console.log('   Admin Wallet:', ADMIN_WALLET.toString());
}

initializeNewContract().catch(console.error);
