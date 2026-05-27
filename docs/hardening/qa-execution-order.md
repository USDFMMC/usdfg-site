# QA execution order

> **Record results in:** [`qa-results-template.md`](./qa-results-template.md)  
> **Pre-flight:** [`staging-deploy-checklist.md`](./staging-deploy-checklist.md)

---

## ⚠️ Warnings (mandatory)

1. **Lobby Firestore-only admin resolve is deprecated for QA sign-off.**  
   Do **not** use Standard Challenge Lobby “Creator wins / Challenger wins.”  
   **Admin flow 9:** `/admin/disputes` only (on-chain → server → Firestore).

2. **Wave 1A `status` gap remains.**  
   Abuse test **H** (`status: completed` only) may **still allow**. Document result; do **not** treat as production-ready.

3. **Wave 1B is required** before production hardening is complete.  
   **No Wave 1B / P0.3 code** until this QA cycle is finished and reviewed.

---

## Phase 0 — Environment (5 min)

| Step | Action |
|------|--------|
| 0.1 | Preview URL + devnet Phantom |
| 0.2 | Confirm `projectId` in console = staging Firebase |
| 0.3 | Create throwaway challenge → Firestore write OK |

---

## Phase 1 — Abuse tests (Rules Playground)

Use disposable `challenges/{testId}` or Playground simulator. Log in **template § Abuse tests**.

| Order | ID | Expected |
|-------|-----|----------|
| 1 | **I** | Allow — legitimate `results` |
| 2 | **J** | Allow — legitimate claim lock |
| 3 | **A** | Deny — forge `winner` |
| 4 | **B** | Deny — `needsPayout` while active |
| 5 | **C** | Deny — `canClaim` alone |
| 6 | **D** | Deny — `payoutStatus: paid` |
| 7 | **E** | Deny — `resolvedBy` / `resolvedAt` / `adminResolutionTx` |
| 8 | **F** | Deny — `statsApplied` |
| 9 | **G** | Deny — `payoutLockOwner` when not completed |
| 10 | **H** | Document — Wave 1A gap if **Allow** |

---

## Phase 2 — Happy path (Flows 1–4)

**One challenge, two wallets.**

| Order | Flow | Template § |
|-------|------|----------------|
| 1 | Create challenge | 1 |
| 2 | Join challenge | 2 |
| 3 | Fund challenge | 3 |
| 4 | Active / live | 4 |

**Stop if any fail.**

---

## Phase 3 — Results (Flows 5–6)

Same challenge:

| Order | Flow | Template § |
|-------|------|----------------|
| 5 | Submit win | 5 |
| 6 | Submit loss → `awaiting_auto_resolution` | 6 |

---

## Phase 4 — Auto-resolution (Flow 8)

**Use a second challenge** (repeat 1–6, do **not** dispute):

| Order | Flow | Template § |
|-------|------|----------------|
| 7 | Wait for `resolveAfter` + scheduler | 8 |
| 8 | Verify `completed` + `winner` + payout flags | 8 |

Allow several minutes; check Functions logs if blocked.

---

## Phase 5 — Dispute + admin + claim (Flows 7, 9, 10)

**Third challenge** (repeat 1–6):

| Order | Flow | Template § | Notes |
|-------|------|------------|--------|
| 9 | Trigger dispute | 7 | Manual or both WIN |
| 10 | **Admin resolve** | 9 | **`/admin/disputes` ONLY** |
| 11 | Winner claim | 10 | Devnet tx + Firestore payout fields |

⛔ **Skip lobby resolve buttons** for flow 9 sign-off.

---

## Phase 6 — Tournament (Flows 11–12) — last

| Order | Flow | Template § |
|-------|------|----------------|
| 12 | Tournament completion | 11 |
| 13 | Champion claim | 12 |

Waive only with written reason in template.

---

## Phase 7 — Sign-off

- [ ] Complete **Known limitations** in template
- [ ] **Lobby resolve:** not used for pass
- [ ] **H documented** if Allow
- [ ] QA + Engineering approval rows
- [ ] **Merge to main:** leave unchecked until gates pass

---

## Quick reference

| Item | Value |
|------|--------|
| Admin route | `/admin/disputes` |
| Lobby admin resolve | **Deprecated** — do not sign off |
| Wave 1A `status` | **Gap** — Wave 1B required for prod hardening |
| Results file | `qa-results-template.md` |
