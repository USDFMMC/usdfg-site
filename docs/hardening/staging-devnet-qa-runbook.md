# Staging / devnet QA runbook

> **Branch:** `safety/prelaunch-hardening-p0` only — **do not merge to `main`** until merge gates pass.  
> **Execution:** Use with `staging-deploy-checklist.md` and `qa-execution-order.md`. Record results in `qa-results-template.md`.

---

## ⚠️ Hardening status (read first)

| Item | Status |
|------|--------|
| **Wave 1A** | Deployed in branch (`firestore.rules`) — partial protection |
| **`status` field gap** | Wave 1A does **not** fully lock `status`; abuse test **H** may still **allow** |
| **Wave 1B** | **Required** before production hardening is considered complete — **not implemented** |
| **P0.3 dispute unification** | **Not implemented** — plan only |
| **Lobby Firestore-only admin resolve** | **Deprecated for QA sign-off** — use `/admin/disputes` only |

**Do not begin Wave 1B or P0.3 implementation until QA results are collected and reviewed.**

---

## Scope

- Preview client from `safety/prelaunch-hardening-p0`
- Firestore rules (Wave 1A) on **staging / QA Firebase project**
- Solana **devnet** only
- **No** Cloudflare Production deploy
- **No** `VITE_APP_ENV=production` + devnet builds

---

## 1. Preconditions

```bash
cd /path/to/usdfg-site
git fetch origin
git checkout safety/prelaunch-hardening-p0
git pull origin safety/prelaunch-hardening-p0
git rev-parse HEAD
git branch --show-current   # must be safety/prelaunch-hardening-p0
```

---

## 2. Firebase target

`.firebaserc` default: `usdfg-app`. If you have a **dedicated staging project**, use it:

```bash
firebase login
firebase use --add    # optional: alias "staging"
firebase use <STAGING_PROJECT_ID>
firebase projects:list   # confirm active project before deploy
```

**Production guard:** Never deploy rules to a prod-only project while testing this branch unless that project **is** your intentional QA environment.

---

## 3. Deploy Firestore rules (staging only)

```bash
# Optional validate
firebase deploy --only firestore:rules --project <STAGING_PROJECT_ID> --dry-run

# Deploy
firebase deploy --only firestore:rules --project <STAGING_PROJECT_ID>
```

**Do not run** (unless explicitly intended):

```bash
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy
```

**Verify:** Firebase Console → Firestore → Rules → publish time matches this branch.

**Rollback ready:** Console → Rules → History (see section 8).

---

## 4. Deploy preview client (Cloudflare Pages)

1. **Workers & Pages** → USDFG project → deploy **Preview** from branch `safety/prelaunch-hardening-p0`.
2. Set env vars under **Preview** (not Production) — see section 5.
3. Do **not** promote to Production or redeploy Production from this branch.

**Local alternative:**

```bash
cp .env.example .env.local
# fill staging Firebase + devnet (section 5)
npm ci && npm run build && npm run preview
```

**Build guard smoke:**

```bash
# Must FAIL
VITE_APP_ENV=production VITE_SOLANA_CLUSTER=devnet npm run build

# Must PASS for staging QA
VITE_APP_ENV=staging VITE_SOLANA_CLUSTER=devnet npm run build
```

---

## 5. Environment variables

### Required (Preview / `.env.local`)

```env
VITE_APP_ENV=staging
VITE_SOLANA_CLUSTER=devnet

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=          # must match rules deploy project
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Strongly recommended

```env
VITE_SOLANA_RPC_ENDPOINT=          # devnet RPC (Helius/QuickNode/public)
```

### Optional (devnet defaults in `src/lib/chain/environment.ts`)

```env
VITE_USDFG_PROGRAM_ID=FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP
VITE_USDFG_MINT=7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX
VITE_USDFG_ADMIN_WALLET=3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd
VITE_USDFG_PLATFORM_WALLET=AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq
VITE_SITE_ORIGIN=https://<preview>.pages.dev
```

### Forbidden for this QA

```env
VITE_APP_ENV=production
VITE_SOLANA_CLUSTER=mainnet-beta
```

### Backend (same Firebase project — usually already deployed)

- `createAdminNonce`, `verifyAdmin`, `finalizeAdminChallengeDispute`, `finalizeProvisionalChallengeResolutions`
- Region: `us-central1`

---

## 6. Confirm not touching production

| Check | Pass |
|-------|------|
| Git branch | `safety/prelaunch-hardening-p0` |
| Cloudflare deployment | **Preview** only |
| `VITE_APP_ENV` | `staging` or `development` |
| Built `VITE_FIREBASE_PROJECT_ID` | Staging project (browser console: `FIREBASE CONFIG`) |
| Firebase CLI active project | Staging / QA ID |
| `firebase deploy` | `--only firestore:rules` only |
| Public `usdfg.pro` | Unchanged (no Production Pages deploy) |
| Phantom | **Devnet**; explorer `?cluster=devnet` |

---

## 7. Admin testing (`/admin/disputes`)

### Canonical path only

1. On-chain `resolve_admin`
2. Callable `finalizeAdminChallengeDispute`
3. Firestore terminal state

Routes: `/admin/disputes` or `/console-7x9a/disputes`.

### ⛔ Lobby Firestore-only resolve — deprecated for QA sign-off

`StandardChallengeLobby.tsx` “Creator wins / Challenger wins” calls `resolveAdminChallenge()` with **no on-chain tx**. **Do not** use for flow 9 pass/fail. Expected: fail or irrelevant under Wave 1A + anonymous `/app` auth.

### Admin setup

1. **Firestore** `admins/{wallet}` — document ID = **lowercase** wallet (e.g. `3selodgsajuqu2pzskzv7lm7g7gktckmrd693u69kcud`):

   ```json
   { "active": true, "role": "admin" }
   ```

2. **Phantom** — devnet, address = `VITE_USDFG_ADMIN_WALLET` (or default above).
3. Open `/admin/disputes` → connect → sign nonce → verified.
4. Resolve disputed challenge → confirm `adminResolutionTx`, `status: completed`, `canClaim: true`.
5. Winner claims in `/app` (flow 10).

---

## 8. Rollback plan

### Console (fastest)

Firestore → Rules → **History** → roll back to pre–Wave 1A rules → re-test create/join.

### CLI

```bash
git show <KNOWN_GOOD_COMMIT>:firestore.rules > firestore.rules
firebase deploy --only firestore:rules --project <STAGING_PROJECT_ID>
git checkout safety/prelaunch-hardening-p0 -- firestore.rules
```

### Client

Redeploy previous Cloudflare Preview; do not touch Production.

---

## 9. Merge gate (summary)

Full checklist in `qa-results-template.md` sign-off. Minimum:

- [ ] Preview + rules on same Firebase project
- [ ] Flows 1–10 pass (11–12 pass or waived with reason)
- [ ] Flow 9 via **Dispute Console only**
- [ ] Abuse A–G deny; I–J allow; H documented
- [ ] Wave 1A limitations acknowledged; Wave 1B tracked
- [ ] QA + Engineering sign-off before `main` merge

---

## Related docs

| Doc | Use |
|-----|-----|
| `staging-deploy-checklist.md` | Fast operator pre-flight |
| `qa-execution-order.md` | Test sequence |
| `qa-results-template.md` | Record pass/fail |
| `challenge-write-matrix.md` | Write path reference |
| `wave-1b-firestore-plan.md` | Post-QA rules work (plan only) |
| `p0-3-dispute-unification-plan.md` | Post-QA dispute path (plan only) |
