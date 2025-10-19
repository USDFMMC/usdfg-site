import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkAdminState() {
  console.log('🔍 Checking admin_state account...\n');

  // Derive admin_state PDA
  const [adminStatePDA] = await PublicKey.findProgramAddress(
    [Buffer.from('admin')],
    PROGRAM_ID
  );

  console.log('📍 Admin State PDA:', adminStatePDA.toString());

  try {
    const accountInfo = await connection.getAccountInfo(adminStatePDA);

    if (!accountInfo) {
      console.log('❌ Admin state does NOT exist');
      console.log('✅ This is GOOD - you can initialize fresh!\n');
      console.log('👉 Go to https://usdfg.pro/admin.html and click "Initialize Contract"');
      return;
    }

    console.log('\n📊 Account Info:');
    console.log('   Owner:', accountInfo.owner.toString());
    console.log('   Data length:', accountInfo.data.length, 'bytes');
    console.log('   Lamports:', accountInfo.lamports);
    
    // Expected length for new AdminState: 8 + 32 + 32 + 2 + 1 + 1 + 8 + 8 = 92 bytes
    // Old AdminState: 8 + 32 + 1 + 8 + 8 = 57 bytes
    
    if (accountInfo.data.length === 57) {
      console.log('\n⚠️  PROBLEM: Account has OLD structure (57 bytes)');
      console.log('   Expected: 92 bytes for new structure with platform fees');
      console.log('\n🔧 SOLUTION: The account needs to be closed and reinitialized');
    } else if (accountInfo.data.length === 92) {
      console.log('\n✅ Account has CORRECT structure (92 bytes)');
      console.log('   This should work. Let me parse the data...\n');
      
      // Try to parse
      try {
        const data = accountInfo.data;
        const discriminator = data.slice(0, 8);
        const admin = new PublicKey(data.slice(8, 40));
        const platformWallet = new PublicKey(data.slice(40, 72));
        const platformFeeBps = data.readUInt16LE(72);
        const isPaused = data[74] === 1;
        const isActive = data[75] === 1;
        
        console.log('📋 Parsed Admin State:');
        console.log('   Admin:', admin.toString());
        console.log('   Platform Wallet:', platformWallet.toString());
        console.log('   Platform Fee:', platformFeeBps, 'bps (', platformFeeBps / 100, '%)');
        console.log('   Is Paused:', isPaused);
        console.log('   Is Active:', isActive);
        
        if (isActive) {
          console.log('\n✅ Contract is properly initialized and active!');
          console.log('   You can create challenges now.');
        } else {
          console.log('\n⚠️  Contract is initialized but INACTIVE');
        }
      } catch (parseError) {
        console.log('\n❌ Could not parse account data:', parseError.message);
        console.log('   Data might be corrupted.');
      }
    } else {
      console.log('\n❌ UNEXPECTED data length:', accountInfo.data.length, 'bytes');
      console.log('   Expected: 92 bytes (new) or 57 bytes (old)');
      console.log('   Data might be corrupted.');
    }

    console.log('\n📦 Raw data (first 100 bytes):');
    console.log('  ', accountInfo.data.slice(0, 100).toString('hex'));

  } catch (error) {
    console.error('\n❌ Error checking account:', error.message);
  }
}

checkAdminState().catch(console.error);

