# 🔧 Smart Contract Improvements Before Deployment

## Current Hardcoded Values That Should Be Configurable:

### 1. **Platform Fee Percentage** ⚠️ CRITICAL
**Current:** Hardcoded to 5% (`total_prize / 20`)
**Problem:** Can't change fee without redeploying
**Solution:** Store `platform_fee_bps` in AdminState (basis points, e.g., 500 = 5%)

### 2. **Platform Wallet Update Function** ⚠️ IMPORTANT
**Current:** Set once during initialize, can't change
**Problem:** If platform wallet is compromised or needs to change, we're stuck
**Solution:** Add `update_platform_wallet()` function

### 3. **Min/Max Entry Fees** 🔧 NICE TO HAVE
**Current:** Hardcoded (1 USDFG min, 1000 USDFG max)
**Problem:** Can't adjust limits as platform grows
**Solution:** Store in AdminState, add update function

### 4. **Dispute Timer Duration** 🔧 NICE TO HAVE
**Current:** Hardcoded to 900 seconds (15 minutes)
**Problem:** Can't adjust based on game types
**Solution:** Make configurable per challenge or globally

### 5. **Emergency Pause** 🛑 CRITICAL FOR SECURITY
**Current:** No pause mechanism
**Problem:** Can't stop challenge creation if exploit found
**Solution:** Add `is_paused` flag and check in create_challenge/accept_challenge

### 6. **Emergency Withdraw** 🛑 IMPORTANT
**Current:** No way to rescue stuck funds
**Problem:** If bug occurs, funds are permanently stuck
**Solution:** Add admin function to withdraw from specific escrow (with time-lock for safety)

---

## Recommended Additions (Priority Order):

### 🔴 MUST HAVE (Add Now):
1. **Configurable Platform Fee** - Essential for business flexibility
2. **Update Platform Wallet Function** - Essential for security
3. **Emergency Pause** - Essential for security

### 🟡 SHOULD HAVE (Add Now):
4. **Update Platform Fee Function** - Important for business
5. **Emergency Withdraw** - Important for edge cases

### 🟢 NICE TO HAVE (Can Add Later):
6. **Configurable Min/Max Entry Fees**
7. **Configurable Dispute Timer**

---

## Code Changes Needed:

### AdminState Update:
```rust
pub struct AdminState {
    pub admin: Pubkey,
    pub platform_wallet: Pubkey,
    pub platform_fee_bps: u16,  // NEW: 500 = 5%, 1000 = 10%
    pub is_paused: bool,         // NEW: Emergency pause
    pub is_active: bool,
    pub created_at: i64,
    pub last_updated: i64,
}
```

### New Functions:
```rust
pub fn update_platform_wallet(ctx, new_wallet: Pubkey) -> Result<()>
pub fn update_platform_fee(ctx, new_fee_bps: u16) -> Result<()>  // Max 1000 = 10%
pub fn pause_contract(ctx) -> Result<()>
pub fn unpause_contract(ctx) -> Result<()>
```

### Modified resolve_challenge:
```rust
// Instead of: let platform_fee = total_prize / 20;
let platform_fee = (total_prize * ctx.accounts.admin_state.platform_fee_bps as u64) / 10000;
```

---

## What Do You Want to Add?

**Option 1:** Add all MUST HAVE features (Platform fee config + Pause + Update wallet)
**Option 2:** Add MUST HAVE + SHOULD HAVE features (Full control)
**Option 3:** Deploy as-is and add features later if needed

**Recommendation:** Option 1 - Add the 3 MUST HAVE features. Takes 10 more minutes but saves you from redeploying if you need to:
- Change platform fee (e.g., promotional 2% fee, or increase to 7%)
- Update platform wallet address
- Pause the contract in case of exploit

What do you think?

