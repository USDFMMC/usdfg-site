# Staging deploy checklist (operator)

> **5-minute pre-flight** before QA. Full detail: `staging-devnet-qa-runbook.md`.

---

## ⚠️ Do not

- [ ] Merge to `main`
- [ ] Deploy Cloudflare **Production** from `safety/prelaunch-hardening-p0`
- [ ] Set `VITE_APP_ENV=production` on devnet
- [ ] Run `firebase deploy` (full) or `--only functions` unless intentional
- [ ] Use lobby “Creator wins / Challenger wins” for admin sign-off

---

## Branch & commit

- [ ] `git checkout safety/prelaunch-hardening-p0 && git pull`
- [ ] Note commit SHA: `________________`

---

## Firebase project

- [ ] `firebase use <STAGING_PROJECT_ID>` — **not** prod-only by mistake
- [ ] `firebase projects:list` — active project = intended QA project
- [ ] `VITE_FIREBASE_PROJECT_ID` in Preview env **matches** this project

---

## Firestore rules

- [ ] `firebase deploy --only firestore:rules --project <STAGING_PROJECT_ID>`
- [ ] Console → Firestore → Rules → publish time OK
- [ ] **Rollback ready:** Rules → History tab open / last-good version noted

---

## Cloudflare Pages (Preview only)

- [ ] Preview build triggered from `safety/prelaunch-hardening-p0`
- [ ] Env scope = **Preview** (Production vars untouched)
- [ ] Preview URL recorded: `________________`

---

## Env quick verify

- [ ] `VITE_APP_ENV` = `staging` or `development`
- [ ] `VITE_SOLANA_CLUSTER` = `devnet` (or unset → devnet default)
- [ ] All `VITE_FIREBASE_*` set on Preview
- [ ] `VITE_SOLANA_RPC_ENDPOINT` set (recommended)
- [ ] `VITE_USDFG_ADMIN_WALLET` = wallet you will use at `/admin/disputes`

---

## Runtime smoke (2 min)

- [ ] Open Preview → `/app` — no Firebase config errors
- [ ] Browser console `projectId` = staging project
- [ ] Phantom = **Devnet**
- [ ] Explorer links show `?cluster=devnet`

---

## Admin pre-flight

- [ ] Firestore `admins/{lowercase_wallet}` exists, `active: true`
- [ ] `/admin/disputes` → connect admin wallet → **Verified** (not Unauthorized)

---

## QA handoff

- [ ] Open `qa-execution-order.md` and start testing
- [ ] Fill `qa-results-template.md` as you go

**Sign-off when complete:** Operator initials `______` Date `______`
