/**
 * Initialize the USDFG Smart Contract
 * 
 * This script initializes the admin state and price oracle PDAs
 * that are required before anyone can create challenges.
 */

import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { PROGRAM_ID, SEEDS } from './config';
import IDL from './usdfg_smart_contract.json';

/**
 * Initialize the smart contract (admin state + price oracle)
 * This only needs to be run ONCE by the contract owner
 */
export async function initializeSmartContract(
  wallet: any,
  connection: Connection
): Promise<void> {
  try {
    console.log('🔧 Initializing USDFG Smart Contract...');
    
    // Create wallet adapter for Anchor
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions || (async (txs: any[]) => {
        const signed = [];
        for (const tx of txs) {
          signed.push(await wallet.signTransaction(tx));
        }
        return signed;
      }),
    };
    
    const provider = new AnchorProvider(connection, anchorWallet as any, {
      commitment: 'confirmed',
    });
    
    const program = new Program(IDL as any, PROGRAM_ID, provider);
    
    // Derive Admin State PDA
    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );
    
    console.log('📍 Admin State PDA:', adminStatePDA.toString());
    
    // Check if already initialized
    try {
      const adminState = await program.account.adminState.fetch(adminStatePDA);
      console.log('✅ Admin state already initialized!');
      console.log('   Admin:', adminState.admin.toString());
    } catch (e) {
      // Not initialized yet, let's initialize it
      console.log('🔨 Initializing admin state...');
      
      const tx = await program.methods
        .initialize()
        .accounts({
          adminState: adminStatePDA,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Admin state initialized! TX:', tx);
    }
    
    // Derive Price Oracle PDA
    const [priceOraclePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.PRICE_ORACLE],
      PROGRAM_ID
    );
    
    console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());
    
    // Check if price oracle is initialized
    try {
      const priceOracle = await program.account.priceOracle.fetch(priceOraclePDA);
      console.log('✅ Price oracle already initialized!');
      console.log('   Price:', priceOracle.usdPerUsdfg.toString());
    } catch (e) {
      // Not initialized yet, let's initialize it
      console.log('🔨 Initializing price oracle...');
      
      // Set initial price: 0.15 USD per USDFG (in lamports: 0.15 * 10^9 = 150,000,000)
      const initialPrice = new BN(150_000_000);
      
      const tx = await program.methods
        .initializePriceOracle(initialPrice)
        .accounts({
          priceOracle: priceOraclePDA,
          adminState: adminStatePDA,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Price oracle initialized! TX:', tx);
    }
    
    console.log('🎉 Smart contract fully initialized and ready!');
  } catch (error) {
    console.error('❌ Error initializing smart contract:', error);
    throw error;
  }
}

/**
 * Check if the smart contract is initialized
 */
export async function isSmartContractInitialized(
  connection: Connection
): Promise<boolean> {
  try {
    // Just check if admin state exists
    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );
    
    const accountInfo = await connection.getAccountInfo(adminStatePDA);
    return accountInfo !== null;
  } catch (error) {
    return false;
  }
}

