# USDFG Challenge Flow End-to-End Audit Report

**Date:** Current  
**Scope:** Complete challenge lifecycle from creation to reward claim

---

## 1. USER ACTIONS BREAKDOWN

### 1.1 CREATOR CREATE CHALLENGE

**Button Label:** "Create Challenge" (in CreateChallengeForm modal)

**Function Called:** `handleCreateChallenge(challengeData)`

**Wallet Popup:** ✅ YES - Wallet must be connected (checks `publicKey`)

**On-Chain Transaction:** ✅ YES

**Instruction Called:** `createChallenge` (from `@/lib/chain/contract`)

**Token Movement:**
- **USDFG Tokens:** ❌ NO (only creates PDA, no funding yet)
- **SOL Fee:** ✅ YES (transaction fee for PDA creation)

**Firestore Status:**
- **Before:** N/A (challenge doesn't exist)
- **After:** `pending_waiting_for_opponent`

**Additional Details:**
- Creates challenge document in Firestore via `addChallenge()`
- Stores `pda` field in Firestore after on-chain creation
- Validates user doesn't have active challenges (blocks if status is `active`, `pending_waiting_for_opponent`, `creator_confirmation_required`, or `creator_funded`)
- For team challenges, validates user is team key holder
- Sets `entryFee`, `prizePool` (calculated as `entryFee * 2`), `creator`, `createdAt`, `status: 'pending_waiting_for_opponent'`

---

### 1.2 CHALLENGER EXPRESS INTENT (Join Challenge)

**Button Label:** "Join Challenge ({entryFee} USDFG + Network Fee)"

**Function Called:** `handleDirectJoinerExpressIntent(challenge)`

**Wallet Popup:** ✅ YES - Wallet must be connected

**On-Chain Transaction:** ✅ YES (if PDA exists)

**Instruction Called:** `expressJoinIntent` (from `@/lib/chain/contract`)

**Token Movement:**
- **USDFG Tokens:** ❌ NO (intent only, no payment)
- **SOL Fee:** ✅ YES (transaction fee for on-chain intent)

**Firestore Status:**
- **Before:** `pending_waiting_for_opponent`
- **After:** `creator_confirmation_required`

**Additional Details:**
- **Step 1:** Updates Firestore via `expressJoinIntent()` - sets `status: 'creator_confirmation_required'`, `pendingJoiner: wallet`, `creatorFundingDeadline: 5 minutes from now`
- **Step 2:** If PDA exists, calls on-chain `expressJoinIntent()` instruction
- If PDA doesn't exist yet, only Firestore update happens (creator must create PDA first)
- If on-chain call fails with "already expressed", treats as success
- For Founder Challenges (admin-created, 0 entry fee), skips on-chain step entirely
- Guard: Blocks if user is creator (unless deadline expired)
- Guard: Blocks if status is not `pending_waiting_for_opponent` or `creator_confirmation_required`
- Guard: Blocks if deadline expired and user is NOT the pending joiner

---

### 1.3 CREATOR FUND

**Button Label:** "Fund Challenge ({entryFee} USDFG + Network Fee)" or "✨ Confirm and Fund Challenge ✨"

**Function Called:** `handleDirectCreatorFund(challenge)`

**Wallet Popup:** ✅ YES - Wallet must be connected

**On-Chain Transaction:** ✅ YES

**Instruction Called:** `creatorFund` (from `@/lib/chain/contract`)

**Token Movement:**
- **USDFG Tokens:** ✅ YES - Transfers `entryFee` USDFG from creator to escrow
- **SOL Fee:** ✅ YES (transaction fee)

**Firestore Status:**
- **Before:** `creator_confirmation_required`
- **After:** `creator_funded`

**Additional Details:**
- **Step 1:** If PDA doesn't exist, creates it first via `createChallenge()` on-chain, then updates Firestore with `pda` field
- **Step 2:** Calls on-chain `creatorFund()` instruction - transfers USDFG to escrow token account
- **Step 3:** Updates Firestore via `creatorFund()` - sets `status: 'creator_funded'`, `challenger: pendingJoiner`, `pendingJoiner: null`, `fundedByCreatorAt`, `joinerFundingDeadline: 5 minutes from now`
- Guard: Only creator can fund
- Guard: Status must be `creator_confirmation_required`
- Guard: Deadline must not be expired
- Guard: Must have `pendingJoiner` (someone expressed intent)
- If on-chain succeeds but Firestore fails, checks if status is already `creator_funded` (idempotent)

---

### 1.4 CHALLENGER FUND (Joiner Fund)

**Button Label:** "Fund Challenge ({entryFee} USDFG + Network Fee)" or "✨ Creator Funded - Time to Fund Your Entry ✨"

**Function Called:** `handleDirectJoinerFund(challenge)` or `onJoinerFund` callback

**Wallet Popup:** ✅ YES - Wallet must be connected

**On-Chain Transaction:** ✅ YES

**Instruction Called:** `joinerFund` (from `@/lib/chain/contract`)

**Token Movement:**
- **USDFG Tokens:** ✅ YES - Transfers `entryFee` USDFG from challenger to escrow
- **SOL Fee:** ✅ YES (transaction fee)

**Firestore Status:**
- **Before:** `creator_funded`
- **After:** `active`

**Additional Details:**
- **Step 1:** Calls on-chain `joinerFund()` instruction - transfers USDFG to escrow
- **Step 2:** Updates Firestore via `joinerFund()` - sets `status: 'active'`, adds challenger to `players` array (ensures both creator and challenger are in array), sets `fundedByJoinerAt`, sets `resultDeadline: 2 hours from now` if challenge is full
- Guard: Only challenger can fund
- Guard: Status must be `creator_funded`
- Guard: Deadline must not be expired
- For tournaments, seeds players into bracket and activates first round matches

---

### 1.5 SUBMIT RESULT

**Button Label:** "🏆 Submit Result"

**Function Called:** `handleSubmitResult(didWin, proofFile)`

**Wallet Popup:** ❌ NO (Firestore only, no on-chain transaction)

**On-Chain Transaction:** ❌ NO

**Instruction Called:** N/A

**Token Movement:**
- **USDFG Tokens:** ❌ NO
- **SOL Fee:** ❌ NO

**Firestore Status:**
- **Before:** `active`
- **After:** `active` (status unchanged, but `results` field updated)

**Additional Details:**
- Stores result in Firestore via `submitChallengeResult()` - updates `results[wallet] = { didWin, submittedAt }`
- For tournaments, uses `submitTournamentMatchResult()` instead
- After submission, shows Trust Review Modal (for standard challenges)
- Guard: Status must be `active`
- Guard: User must be participant (in `players` array)
- Guard: User must not have already submitted (`hasAlreadySubmitted` check)
- Guard: Must have at least 2 players
- If both players submit and results match, challenge auto-completes and winner is determined
- If opponent submitted loss, user auto-wins (no need to submit)

---

### 1.6 CLAIM REWARD (Winner Claims Prize)

**Button Label:** "💰 Claim Prize"

**Function Called:** `handleClaimPrize(challenge)`

**Wallet Popup:** ✅ YES - Wallet must be connected

**On-Chain Transaction:** ✅ YES

**Instruction Called:** `resolveChallenge` (from `@/lib/chain/contract`)

**Token Movement:**
- **USDFG Tokens:** ✅ YES - Transfers entire escrow balance (2x entryFee) to winner, minus platform fee
- **SOL Fee:** ✅ YES (transaction fee)

**Firestore Status:**
- **Before:** `completed`
- **After:** `completed` (status unchanged, but `prizeClaimed: true` set)

**Additional Details:**
- **Step 1:** Checks if user has reviewed opponent (via `hasUserReviewedChallenge()`). If not, shows Trust Review Modal first
- **Step 2:** Calls on-chain `resolveChallenge()` instruction - transfers USDFG from escrow to winner's token account (and platform fee to platform wallet)
- **Step 3:** Updates Firestore via `recordFounderChallengeReward()` (for Founder Challenges) or sets `prizeClaimed: true`
- Guard: Status must be `completed`
- Guard: User must be the winner
- Guard: User must be participant
- Guard: Prize must not already be claimed
- For Founder Challenges, records reward in player stats

---

### 1.7 CANCEL CHALLENGE

**Button Label:** "Cancel/Delete Challenge" or "🗑️ Delete Challenge"

**Function Called:** `handleCancelChallenge(challenge)`

**Wallet Popup:** ✅ YES (if PDA exists and on-chain cancel is needed)

**On-Chain Transaction:** ✅ YES (if PDA exists)

**Instruction Called:** `cancelChallenge` (from `@/lib/chain/contract`) - optional, only if PDA exists

**Token Movement:**
- **USDFG Tokens:** ❌ NO
- **SOL Fee:** ✅ YES (if on-chain cancel happens)

**Firestore Status:**
- **Before:** `pending_waiting_for_opponent` or `creator_confirmation_required` (with expired deadline)
- **After:** Challenge deleted (document removed from Firestore)

**Additional Details:**
- If status is `creator_confirmation_required` and deadline expired, calls `revertCreatorTimeout()` first
- Deletes challenge document via `deleteChallenge()`
- If PDA exists, may call on-chain `cancelChallenge()` (but this is optional - Firestore deletion is primary)
- Guard: Only creator can cancel
- Guard: Status must be `pending_waiting_for_opponent` OR `creator_confirmation_required` with expired deadline
- Guard: Cannot cancel if challenge is `active`, `creator_funded`, or `completed`

---

## 2. FIRESTORE STATUS STRINGS

All status strings currently in use:

1. **`pending_waiting_for_opponent`** - Initial state after challenge creation, waiting for someone to join
2. **`creator_confirmation_required`** - Challenger expressed intent, waiting for creator to fund
3. **`creator_funded`** - Creator funded escrow, waiting for challenger to fund
4. **`active`** - Both players funded, match in progress
5. **`completed`** - Match finished, winner determined
6. **`cancelled`** - Challenge cancelled/deleted
7. **`disputed`** - Challenge in dispute (rare, manual admin action)

**Status Flow:**
```
pending_waiting_for_opponent
  ↓ (challenger expresses intent)
creator_confirmation_required
  ↓ (creator funds)
creator_funded
  ↓ (challenger funds)
active
  ↓ (both submit results OR deadline passes)
completed
```

**Revert Paths:**
- `creator_confirmation_required` → `pending_waiting_for_opponent` (if creator deadline expires)
- `creator_funded` → `pending_waiting_for_opponent` (if joiner deadline expires)

---

## 3. REACTIVE LOGIC (useEffect & Auto-Triggers)

### 3.1 Auto-Revert on Deadline Expiry

**Location:** `useChallengeExpiry` hook (imported in `app/index.tsx`)

**Trigger:** Polls challenges every 30 seconds (or uses Firestore listeners)

**Actions:**
- Checks `creatorFundingDeadline` - if expired and status is `creator_confirmation_required`, calls `revertCreatorTimeout()`
- Checks `joinerFundingDeadline` - if expired and status is `creator_funded`, calls `revertJoinerTimeout()`

**Functions Called:**
- `revertCreatorTimeout(challengeId)` - Reverts to `pending_waiting_for_opponent`, clears `pendingJoiner` and `challenger`
- `revertJoinerTimeout(challengeId)` - Reverts to `pending_waiting_for_opponent`, triggers on-chain refund (via contract)

---

### 3.2 Auto-Complete on Result Submission

**Location:** `submitChallengeResult()` in `firestore.ts`

**Trigger:** When a result is submitted via `submitChallengeResult()`

**Actions:**
- Checks if both players have submitted results
- If both submitted and results match (both claim win or both claim loss), determines winner
- If both claim win → dispute (manual resolution)
- If both claim loss → tie (no winner)
- If one claims win and other claims loss → winner is the one who claimed win
- If opponent submitted loss → user auto-wins (no need to submit)

**Status Change:** `active` → `completed` (when winner determined)

---

### 3.3 Result Deadline Auto-Resolution

**Location:** `checkResultDeadline()` in `firestore.ts`

**Trigger:** Called by `useResultDeadlines` hook (polls every 30 seconds)

**Actions:**
- Checks if `resultDeadline` has passed (2 hours after challenge becomes active)
- If no results submitted → `status: 'completed'`, `winner: 'forfeit'` (no refund)
- If only one player submitted:
  - If they claimed win → they win by default
  - If they claimed loss → opponent wins by default

**Status Change:** `active` → `completed`

---

### 3.4 On-Chain Status Sync

**Location:** `syncChallengeStatusFromChain()` in `firestore.ts`

**Trigger:** Called periodically or on-demand

**Actions:**
- Fetches challenge account data from Solana
- Parses on-chain status byte
- Maps to Firestore status string
- Updates Firestore if status differs (except: won't overwrite `completed` with `active`)

**Status Mapping:**
- 0 → `pending_waiting_for_opponent`
- 1 → `creator_confirmation_required`
- 2 → `creator_funded`
- 3 → `active`
- 4 → `completed`
- 5 → `cancelled`
- 6 → `disputed`

---

### 3.5 Real-Time Challenge Updates

**Location:** `StandardChallengeLobby.tsx` - `useEffect` with `onSnapshot`

**Trigger:** Real-time Firestore listener on challenge document

**Actions:**
- Updates `liveChallenge` state when challenge document changes
- Auto-fixes `players` array if challenge is `active` but array is empty
- Ensures button visibility updates immediately when status changes

---

## 4. GUARD CONDITIONS

### 4.1 Create Challenge Guards

- ✅ User must have wallet connected (`publicKey` check)
- ✅ User must not have active challenge (status in: `active`, `pending_waiting_for_opponent`, `creator_confirmation_required`, `creator_funded`)
- ✅ For team challenges: User must be team key holder
- ✅ Entry fee must be between 0.000000001 and 1000 USDFG (on-chain validation)

---

### 4.2 Express Intent Guards

- ✅ User must have wallet connected
- ✅ Challenge status must be `pending_waiting_for_opponent` OR `creator_confirmation_required` (with expired deadline)
- ✅ User must not be creator (unless deadline expired)
- ✅ User must not already be participant (`pendingJoiner` or `challenger` check)
- ✅ Challenge must not be expired (`expirationTimer` check)
- ✅ For team challenges: User must be part of team (and team key holder if `teamOnly: true`)
- ✅ If deadline expired and user is NOT the pending joiner, block join attempt

---

### 4.3 Creator Fund Guards

- ✅ User must be creator (`isChallengeCreator` check)
- ✅ Status must be `creator_confirmation_required`
- ✅ Deadline must not be expired (`isCreatorFundingDeadlineExpired` check)
- ✅ Must have `pendingJoiner` (someone expressed intent)
- ✅ Entry fee must be > 0 (validated before on-chain call)
- ✅ If PDA doesn't exist and no `pendingJoiner`, can't fund (must wait for joiner)

---

### 4.4 Joiner Fund Guards

- ✅ User must be challenger (`isChallengeChallenger` check)
- ✅ Status must be `creator_funded`
- ✅ Deadline must not be expired (`isJoinerFundingDeadlineExpired` check)
- ✅ User must have sufficient USDFG balance (checked on-chain, contract will fail if insufficient)

---

### 4.5 Submit Result Guards

- ✅ Status must be `active`
- ✅ User must be participant (in `players` array OR is creator/challenger)
- ✅ User must not have already submitted (`hasAlreadySubmitted` check via `results[wallet]`)
- ✅ Must have at least 2 players in `players` array

---

### 4.6 Claim Prize Guards

- ✅ Status must be `completed`
- ✅ User must be the winner (`winner` field matches user wallet)
- ✅ User must be participant
- ✅ Prize must not already be claimed (`prizeClaimed` check)
- ✅ User must have reviewed opponent (for Founder Challenges, checked via `hasUserReviewedChallenge()`)

---

### 4.7 Cancel Challenge Guards

- ✅ User must be creator
- ✅ Status must be `pending_waiting_for_opponent` OR `creator_confirmation_required` (with expired deadline)
- ✅ Cannot cancel if status is `active`, `creator_funded`, or `completed`

---

## 5. SPECIAL CASES & EDGE CASES

### 5.1 Founder Challenges

- **Definition:** Admin-created challenges with entry fee = 0 or < 0.000000001
- **Express Intent:** Skips on-chain `expressJoinIntent()` call (Firestore only)
- **Funding:** Creator funding still requires on-chain `creatorFund()` (even with 0 USDFG)
- **Reward Claim:** Uses `recordFounderChallengeReward()` to update player stats

---

### 5.2 PDA Creation Timing

- **Scenario 1:** Creator creates challenge → PDA created immediately → Challenger can express on-chain intent
- **Scenario 2:** Challenger expresses intent first → No PDA yet → Creator must create PDA before funding
- **Scenario 3:** Creator tries to fund without PDA → Creates PDA first, then funds

---

### 5.3 Double-Submission Protection

- **Express Intent:** Checks `pendingJoiner` field - if user already expressed, allows retry only if PDA exists (for on-chain step)
- **Submit Result:** Checks `results[wallet]` - blocks if already submitted
- **Fund:** Idempotent checks - if status already `creator_funded` or `active`, returns success without action

---

### 5.4 Deadline Expiry Handling

- **Creator Deadline:** Auto-reverts to `pending_waiting_for_opponent`, clears `pendingJoiner` and `challenger`, allows new users to join
- **Joiner Deadline:** Auto-reverts to `pending_waiting_for_opponent`, triggers on-chain refund to creator (via contract `auto_refund_joiner_timeout`)
- **Result Deadline:** Auto-determines winner based on submitted results, or forfeit if no results

---

### 5.5 State Mismatch Recovery

- **On-Chain vs Firestore:** `syncChallengeStatusFromChain()` periodically syncs status from on-chain to Firestore
- **Firestore Update Failure:** If on-chain succeeds but Firestore fails, checks if status is already correct (idempotent)
- **Players Array Fix:** Auto-fixes empty `players` array if challenge is `active` but array is missing players

---

## 6. TRANSACTION FLOW SUMMARY

### Complete Flow (Happy Path):

1. **Creator Creates:** Firestore `pending_waiting_for_opponent` + On-chain PDA creation
2. **Challenger Joins:** Firestore `creator_confirmation_required` + On-chain `expressJoinIntent`
3. **Creator Funds:** Firestore `creator_funded` + On-chain `creatorFund` (USDFG transfer)
4. **Challenger Funds:** Firestore `active` + On-chain `joinerFund` (USDFG transfer)
5. **Both Submit Results:** Firestore `completed` (auto-determined winner)
6. **Winner Claims:** Firestore `prizeClaimed: true` + On-chain `resolveChallenge` (USDFG transfer to winner)

### Revert Paths:

- **Creator Deadline Expires:** `creator_confirmation_required` → `pending_waiting_for_opponent` (clears joiner)
- **Joiner Deadline Expires:** `creator_funded` → `pending_waiting_for_opponent` (refunds creator)

---

## 7. NOTES

- **USDFG Token Movement:** Only occurs during `creatorFund`, `joinerFund`, and `resolveChallenge` (reward claim)
- **SOL Fees:** Required for all on-chain transactions (PDA creation, express intent, funding, reward claim)
- **Firestore-First Approach:** Most actions update Firestore first for instant UI feedback, then sync on-chain
- **Idempotency:** Most operations are idempotent - safe to retry if they already succeeded
- **Real-Time Updates:** Uses Firestore `onSnapshot` listeners for instant UI updates across all users

---

**END OF AUDIT REPORT**
