# Devnet QA results — pre-launch hardening

**Purpose:** Record pass/fail evidence for `safety/prelaunch-hardening-p0` before merge to `main`.  
**Related:** `challenge-write-matrix.md`, `firestore.rules` (Wave 1A).

---

## Test environment

| Field | Value |
|-------|--------|
| **Date** | |
| **Tester** | |
| **Branch / deploy** | `safety/prelaunch-hardening-p0` |
| **Preview URL** | |
| **Firebase project** | |
| **`firestore.rules` deployed?** | ☐ Yes ☐ No — **required for security QA** |
| **`VITE_APP_ENV`** | `development` / `staging` (not `production` on devnet) |
| **`VITE_SOLANA_CLUSTER`** | `devnet` (or unset) |
| **Solana explorer cluster in UI/logs** | Expected: `devnet` |

---

## Summary

| Area | Pass | Fail | Blocked | Notes |
|------|------|------|---------|-------|
| Gameplay flows (1–12) | /12 | | | |
| Firestore abuse tests (A–J) | /10 | | | |
| **Overall staging ready?** | ☐ Yes ☐ No | | | |

---

## Gameplay flows

### 1. Create challenge

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | `/app` → create challenge (`/app/challenge/new` or in-app flow) |
| **Wallet role** | Creator |
| **Expected Firestore** | New `challenges/{id}`: `createdByUid`, `status` (e.g. `pending_waiting_for_opponent`), `creator` / `creatorWallet`, `entryFee`, `game`; **no** `winner`, `needsPayout`, `payoutStatus` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 2. Join challenge

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | `/app` → challenge detail → Join |
| **Wallet role** | Opponent (non-creator) |
| **Expected Firestore** | `status: creator_confirmation_required`, `pendingJoiner`, `opponentWallet`; and/or `opponentUid` first bind |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 3. Fund challenge

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Challenge lobby / detail → fund escrow |
| **Wallet role** | Creator and/or joiner (per flow) |
| **Expected Firestore** | Funding statuses (`creator_funded`, joiner fund path); `pda` set once when paid |
| **Expected on-chain** | Devnet tx succeeds |
| **Explorer URL** | Must include `?cluster=devnet` (or mainnet-appropriate when configured) |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 4. Move to active / live

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Lobby after both sides funded |
| **Wallet role** | Participant |
| **Expected Firestore** | `status: active`; or warm-up: `warmupStatus: active`, `officialMatchStatus: waiting_ready` → `live` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 5. Submit win result

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Lobby → Submit Result → **YES** (I won) |
| **Wallet role** | Player A (first submitter) |
| **Expected Firestore** | `results.{canonicalKey}` with `didWin: true`, `submittedAt`; typically **no** `winner` until both sides resolved |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 6. Submit loss result

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Lobby → Submit Result → **NO** (I lost) |
| **Wallet role** | Losing player |
| **Expected Firestore** | `results`, `status: awaiting_auto_resolution`, `provisionalWinner`, `lossReportedBy`, `resolveAfter`, `resolutionMeta` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 7. Trigger dispute

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Lobby during `awaiting_auto_resolution` → **Dispute**; **or** both players submit WIN |
| **Wallet role** | Participant |
| **Expected Firestore** | `status: disputed`, `disputedBy`, `disputedAt`, `disputeReason` (manual); or `status: disputed`, `winner: null` (both-win) |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 8. Auto-resolution

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Wait past `resolveAfter` after loss report (no manual dispute) |
| **Wallet role** | N/A (Cloud Function `provisionalResolution` / scheduler) |
| **Expected Firestore** | `status: completed`, `winner`; client may then set `needsPayout`, `canClaim`, `payoutStatus: pending` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 9. Admin resolve (`/admin/disputes`)

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | `/admin/disputes` or `/console-7x9a/disputes` |
| **Wallet role** | Admin (`admins/{auth.uid}` in Firebase + wallet signature) |
| **Expected flow** | 1) On-chain `resolve_admin` 2) `finalizeAdminChallengeDispute` 3) Firestore `completed` + payout flags |
| **Do not use** | Lobby “resolve dispute” buttons (Firestore-only — expected **permission-denied** under Wave 1A rules) |
| **Expected Firestore** | `status: completed`, `winner`, `needsPayout`, `canClaim`, `payoutStatus: pending`, `resolutionType: admin`, `adminResolutionTx` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 10. Winner claim

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Lobby → **Claim reward** |
| **Wallet role** | Declared winner only |
| **Expected Firestore (lock)** | `payoutStatus: processing`, `payoutLockOwner`, `payoutAttemptedAt` |
| **Expected Firestore (success)** | `payoutSignature`, `payoutStatus: paid`, `needsPayout: false`, `payoutTriggered: true` |
| **Expected on-chain** | `resolve_challenge` or admin-resolved claim path on devnet |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 11. Tournament completion

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | `/app` → tournament bracket → play through to final |
| **Wallet role** | Creator + participants |
| **Expected Firestore** | `tournament.stage: completed`, `status: completed`, `winner` (champion), `needsPayout`, `canClaim`, `payoutStatus: pending` |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | |

---

### 12. Champion claim flags

| Item | Record |
|------|--------|
| **Pass / Fail / Blocked** | ☐ Pass ☐ Fail ☐ Blocked |
| **Route** | Tournament lobby after final match |
| **Wallet role** | Champion |
| **Expected UI** | Claim CTA visible when `canClaim` / `needsPayout` set |
| **Expected Firestore** | Same as Flow 10 for champion wallet |
| **Actual result** | |
| **Console errors** | |
| **Notes / screenshots** | Founder free tournaments may show manual-reward message instead |

---

## Direct Firestore abuse tests

Run as **signed-in participant** (not in `admins/{uid}`). Use Firebase Console Rules Simulator or a minimal test harness with user auth token.

| ID | Attack (single `update` on `challenges/{id}`) | Expected | Pass / Fail | Notes |
|----|-----------------------------------------------|----------|-------------|-------|
| **A** | Set `winner` to self only (no `status: completed`) | **Deny** | ☐ | |
| **B** | Set `needsPayout: true` while `status: active` | **Deny** | ☐ | |
| **C** | Set `canClaim: true` alone | **Deny** | ☐ | |
| **D** | Set `payoutStatus: paid` without claim flow | **Deny** | ☐ | |
| **E** | Set `resolvedBy`, `resolvedAt`, `adminResolutionTx` | **Deny** | ☐ | |
| **F** | Set `statsApplied: true` | **Deny** | ☐ | |
| **G** | Set `payoutLockOwner` while not `completed` | **Deny** | ☐ | |
| **H** | Set `status: completed` only (no other fields) | **Allow** (Wave 1A known gap) | ☐ | Document if observed |
| **I** | Legitimate: `results` only (win submit) | **Allow** | ☐ | |
| **J** | Legitimate: claim lock when `completed` + `needsPayout` | **Allow** | ☐ | |

---

## Known limitations (confirm still acceptable for staging)

| Item | Observed? | Acceptable for staging? |
|------|-----------|-------------------------|
| `status` not fully locked (Wave 1A) | ☐ | ☐ |
| Broad gameplay exception (Wave 1B pending) | ☐ | ☐ |
| Lobby admin resolve not canonical — use Dispute Console | ☐ | ☐ |
| Any unexpected `permission-denied` on happy path | ☐ | ☐ |

---

## Sign-off

| Role | Name | Date | Approve staging continue? |
|------|------|------|---------------------------|
| QA | | | ☐ Yes ☐ No |
| Engineering | | | ☐ Yes ☐ No |

**Merge to `main`:** ☐ Approved after staging ☐ Not yet
