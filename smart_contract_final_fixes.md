# Final Smart Contract Fixes

Your smart contract is almost perfect! You've already removed the oracle check from `create_challenge`. Now we need to make a few more small changes:

## 1. Remove Oracle Accounts from CreateChallenge

Find this in your `CreateChallenge` struct:
```rust
#[derive(Accounts)]
#[instruction(entry_fee: u64)]
pub struct CreateChallenge<'info> {
    // ... other accounts ...
    #[account(seeds = [PRICE_ORACLE_SEED], bump)]
    pub price_oracle: Account<'info, PriceOracle>,
    pub admin_state: Account<'info, AdminState>,
    // ... other accounts ...
}
```

**Remove these two lines:**
```rust
#[account(seeds = [PRICE_ORACLE_SEED], bump)]
pub price_oracle: Account<'info, PriceOracle>,
```

## 2. Remove StaleOraclePrice Error

Find this in your `ChallengeError` enum:
```rust
#[msg("Oracle price is too old")]
StaleOraclePrice,
```

**Remove this line entirely.**

## 3. Update Frontend to Remove Oracle Accounts

In your frontend `contract.ts`, the `createChallenge` function should NOT include oracle accounts in the instruction keys.

## 4. Test the Changes

After making these changes:
1. `anchor build`
2. `anchor deploy --provider.cluster devnet`
3. Update frontend with new Program ID
4. Test challenge creation

## What This Achieves

✅ **No more oracle dependency for challenge creation**
✅ **Any player can create challenges without admin intervention**
✅ **No more `StaleOraclePrice` errors**
✅ **All security checks remain intact**
✅ **Escrow and payout logic unchanged**

The oracle can still exist and be updated by admins, but it's no longer required for challenge creation!
