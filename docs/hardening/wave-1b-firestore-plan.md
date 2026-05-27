# Wave 1B — Firestore rules plan (plan only)

> **Plan only.** Wave 1A does not fully lock `status`. Implement when devnet flows are stable on Preview.

**Status:** Not implemented. Builds on Wave 1A (`safety/prelaunch-hardening-p0`).  
**Goal:** Close remaining integrity gaps without breaking devnet gameplay.  
**Prerequisite:** Smoke-test create/join/play on devnet after Wave 1A (see [`README.md`](./README.md)).

---

## Problems Wave 1A leaves open

| Gap | Risk |
|-----|------|
| `status` not in privileged deny list | Participant may set `status: completed` in isolation via SDK |
| `isParticipantGameplayResolutionUpdate` is broad | One update with `status: completed` + `winner` + payout flags may pass if `winner ∈ players` |
| Terminal fields split across client paths | Hard to reason about; stats/completion trust client order |
| No per-transition `affectedKeys()` allowlists | Rules don’t mirror `challenge-write-matrix.md` row-by-row |

---

## Wave 1B objectives

1. **Lock down `status` manipulation** — only explicit transitions allowed for non-admin.
2. **Replace broad gameplay helper** with **named transition allowlists** (one helper per transition).
3. **Prevent participant-forged terminal completion** — `completed` only via allowed transitions that include required co-fields.
4. **Reserve terminal resolution fields** for server + claim paths only (see table below).
5. **Preserve devnet flows** (create, join, fund, active, results, claim).

---

## Proposed rules structure

```
challenge update allowed IF:
  (existing join / bind / join-intent paths) OR
  (isAdminUser && disputed) OR
  isAllowedTransition_<name>() OR
  isParticipantPayoutClaimUpdate()  // keep from 1A, possibly tighten
AND challengePdaImmutableAfterSet()
AND challengePayoutSignatureImmutable()
AND challengePrivilegedFieldsOk()  // simplified: admin-only + claim-only fields
```

Remove monolithic `isParticipantGameplayResolutionUpdate()`.

---

## Status transition allowlist (draft)

| Transition ID | From `resource.status` | To `request.status` | Who | Allowed `affectedKeys()` (max) |
|---------------|------------------------|---------------------|-----|--------------------------------|
| **T1** | `pending_waiting_for_opponent` | `creator_confirmation_required` | Joiner | `status`, `pendingJoiner`, `opponentWallet`, `creatorFundingDeadline` (existing `isJoinIntentUpdate`) |
| **T2** | funding states | `creator_funded` / joiner fund | Participant | funding fields only (audit `writeChallengeFields` fund paths) |
| **T3** | funded | `active` | Participant | `status`, `pda` (if unset), warmup fields, `players`/`playersUid`, `updatedAt` |
| **T4** | `active` / `in-progress` | — | Participant | `results`, `updatedAt` only |
| **T5** | `active` / `in-progress` | `awaiting_auto_resolution` | Loser | `results`, `status`, `provisionalWinner`, `lossReportedBy`, `resolveAfter`, `resolutionMeta`, `updatedAt` |
| **T6** | `awaiting_auto_resolution` | `disputed` | Participant | `status`, `disputedBy`, `disputedAt`, `disputeReason`, `winner`, `updatedAt` |
| **T7** | `active` | `disputed` | Participant | `status`, `winner`, `results`, `updatedAt` (both-win path) |
| **T8** | `awaiting_auto_resolution` | `completed` | **Server only** (function) OR client only after scheduler marker | Prefer move to `provisionalResolution` Admin SDK |
| **T9** | `completed` (post-resolution) | `completed` | Participant | payout-enablement bundle only: `needsPayout`, `canClaim`, `payoutStatus`, `payoutTriggered`, `winner`, `resolutionType`, `prizePool`, `results` strip, `updatedAt` |
| **T10** | `disputed` | `completed` | **Admin / server only** | full completion + payout flags |

**Wave 1B decision:** Move **T8** and auto-complete from `determineWinner` / scheduler to **trusted writers only** where possible; if client must keep T9, require `resource.status` already `completed` OR coming from allowed predecessor in same transaction (hard in rules — may need callable).

---

## Field ownership after 1B

| Field group | Non-admin client | Admin Firebase | Cloud Functions |
|-------------|------------------|----------------|-----------------|
| `status` | Transition allowlist only | Disputed → completed | `provisionalResolution`, finalize dispute |
| `winner` | T5–T7, T9 (with guards) | Admin resolve | Server auto-resolve |
| `needsPayout`, `canClaim`, `payoutStatus` (pending) | T9 bundle only | Admin | `finalizeAdminChallengeDispute` |
| `payoutLock*` / `prizeClaimedAt` | Claim helper only | — | — |
| `resolvedBy`, `statsApplied` | **Never** | Never (use server) | Always |

---

## Implementation order (when approved)

| Step | Work | Regression risk |
|------|------|-----------------|
| **1B-1** | Add `status` transition map; deny any `status` change not matching a transition | High — fund/join QA |
| **1B-2** | Split gameplay helper into T4–T7 allowlists | Medium |
| **1B-3** | Tighten completion: require prior `results` keys or `awaiting_auto_resolution` for `completed` | Medium |
| **1B-4** | Optional: callable `enableChallengePayout` for T9 instead of client | Low–medium |
| **1B-5** | Rules emulator + devnet smoke re-run | — |

---

## Out of scope for 1B

- Challenge read scoping (P1)
- Other collections (`challenge_lobbies`, `stats`)
- Mainnet env flip
- Dispute UI unification (P0.3)

---

## Success criteria

- Abuse test **H** (`status: completed` only) → **Deny**
- Abuse forged `completed` + `winner` + `needsPayout` without valid prior state → **Deny**
- All 12 gameplay flows in QA template still **Pass** on devnet

---

## Estimated effort

| Item | Effort |
|------|--------|
| Rules refactor + emulator cases | 1–2 days |
| Client adjustments (if T9 moved to callable) | 0.5–1 day |
| Staging QA re-run | 0.5–1 day |
