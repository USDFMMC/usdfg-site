import { 
  Connection, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair
} from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK');
const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function closeOldAdminState() {
  console.log('🔧 Closing OLD admin_state account...\n');

  // Derive admin_state PDA
  const [adminStatePDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from('admin')],
    PROGRAM_ID
  );

  console.log('📍 Admin State PDA:', adminStatePDA.toString());
  console.log('📍 Admin Wallet:', ADMIN_WALLET.toString());

  // Check account exists
  const accountInfo = await connection.getAccountInfo(adminStatePDA);
  if (!accountInfo) {
    console.log('✅ Admin state does not exist. Nothing to close!');
    return;
  }

  console.log('\n📊 Current Account:');
  console.log('   Owner:', accountInfo.owner.toString());
  console.log('   Data length:', accountInfo.data.length, 'bytes');
  console.log('   Lamports:', accountInfo.lamports);

  if (accountInfo.data.length !== 57) {
    console.log('\n⚠️  Account does not have old structure (57 bytes)');
    console.log('   Aborting to avoid closing wrong account.');
    return;
  }

  console.log('\n⚠️  IMPORTANT:');
  console.log('   This script needs your admin wallet private key to sign.');
  console.log('   For security, you should do this through Phantom wallet instead.\n');
  console.log('👉 RECOMMENDED APPROACH:');
  console.log('   Since the account is owned by the program, we need a program instruction to close it.');
  console.log('   The program needs a "close_admin_state" or "migrate_admin_state" function.\n');
  
  console.log('🔧 ALTERNATIVE SOLUTION:');
  console.log('   Deploy a NEW program ID with the new structure, OR');
  console.log('   Add a migration function to the smart contract that:');
  console.log('   1. Reads the old admin data');
  console.log('   2. Closes the old account (using "close" constraint)');
  console.log('   3. Reinitializes with new structure + default platform values\n');

  console.log('💡 QUICK FIX for now:');
  console.log('   1. Create a new program deployment with a FRESH program ID');
  console.log('   2. Or, add a migration instruction to your smart contract:');
  console.log('      - Add this to lib.rs:\n');
  console.log('```rust');
  console.log('pub fn migrate_admin_state(ctx: Context<MigrateAdmin>, platform_wallet: Pubkey, platform_fee_bps: u16) -> Result<()> {');
  console.log('    // Close old account and realloc to new size');
  console.log('    // ... migration logic');
  console.log('}');
  console.log('```\n');

  console.log('📌 For immediate fix, I\'ll create a SIMPLER solution below...');
}

closeOldAdminState().catch(console.error);

