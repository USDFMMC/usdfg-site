# Solana Playground Quick Reference

## ⚠️ DEVNET TESTING ONLY
This deployment is for devnet testing. Mainnet deployment will be handled separately.

## Contract Info
- **Program ID**: `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`
- **Network**: Devnet (testing only)
- **Contract File**: `CONTRACT_FOR_PLAYGROUND.rs` (891 lines)

## Quick Steps
1. Go to https://beta.solpg.io/
2. Connect wallet (`pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`)
3. Create new program
4. Copy entire `CONTRACT_FOR_PLAYGROUND.rs` → paste into `src/lib.rs`
5. Set Cargo.toml dependencies (see below)
6. Click **Build**
7. Click **Deploy**
8. Download IDL → save to `client/public/idl/usdfg_smart_contract.json`

## Cargo.toml for Playground
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

## After Deployment
- ✅ Program ID should be: `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM`
- ✅ Download IDL file
- ✅ Copy IDL to `client/public/idl/usdfg_smart_contract.json`
- ✅ Frontend already configured - no changes needed!

## Need Help?
See `PLAYGROUND_DEPLOYMENT_GUIDE.md` for detailed instructions.

