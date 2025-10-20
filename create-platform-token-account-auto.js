import { Connection, PublicKey, Transaction, Keypair, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const USDFG_MINT = new PublicKey('BVmHvB4Vsd2H3fX3Z6z49jLvdiNMshzBce4U4e7tvjZM');
const PLATFORM_WALLET = new PublicKey('AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq');

async function createPlatformTokenAccount() {
  console.log('🏦 Creating platform token account...\n');
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Get the associated token account address
  const platformTokenAccount = await getAssociatedTokenAddress(
    USDFG_MINT,
    PLATFORM_WALLET
  );
  
  console.log('📍 Platform Wallet:', PLATFORM_WALLET.toString());
  console.log('📍 Platform Token Account:', platformTokenAccount.toString());
  console.log('');
  
  // Check if it already exists
  const accountInfo = await connection.getAccountInfo(platformTokenAccount);
  if (accountInfo) {
    console.log('✅ Platform token account already exists!');
    console.log('🎉 No action needed. You can claim prizes now!');
    return;
  }
  
  console.log('⚠️  Platform token account does not exist.');
  console.log('');
  console.log('🔧 MANUAL SOLUTION (Easiest):');
  console.log('');
  console.log('1. Open Phantom wallet');
  console.log('2. Make sure you have at least 0.003 SOL on devnet');
  console.log('3. Go to: https://spl-token-faucet.com/?token-name=USDFG');
  console.log('4. Enter platform wallet: AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq');
  console.log('5. This will create the token account automatically!');
  console.log('');
  console.log('OR use Solana CLI:');
  console.log('');
  console.log('spl-token create-account BVmHvB4Vsd2H3fX3Z6z49jLvdiNMshzBce4U4e7tvjZM --owner AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq --url devnet');
  console.log('');
  console.log('💡 TIP: You can also send 0 USDFG tokens to the platform wallet from Phantom,');
  console.log('   which will automatically create the account!');
}

createPlatformTokenAccount().catch(console.error);

