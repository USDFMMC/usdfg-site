# 🚨 URGENT: Redeploy Contract to Fix Prize Claim Expiration Issue

## Critical Issue

**Players cannot claim prizes after 15 minutes**, even though the challenge is completed. This is causing funds to be locked in escrow.

## Root Cause

The smart contract's `resolve_challenge` function checks `dispute_timer` which expires 15 minutes after challenge creation. This prevents winners from claiming prizes after completion, even though they should be able to claim **ANYTIME**.

## Solution

### 1. ✅ Fixed: Removed Expiration Check from Prize Claims
- **Before**: Prize claims blocked after 15 minutes
- **After**: Winners can claim prizes **ANYTIME** after challenge completion (no expiration)

### 2. ✅ Fixed: Increased Dispute Timer
- **Before**: 15 minutes (900 seconds)
- **After**: 2 hours (7200 seconds) - matches UI expiration

## What Was Changed

### Smart Contract (`programs/usdfg_smart_contract/src/lib.rs`)

1. **Increased `dispute_timer`** from 15 minutes → 2 hours:
```rust
let dispute_timer = now + 7200; // 2 hours (matches UI expiration)
```

2. **Removed expiration check** from `resolve_challenge`:
```rust
// ✅ REMOVED: Expiration check for prize claims
// Once both players have submitted results and challenge is completed,
// winners should be able to claim prizes ANYTIME (no time limit).
// The dispute_timer only applies to preventing NEW disputes, not claiming prizes.
```

### Frontend Changes

1. **Removed pre-check** in `handleClaimPrize` (index.tsx)
2. **Removed validation** in `claimChallengePrize` (firestore.ts)
3. **Updated error messages** to mention old contract version if expiration error occurs

## Original Purpose of Expiration Check

**Yes, it was for security**, but it was incorrectly applied:

### ✅ CORRECT Security Use (Still Active):
1. **Prevent joining expired challenges** (`accept_challenge`)
   - Stops players from joining old/stale challenges
   - Protects against accepting challenges created long ago
   - **This check REMAINS** (line 88-92 in contract)

### ❌ INCORRECT Use (Now Fixed):
2. **Block prize claims after completion** (`resolve_challenge`) 
   - Was trying to prevent delayed disputes/resolutions
   - **THE PROBLEM**: Once both players submit results and challenge is completed, 
     winners should be able to claim **ANYTIME** - no security risk
   - This was blocking legitimate prize claims
   - **This check REMOVED** (was line 182-186)

## How to Redeploy

### Step 1: Open Solana Playground

1. Go to https://beta.solpg.io
2. Make sure you're logged in
3. **If it asks for a project name**, you can use any name like:
   - `USDFG Arena Contract`
   - `usdfg-smart-contract`
   - `usdfg-arena` (or any name you prefer)
   - **Note**: The project name doesn't affect deployment - it's just for your workspace

### Step 2: Copy Updated Contract Code

1. Open `COPY_THIS_TO_PLAYGROUND.rs` in this repository
2. Copy **ALL** the code (the entire file)
3. In Solana Playground, delete all code in `lib.rs`
4. Paste the new code

### Step 3: Build

1. Click **"Build"** button in Solana Playground
2. Wait for build to complete successfully

### Step 4: Deploy

1. Click **"Deploy"** button in Solana Playground
2. Approve the transaction
3. **IMPORTANT: COPY THE NEW PROGRAM ID** (it will be different)

### Step 3: Update Frontend Config

Update `client/src/lib/chain/config.ts`:
```typescript
export const PROGRAM_ID = new PublicKey("YOUR_NEW_PROGRAM_ID_HERE");
```

## Why This Fix Works

1. **No Expiration for Prize Claims**: Once a challenge is completed (both players submitted results), winners can claim anytime
2. **Dispute Timer Only for Joining**: The `dispute_timer` now only prevents players from joining expired challenges (2 hours)
3. **Matches UI**: 2-hour timer matches what users see in the UI

## Impact

- ✅ Winners can claim prizes **ANYTIME** after completion
- ✅ No more locked funds in escrow
- ✅ Better user experience - no rush to claim
- ✅ Matches UI expectations (2 hours, not 15 minutes)

---

**After redeploying, send me the new program ID and I'll update the frontend config!** 🚀
