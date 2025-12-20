# Challenge Flow Implementation - Status

## ✅ Completed

### Smart Contract (lib.rs)
- ✅ Updated ChallengeStatus enum with new states:
  - PendingWaitingForOpponent
  - CreatorConfirmationRequired  
  - CreatorFunded
  - Active (replaces InProgress)
- ✅ Modified create_challenge() - NO PAYMENT, metadata only
- ✅ Added express_join_intent() - NO PAYMENT, intent only
- ✅ Added creator_fund() - Creator funds after joiner expresses intent
- ✅ Added joiner_fund() - Joiner funds after creator funded
- ✅ Updated Challenge struct with new timer fields
- ✅ Added auto-refund functions for timeouts
- ✅ Updated all functions to use new states
- ✅ Added new error types and events

## 🚧 In Progress

### Frontend Contract Functions (contract.ts)
- ✅ Updated createChallenge() - removed payment logic
- ⏳ Need to replace acceptChallenge() with expressJoinIntent()
- ⏳ Need to add creatorFund() function
- ⏳ Need to add joinerFund() function
- ⏳ Need to add auto-refund functions

### Firestore Schema
- ⏳ Add new status fields
- ⏳ Add timer fields (expiration_timer, confirmation_timer, joiner_funding_timer)
- ⏳ Update challenge creation to use new states

### UI Updates
- ⏳ Update CreateChallengeForm to show "No funds committed" message
- ⏳ Update join flow to express intent only
- ⏳ Add "Accept Challenger & Fund" button for creator
- ⏳ Add "Fund Challenge" button for joiner
- ⏳ Show proper state messages at each step
- ⏳ Add timeout checking and auto-refund UI

## 📋 Next Steps

1. Complete frontend contract functions
2. Update Firestore schema and functions
3. Update UI components
4. Add timeout monitoring
5. Test full flow

