# 🚀 Deploy to Solana Playground - Security Fix

## Step-by-Step Guide

### 1. Open Solana Playground
Go to: **https://beta.solpg.io/**

### 2. Copy the Updated Smart Contract

Open the file: `programs/usdfg_smart_contract/src/lib.rs`

Then **replace the ENTIRE file** in Solana Playground with the updated version.

### 3. Build the Contract

In Solana Playground:
1. Click **"Build"** button (hammer icon) 
2. Wait for it to compile
3. Should see: ✅ "Build successful"

### 4. Deploy the Contract

1. Click **"Deploy"** button
2. Make sure you're on **Devnet**
3. Confirm the transaction in your wallet
4. Copy the **Program ID** that appears

### 5. Update the Program ID

**IMPORTANT:** The Program ID should already be:
```
9NBcMx3x8EotQi63fukhXpYbcBRgyWj6PcEFyEaL9oqo
```

If it's different, you'll need to update it in 3 places:
- Line 4 of `lib.rs`: `declare_id!("YOUR_NEW_ID");`
- `Anchor.toml`
- `client/src/lib/chain/config.ts`

### 6. Test It!

After deployment:
1. Refresh your app
2. Try to claim one of the prizes
3. Should work! 🎉

---

## 🔧 What Changed in the Code

### Key Changes:

1. **Line 227** (ResolveChallenge transfer):
   ```rust
   authority: ctx.accounts.escrow_token_account.to_account_info(),
   // Changed from: ctx.accounts.escrow_wallet.to_account_info()
   ```

2. **Line 435** (CreateChallenge):
   ```rust
   token::authority = escrow_token_account
   // Changed from: token::authority = escrow_wallet
   ```

3. **Line 463** (AcceptChallenge):
   ```rust
   token::authority = escrow_token_account
   // Changed from: token::authority = escrow_wallet
   ```

4. **Line 486** (ResolveChallenge):
   ```rust
   token::authority = escrow_token_account
   // Changed from: token::authority = escrow_wallet
   ```

---

## ✅ Expected Result

**Before (Error):**
```
❌ Cross-program invocation with unauthorized signer
```

**After (Success):**
```
✅ Prize claimed!
✅ 95 USDFG transferred to winner
```

---

## 🎯 Quick Deploy Checklist

- [ ] Open Solana Playground
- [ ] Paste updated `lib.rs` code
- [ ] Click Build
- [ ] Click Deploy
- [ ] Verify Program ID matches: `9NBcMx3x8EotQi63fukhXpYbcBRgyWj6PcEFyEaL9oqo`
- [ ] Test claim prize on your app
- [ ] Celebrate! 🎉

---

## 💡 Tips

- Make sure you have some SOL in your Phantom wallet for deployment fees (~0.1 SOL)
- Deploy to **Devnet** (not mainnet yet)
- After deployment, wait ~30 seconds for the network to propagate
- If Program ID changed, update it everywhere before testing

---

Ready to deploy? Open https://beta.solpg.io/ and let's do this! 🚀

