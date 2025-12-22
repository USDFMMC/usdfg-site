# Deploy Smart Contract via Solana Playground

## ⚠️ IMPORTANT: Devnet Testing Only

**This deployment is for DEVNET testing only.** Mainnet deployment will be handled separately once the project is ready for production.

## Quick Steps

Your contract is ready to deploy! The code in `CONTRACT_FOR_PLAYGROUND.rs` is already configured with the correct program ID: `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`

## Step-by-Step Instructions

### 1. Open Solana Playground
- Go to: https://beta.solpg.io/
- Connect your wallet (the one with address `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`)

### 2. Create a New Program
- Click "New" or "Create" to start a new project
- Name it something like "usdfg_smart_contract"

### 3. Copy Your Contract Code
- Open `CONTRACT_FOR_PLAYGROUND.rs` from your project
- Copy the ENTIRE file contents (all 891 lines)
- In Playground, you'll see a file like `src/lib.rs` - replace its contents with your code

### 4. Configure Dependencies
In Playground, you need to set up the `Cargo.toml` file. It should look like this:

```toml
[package]
name = "usdfg_smart_contract"
version = "0.1.0"
description = "USDFG Challenge Smart Contract"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "usdfg_smart_contract"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
```

### 5. Build the Program
- Click the "Build" button in Playground
- Wait for the build to complete (may take 1-2 minutes)
- Check for any errors and fix them if needed

### 6. Deploy to Devnet
- Once build succeeds, click "Deploy" button
- Confirm the transaction in your wallet
- Wait for deployment to complete

### 7. Verify Deployment
After deployment, you should see:
- Program ID: `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`
- Status: Deployed
- Explorer link to view on Solana Explorer

### 8. Download the IDL
- After successful deployment, download the IDL file
- Save it as `usdfg_smart_contract.json`
- Copy it to: `client/public/idl/usdfg_smart_contract.json`

### 9. Update Frontend (if needed)
Your frontend is already configured to use `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`, so no changes needed!

## Important Notes

✅ **Program ID**: The contract declares `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM` - this should match your Playground wallet address

✅ **Network**: Make sure you're deploying to **Devnet** (not Mainnet) - This is for testing only!

✅ **Wallet Balance**: You need at least 2-3 SOL in your wallet for deployment fees

## Troubleshooting

### Build Errors
- Make sure all dependencies are correct in `Cargo.toml`
- Check that Anchor version matches (0.30.1)
- Verify all imports are correct

### Deployment Errors
- Check wallet has enough SOL (request airdrop if needed)
- Ensure you're on Devnet
- Verify program ID matches your wallet address

### IDL Issues
- Make sure to download the IDL after deployment
- Update the IDL file in `client/public/idl/` directory
- Rebuild frontend after updating IDL

## What Changed in This Contract

✅ No payment required during challenge creation
✅ Intent-first flow: `PendingWaitingForOpponent` → `CreatorConfirmationRequired` → `CreatorFunded` → `Active`
✅ Players only pay after both confirm intent
✅ Better timeout handling
✅ Improved dispute resolution

## Verification Checklist

After deployment:
- [ ] Program deployed successfully
- [ ] Program ID matches: `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`
- [ ] IDL downloaded and copied to frontend
- [ ] Frontend rebuilds without errors
- [ ] Test challenge creation works

## Next Steps

1. Test creating a challenge (should work without payment)
2. Test the full flow: create → join → fund → play → resolve
3. Monitor for any errors in the console
4. Once testing is complete, we'll handle mainnet deployment separately

## Mainnet Deployment (Future)

When ready for mainnet:
- Generate new program keypair for mainnet
- Update program ID in contract
- Deploy to mainnet with proper security review
- Update frontend config for mainnet
- This will be a separate process from devnet testing

