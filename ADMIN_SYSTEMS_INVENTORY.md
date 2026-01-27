# Admin Systems Inventory Report

**Generated:** 2026-01-26  
**Scope:** Complete codebase scan for admin-related systems, roles, permissions, and privileged actions

---

## (A) Admin UI Surfaces Found

### 1. Admin HTML Page
- **File:** `client/public/admin.html`
- **Route:** `/admin.html` (static file, not routed through React)
- **Purpose:** Informational status page showing:
  - Contract deployment status
  - Platform fee (5% hardcoded)
  - Platform wallet address
  - Entry fee ranges
- **Security:** ⚠️ **PUBLIC** - No authentication, anyone can access
- **Notes:** This is just a status display page, not a functional admin panel

### 2. Admin Routes in React App
- **Result:** ❌ **NONE FOUND**
- No `/admin`, `/dashboard`, `/ops`, `/console`, or `/moderation` routes exist
- No admin-specific React components or pages

---

## (B) Role/Permission Implementation

### 1. Admin Wallet Hardcoding
- **File:** `client/src/lib/chain/config.ts:23`
- **Admin Wallet:** `3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`
- **Implementation:** Simple string comparison against wallet address
- **Usage Pattern:**
  ```typescript
  const isAdmin = currentWallet.toLowerCase() === ADMIN_WALLET.toString().toLowerCase();
  ```

### 2. Admin Checks Found In:
- **`client/src/pages/app/index.tsx`** (multiple locations):
  - Line 1954: Admin check for founder challenges (entryFee = 0)
  - Line 2454: Admin challenge detection
  - Line 2833: Admin challenge detection
  - Line 3661: Admin wallet validation
  - Line 3793: Admin-only actions
  - Line 3893: Admin founder challenge detection
  - Line 3968: Admin user exemption from active challenge limits
  - Line 6167: Admin challenge handling
  - Line 6869: Admin entry fee validation
  - Line 7199: Admin UI elements (founder challenge hints)
  - Line 7256: Admin entry fee validation
  - Line 7395: Admin entry fee validation

- **`client/src/components/arena/CreateChallengeForm.tsx`**:
  - Line 301: Admin entry fee validation
  - Line 730: Admin UI hints for founder challenges
  - Line 744: Admin placeholder text
  - Line 777: Admin entry fee validation
  - Line 793: Admin tournament validation
  - Line 823: Admin tournament validation

- **`client/src/components/arena/TournamentBracketView.tsx`**:
  - Line 139: Admin creator detection
  - Line 146: Admin viewer detection
  - Line 287: Admin-only UI elements

- **`client/src/lib/firebase/firestore.ts`**:
  - Line 4164: Admin check for founder challenges

### 3. Permission System
- **Firebase Auth:** ❌ **NOT USED** - No Firebase Authentication
- **Firebase Custom Claims:** ❌ **NOT USED**
- **Firestore Roles Collection:** ❌ **NOT FOUND**
- **Role-Based Access Control:** ❌ **NOT IMPLEMENTED**
- **Current System:** ✅ **WALLET-BASED** - Single hardcoded admin wallet address

### 4. Firestore Security Rules
- **File:** `firestore.rules`
- **Status:** ⚠️ **WIDE OPEN** - All collections allow `read: if true` and `write: if true`
- **No Admin Checks:** Rules don't check for admin wallet or any role
- **Collections with Open Access:**
  - `challenges` - anyone can read/write/delete
  - `player_stats` - anyone can read/write
  - `challenge_chats` - anyone can read/write
  - `voice_signals` - anyone can read/write
  - `free_claims` - anyone can create/update/delete
  - `founder_rewards` - anyone can create/delete (update: false)
  - `stats` - anyone can create/update/delete
  - `trust_reviews` - anyone can create/delete
  - `teams` - anyone can create/update/delete

---

## (C) Admin-Capable API Endpoints/Functions

### 1. Client-Side Functions (No Server-Side Auth)

#### Challenge Management
- **`deleteChallenge(challengeId: string)`**
  - **File:** `client/src/lib/firebase/firestore.ts:1110`
  - **Access:** ⚠️ **ANYONE** - No admin check
  - **Action:** Deletes challenge document from Firestore
  - **Security:** ❌ **INSECURE** - Any user can delete any challenge

#### Founder Reward Recording
- **`recordFounderChallengeReward(wallet, challengeId, amount, txSignature?)`**
  - **File:** `client/src/lib/firebase/firestore.ts:1670`
  - **Access:** ⚠️ **ANYONE** - No admin check
  - **Action:** Records USDFG reward transfer and updates player stats
  - **Security:** ❌ **INSECURE** - Any user can record fake rewards

#### Player Stats Updates
- **`updatePlayerLastActive(wallet: string)`** - Anyone can call
- **`updatePlayerDisplayName(wallet: string, name: string)`** - Anyone can call
- **`updatePlayerCountry(wallet: string, countryCode: string | null)`** - Anyone can call
- **All player stats functions:** ⚠️ **NO ADMIN CHECKS**

### 2. Node.js Scripts (Manual Admin Tools)

#### Founder Reward Script
- **File:** `record-founder-reward.js`
- **Purpose:** Manually record USDFG transfers for founder challenges
- **Usage:** `node record-founder-reward.js <wallet> <challengeId> <amount> [txSignature]`
- **Access:** ✅ **LOCAL ONLY** - Must be run on server/developer machine
- **Security:** ✅ **SECURE** - Requires local file system access

#### Firebase Data Cleanup Script
- **File:** `clear-firebase-data.js`
- **Purpose:** Delete all data from Firestore collections
- **Access:** ✅ **LOCAL ONLY** - Must be run on server/developer machine
- **Security:** ✅ **SECURE** - Requires local file system access
- **Collections Cleared:**
  - challenges, player_stats, challenge_chats, voice_signals
  - challenges_archive, founder_rewards, stats, free_claims, users

### 3. Smart Contract Functions (On-Chain)

#### Contract Admin Functions
- **Result:** ❌ **NONE FOUND**
- **Contract Design:** ✅ **DECENTRALIZED** - No admin authority
- **Platform Fee:** Hardcoded 5% (500 basis points)
- **Platform Wallet:** Hardcoded `AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq`
- **No Admin Override:** Contract has no admin functions to:
  - Change platform fee
  - Change platform wallet
  - Refund challenges
  - Cancel challenges (except via `cancel_challenge` which requires participant consensus)

#### Refund Functions
- **`refund_dispute()`** - **File:** `programs/usdfg_smart_contract/src/lib.rs:401`
  - **Access:** ✅ **ANY PLAYER** - Either participant can call
  - **Purpose:** Refunds both players when both claim victory (dispute)
  - **Security:** ✅ **SECURE** - Only works when both players submitted results

#### Cancel Functions
- **`cancel_challenge()`** - **File:** `client/src/lib/chain/contract.ts:1025`
  - **Access:** ⚠️ **ANYONE** - No admin check in frontend
  - **Purpose:** Cancels challenge on-chain
  - **Security:** ⚠️ **PARTIAL** - Contract may have restrictions, but frontend doesn't check

### 4. Cloudflare/Netlify Functions
- **File:** `functions/_middleware.ts`
- **Purpose:** SPA routing middleware
- **Admin Functions:** ❌ **NONE** - Only handles static asset routing

### 5. Firebase Functions
- **Result:** ❌ **NONE FOUND** - No Firebase Cloud Functions directory

---

## (D) Security Gaps & Vulnerabilities

### 🔴 CRITICAL GAPS

#### 1. Firestore Rules - Completely Open
- **Issue:** All collections allow `read: if true` and `write: if true`
- **Impact:** Any user can:
  - Delete any challenge
  - Modify any player stats
  - Create fake founder rewards
  - Manipulate trust reviews
  - Delete teams
- **Fix Required:** Implement wallet-based rules or admin checks

#### 2. No Admin Authentication
- **Issue:** Admin checks only compare wallet address client-side
- **Impact:** 
  - Anyone can inspect code to see admin wallet
  - Client-side checks can be bypassed
  - No server-side validation
- **Fix Required:** Add server-side admin verification

#### 3. Privileged Functions Exposed Client-Side
- **Functions with no admin checks:**
  - `deleteChallenge()` - Anyone can delete any challenge
  - `recordFounderChallengeReward()` - Anyone can record fake rewards
  - `updatePlayerStats()` - Anyone can manipulate stats
- **Fix Required:** Add admin wallet checks or move to server-side

#### 4. Founder Challenge Abuse
- **Issue:** Admin can create challenges with `entryFee = 0` (founder challenges)
- **Current Check:** Only client-side wallet comparison
- **Risk:** If admin wallet is compromised, attacker can create free challenges
- **Mitigation:** Smart contract should validate entry fees

#### 5. No Rate Limiting
- **Issue:** No rate limits on:
  - Challenge creation
  - Challenge deletion
  - Stats updates
  - Reward recording
- **Risk:** Spam, DoS attacks, data manipulation

### 🟡 MEDIUM GAPS

#### 6. Admin Wallet Hardcoded
- **Issue:** Admin wallet address is hardcoded in source code
- **Risk:** Cannot rotate admin wallet without code changes
- **Better Approach:** Store in environment variable or Firestore config

#### 7. No Audit Logging
- **Issue:** No logging of admin actions
- **Impact:** Cannot track who did what, when
- **Fix:** Add Firestore audit log collection

#### 8. No Multi-Admin Support
- **Issue:** Only one admin wallet supported
- **Impact:** Single point of failure
- **Fix:** Implement multi-admin system with Firestore allowlist

### 🟢 LOW RISK

#### 9. Admin HTML Page Public
- **Issue:** `/admin.html` is publicly accessible
- **Impact:** Information disclosure (contract status, platform wallet)
- **Risk:** Low - only displays public information

#### 10. No Challenge Refund Endpoint
- **Issue:** No admin function to refund challenges manually
- **Impact:** Cannot recover funds from stuck challenges
- **Note:** Smart contract has `refund_dispute()` but requires both players to submit results

---

## Summary

### Current Admin Capabilities
1. ✅ **Create Founder Challenges** (entryFee = 0) - Admin wallet only
2. ✅ **Bypass Active Challenge Limits** - Admin wallet exempt
3. ❌ **Refund Challenges** - No admin function
4. ❌ **Cancel Challenges** - No admin override (only participant consensus)
5. ❌ **Modify Platform Fee** - Hardcoded in contract
6. ❌ **Change Platform Wallet** - Hardcoded in contract
7. ⚠️ **Delete Challenges** - Anyone can do this (no admin check)
8. ⚠️ **Record Rewards** - Anyone can do this (no admin check)

### Recommended Immediate Actions
1. **🔴 URGENT:** Add Firestore security rules with admin wallet checks
2. **🔴 URGENT:** Add admin checks to `deleteChallenge()` function
3. **🔴 URGENT:** Add admin checks to `recordFounderChallengeReward()` function
4. **🟡 HIGH:** Move admin wallet to environment variable
5. **🟡 HIGH:** Add server-side admin verification
6. **🟡 HIGH:** Implement audit logging for admin actions
7. **🟢 MEDIUM:** Add rate limiting to privileged functions
8. **🟢 MEDIUM:** Implement multi-admin support

---

**Report End**
