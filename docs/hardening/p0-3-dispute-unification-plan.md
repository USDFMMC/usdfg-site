# P0.3 — Dispute resolution unification plan (plan only)

> **Plan only.** Until implemented, use **`/admin/disputes`** for disputes — not lobby Firestore-only resolve.

**Status:** Not implemented.  
**Goal:** Single canonical admin dispute path; eliminate Firestore-only lobby resolve.  
**Prerequisite:** Wave 1A on `usdfg-app`; optional Wave 1B in parallel.

---

## Current state (problem)

| Path | Location | On-chain | Server finalize | Firestore |
|------|----------|----------|-----------------|-----------|
| **Canonical** | `DisputeConsole.tsx` | `resolveAdminChallengeOnChain` | `finalizeAdminChallengeOnServer` | Admin SDK via `finalizeAdminChallengeDispute` |
| **Split / unsafe** | `StandardChallengeLobby.tsx` `handleResolveDispute` | **None** | **None** | Client `resolveAdminChallenge()` |

Lobby path sets `status: completed`, `resolvedBy`, payout flags **without** chain proof. Under Wave 1A rules, lobby path likely **fails** for wallets without `admins/{uid}` — but UI still exposes buttons (confusing + wrong if admin doc exists on wrong wallet).

Claim flow expects `resolvedBy` + may call `resolveAdminChallengeOnChain` only when Firestore `status === 'disputed'` — **desync** if lobby set `completed` first.

---

## Target pipeline (canonical)

```
Admin selects winner in Dispute Console
        │
        ▼
[1] resolveAdminChallengeOnChain(adminWallet, challengeId, winner)
        │  Solana program enforces dispute + authority
        ▼
[2] finalizeAdminChallengeDispute (callable, requireAdminClaims)
        │  Validates status === disputed, winner ∈ players
        ▼
[3] Firestore: completed, winner, payout flags, adminResolutionTx, audit log
        │
        ▼
[4] Winner claims (optional) via existing claimChallengePrize
        │  resolve_challenge OR admin-resolved branch (align with on-chain state)
```

**Invariant:** No Firestore `completed` / `needsPayout` for disputes until step [2] succeeds after step [1].

---

## Implementation plan (minimal UX change)

### Step P0.3-1 — Disable lobby Firestore-only resolve

| Change | File | Approach |
|--------|------|----------|
| Remove or gate lobby resolve buttons | `StandardChallengeLobby.tsx` | Hide when `status === 'disputed'` **or** show “Open Admin Console” link only |
| Deprecate client export | `firestore.ts` `resolveAdminChallenge` | Mark `@deprecated`; throw if called outside tests |
| Keep `triggerChallengeDispute` | Same file | Unchanged |

**No redesign:** Replace admin buttons with link text + `window.open('/admin/disputes')` or in-app route.

### Step P0.3-2 — Harden Dispute Console as only writer

| Change | File | Approach |
|--------|------|----------|
| Ensure on-chain always first | `DisputeConsole.tsx` | Already correct; add guard if `status !== 'disputed'` |
| Server rejects non-disputed | `functions/src/finalizeChallenge.ts` | Already checks `status === 'disputed'` |
| Rules: admin client writes on disputed | `firestore.rules` | Narrow `isAdminUser() && disputed` to **deny** client admin writes in 1B; only server writes completion (optional hardening) |

### Step P0.3-3 — Align claim with on-chain state

| Change | File | Approach |
|--------|------|----------|
| After admin finalize, Firestore `status: completed` | `finalizeChallenge.ts` | Already sets this |
| Claim path | `claimChallengePrize` | Ensure `resolveAdminChallengeOnChain` not required when already resolved on-chain; use `resolve_challenge` or detect `adminResolutionTx` |
| Audit | `contract.ts` | Verify program state after `resolve_admin` vs `disputed` check at line ~1418 |

### Step P0.3-4 — Firestore rules alignment

| Rule | Intent |
|------|--------|
| Non-admin cannot set `resolvedBy` | Wave 1A ✓ |
| Only server sets `completed` from `disputed` | Wave 1B / optional: remove `isAdminUser() && disputed` client update entirely |

---

## What we will NOT do in P0.3

- Redesign Dispute Console UI
- Change tournament admin bracket override (`TournamentBracketView` founder ops) — separate ops policy
- Merge to `main` or production deploy
- Force mainnet

---

## Devnet testing after P0.3

Re-run devnet smoke flows:

- **7** Trigger dispute  
- **9** Admin resolve **only** via `/admin/disputes`  
- **10** Winner claim after admin resolve  

Confirm lobby has **no** working Firestore-only resolve (expected).

---

## Dependencies

| Dependency | Notes |
|------------|-------|
| Program audit (P0.4) | Confirm `resolve_admin` signer requirements |
| Firebase `admins/{wallet}` docs | Admin must complete `useAdminWalletAuth` flow |
| Wave 1A rules deployed | Lobby path already blocked for non-admin |

---

## Rollout order

1. P0.3-1 (lobby disable/link) — **low risk**, can ship on safety branch alone  
2. P0.3-2 / 1B-3 claim alignment — **medium risk**, QA flows 9–10  
3. Optional: remove client admin Firestore writes from rules — **server-only finalize**

---

## Success criteria

- Zero production use of `resolveAdminChallenge` from lobby  
- All dispute resolutions have `adminResolutionTx` + server audit log  
- Escrow state and Firestore `status` / `winner` / payout flags stay aligned  
- Devnet flows 7, 9, 10 pass on staging

---

## Estimated effort

| Item | Effort |
|------|--------|
| Lobby gating + link | 1–2 hours |
| Claim alignment + QA | 0.5–1 day |
| Rules cleanup (optional) | 0.5 day |
