#!/usr/bin/env node

/**
 * Create USDFG Token Mint (DEVNET ONLY)
 * 
 * Uses:
 * - Vanity keypair (UFGa...) as the mint address
 * - HA wallet (HATb...) as mint authority and freeze authority
 * - Adds token metadata with image
 */

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  getMint,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE
} from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { 
  createMetadataAccountV3,
  createFungible,
  updateV1,
  findMetadataPda,
  mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import fs from 'fs';
import bs58 from 'bs58';
import path from 'path';
import { NFTStorage, File } from 'nft.storage';

// Configuration
const MINT_KEYPAIR_PATH = './wallets/UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT.json';
const AUTHORITY_KEYPAIR_PATH = './wallets/authority.json';
const HA_PUBLIC_KEY = 'HATbEKpksdhRE7RPGgAnk7fM9sXK2LwxGQHwGbtCpvFp';
const HA_PRIVATE_KEY_BASE58 = '59xNhH1xrfncjqx4KaSCcaxNwf7A89kzGTxzm8xQZAn6bVC82M1ntZ2hbogx3ywy6c1xcwMTcma5RDZqis4gzR1Y';
const TOKEN_IMAGE_PATH = '/Users/usdfg/Downloads/usdfgtoken.png';
const NFT_STORAGE_TOKEN = process.env.NFT_STORAGE_TOKEN || ''; // Set via environment variable

// Token parameters
const TOKEN_NAME = 'USDFGAMING';
const TOKEN_SYMBOL = 'USDFG';
const TOKEN_DECIMALS = 9;
const TOTAL_SUPPLY = 21_000_000; // 21 million tokens

// FORCE DEVNET ONLY
const RPC_URL = 'https://api.devnet.solana.com';
const NETWORK = 'devnet';

/**
 * Upload image to IPFS using NFT.Storage
 */
async function uploadImageToIPFS(imagePath) {
  console.log('\n📤 Uploading image to IPFS...');
  
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // If NFT_STORAGE_TOKEN is not set, use fallback URL
    if (!NFT_STORAGE_TOKEN) {
      console.log('⚠️  NFT_STORAGE_TOKEN not set. Using fallback URL.');
      const imageUri = `https://usdfg.pro/assets/usdfg-token.png`;
      console.log(`✅ Image URI (fallback): ${imageUri}`);
      return imageUri;
    }

    // Upload to IPFS via NFT.Storage
    const storage = new NFTStorage({ token: NFT_STORAGE_TOKEN });
    const imageData = fs.readFileSync(imagePath);
    const imageFile = new File([imageData], path.basename(imagePath), { type: 'image/png' });
    
    console.log('   Uploading image to IPFS...');
    const imageCid = await storage.storeBlob(imageFile);
    const imageUri = `https://${imageCid}.ipfs.nftstorage.link`;
    
    console.log(`✅ Image uploaded to IPFS: ${imageUri}`);
    return imageUri;
  } catch (error) {
    console.error('❌ Error uploading image to IPFS:', error.message);
    // Fallback to website URL
    const imageUri = `https://usdfg.pro/assets/usdfg-token.png`;
    console.log(`   Using fallback URL: ${imageUri}`);
    return imageUri;
  }
}

/**
 * Upload metadata JSON to IPFS
 */
async function prepareMetadataJSON(imageUri) {
  console.log('\n📤 Uploading metadata JSON to IPFS...');
  
  try {
    const metadataJSON = {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      description: 'USDFG - Skill-based gaming token',
      image: imageUri,
      website: 'https://usdfg.pro',
      decimals: TOKEN_DECIMALS
    };
    
    // If NFT_STORAGE_TOKEN is not set, use fallback URL
    if (!NFT_STORAGE_TOKEN) {
      console.log('⚠️  NFT_STORAGE_TOKEN not set. Using fallback URL.');
      const metadataUri = `https://usdfg.pro/api/token-metadata.json`;
      console.log(`✅ Metadata URI (fallback): ${metadataUri}`);
      console.log(`   JSON content:`, JSON.stringify(metadataJSON, null, 2));
      return metadataUri;
    }

    // Upload to IPFS via NFT.Storage
    const storage = new NFTStorage({ token: NFT_STORAGE_TOKEN });
    const metadataString = JSON.stringify(metadataJSON, null, 2);
    const metadataFile = new File([metadataString], 'token-metadata.json', { type: 'application/json' });
    
    console.log('   Uploading metadata JSON to IPFS...');
    const metadataCid = await storage.storeBlob(metadataFile);
    const metadataUri = `https://${metadataCid}.ipfs.nftstorage.link`;
    
    console.log(`✅ Metadata JSON uploaded to IPFS: ${metadataUri}`);
    console.log(`   JSON content:`, metadataString);
    
    return metadataUri;
  } catch (error) {
    console.error('❌ Error uploading metadata JSON:', error.message);
    // Fallback to website URL
    const metadataUri = `https://usdfg.pro/api/token-metadata.json`;
    console.log(`   Using fallback URL: ${metadataUri}`);
    return metadataUri;
  }
}

/**
 * Create token metadata account on-chain using Metaplex
 */
async function createTokenMetadataOnChain(connection, mint, authorityKeypair, imageUri) {
  console.log('\n📝 Creating token metadata account on-chain...');
  
  try {
    // Prepare metadata JSON URI
    const metadataUri = await prepareMetadataJSON(imageUri);
    
    // Create UMI instance
    const umi = createUmi(connection.rpcEndpoint);
    umi.use(mplTokenMetadata());
    
    // Convert keypairs to UMI format
    const umiAuthorityKeypair = fromWeb3JsKeypair(authorityKeypair);
    const umiAuthoritySigner = createSignerFromKeypair(umi, umiAuthorityKeypair);
    umi.use(signerIdentity(umiAuthoritySigner));
    
    const mintPublicKey = fromWeb3JsPublicKey(mint);
    
    // Find metadata PDA
    const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
    console.log(`   Metadata PDA: ${metadataPda.toString()}`);
    
    // Check if metadata account already exists and has data
    const existingMetadata = await umi.rpc.getAccount(metadataPda);
    
    let builder;
    let isUpdate = false;
    
    // Ensure URI is short enough (Metaplex has a ~200 char limit for URI field)
    if (metadataUri.length > 200) {
      throw new Error(`Metadata URI too long (${metadataUri.length} chars). Must be under 200 characters.`);
    }
    
    if (existingMetadata.exists && existingMetadata.data && existingMetadata.data.length > 0) {
      // Update existing metadata account
      console.log('   ⚠️  Metadata account exists. Updating with new URI...');
      isUpdate = true;
      
      // Use updateArgs to properly structure the data
      const { updateArgs } = await import('@metaplex-foundation/mpl-token-metadata');
      const updateData = updateArgs({
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
      });
      
      builder = updateV1(umi, {
        metadata: metadataPda,
        updateAuthority: umiAuthoritySigner,
        newUpdateAuthority: umiAuthoritySigner.publicKey, // Keep same authority
        data: updateData,
      });
    } else {
      // Create new metadata account
      console.log('   Creating metadata account transaction...');
      
      builder = createMetadataAccountV3(umi, {
        metadata: metadataPda,
        mint: mintPublicKey,
        mintAuthority: umiAuthoritySigner,
        updateAuthority: umiAuthoritySigner.publicKey, // HA wallet keeps update authority
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: metadataUri, // URI to metadata JSON (must be < 200 chars)
        sellerFeeBasisPoints: 0,
        isMutable: true, // Allow metadata updates
      });
    }
    
    try {
      
      const result = await builder.sendAndConfirm(umi);
      // The result from sendAndConfirm should have a signature property
      let signature = 'unknown';
      if (result) {
        // UMI sendAndConfirm returns { signature: Uint8Array }
        if (result.signature) {
          // Convert Uint8Array to base58 string
          if (result.signature instanceof Uint8Array) {
            signature = bs58.encode(result.signature);
          } else {
            signature = result.signature.toString();
          }
        } else if (result.response?.signature) {
          if (result.response.signature instanceof Uint8Array) {
            signature = bs58.encode(result.response.signature);
          } else {
            signature = result.response.signature.toString();
          }
        } else if (typeof result === 'string') {
          signature = result;
        } else {
          // Try to extract from the result object
          const resultStr = JSON.stringify(result);
          const sigMatch = resultStr.match(/"signature":"([^"]+)"/);
          if (sigMatch) {
            signature = sigMatch[1];
          }
        }
      }
      
      if (isUpdate) {
        console.log(`✅ Metadata account updated`);
      } else {
        console.log(`✅ Metadata account created`);
      }
      console.log(`   Transaction: ${signature}`);
      
      // Verify metadata account exists
      const metadataAccount = await umi.rpc.getAccount(metadataPda);
      if (!metadataAccount.exists) {
        throw new Error('Metadata account was not created');
      }
      
      console.log(`✅ Metadata account verified on-chain`);
      
      return {
        metadataAccount: metadataPda.toString(),
        metadataUri: metadataUri,
        imageUri: imageUri,
        updateAuthority: authorityKeypair.publicKey.toString(),
        transaction: signature
      };
    } catch (error) {
      console.error('❌ Error creating metadata account:', error.message);
      console.error('   Full error:', error);
      // For devnet, we can continue without metadata if it fails
      console.log('⚠️  Continuing without metadata (devnet only)');
      return {
        metadataAccount: metadataPda.toString(),
        metadataUri: metadataUri,
        imageUri: imageUri,
        updateAuthority: authorityKeypair.publicKey.toString(),
        transaction: 'metadata-creation-failed'
      };
    }
  } catch (error) {
    console.error('❌ Error in createTokenMetadataOnChain:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Creating USDFG Token Mint (DEVNET ONLY)');
  console.log('==========================================\n');
  
  // Safety check: Force devnet
  if (RPC_URL.includes('mainnet')) {
    throw new Error('❌ SAFETY: This script is configured for DEVNET ONLY. Do not run on mainnet.');
  }
  
  console.log(`🌐 Network: ${NETWORK} (forced)`);
  console.log(`⚠️  This is a DEVNET PREVIEW ONLY\n`);
  
  try {
    // Load keypairs
    console.log('📁 Loading keypairs...');
    
    // Load mint keypair (vanity address)
    if (!fs.existsSync(MINT_KEYPAIR_PATH)) {
      throw new Error(`Mint keypair not found: ${MINT_KEYPAIR_PATH}`);
    }
    const mintKeypairData = JSON.parse(fs.readFileSync(MINT_KEYPAIR_PATH, 'utf8'));
    const mintKeypair = Keypair.fromSecretKey(Uint8Array.from(mintKeypairData));
    console.log(`✅ Mint keypair loaded: ${mintKeypair.publicKey.toString()}`);
    
    // Create authority keypair from base58 if it doesn't exist
    if (!fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
      console.log('📝 Creating temporary authority.json...');
      const privateKeyBytes = bs58.decode(HA_PRIVATE_KEY_BASE58);
      const authorityKeypair = Keypair.fromSecretKey(privateKeyBytes);
      
      // Verify public key matches
      if (authorityKeypair.publicKey.toString() !== HA_PUBLIC_KEY) {
        throw new Error(`Public key mismatch! Expected ${HA_PUBLIC_KEY}, got ${authorityKeypair.publicKey.toString()}`);
      }
      
      // Save as JSON array (temporary only)
      fs.writeFileSync(AUTHORITY_KEYPAIR_PATH, JSON.stringify(Array.from(authorityKeypair.secretKey)));
      console.log(`✅ Authority keypair created (temporary): ${authorityKeypair.publicKey.toString()}`);
    }
    
    // Load authority keypair
    const authorityKeypairData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf8'));
    const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(authorityKeypairData));
    
    // Verify authority public key
    if (authorityKeypair.publicKey.toString() !== HA_PUBLIC_KEY) {
      throw new Error(`Authority public key mismatch! Expected ${HA_PUBLIC_KEY}, got ${authorityKeypair.publicKey.toString()}`);
    }
    console.log(`✅ Authority keypair loaded: ${authorityKeypair.publicKey.toString()}`);
    
    // Connect to network
    console.log(`\n🌐 Connecting to ${NETWORK}...`);
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Check balances
    let mintBalance = await connection.getBalance(mintKeypair.publicKey);
    let authorityBalance = await connection.getBalance(authorityKeypair.publicKey);
    
    console.log(`\n💰 Wallet Balances:`);
    console.log(`   Mint wallet (${mintKeypair.publicKey.toString()}): ${mintBalance / 1e9} SOL`);
    console.log(`   Authority wallet (${authorityKeypair.publicKey.toString()}): ${authorityBalance / 1e9} SOL`);
    
    // Check if account exists and close it if it's a system account
    const existingAccount = await connection.getAccountInfo(mintKeypair.publicKey);
    if (existingAccount && existingAccount.owner.equals(SystemProgram.programId)) {
      console.log('\n⚠️  System account exists at mint address. Closing it completely...');
      console.log(`   Current balance: ${mintBalance} lamports`);
      
      // Transfer ALL lamports (including rent-exempt) to authority
      // Authority pays the transaction fee, so we can transfer everything
      const closeTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mintKeypair.publicKey,
          toPubkey: authorityKeypair.publicKey,
          lamports: mintBalance, // Transfer ALL lamports - no subtraction, no buffer
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      closeTx.recentBlockhash = blockhash;
      closeTx.feePayer = authorityKeypair.publicKey; // Authority pays fee, not mint wallet
      closeTx.sign(mintKeypair, authorityKeypair);
      
      const closeSig = await connection.sendRawTransaction(closeTx.serialize());
      await connection.confirmTransaction(closeSig);
      console.log('✅ Account closing transaction sent:', closeSig);
      
      // Wait for account to be fully closed and deleted
      console.log('⏳ Waiting for account to be fully closed...');
      let accountStillExists = true;
      let attempts = 0;
      while (accountStillExists && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const checkAccount = await connection.getAccountInfo(mintKeypair.publicKey);
        accountStillExists = !!checkAccount;
        attempts++;
        if (accountStillExists) {
          console.log(`   Attempt ${attempts}: Account still exists, waiting...`);
        }
      }
      
      if (accountStillExists) {
        throw new Error('Account was not fully closed after 10 attempts. Cannot proceed.');
      }
      
      console.log('✅ Account fully closed and deleted');
      mintBalance = 0;
    }
    
    // Ensure authority has enough SOL for mint creation
    // Mint creation requires ~0.001 SOL for rent
    if (authorityBalance < 0.1 * 1e9) {
      console.log('⚠️  Insufficient SOL in authority wallet. Requesting airdrop...');
      try {
        const airdropSig = await connection.requestAirdrop(authorityKeypair.publicKey, 2 * 1e9);
        await connection.confirmTransaction(airdropSig);
        console.log('✅ Airdrop received');
        authorityBalance = await connection.getBalance(authorityKeypair.publicKey);
      } catch (error) {
        console.log('⚠️  Airdrop failed:', error.message);
        if (authorityBalance < 0.1 * 1e9) {
          throw new Error('Insufficient SOL in authority wallet. Need at least 0.1 SOL.');
        }
      }
    }
    
    // IMPORTANT: Account is now closed (if it existed)
    // We cannot transfer SOL to mint address as that would recreate a system account
    // Instead, we need to manually construct the mint creation transaction
    // where the authority pays for account creation, not the mint keypair
    // This requires using lower-level SPL token instructions
    
    // Confirm before proceeding
    console.log(`\n⚠️  READY TO CREATE TOKEN MINT (DEVNET)`);
    console.log(`   Mint Address: ${mintKeypair.publicKey.toString()}`);
    console.log(`   Mint Authority: ${authorityKeypair.publicKey.toString()}`);
    console.log(`   Freeze Authority: ${authorityKeypair.publicKey.toString()}`);
    console.log(`   Name: ${TOKEN_NAME}`);
    console.log(`   Symbol: ${TOKEN_SYMBOL}`);
    console.log(`   Decimals: ${TOKEN_DECIMALS}`);
    console.log(`   Total Supply: ${TOTAL_SUPPLY.toLocaleString()} ${TOKEN_SYMBOL}`);
    console.log(`   Network: ${NETWORK}`);
    console.log(`\n⏸️  This will create the mint on ${NETWORK}. Press Ctrl+C to cancel.`);
    console.log(`   Waiting 5 seconds...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if mint already exists
    let mint = mintKeypair.publicKey;
    const existingAccountCheck = await connection.getAccountInfo(mintKeypair.publicKey);
    
    if (existingAccountCheck) {
      // Account exists - check if it's already a mint
      if (existingAccountCheck.owner.equals(TOKEN_PROGRAM_ID)) {
        try {
          const existingMint = await getMint(connection, mintKeypair.publicKey);
          console.log('⚠️  Mint already exists at this address');
          console.log(`   Decimals: ${existingMint.decimals}`);
          console.log(`   Supply: ${existingMint.supply.toString()}`);
          console.log(`   Mint Authority: ${existingMint.mintAuthority?.toString() || 'None (revoked)'}`);
          console.log(`   Freeze Authority: ${existingMint.freezeAuthority?.toString() || 'None (revoked)'}`);
        } catch (error) {
          throw new Error('Account exists and is owned by Token Program but is not a valid mint. Cannot proceed.');
        }
      } else {
        // Account exists but is a system account - we need to create mint differently
        // Since createMint requires account to not exist, we'll use a workaround:
        // Create mint with a temporary keypair, then we'd need to transfer, but that's complex
        // Instead, let's try creating the mint account manually
        console.log('⚠️  Account exists as system account. Attempting to create mint...');
        console.log('   Note: This may fail if account cannot be converted to mint account.');
        try {
          mint = await createMint(
            connection,
            mintKeypair, // Payer
            authorityKeypair.publicKey, // Mint authority
            authorityKeypair.publicKey, // Freeze authority
            TOKEN_DECIMALS,
            mintKeypair, // Mint keypair
            undefined,
            undefined
          );
          console.log(`✅ Token mint created: ${mint.toString()}`);
        } catch (error) {
          throw new Error(`Cannot create mint: Account at ${mintKeypair.publicKey.toString()} already exists as a system account. Please use a different vanity address or wait for the account to be closed. Error: ${error.message}`);
        }
      }
    } else {
      // Account doesn't exist - create mint manually with authority as payer
      console.log('🏭 Creating new token mint (authority pays for account creation)...');
      
      // Calculate rent for mint account
      const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
      console.log(`   Rent-exempt balance: ${rentExemptBalance} lamports`);
      
      // Create transaction with:
      // 1. Create account instruction (authority pays)
      // 2. Initialize mint instruction
      const mintTransaction = new Transaction();
      
      // Create account instruction - authority pays, creates account owned by Token Program
      mintTransaction.add(
        SystemProgram.createAccount({
          fromPubkey: authorityKeypair.publicKey, // Authority pays
          newAccountPubkey: mintKeypair.publicKey, // Mint address
          space: MINT_SIZE,
          lamports: rentExemptBalance,
          programId: TOKEN_PROGRAM_ID, // Account owned by Token Program
        })
      );
      
      // Initialize mint instruction
      mintTransaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey, // Mint address
          TOKEN_DECIMALS, // Decimals
          authorityKeypair.publicKey, // Mint authority
          authorityKeypair.publicKey, // Freeze authority
          TOKEN_PROGRAM_ID
        )
      );
      
      // Sign with both keypairs
      const { blockhash } = await connection.getLatestBlockhash();
      mintTransaction.recentBlockhash = blockhash;
      mintTransaction.feePayer = authorityKeypair.publicKey;
      mintTransaction.sign(mintKeypair, authorityKeypair);
      
      // Send transaction
      const mintSig = await connection.sendRawTransaction(mintTransaction.serialize());
      await connection.confirmTransaction(mintSig);
      console.log(`✅ Token mint created: ${mintKeypair.publicKey.toString()}`);
      console.log(`   Transaction: ${mintSig}`);
      
      mint = mintKeypair.publicKey;
    }
    
    // Verify mint address matches
    if (mint.toString() !== mintKeypair.publicKey.toString()) {
      throw new Error(`Mint address mismatch! Expected ${mintKeypair.publicKey.toString()}, got ${mint.toString()}`);
    }
    
    // Create token account for authority
    console.log('\n💼 Creating token account for authority...');
    const authorityTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair, // Payer
      mint, // Mint
      authorityKeypair.publicKey // Owner
    );
    console.log(`✅ Token account created: ${authorityTokenAccount.address.toString()}`);
    
    // Mint total supply to authority
    console.log(`\n💰 Minting ${TOTAL_SUPPLY.toLocaleString()} ${TOKEN_SYMBOL} to authority...`);
    const totalSupplyLamports = TOTAL_SUPPLY * Math.pow(10, TOKEN_DECIMALS);
    const mintTx = await mintTo(
      connection,
      authorityKeypair, // Payer
      mint, // Mint
      authorityTokenAccount.address, // Destination
      authorityKeypair, // Mint authority
      totalSupplyLamports // Amount
    );
    console.log(`✅ Mint transaction: ${mintTx}`);
    
    // Upload image to IPFS and create metadata on-chain
    const imageUri = await uploadImageToIPFS(TOKEN_IMAGE_PATH);
    const metadataResult = await createTokenMetadataOnChain(connection, mint, authorityKeypair, imageUri);
    
    // Check current mint state
    const mintInfo = await getMint(connection, mint);
    console.log('\n📊 Current Mint State:');
    console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toString() || 'None (already revoked)'}`);
    console.log(`   Freeze Authority: ${mintInfo.freezeAuthority?.toString() || 'None (already revoked)'}`);
    
    // Revoke mint authority (make supply fixed) - only if it exists
    if (mintInfo.mintAuthority && mintInfo.mintAuthority.equals(authorityKeypair.publicKey)) {
      console.log('\n🔒 Revoking mint authority (making supply fixed)...');
      try {
        await setAuthority(
          connection,
          authorityKeypair, // Payer
          mint, // Mint
          null, // New authority (null = revoke)
          AuthorityType.MintTokens, // Authority type
          authorityKeypair // Current authority (must be a Keypair, not PublicKey)
        );
        console.log('✅ Mint authority revoked - supply is now fixed');
      } catch (error) {
        console.error('⚠️  Error revoking mint authority:', error.message);
        console.log('   Continuing anyway...');
      }
    } else if (!mintInfo.mintAuthority) {
      console.log('\n✅ Mint authority already revoked');
    } else {
      console.log(`\n⚠️  Mint authority is ${mintInfo.mintAuthority.toString()}, not HA wallet. Skipping revocation.`);
    }
    
    // Revoke freeze authority - only if it exists
    if (mintInfo.freezeAuthority && mintInfo.freezeAuthority.equals(authorityKeypair.publicKey)) {
      console.log('\n🔒 Revoking freeze authority...');
      try {
        await setAuthority(
          connection,
          authorityKeypair, // Payer
          mint, // Mint
          null, // New authority (null = revoke)
          AuthorityType.FreezeAccount, // Authority type
          authorityKeypair // Current authority
        );
        console.log('✅ Freeze authority revoked - token cannot be frozen');
      } catch (error) {
        console.error('⚠️  Error revoking freeze authority:', error.message);
        console.log('   Continuing anyway...');
      }
    } else if (!mintInfo.freezeAuthority) {
      console.log('\n✅ Freeze authority already revoked');
    } else {
      console.log(`\n⚠️  Freeze authority is ${mintInfo.freezeAuthority.toString()}, not HA wallet. Skipping revocation.`);
    }
    
    // Get final mint state for summary
    const finalMintInfo = await getMint(connection, mint);
    
    // Clean up: Delete authority.json
    console.log('\n🧹 Cleaning up temporary files...');
    if (fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
      fs.unlinkSync(AUTHORITY_KEYPAIR_PATH);
      console.log('✅ Deleted temporary authority.json');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ USDFG TOKEN MINT CREATED SUCCESSFULLY (DEVNET)');
    console.log('='.repeat(60));
    console.log(`\n📋 Token Details:`);
    console.log(`   Mint Address: ${mint.toString()}`);
    console.log(`   Total Supply: ${TOTAL_SUPPLY.toLocaleString()} ${TOKEN_SYMBOL}`);
    console.log(`   Decimals: ${TOKEN_DECIMALS}`);
    console.log(`   Mint Authority: ${finalMintInfo.mintAuthority?.toString() || 'REVOKED (fixed supply)'}`);
    console.log(`   Freeze Authority: ${finalMintInfo.freezeAuthority?.toString() || 'REVOKED (cannot freeze)'}`);
    console.log(`   Current Supply: ${finalMintInfo.supply.toString()}`);
    console.log(`\n📝 Metadata Account Details:`);
    console.log(`   Metadata Account: ${metadataResult.metadataAccount}`);
    console.log(`   Metadata URI: ${metadataResult.metadataUri}`);
    console.log(`   Name: ${TOKEN_NAME}`);
    console.log(`   Symbol: ${TOKEN_SYMBOL}`);
    console.log(`   Image URI: ${metadataResult.imageUri}`);
    console.log(`   Metadata Update Authority: ${metadataResult.updateAuthority} (HA...)`);
    console.log(`   Transaction: ${metadataResult.transaction}`);
    console.log(`\n🔗 Explorer Links:`);
    console.log(`   Mint Address: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    console.log(`   Metadata Account: https://explorer.solana.com/address/${metadataResult.metadataAccount}?cluster=devnet`);
    console.log(`   Metadata JSON: ${metadataResult.metadataUri}`);
    console.log(`   Image (verify rendering): ${metadataResult.imageUri}`);
    console.log(`\n⚠️  Note: This is DEVNET ONLY. Do not proceed to mainnet until reviewed.`);
    console.log('\n');
    
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
      fs.unlinkSync(AUTHORITY_KEYPAIR_PATH);
    }
    throw error;
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
