# CRITICAL: Rebuild and Redeploy Required

## Problem
The deployed Anchor program on-chain does NOT match the local Rust code. The `CreatorFund` struct has been updated (rent removed, account order changed), but the contract has not been redeployed.

## Current Situation

**Local Rust Struct (correct):**
```rust
#[derive(Accounts)]
pub struct CreatorFund<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = creator,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub mint: Account<'info, Mint>,
}
```

**Account Order:**
1. challenge
2. creator
3. creator_token_account
4. escrow_token_account
5. token_program
6. system_program
7. mint

**Deployed Contract:** Still has the OLD struct (with rent and possibly different order)

## Required Steps

### Step 1: Build the Program
```bash
cd /Users/usdfg/usdfg-site
anchor clean
anchor build
```

### Step 2: Deploy to Devnet
```bash
anchor deploy
```

### Step 3: Copy New IDL to Frontend
After deployment, copy the new IDL:
```bash
cp target/idl/usdfg_smart_contract.json client/src/lib/chain/usdfg_smart_contract.json
cp target/idl/usdfg_smart_contract.json client/public/idl/usdfg_smart_contract.json
```

### Step 4: Verify IDL
Open `client/src/lib/chain/usdfg_smart_contract.json` and verify:
- ✅ `creatorFund` instruction exists
- ✅ Account order matches Rust struct exactly
- ✅ No `rent` account

### Step 5: Frontend Already Matches
The frontend code in `client/src/lib/chain/contract.ts` already matches the Rust struct order. After redeploy, it should work immediately.

## If Anchor CLI Not Found

Install Anchor:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
```

Then add to PATH:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

## Verification After Deployment

1. Check the new IDL includes `creatorFund` instruction
2. Verify account order in IDL matches Rust struct
3. Try funding a challenge - should work immediately

