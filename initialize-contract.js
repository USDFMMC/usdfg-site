import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import idl from './target/idl/usdfg_smart_contract.json' assert { type: 'json' };

const PROGRAM_ID = 'DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK';
const ADMIN_WALLET = '3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd';
const PLATFORM_WALLET = 'AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq';
const PLATFORM_FEE_BPS = 500; // 5%

async function initializeContract() {
  console.log('🚀 Initializing Smart Contract...\n');
  console.log('Program ID:', PROGRAM_ID);
  console.log('Admin Wallet:', ADMIN_WALLET);
  console.log('Platform Wallet:', PLATFORM_WALLET);
  console.log('Platform Fee:', PLATFORM_FEE_BPS, 'bps (5%)\n');

  try {
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Check if wallet is connected (Phantom)
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error('❌ Phantom wallet not found! Please install Phantom wallet extension.');
    }

    // Connect to Phantom
    console.log('📱 Connecting to Phantom wallet...');
    await window.solana.connect();
    const wallet = window.solana;
    
    console.log('✅ Connected to wallet:', wallet.publicKey.toString());
    console.log('⚠️  Make sure this is your ADMIN wallet:', ADMIN_WALLET, '\n');

    // Verify connected wallet matches admin wallet
    if (wallet.publicKey.toString() !== ADMIN_WALLET) {
      throw new Error(`❌ Wrong wallet connected! Please connect with admin wallet: ${ADMIN_WALLET}`);
    }

    // Setup Anchor provider
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );

    // Load program
    const programId = new PublicKey(PROGRAM_ID);
    const program = new Program(idl, programId, provider);

    // Derive admin state PDA
    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin')],
      programId
    );

    console.log('📋 Admin State PDA:', adminStatePDA.toString());

    // Check if already initialized
    console.log('🔍 Checking if contract is already initialized...');
    try {
      const adminState = await program.account.adminState.fetch(adminStatePDA);
      console.log('⚠️  Contract is already initialized!');
      console.log('   Admin:', adminState.admin.toString());
      console.log('   Platform Wallet:', adminState.platformWallet.toString());
      console.log('   Platform Fee:', adminState.platformFeeBps, 'bps');
      console.log('   Is Active:', adminState.isActive);
      console.log('   Is Paused:', adminState.isPaused);
      console.log('\n✅ No action needed. Contract is ready to use!');
      return;
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        console.log('✅ Contract is NOT initialized. Proceeding with initialization...\n');
      } else {
        throw error;
      }
    }

    // Initialize the contract
    console.log('📝 Sending initialization transaction...');
    const adminPubkey = new PublicKey(ADMIN_WALLET);
    const platformWalletPubkey = new PublicKey(PLATFORM_WALLET);

    const tx = await program.methods
      .initialize(adminPubkey, platformWalletPubkey, PLATFORM_FEE_BPS)
      .accounts({
        adminState: adminStatePDA,
        payer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Transaction sent!');
    console.log('   Signature:', tx);
    console.log('   Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction(tx, 'confirmed');

    // Fetch and display admin state
    const adminState = await program.account.adminState.fetch(adminStatePDA);
    console.log('\n🎉 CONTRACT INITIALIZED SUCCESSFULLY!\n');
    console.log('📊 Contract Configuration:');
    console.log('   Admin:', adminState.admin.toString());
    console.log('   Platform Wallet:', adminState.platformWallet.toString());
    console.log('   Platform Fee:', adminState.platformFeeBps, 'bps (', adminState.platformFeeBps / 100, '%)');
    console.log('   Is Active:', adminState.isActive);
    console.log('   Is Paused:', adminState.isPaused);
    console.log('\n✅ Smart contract is ready to use!');
    console.log('🎮 Users can now create challenges on your platform!\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

// Run if in browser
if (typeof window !== 'undefined') {
  window.initializeContract = initializeContract;
  console.log('💡 Run: window.initializeContract() in console to initialize');
}

export default initializeContract;

