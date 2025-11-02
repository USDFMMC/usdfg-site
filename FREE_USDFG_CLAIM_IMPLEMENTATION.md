# Free USDFG Claim Feature - Implementation Guide

## Overview
This feature allows random activation of free USDFG distribution events where a limited number of users can claim free tokens.

## How It Works

### 1. **Random Activation System**
- Admin or backend service creates claim events in Firestore (`free_claims` collection)
- Events activate at random times (can be scheduled via Cloud Functions or cron job)
- Each event has:
  - `totalAmount`: Total USDFG to distribute
  - `amountPerClaim`: Amount each user gets (e.g., 10 USDFG)
  - `maxClaims`: Maximum number of people (e.g., 50)
  - `expiresAt`: When the event expires

### 2. **User Experience**
- One of the 4 stat boxes is replaced with "Claim Free USDFG" when active
- Shows remaining claims and amount per claim
- Click to claim if wallet is connected and user hasn't claimed yet
- Real-time updates as claims are made

### 3. **Implementation Steps**

#### Step 1: Create Claim Event (Admin/Backend)
```javascript
// Example: Create a claim event manually or via Cloud Function
const claimEvent = {
  isActive: true,
  totalAmount: 500,        // 500 USDFG total
  amountPerClaim: 10,      // 10 USDFG per user
  maxClaims: 50,           // 50 people can claim
  currentClaims: 0,
  claimedBy: [],
  activatedAt: Timestamp.now(),
  expiresAt: Timestamp.fromMillis(Date.now() + 3600000), // 1 hour
  createdAt: Timestamp.now()
};

await addDoc(collection(db, 'free_claims'), claimEvent);
```

#### Step 2: Token Distribution
**Option A: Backend Cloud Function** (Recommended)
- Cloud Function listens for claim events
- Transfers USDFG tokens directly to user wallets
- More secure and prevents abuse

**Option B: Client-Side Transfer** (Current Implementation)
- Uses SPL token transfer from a faucet wallet
- Requires faucet wallet with USDFG tokens
- Less secure but simpler

#### Step 3: UI Integration
- Replace "Win Rate" stat box with "Claim Free USDFG" component
- Show active claim events in real-time
- Handle claim button clicks

## Files Modified

1. **`client/src/lib/firebase/firestore.ts`**
   - Added `FreeClaimEvent` interface
   - Added `getActiveFreeClaimEvent()`
   - Added `claimFreeUSDFG()`
   - Added `subscribeToActiveFreeClaim()`

2. **`client/src/pages/app/index.tsx`**
   - Added state for active claim event
   - Added subscription to claim events
   - Added claim handler function
   - Replaced "Win Rate" stat box with "Claim Free USDFG" component

## Next Steps

1. **Set up faucet wallet**: Create a Solana wallet with USDFG tokens for distribution
2. **Add token transfer logic**: Implement SPL token transfer in `handleClaimFreeUSDFG`
3. **Create scheduling system**: Set up Cloud Functions or cron job to create random claim events
4. **Test the feature**: Create a test claim event and verify the flow

## Notes

- Each wallet can only claim once per event
- Claims are limited by `maxClaims`
- Events expire automatically based on `expiresAt`
- Real-time updates via Firestore listeners
- Token transfer requires connection to Solana network

