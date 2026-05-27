# Security & Firestore hardening (lean reference)

Practical notes for `safety/prelaunch-hardening-p0`. **Not** a formal QA pipeline — build, test on devnet/Preview, fix, iterate.

---

## What is live (keep these)

| Area | Location |
|------|----------|
| **Wave 1A Firestore rules** | `firestore.rules` — privileged fields blocked; client `delete` on `challenges` denied |
| **Join intent** | `isJoinIntentUpdate()` includes `updatedAt` (matches `expressJoinIntent`) |
| **Env config** | `src/lib/chain/environment.ts`, `.env.example` — devnet defaults; prod+devnet build guard |
| **Admin disputes** | Use `/admin/disputes` (on-chain → `finalizeAdminChallengeDispute`) — not lobby Firestore-only resolve |
| **Client expired cleanup** | Disabled until Admin SDK job exists (avoids `permission-denied` spam) |

---

## Known gaps (fix when ready, not blocking dev iteration)

- **`status` not fully locked** — Wave 1B plan: [`wave-1b-firestore-plan.md`](./wave-1b-firestore-plan.md)
- **Lobby `resolveAdminChallenge`** — deprecated; P0.3 plan: [`p0-3-dispute-unification-plan.md`](./p0-3-dispute-unification-plan.md)
- **Expired challenges** may linger in lists until server cleanup is added
- **Creator delete** via client `deleteDoc` still blocked by rules (intentional)

---

## Day-to-day workflow

1. Work on `safety/prelaunch-hardening-p0` until stable; **do not merge `main`** until you choose to.
2. `npm run dev` or Cloudflare **Preview** from the safety branch.
3. Phantom on **devnet**; set `VITE_SOLANA_RPC_ENDPOINT` in Preview (e.g. Helius devnet URL) — avoids 429 on public RPC.
4. After rules changes: `firebase deploy --only firestore:rules --project usdfg-app`
5. Smoke: create → join → fund → play → results / dispute / admin / claim as needed.

---

## Rollback (Firestore rules)

**Console (fast):** Firebase → Firestore → Rules → History → roll back.

**CLI:**

```bash
git show <COMMIT>:firestore.rules > firestore.rules
firebase deploy --only firestore:rules --project usdfg-app
```

Preview: redeploy a previous Cloudflare Preview build; do not touch Production until ready.

---

## Docs map

| Doc | Use |
|-----|-----|
| [`challenge-write-matrix.md`](./challenge-write-matrix.md) | Source of truth for `challenges/{id}` writes |
| [`wave-1b-firestore-plan.md`](./wave-1b-firestore-plan.md) | Future rules tightening (plan only) |
| [`p0-3-dispute-unification-plan.md`](./p0-3-dispute-unification-plan.md) | Single admin dispute path (plan only) |
| [`archive/`](./archive/) | Retired staging QA runbooks/templates (historical) |
