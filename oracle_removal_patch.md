# Oracle Removal Patch for Smart Contract

## Problem
The current smart contract has an oracle freshness check that requires the oracle to be updated every 5 minutes, causing `StaleOraclePrice` errors.

## Solution
Remove the oracle dependency entirely from the smart contract.

## Changes Needed

### 1. In `lib.rs` - Remove oracle check from `create_challenge`:

Find this code in the `create_challenge` function:
```rust
// Security: Verify oracle is fresh (within 5 minutes)
let now = Clock::get()?.unix_timestamp;
require!(
    now - price_oracle.last_updated <= 300, // 5 minutes
    ChallengeError::StaleOraclePrice
);
```

**Replace with:**
```rust
// Oracle check removed - not needed for USDFG native token
let now = Clock::get()?.unix_timestamp;
```

### 2. Remove oracle accounts from `CreateChallenge` struct:

Find this in the `CreateChallenge` struct:
```rust
pub price_oracle: Account<'info, PriceOracle>,
pub admin_state: Account<'info, AdminState>,
```

**Remove these two lines entirely.**

### 3. Remove oracle accounts from instruction keys:

In the `create_challenge` function, find:
```rust
ctx.accounts.price_oracle.to_account_info(),
ctx.accounts.admin_state.to_account_info(),
```

**Remove these two lines from the instruction keys.**

### 4. Remove oracle-related error codes:

Find and remove:
```rust
#[msg("Oracle price is too old")]
StaleOraclePrice,
```

### 5. Remove oracle-related events:

Find and remove:
```rust
#[event]
pub struct PriceUpdated {
    pub price: u64,
    pub timestamp: i64,
}
```

## After Making Changes

1. Run `anchor build` to compile
2. Run `anchor deploy` to deploy the new contract
3. Update the frontend to use the new Program ID
4. Remove oracle refresh logic from frontend

## Benefits

- No more oracle dependency
- No more `StaleOraclePrice` errors
- Simpler, more decentralized system
- USDFG works natively without price conversion
