# Challenge Creation and Fee Flow

## Complete Step-by-Step Process

### **STEP 1: Challenge Creation (FREE - No Fees)**
**Location:** `client/src/pages/app/index.tsx` → `handleCreateChallenge()`

1. **User fills out form** (`CreateChallengeForm.tsx`)
   - Selects game, platform, mode, entry fee, rules
   - Clicks "Create Challenge"

2. **Challenge created in Firestore** (`client/src/lib/firebase/firestore.ts` → `addChallenge()`)
   - **Status:** `pending_waiting_for_opponent`
   - **Fee:** ❌ **NO FEE** - Completely free!
   - **On-chain:** ❌ **NO PDA created yet** - No Solana transaction
   - **Firestore only:** Challenge document created with:
     - `creator`: Creator's wallet address
     - `entryFee`: Challenge amount (USDFG)
     - `status`: `pending_waiting_for_opponent`
     - `expirationTimer`: 60 minutes TTL
     - `players`: `[creator]` (creator is first player)

**Result:** Challenge appears in lobby, waiting for opponent

---

### **STEP 2: Opponent Expresses Join Intent (FREE - No Fees)**
**Location:** `client/src/pages/app/index.tsx` → `handleDirectJoinerExpressIntent()`

1. **Opponent clicks "Join Challenge"**
2. **Firestore update only** (`client/src/lib/firebase/firestore.ts` → `expressJoinIntent()`)
   - **Status:** `pending_waiting_for_opponent` → `creator_confirmation_required`
   - **Fee:** ❌ **NO FEE** - Completely free!
   - **On-chain:** ❌ **NO on-chain transaction** - Firestore only
   - **Updates:**
     - `pendingJoiner`: Opponent's wallet address
     - `creatorFundingDeadline`: 5 minutes from now
     - `status`: `creator_confirmation_required`

**Result:** 
- Creator sees "Fund Challenge" button appear immediately
- Opponent sees "Waiting for creator to fund" message
- **No Solana fees charged!**

---

### **STEP 3: Creator Funds Challenge (FIRST FEE)**
**Location:** `client/src/pages/app/index.tsx` → `handleDirectCreatorFund()`

#### **3A: If PDA doesn't exist yet:**
1. **Create PDA on-chain** (`client/src/lib/chain/contract.ts` → `createChallenge()`)
   - **Fee:** ✅ **Solana transaction fee** (~0.000005 SOL)
   - **On-chain:** Creates challenge PDA account
   - **Firestore:** Updates `pda` field with PDA address
   - **Status:** Still `creator_confirmation_required`

2. **Wait for joiner to express on-chain intent** (if needed)
   - If joiner only expressed in Firestore, they need to express on-chain
   - Creator sees message: "Waiting for challenger to complete on-chain join intent"

#### **3B: If PDA exists:**
1. **Creator funds on-chain** (`client/src/lib/chain/contract.ts` → `creatorFundOnChain()`)
   - **Fee:** ✅ **Solana transaction fee** (~0.000005 SOL)
   - **USDFG:** ✅ **Transfers entryFee USDFG** to escrow
   - **On-chain:** Challenge state → `CreatorConfirmationRequired` → `CreatorFunded`
   - **Escrow:** Creator's USDFG locked in escrow

2. **Update Firestore** (`client/src/lib/firebase/firestore.ts` → `creatorFund()`)
   - **Status:** `creator_confirmation_required` → `creator_funded`
   - **Updates:**
     - `challenger`: Moves `pendingJoiner` to `challenger`
     - `pendingJoiner`: Set to `null`
     - `fundedByCreatorAt`: Timestamp
     - `joinerFundingDeadline`: 5 minutes from now

**Result:**
- Creator has paid: **Solana fee + entryFee USDFG**
- Status: `creator_funded`
- Opponent sees "Fund Challenge" button

---

### **STEP 4: Challenger Funds Challenge (SECOND FEE)**
**Location:** `client/src/pages/app/index.tsx` → `handleDirectJoinerFund()`

1. **Challenger funds on-chain** (`client/src/lib/chain/contract.ts` → `joinerFundOnChain()`)
   - **Fee:** ✅ **Solana transaction fee** (~0.000005 SOL)
   - **USDFG:** ✅ **Transfers entryFee USDFG** to escrow
   - **On-chain:** Challenge state → `CreatorFunded` → `Active`
   - **Escrow:** Both players' USDFG locked (total = 2 × entryFee)

2. **Update Firestore** (`client/src/lib/firebase/firestore.ts` → `joinerFund()`)
   - **Status:** `creator_funded` → `active`
   - **Updates:**
     - `fundedByJoinerAt`: Timestamp
     - `players`: `[creator, challenger]` (both players)
     - `resultDeadline`: 2 hours from now

**Result:**
- Challenger has paid: **Solana fee + entryFee USDFG**
- Status: `active`
- Match starts!
- Prize pool: **2 × entryFee USDFG** (winner takes all)

---

## Fee Summary

| Step | Action | Solana Fee | USDFG | Total Cost |
|------|--------|------------|-------|------------|
| 1. Create Challenge | Firestore only | ❌ FREE | ❌ FREE | **FREE** |
| 2. Express Join Intent | Firestore only | ❌ FREE | ❌ FREE | **FREE** |
| 3. Creator Funds | On-chain + Firestore | ✅ ~0.000005 SOL | ✅ entryFee USDFG | **Fee + USDFG** |
| 4. Challenger Funds | On-chain + Firestore | ✅ ~0.000005 SOL | ✅ entryFee USDFG | **Fee + USDFG** |

**Total Fees:**
- **Creator pays:** 1 Solana fee + entryFee USDFG
- **Challenger pays:** 1 Solana fee + entryFee USDFG
- **Prize Pool:** 2 × entryFee USDFG (winner takes all)

---

## Status Flow

```
pending_waiting_for_opponent
    ↓ (opponent expresses intent - FREE)
creator_confirmation_required
    ↓ (creator funds - Fee + USDFG)
creator_funded
    ↓ (challenger funds - Fee + USDFG)
active
    ↓ (both submit results)
completed
```

---

## Key Points

1. **Challenge creation is FREE** - No fees, no on-chain transaction
2. **Join intent is FREE** - Firestore only, no Solana fee
3. **Creator funds first** - Pays Solana fee + USDFG
4. **Challenger funds second** - Pays Solana fee + USDFG
5. **PDA creation** - Happens when creator funds (if not already created)
6. **Real-time updates** - Firestore listeners update UI instantly
7. **On-chain sync** - Firestore is source of truth, on-chain syncs when funding

---

## Files Involved

- **Challenge Creation:** `client/src/pages/app/index.tsx` → `handleCreateChallenge()`
- **Firestore Operations:** `client/src/lib/firebase/firestore.ts`
  - `addChallenge()` - Creates challenge
  - `expressJoinIntent()` - Opponent joins (free)
  - `creatorFund()` - Creator funds
  - `joinerFund()` - Challenger funds
- **On-chain Operations:** `client/src/lib/chain/contract.ts`
  - `createChallenge()` - Creates PDA
  - `creatorFundOnChain()` - Creator funds on-chain
  - `joinerFundOnChain()` - Challenger funds on-chain
- **UI Components:**
  - `CreateChallengeForm.tsx` - Challenge creation form
  - `StandardChallengeLobby.tsx` - Challenge lobby with buttons
