# Challenge write matrix (source of truth)

> **Wave 1A:** `status` not fully locked — see [`wave-1b-firestore-plan.md`](./wave-1b-firestore-plan.md).  
> **Disputes:** `/admin/disputes` only — not lobby `resolveAdminChallenge`. Overview: [`README.md`](./README.md).

**Purpose:** Map every `challenges/{id}` write path for Firestore rules hardening (Wave 1A+).  
**Last updated:** Pre-launch hardening Phase 1.  
**Rules file:** `firestore.rules` (`challengePrivilegedFieldsOk` and helpers).

---

## Legend

| Class | Meaning |
|-------|---------|
| **Client-safe** | May remain on authenticated client when rules allowlisted |
| **Server-only** | Must use Cloud Functions / Admin SDK only |
| **Admin Firebase** | Requires `admins/{auth.uid}` + `isAdminUser()` |
| **Admin wallet UI** | Client checks `ADMIN_WALLET` (UI only — not security) |

---

## Privileged fields (Wave 1A)

These must not be forged by non-admin clients except via documented exceptions below.

| Field | Wave 1A |
|-------|---------|
| `winner` | Gameplay resolution exception only |
| `needsPayout`, `canClaim`, `payoutStatus` | Completion or claim exceptions |
| `payoutLockOwner`, `payoutTriggered`, `prizeClaimedAt` | Claim exception only |
| `payoutSignature` | Claim + immutability rule once set |
| `resolvedBy`, `resolvedAt`, `adminResolutionTx` | **Server/admin only** |
| `statsApplied` | **Server only** (`applyMatchStats`, functions) |

`status` is **not** globally locked in Wave 1A (Wave 1B will add transition allowlists).

---

## Write paths by feature

### Create challenge

| Writer | Function | Fields | Class |
|--------|----------|--------|-------|
| Client | `addDoc` / create flow in `firestore.ts` ~1879 | Initial challenge payload, `createdByUid` | Client-safe (create rule) |

### Join / funding

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client | `writeChallengeFields` join intents | `status`, `pendingJoiner`, `opponentWallet`, deadlines | Client-safe (`isJoinIntentUpdate`) |
| Client | `isOpponentUidFirstBind` | `opponentUid`, wallets | Client-safe |
| Client | Fund / activate paths ~2300–2450 | `status`, `pda` (first set), `players`, warmup fields | Client-safe (no privileged payout flags) |

### Result submission

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client | `submitChallengeResult` transaction ~3473 | `results`, `updatedAt` | Client-safe |
| Client | Loss auto-path ~3445 | `results`, `status: awaiting_auto_resolution`, `provisionalWinner`, `lossReportedBy`, `resolveAfter`, `resolutionMeta` | Client-safe (gameplay resolution) |

### Auto winner / forfeit / dispute

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client | `determineWinner` ~3692 | `status: disputed`, `winner: null` | Client-safe |
| Client | `determineWinner` forfeit ~3709 | `status: completed`, `winner: forfeit` | Client-safe |
| Client | `determineWinner` clear winner ~3741 | `status: completed`, `winner` | Client-safe |
| Client | `determineWinner` payout ready ~3783 | `needsPayout`, `canClaim`, `payoutStatus: pending`, … | Client-safe (gameplay resolution + completed) |
| Client | `triggerChallengeDispute` ~6437 | `status: disputed`, `disputedBy`, `disputeReason` | Client-safe |

### Tournament bracket

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client | Tournament advance ~924–1274 | `tournament`, match winners | Client-safe (no privileged unless completion) |
| Client | Tournament complete ~1099 | `status: completed`, `needsPayout`, `canClaim`, `payoutStatus`, `winner` | Client-safe (gameplay resolution) |

### Admin dispute resolution

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client (lobby) | `resolveAdminChallenge` ~6487 | `status: completed`, payout flags, `resolvedBy` | **Blocked for non-admin** in Wave 1A — use Dispute Console + server |
| Server | `finalizeAdminChallengeDispute` | Completion + payout enablement | Server-only |
| Client + server | `DisputeConsole` on-chain then `finalizeAdminChallengeOnServer` | `adminResolutionTx`, completion | Admin Firebase + server |

### Claim payout

| Writer | Function | Typical fields | Class |
|--------|----------|----------------|-------|
| Client | `claimChallengePrize` lock tx ~5958 | `payoutStatus: processing`, `payoutLockOwner`, `payoutAttemptedAt` | Client-safe (`isParticipantPayoutClaimUpdate`) |
| Client | `claimChallengePrize` success ~6074 | `payoutSignature`, `paid`, `needsPayout: false`, … | Client-safe (claim exception) |

### Stats

| Writer | Function | Fields | Class |
|--------|----------|--------|-------|
| Cloud Function | `applyMatchStats` | `statsApplied` | **Server only** |
| Client | `invokeApplyMatchStats` | (none direct) | Calls function only |

### Scheduled / server

| Writer | Function | Fields | Class |
|--------|----------|--------|-------|
| Cloud Function | `provisionalResolution` | Completion, stats | Server-only |
| Cloud Function | `finalizeAdminChallengeDispute` | Admin resolution metadata | Server-only |

---

## Firestore rules helpers (Wave 1A)

| Helper | Role |
|--------|------|
| `challengeAdminOnlyFieldsUntouched` | Blocks `resolvedBy`, `resolvedAt`, `adminResolutionTx`, `statsApplied` for all non-admin |
| `isParticipantGameplayResolutionUpdate` | Allows result/dispute/completion payout-enablement writes |
| `isParticipantPayoutClaimUpdate` | Allows winner claim lock/finalize fields |
| `challengePrivilegedFieldsOk` | Top-level gate on `challenges` update |
| `challengePayoutSignatureImmutable` | `payoutSignature` set-once |
| `challengePdaImmutableAfterSet` | `pda` immutable after set |

---

## Planned (Wave 1B+)

- Per-status `affectedKeys()` allowlists (replace broad gameplay helper)
- Narrow `challenges` read scope (participant-only)
- Unify lobby admin resolve with on-chain + `finalizeAdminChallengeDispute` (P0.3)
- Move completion/payout enablement to callable where rules are insufficient

---

## QA checklist (devnet)

After each rules deploy, verify on devnet:

1. Create challenge → join → fund → active  
2. Submit results (win / loss / dispute)  
3. Auto-resolution window → dispute escalate  
4. Admin resolve via Dispute Console (Firebase admin)  
5. Winner claim (lock → on-chain → paid)  
6. Tournament bracket advance + champion payout flags  

---

## Related files

- `src/lib/firebase/firestore.ts` — `writeChallengeFields`, `submitChallengeResult`, `claimChallengePrize`, `determineWinner`, `resolveAdminChallenge`
- `functions/src/finalizeChallenge.ts` — `finalizeAdminChallengeDispute`
- `functions/src/applyMatchStats.ts` — stats application
- `functions/src/provisionalResolution.ts` — scheduled auto-complete
