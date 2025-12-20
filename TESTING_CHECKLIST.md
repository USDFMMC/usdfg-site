# Challenge Flow Testing Checklist

## Status: ✅ Architecture Complete - Testing Phase

The challenge state machine has been successfully refactored to an intent-first model. All changes are committed and pushed. Now we enter the critical testing phase.

---

## Phase 1: Devnet End-to-End Testing (CRITICAL)

**Goal**: Deliberately try to break the system. Verify it fails safely every time.

### Test Scenarios

#### 1. Happy Path
- [ ] Creator creates challenge → status: `pending_waiting_for_opponent`
- [ ] Joiner expresses intent (no payment) → status: `creator_confirmation_required`
- [ ] Creator funds → status: `creator_funded`
- [ ] Joiner funds → status: `active`
- [ ] Challenge completes successfully

#### 2. Creator Timeout Scenarios
- [ ] Joiner expresses intent → Creator walks away → Timer expires (5 min)
  - [ ] Verify challenge reverts to `pending_waiting_for_opponent`
  - [ ] Verify no funds locked
  - [ ] Verify joiner can express intent again
- [ ] Joiner expresses intent → Creator rejects wallet prompt → Verify state reverts
- [ ] Browser refresh during `creator_confirmation_required` → Verify state persists correctly

#### 3. Joiner Timeout Scenarios
- [ ] Creator funds → Joiner walks away → Timer expires (5 min)
  - [ ] Verify challenge reverts to `pending_waiting_for_opponent`
  - [ ] Verify creator refunded on-chain
  - [ ] Verify Firestore state correct
- [ ] Creator funds → Joiner rejects wallet prompt → Verify refund works
- [ ] Browser refresh during `creator_funded` → Verify state persists correctly

#### 4. Pending Challenge Expiration
- [ ] Create challenge → No one joins → 24 hours pass
  - [ ] Verify challenge expires and cancels
  - [ ] Verify no funds locked

#### 5. Adversarial Scenarios
- [ ] Creator tries to fund before joiner expresses intent → Should fail
- [ ] Joiner tries to fund before creator funds → Should fail
- [ ] Multiple joiners try to express intent → Only first succeeds
- [ ] Creator tries to express intent on own challenge → Should fail
- [ ] Browser crash mid-transaction → Verify state consistency after reconnect
- [ ] Network interruption during funding → Verify proper error handling

#### 6. Multi-Device Testing
- [ ] Create challenge on Desktop → Express intent on Mobile
- [ ] Fund from different device → Verify state syncs correctly
- [ ] Test real-time Firestore updates across devices

---

## Phase 2: Contract Refund Verification

**Goal**: Confirm contract is the final authority - no funds can remain locked.

### Manual Contract Tests

- [ ] Call `auto_refund_joiner_timeout` instruction manually after deadline
  - [ ] Verify succeeds without admin privileges
  - [ ] Verify creator receives refund
  - [ ] Verify challenge state updates correctly
- [ ] Test contract revert scenarios:
  - [ ] Creator timeout → Contract reverts correctly
  - [ ] Joiner timeout → Contract refunds creator
  - [ ] Pending expiration → Contract cancels correctly
- [ ] Verify contract state matches Firestore state after all operations

### Edge Cases
- [ ] Test refund after multiple timeout attempts
- [ ] Verify no double-refunds possible
- [ ] Test refund with network congestion/slow confirmation

---

## Phase 3: UI Clarity Pass

**Goal**: Every state has a single, unambiguous message. No mixed signals.

### State Messages Review

#### `pending_waiting_for_opponent`
- [ ] Creator sees: "Waiting for opponent..." (NO action buttons)
- [ ] Others see: "Express Join Intent (No Payment)" button
- [ ] Message is clear: No funds committed yet

#### `creator_confirmation_required`
- [ ] Creator sees: "Opponent found! Confirm & Fund" with countdown
- [ ] Creator sees: Opponent wallet address displayed
- [ ] Others see: "Waiting for creator to confirm..." (NO payment buttons)
- [ ] Message is clear: Creator must fund within 5 minutes

#### `creator_funded`
- [ ] Challenger sees: "Creator funded. Fund now to activate" with countdown
- [ ] Creator sees: "Waiting for challenger to fund..."
- [ ] Others see: Status message only
- [ ] Message is clear: Challenger must fund within 5 minutes

#### `active`
- [ ] All see: "Challenge Active" status
- [ ] Participants see: Appropriate action buttons
- [ ] Message is clear: Challenge is live

### Button Visibility Rules
- [ ] No payment button shown unless contract state explicitly allows it
- [ ] Buttons disabled when wallet not connected
- [ ] Clear error messages for invalid actions
- [ ] Timeout messages are prominent and clear

---

## Phase 4: Logging and Observability

**Goal**: Ability to answer "Why did this challenge revert?" quickly.

### Required Logs/Events

#### Firestore Functions
- [ ] Log when `expressJoinIntent` is called (wallet, challengeId, timestamp)
- [ ] Log when `creatorFund` is called (wallet, challengeId, timestamp)
- [ ] Log when `joinerFund` is called (wallet, challengeId, timestamp)
- [ ] Log timeout reversions: `revertCreatorTimeout`, `revertJoinerTimeout`, `expirePendingChallenge`
  - [ ] Include: challengeId, previous state, new state, reason, timestamp

#### Contract Events (if supported)
- [ ] Log state transitions on-chain
- [ ] Log refund transactions
- [ ] Log timeout reversions

#### UI Events (Optional, for debugging)
- [ ] Log when user clicks funding buttons
- [ ] Log wallet rejection/cancellation
- [ ] Log browser refresh during critical states

### Query Examples We Should Support
- "Why did challenge X revert?" → Query logs for challengeId
- "Who timed out on challenge Y?" → Query timeout logs
- "Show all creator timeouts in last 24h" → Query timeout logs by type

---

## Testing Protocol

1. **Use Two Separate Wallets**: Creator wallet and Joiner wallet
2. **Test Each Scenario 3 Times**: Ensure consistency
3. **Document Failures**: If something fails, document exact steps to reproduce
4. **Verify On-Chain State**: After each test, verify contract state matches Firestore
5. **Check Console Logs**: Ensure no errors or unexpected warnings
6. **Test Network Conditions**: Try with slow network, network interruption

---

## Success Criteria

✅ All adversarial scenarios fail safely (no funds locked)
✅ Contract refunds work correctly in all timeout scenarios
✅ UI messages are clear and unambiguous
✅ State transitions are logged for debugging
✅ No edge cases leave funds or state inconsistent
✅ Real-time Firestore updates work correctly across devices

---

## Notes

- This testing should be done on **devnet only**
- Do NOT deploy to mainnet until all tests pass
- Document any issues found during testing
- Consider adding automated tests for critical paths after manual testing completes

