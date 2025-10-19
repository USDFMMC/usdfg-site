# 🚀 Deploy Smart Contract with 5% Platform Fee Collection

## ✅ What Was Added

### Platform Fee Collection (5%):
- Winner receives **95%** of prize pool
- Platform receives **5%** of prize pool
- Platform fees are automatically collected during prize claim

### Changes Made:
1. ✅ Added `platform_wallet` to `AdminState`
2. ✅ Updated `initialize` function to accept `platform_wallet` parameter
3. ✅ Updated `resolve_challenge` to calculate and transfer fees:
   - Calculates 5% platform fee (`total_prize / 20`)
   - Transfers 95% to winner
   - Transfers 5% to platform wallet
4. ✅ Added `platform_token_account` to `ResolveChallenge` struct
5. ✅ Added `PlatformFeeCollected` event for tracking

---

## 📋 Deployment Steps

### 1. Go to Solana Playground
Visit: https://beta.solpg.io/

### 2. Copy the Updated Smart Contract
The full smart contract code is in: `programs/usdfg_smart_contract/src/lib.rs`

### 3. Build the Contract
1. Click "Build" in Solana Playground
2. Wait for compilation to complete

### 4. Deploy the Contract
1. Make sure you have enough SOL in your Playground wallet (~2 SOL for deployment)
2. Click "Deploy"
3. Copy the new **Program ID**

### 5. Important: Initialize with Platform Wallet
When you first deploy, you MUST call `initialize` with:
- `admin`: Your admin wallet address
- `platform_wallet`: The wallet address that will receive 5% fees

---

## 💰 How It Works Now

### Example: 50 USDFG Entry Fee

**Before (Old Contract):**
- Entry fee: 50 USDFG × 2 = 100 USDFG total
- Winner receives: 100 USDFG (100%)
- Platform receives: 0 USDFG ❌

**After (New Contract):**
- Entry fee: 50 USDFG × 2 = 100 USDFG total
- Winner receives: 95 USDFG (95%) ✅
- Platform receives: 5 USDFG (5%) ✅

---

## 🔧 Frontend Update Needed

After deploying, update these files with the new Program ID:

1. `Anchor.toml` (line 9)
2. `client/src/lib/chain/config.ts` (line 14)
3. `programs/usdfg_smart_contract/src/lib.rs` (line 4)

---

## ⚠️ Breaking Changes

### Old Challenges
Challenges created with the old contract **cannot** use the new contract. They don't have platform fee deducted.

### New Challenges
All new challenges will automatically:
- Deduct 5% platform fee on payout
- Send fee to the `platform_wallet` set during initialization

---

## 🧪 Testing

After deployment:

1. **Create a test challenge** (1-10 USDFG)
2. **Accept and complete it**
3. **Winner claims prize**
4. **Check balances:**
   - Winner should receive 95% (e.g., 1.9 USDFG for 1 USDFG entry)
   - Platform wallet should receive 5% (e.g., 0.1 USDFG)

---

## 📊 Monitoring Platform Fees

The `PlatformFeeCollected` event is emitted every time a fee is collected:
```rust
emit!(PlatformFeeCollected {
    challenge: challenge.key(),
    amount: platform_fee,
    timestamp: challenge.last_updated,
});
```

You can track total platform revenue by listening to these events on-chain.

---

## 🎉 Ready to Deploy!

Once you deploy and get the new Program ID, let me know and I'll update all the frontend files automatically.

