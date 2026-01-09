# USDFG Smart Contract Redeployment Instructions

## Critical Issue
The deployed contract on-chain has a different account structure than the local Rust code. The frontend has been reverted to match the local Rust code exactly. **The contract MUST be redeployed** for the frontend to work.

## Current State
- **Local Rust Code**: `token_program` before `system_program`, NO `rent` in struct
- **Deployed Contract**: Different account order (likely `system_program` before `token_program`, includes `rent`)
- **Frontend**: Now matches local Rust code exactly

## Redeployment Steps

### 1. Verify Program ID
```bash
# Check current program ID in config
grep "PROGRAM_ID" client/src/lib/chain/config.ts

# Current: FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP
```

### 2. Clean Build
```bash
cd /Users/usdfg/usdfg-site
anchor clean
rm -rf target
rm -rf .anchor
```

### 3. Rebuild
```bash
anchor build
```

**Verify the build succeeds and check the program ID:**
```bash
anchor keys list
```

The program ID should be: `FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP`

### 4. Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

**CRITICAL**: Watch the output carefully. You must see:
- A deployment transaction signature
- Confirmation that the program was deployed/upgraded
- The program ID matches: `FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP`

If you see "already deployed" without a new transaction, the deployment didn't happen.

### 5. Verify Deployment
```bash
solana program show FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP --url devnet
```

Check:
- Program exists
- Authority is correct
- Last modified timestamp is recent (just now)

### 6. Update Frontend (if program ID changed)
If the deployment created a NEW program ID (unlikely, but possible):
1. Update `client/src/lib/chain/config.ts` with the new program ID
2. Update `programs/usdfg_smart_contract/src/lib.rs` `declare_id!()` with the new program ID
3. Update `Anchor.toml` `[programs.devnet]` section

### 7. Test
After redeployment:
1. Hard refresh the frontend (Ctrl+Shift+R or Cmd+Shift+R)
2. Try creating a challenge
3. Try creator funding
4. Verify no more account order errors

## Account Order Reference

### CreatorFund (matches local Rust struct):
1. challenge
2. creator
3. creator_token_account
4. escrow_token_account
5. token_program
6. system_program
7. mint

**NO rent sysvar** - Anchor handles it internally for `init_if_needed`

## Troubleshooting

### If deployment fails:
- Check wallet has SOL: `solana balance --url devnet`
- Check wallet is set: `solana config get`
- Verify network: Should be devnet

### If errors persist after redeployment:
- Clear browser cache completely
- Hard refresh (Ctrl+Shift+R)
- Check browser console for the actual program ID being used
- Verify the deployed program ID matches frontend config

## Notes
- The frontend is now in "canonical" mode matching local Rust code
- After redeployment, all account order errors should disappear
- No more frontend shims or workarounds needed

