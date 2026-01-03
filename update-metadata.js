#!/usr/bin/env node

/**
 * Update USDFG Token Metadata (DEVNET ONLY)
 * Updates the existing metadata account with correct image URI
 */

import { Connection, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { 
  updateV1,
  findMetadataPda,
  mplTokenMetadata,
  updateArgs
} from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import fs from 'fs';
import bs58 from 'bs58';

// Configuration
const MINT_ADDRESS = 'UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT';
const AUTHORITY_KEYPAIR_PATH = './wallets/authority.json';
const HA_PUBLIC_KEY = 'HATbEKpksdhRE7RPGgAnk7fM9sXK2LwxGQHwGbtCpvFp';
const HA_PRIVATE_KEY_BASE58 = '59xNhH1xrfncjqx4KaSCcaxNwf7A89kzGTxzm8xQZAn6bVC82M1ntZ2hbogx3ywy6c1xcwMTcma5RDZqis4gzR1Y';

const TOKEN_NAME = 'USDFGAMING';
const TOKEN_SYMBOL = 'USDFG';
const METADATA_URI = 'https://usdfg.pro/api/token-metadata.json'; // This should point to JSON with image

const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔄 Updating USDFG Token Metadata (DEVNET ONLY)\n');
  
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
    
    // Create UMI instance
    const umi = createUmi(connection.rpcEndpoint);
    umi.use(mplTokenMetadata());
    
    // Convert keypairs to UMI format
    const umiAuthorityKeypair = fromWeb3JsKeypair(authorityKeypair);
    const umiAuthoritySigner = createSignerFromKeypair(umi, umiAuthorityKeypair);
    umi.use(signerIdentity(umiAuthoritySigner));
    
    const mintPublicKey = fromWeb3JsPublicKey(authorityKeypair.publicKey); // This should be the mint, not authority
    // Fix: use the actual mint address
    const { PublicKey } = await import('@solana/web3.js');
    const mint = new PublicKey(MINT_ADDRESS);
    const mintPublicKeyCorrect = fromWeb3JsPublicKey(mint);
    
    // Find metadata PDA
    const metadataPda = findMetadataPda(umi, { mint: mintPublicKeyCorrect });
    console.log(`📍 Metadata PDA: ${metadataPda.toString()}`);
    
    // Check if metadata account exists
    const existingMetadata = await umi.rpc.getAccount(metadataPda);
    console.log(`   Account exists: ${existingMetadata.exists}`);
    console.log(`   Data length: ${existingMetadata.data?.length || 0}`);
    
    if (!existingMetadata.exists) {
      throw new Error('Metadata account does not exist. Cannot update.');
    }
    
    // Update metadata
    console.log('\n📝 Updating metadata...');
    const updateData = updateArgs({
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      uri: METADATA_URI,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    });
    
    const builder = updateV1(umi, {
      metadata: metadataPda,
      updateAuthority: umiAuthoritySigner,
      newUpdateAuthority: umiAuthoritySigner.publicKey,
      data: updateData,
    });
    
    const result = await builder.sendAndConfirm(umi);
    let signature = 'unknown';
    if (result?.signature) {
      if (result.signature instanceof Uint8Array) {
        signature = bs58.encode(result.signature);
      } else {
        signature = result.signature.toString();
      }
    }
    
    console.log(`✅ Metadata updated successfully!`);
    console.log(`   Transaction: ${signature}`);
    console.log(`\n🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
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

