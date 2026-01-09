#!/usr/bin/env node

/**
 * Burn excess tokens to fix supply to 21,000,000
 * Current supply: 357,000,000
 * Target supply: 21,000,000
 * Amount to burn: 336,000,000
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getMint, getAccount, burn, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import bs58 from 'bs58';

// Configuration
const MINT_ADDRESS = 'UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT';
const AUTHORITY_KEYPAIR_PATH = './wallets/authority.json';
const HA_PUBLIC_KEY = 'HATbEKpksdhRE7RPGgAnk7fM9sXK2LwxGQHwGbtCpvFp';
const HA_PRIVATE_KEY_BASE58 = '59xNhH1xrfncjqx4KaSCcaxNwf7A89kzGTxzm8xQZAn6bVC82M1ntZ2hbogx3ywy6c1xcwMTcma5RDZqis4gzR1Y';
const TARGET_SUPPLY = 21_000_000;
const TOKEN_DECIMALS = 9;

const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔥 Burning Excess Tokens to Fix Supply (DEVNET ONLY)\n');
  
  try {
    // Create authority keypair from base58 if it doesn't exist
    if (!fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
      console.log('📝 Creating temporary authority.json...');
      const privateKeyBytes = bs58.decode(HA_PRIVATE_KEY_BASE58);
      const authorityKeypair = Keypair.fromSecretKey(privateKeyBytes);
      fs.writeFileSync(AUTHORITY_KEYPAIR_PATH, JSON.stringify(Array.from(authorityKeypair.secretKey)));
    }
    
    // Load authority keypair
    const authorityKeypairData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf8'));
    const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(authorityKeypairData));
    
    if (authorityKeypair.publicKey.toString() !== HA_PUBLIC_KEY) {
      throw new Error(`Authority public key mismatch!`);
    }
    console.log(`✅ Authority keypair loaded: ${authorityKeypair.publicKey.toString()}`);
    
    // Connect to network
    const connection = new Connection(RPC_URL, 'confirmed');
    
    const mint = new PublicKey(MINT_ADDRESS);
    
    // Check current supply
    const mintInfo = await getMint(connection, mint);
    const currentSupply = Number(mintInfo.supply) / Math.pow(10, TOKEN_DECIMALS);
    console.log(`\n📊 Current Supply: ${currentSupply.toLocaleString()} tokens`);
    console.log(`🎯 Target Supply: ${TARGET_SUPPLY.toLocaleString()} tokens`);
    
    if (currentSupply <= TARGET_SUPPLY) {
      console.log('✅ Supply is already at or below target. No burning needed.');
      return;
    }
    
    const excessAmount = currentSupply - TARGET_SUPPLY;
    console.log(`🔥 Amount to burn: ${excessAmount.toLocaleString()} tokens`);
    
    // Get authority's token account
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const authorityTokenAccount = await getAssociatedTokenAddress(mint, authorityKeypair.publicKey);
    
    // Check token account balance
    const tokenAccountInfo = await getAccount(connection, authorityTokenAccount);
    const tokenBalance = Number(tokenAccountInfo.amount) / Math.pow(10, TOKEN_DECIMALS);
    console.log(`\n💰 Authority token balance: ${tokenBalance.toLocaleString()} tokens`);
    
    if (tokenBalance < excessAmount) {
      throw new Error(`Insufficient balance! Have ${tokenBalance.toLocaleString()}, need ${excessAmount.toLocaleString()} to burn.`);
    }
    
    // Burn excess tokens
    const burnAmountLamports = BigInt(Math.floor(excessAmount * Math.pow(10, TOKEN_DECIMALS)));
    console.log(`\n🔥 Burning ${excessAmount.toLocaleString()} tokens (${burnAmountLamports.toString()} lamports)...`);
    
    const burnSig = await burn(
      connection,
      authorityKeypair, // Payer
      authorityTokenAccount, // Source token account
      mint, // Mint
      authorityKeypair, // Owner of token account
      burnAmountLamports // Amount to burn
    );
    
    console.log(`✅ Burn transaction: ${burnSig}`);
    await connection.confirmTransaction(burnSig);
    
    // Verify new supply
    const newMintInfo = await getMint(connection, mint);
    const newSupply = Number(newMintInfo.supply) / Math.pow(10, TOKEN_DECIMALS);
    console.log(`\n✅ New Supply: ${newSupply.toLocaleString()} tokens`);
    
    if (Math.abs(newSupply - TARGET_SUPPLY) < 1) {
      console.log('✅ Supply successfully fixed to 21,000,000!');
    } else {
      console.log(`⚠️  Supply is ${newSupply.toLocaleString()}, expected ${TARGET_SUPPLY.toLocaleString()}`);
    }
    
    console.log(`\n🔗 Explorer: https://explorer.solana.com/tx/${burnSig}?cluster=devnet`);
    
    // Cleanup
    if (fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
      fs.unlinkSync(AUTHORITY_KEYPAIR_PATH);
      console.log('✅ Cleaned up temporary authority.json');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();


