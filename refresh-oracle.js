#!/usr/bin/env node

/**
 * Simple script to refresh the price oracle
 * Run this with: node refresh-oracle.js
 * 
 * This script uses the original admin wallet to update the oracle
 * so that challenges can be created without the "StaleOraclePrice" error
 */

const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { BN } = require('@coral-xyz/anchor');

// Configuration
const PROGRAM_ID = new PublicKey('2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT');
const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');
const RPC_URL = 'https://api.devnet.solana.com';

// Seeds
const SEEDS = {
  ADMIN: Buffer.from('admin'),
  PRICE_ORACLE: Buffer.from('price_oracle')
};

async function refreshOracle() {
  try {
    console.log('🔄 Refreshing price oracle...');
    
    // Create connection
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Derive PDAs
    const [adminStatePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.ADMIN],
      PROGRAM_ID
    );
    
    const [priceOraclePDA] = PublicKey.findProgramAddressSync(
      [SEEDS.PRICE_ORACLE],
      PROGRAM_ID
    );
    
    console.log('📍 Admin State PDA:', adminStatePDA.toString());
    console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());
    
    // Convert price to lamports (e.g. 0.15 USD = 150,000,000 lamports)
    const priceInLamports = new BN(150_000_000); // $0.15
    
    console.log('💰 Updating price to: $0.15 USD');
    
    // Calculate discriminator for "update_price" instruction
    // sha256("global:update_price") first 8 bytes
    const discriminator = Buffer.from([0x3d, 0x22, 0x75, 0x9b, 0x4b, 0x22, 0x7b, 0xd0]);
    
    // Serialize the price argument (u64, little-endian)
    const priceBuffer = Buffer.alloc(8);
    priceInLamports.toArrayLike(Buffer, 'le', 8).copy(priceBuffer);
    
    const instructionData = Buffer.concat([discriminator, priceBuffer]);
    
    // Create instruction
    const instruction = {
      keys: [
        { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
        { pubkey: adminStatePDA, isSigner: false, isWritable: false },
        { pubkey: ADMIN_WALLET, isSigner: true, isWritable: true }, // Admin must be signer + writable
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    };
    
    console.log('⚠️  NOTE: This script requires the admin wallet private key to sign the transaction.');
    console.log('⚠️  For security reasons, you need to run this from a secure environment.');
    console.log('⚠️  The admin wallet private key is needed to sign the oracle update transaction.');
    
    console.log('✅ Oracle refresh instruction prepared');
    console.log('📝 To complete this, you would need to:');
    console.log('   1. Import the admin wallet private key');
    console.log('   2. Sign and send the transaction');
    console.log('   3. Confirm the transaction');
    
  } catch (error) {
    console.error('❌ Error refreshing oracle:', error);
  }
}

// Run the script
refreshOracle();
