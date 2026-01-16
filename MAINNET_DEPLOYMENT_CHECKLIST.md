# USDFG Token Mainnet Deployment Checklist

## ⚠️ Pre-Deployment Verification

### 1. Vanity Keypair Verification
- [x] Vanity keypair exists: `wallets/UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT.json`
- [x] Mint address matches: `UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT`
- [x] Keypair file is secure and backed up

### 2. Authority Wallet Verification
- [x] HA wallet public key: `HATbEKpksdhRE7RPGgAnk7fM9sXK2LwxGQHwGbtCpvFp`
- [x] HA wallet has sufficient SOL (need at least 0.1 SOL for deployment)
- [x] HA wallet private key is secure (never commit to git)

### 3. Token Configuration
- [x] Name: `USDFGAMING`
- [x] Symbol: `USDFG`
- [x] Decimals: `9`
- [x] Total Supply: `21,000,000` (fixed, never increases)
- [x] Mint Authority: HA wallet (will be revoked after mint)
- [x] Freeze Authority: HA wallet (will be revoked after mint)

### 4. Metadata Verification
- [x] Metadata JSON accessible: `https://usdfg.pro/api/token-metadata.json`
- [x] Image accessible: `https://usdfg.pro/assets/usdfg-token.png`
- [x] CORS headers configured correctly
- [x] Metadata displays correctly on devnet

### 5. Devnet Testing
- [x] Token created successfully on devnet
- [x] Metadata displays correctly in Phantom wallet
- [x] Metadata displays correctly on Solana Explorer
- [x] Total supply is correct (21,000,000)
- [x] Mint authority revoked (supply fixed)
- [x] Freeze authority revoked (cannot freeze)

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Checks
```bash
# Verify HA wallet has SOL
solana balance HATbEKpksdhRE7RPGgAnk7fM9sXK2LwxGQHwGbtCpvFp --url mainnet-beta

# Verify vanity keypair exists
ls -la wallets/UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT.json

# Verify metadata URLs are accessible
curl https://usdfg.pro/api/token-metadata.json
curl -I https://usdfg.pro/assets/usdfg-token.png
```

### Step 2: Run Mainnet Deployment Script
```bash
# Make script executable
chmod +x create-usdfg-mint-mainnet.js

# Run deployment (will prompt for confirmations)
node create-usdfg-mint-mainnet.js
```

**The script will:**
1. Prompt for double confirmation
2. Check HA wallet balance
3. Close any existing system account at mint address
4. Create the token mint
5. Mint 21,000,000 tokens to HA wallet
6. Create on-chain metadata
7. Revoke mint authority (lock supply)
8. Revoke freeze authority
9. Clean up temporary files

### Step 3: Post-Deployment Verification

#### Verify Token on Explorer
- [ ] Open: `https://explorer.solana.com/address/UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT`
- [ ] Verify total supply: 21,000,000
- [ ] Verify mint authority: REVOKED
- [ ] Verify freeze authority: REVOKED
- [ ] Verify metadata displays correctly

#### Verify Token in Phantom Wallet
- [ ] Add token to Phantom using mint address
- [ ] Verify image displays correctly
- [ ] Verify name and symbol are correct
- [ ] Verify balance (if you have tokens)

#### Verify Metadata
- [ ] Check metadata account on explorer
- [ ] Verify metadata URI is correct
- [ ] Verify image URI is correct
- [ ] Test metadata JSON endpoint

### Step 4: Update Application Configuration

**Update `client/src/lib/chain/config.ts`:**
```typescript
// Change from:
export const USDFG_MINT = new PublicKey('7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX');

// To:
export const USDFG_MINT = new PublicKey('UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT');
```

**Also update the comment:**
```typescript
/**
 * USDFG Smart Contract Configuration (Mainnet)
 * 
 * This file contains all the addresses and configuration needed to interact
 * with the USDFG smart contract on Solana mainnet.
 */
```

### Step 5: Test Application Integration
- [ ] Test token transfers in your app
- [ ] Test challenge creation with new mint
- [ ] Test all smart contract interactions
- [ ] Verify token displays correctly in UI

### Step 6: Smart Contract Deployment (if needed)
- [ ] Deploy smart contract to mainnet (if not already done)
- [ ] Update `PROGRAM_ID` in config.ts if needed
- [ ] Test all contract functions with mainnet token

## 🔒 Security Checklist

- [x] `authority.json` is in `.gitignore`
- [x] Private keys are never logged or printed
- [x] Temporary files are deleted after execution
- [x] Mint authority will be revoked (supply locked)
- [x] Freeze authority will be revoked (cannot freeze)
- [x] Metadata update authority remains with HA wallet (for future updates)

## 📝 Important Notes

1. **Mint Address**: `UFGaQZsTKsoT6B24nKASB4jrJCxEEdo9HKfhajszrfT` - This is PERMANENT and cannot be changed.

2. **Total Supply**: 21,000,000 tokens - This is FIXED and cannot be increased after mint authority is revoked.

3. **Mint Authority**: Will be revoked immediately after minting, making the supply permanently fixed.

4. **Freeze Authority**: Will be revoked immediately after minting, ensuring tokens cannot be frozen.

5. **Metadata Update Authority**: Remains with HA wallet, allowing future metadata updates if needed.

6. **Cost**: Deployment will cost approximately 0.001-0.002 SOL in transaction fees.

## 🆘 Rollback Plan

If something goes wrong:
1. The mint address cannot be changed (it's the vanity address)
2. If mint authority is already revoked, supply cannot be changed
3. If deployment fails partway through, you can re-run the script (it will detect existing mint)
4. Metadata can always be updated later using the HA wallet

## ✅ Final Verification

Before considering deployment complete:
- [ ] Token exists on mainnet
- [ ] Total supply is exactly 21,000,000
- [ ] Mint authority is REVOKED
- [ ] Freeze authority is REVOKED
- [ ] Metadata displays correctly
- [ ] Application config is updated
- [ ] All tests pass with new mint address

---

**Ready to deploy?** Run: `node create-usdfg-mint-mainnet.js`
