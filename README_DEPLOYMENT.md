# Quick Start: Deploy New Smart Contract

## Problem
The frontend needs to point to the correct deployed smart contract. Use `COPY_THIS_TO_PLAYGROUND.rs` as the source for deployment.

## Solution
Deploy the new smart contract and update your frontend. Everything is ready to go!

## What's Already Done ✅

1. ✅ Anchor project structure created
2. ✅ New program keypair generated: `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY`
3. ✅ Smart contract updated with new program ID
4. ✅ Frontend config updated to use new program ID
5. ✅ Contract integration code updated (no more oracle calls!)

## Quick Deploy

### Option 1: Use the Deployment Script (Recommended)

```bash
./deploy-contract.sh
```

This script will:
- Check if you have all required tools
- Configure Solana for devnet
- Check your wallet balance and offer airdrop
- Build the smart contract
- Deploy to devnet
- Give you next steps

### Option 2: Manual Deployment

```bash
# 1. Set Solana to devnet
solana config set --url devnet

# 2. Check your balance (need ~2 SOL)
solana balance

# 3. Airdrop if needed
solana airdrop 2

# 4. Build
anchor build

# 5. Deploy
anchor deploy
```

## After Deployment

### 1. Copy the IDL to Frontend

```bash
cp target/idl/usdfg_smart_contract.json client/src/lib/chain/
```

### 2. Rebuild Frontend

```bash
cd client
npm run build
# or
npm run dev  # for testing
```

### 3. Deploy to Production

Upload the `dist/` folder to your hosting platform (Netlify, Vercel, etc.)

## Key Differences: New vs Old Contract

| Feature | Old Contract | New Contract |
|---------|-------------|--------------|
| Program ID | `2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT` | `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY` |
| Oracle Required | ✅ Yes (causing errors) | ❌ No (removed) |
| Challenge Creation | Requires oracle refresh | Works directly |
| Account Structure | 12 accounts | 10 accounts (cleaner) |
| Error Messages | Generic | Descriptive |

## Verification

After deploying, verify your contract:

```bash
solana program show 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY
```

You should see:
- Program ID: `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY`
- Owner: `BPFLoaderUpgradeab1e11111111111111111111111`
- ProgramData Address: (generated address)

## Troubleshooting

### "cargo build-sbf not found"

Install Solana platform tools:
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### "Insufficient funds"

Airdrop more SOL:
```bash
solana airdrop 2
```

### "Anchor version mismatch"

The warnings about Anchor versions are normal and won't affect deployment.

### Build fails with Rust errors

Update Rust:
```bash
rustup update
cargo clean
anchor build
```

## Testing

Once deployed, test challenge creation:

1. Go to your site: https://usdfg.pro
2. Connect wallet
3. Try creating a challenge
4. Monitor console - you should see:
   - ✅ No oracle errors
   - ✅ Instruction created successfully
   - ✅ Transaction confirmed

## Rollback (if needed)

If something goes wrong, you can temporarily revert to the old contract:

1. Edit `client/src/lib/chain/config.ts`:
```typescript
export const PROGRAM_ID = new PublicKey('2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT');
```

2. Rebuild and redeploy frontend

## Need Help?

Check the detailed guide: `DEPLOY_SMART_CONTRACT.md`

## Summary

**Current Status:**
- ✅ Smart contract code ready
- ✅ Frontend code updated
- ⏳ **Waiting for deployment**

**Run this now:**
```bash
./deploy-contract.sh
```

That's it! Your new contract will be live and working without the oracle errors. 🚀

