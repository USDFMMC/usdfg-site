# 🚨 URGENT: Redeploy Smart Contract with Timer Fix

## Problem Found!

The smart contract had **15-minute expiry timers** that were:
1. Preventing challenges from being joined after 15 minutes
2. **Preventing winners from claiming prizes after 15 minutes** ❌

This is why the "Claim Prize" functionality wasn't working!

## What Was Fixed

### 1. Removed Timer from `resolve_challenge`
- Winners can now claim prizes **anytime** (no expiry)
- Timer only applies to joining, not claiming

### 2. Increased Join Timer
- Changed from 15 minutes → **2 hours**
- Gives more time for players to join challenges

## How to Redeploy

### Step 1: Open Solana Playground
1. Go to https://beta.solpg.io
2. Make sure you're logged in

### Step 2: Copy Updated Code
1. Open `COPY_THIS_TO_PLAYGROUND.rs` in this repository
2. Copy **ALL** the code
3. In Playground, delete all code in `lib.rs`
4. Paste the new code

### Step 3: Build
1. Click **"Build"** button
2. Wait for success

### Step 4: Deploy
1. Click **"Deploy"** button
2. Approve the transaction
3. **COPY THE NEW PROGRAM ID**

### Step 5: Update Frontend
Send me the new program ID and I'll update:
- `client/src/lib/chain/config.ts`
- `client/src/lib/chain/usdfg_smart_contract.json`

## Why This Is Important

Without this fix:
- ❌ Challenges expire too quickly (15 min)
- ❌ Winners can't claim prizes after 15 min
- ❌ "Claim Prize" button doesn't work

With this fix:
- ✅ Challenges last 2 hours before expiring
- ✅ Winners can claim prizes anytime (no expiry)
- ✅ Full challenge flow works end-to-end

---

**Ready to redeploy? Let me know when you have the new program ID!** 🚀


