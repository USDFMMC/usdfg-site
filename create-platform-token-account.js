import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const USDFG_MINT = new PublicKey('BVmHvB4Vsd2H3fX3Z6z49jLvdiNMshzBce4U4e7tvjZM');
const PLATFORM_WALLET = new PublicKey('AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq');

async function checkPlatformTokenAccount() {
  console.log('🔍 Checking platform token account...\n');
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Get the associated token account address
  const platformTokenAccount = await getAssociatedTokenAddress(
    USDFG_MINT,
    PLATFORM_WALLET
  );
  
  console.log('📍 Platform Wallet:', PLATFORM_WALLET.toString());
  console.log('📍 USDFG Mint:', USDFG_MINT.toString());
  console.log('📍 Platform Token Account (ATA):', platformTokenAccount.toString());
  console.log('');
  
  // Check if it exists
  const accountInfo = await connection.getAccountInfo(platformTokenAccount);
  
  if (accountInfo) {
    console.log('✅ Platform token account EXISTS!');
    console.log('   Balance:', accountInfo.lamports, 'lamports');
    console.log('');
    console.log('🎉 Platform is ready to receive fees!');
  } else {
    console.log('❌ Platform token account DOES NOT EXIST!');
    console.log('');
    console.log('🔧 SOLUTION:');
    console.log('   You need to create this token account first.');
    console.log('');
    console.log('📝 Instructions:');
    console.log('   1. Connect to Phantom with ANY wallet (preferably the platform wallet)');
    console.log('   2. Send 0.001 SOL to create the token account');
    console.log('   3. Or use Solana CLI:');
    console.log('');
    console.log('   spl-token create-account', USDFG_MINT.toString(), '--owner', PLATFORM_WALLET.toString());
    console.log('');
    console.log('⚠️  The wallet creating the account will pay ~0.002 SOL rent.');
    console.log('   But the account will be owned by the platform wallet.');
  }
}

checkPlatformTokenAccount().catch(console.error);

