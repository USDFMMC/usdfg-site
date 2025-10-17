#!/usr/bin/env node

/**
 * Initialize USDFG Smart Contract
 * 
 * This script initializes the smart contract with the admin state.
 * The admin state is required for the smart contract to function properly.
 */

import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createHash } from 'crypto';

// Configuration
const PROGRAM_ID = new PublicKey('9NBcMx3x8EotQi63fukhXpYbcBRgyWj6PcEFyEaL9oqo');
const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');
const RPC_URL = 'https://api.devnet.solana.com';

async function initializeSmartContract() {
  console.log('🚀 Initializing USDFG Smart Contract...');
  
  try {
    // Connect to Solana
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log('✅ Connected to Solana devnet');
    
    // Check if admin state already exists
    const [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin')],
      PROGRAM_ID
    );
    
    console.log('🔍 Checking admin state...');
    console.log('   Admin PDA:', adminPDA.toString());
    
    try {
      const adminAccount = await connection.getAccountInfo(adminPDA);
      if (adminAccount) {
        console.log('✅ Admin state already initialized!');
        return;
      }
    } catch (error) {
      console.log('❌ Admin state not found, initializing...');
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
    
    // Create instruction
    const instruction = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminPDA, isSigner: false, isWritable: true }, // admin_state
        { pubkey: ADMIN_WALLET, isSigner: true, isWritable: true }, // payer
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: instructionData,
    };
    
    console.log('📦 Instruction created');
    console.log('   Program ID:', PROGRAM_ID.toString());
    console.log('   Admin PDA:', adminPDA.toString());
    console.log('   Admin Wallet:', ADMIN_WALLET.toString());
    
    // Note: This requires the admin wallet to sign the transaction
    console.log('⚠️  Manual step required:');
    console.log('   1. The admin wallet needs to sign this transaction');
    console.log('   2. You can do this through the frontend or Solana CLI');
    console.log('   3. Or use a wallet that has access to the admin private key');
    
    console.log('✅ Smart contract initialization ready!');
    console.log('   Admin PDA:', adminPDA.toString());
    console.log('   Admin Wallet:', ADMIN_WALLET.toString());
    
  } catch (error) {
    console.error('❌ Error initializing smart contract:', error);
  }
}

// Run the initialization
initializeSmartContract().catch(console.error);
