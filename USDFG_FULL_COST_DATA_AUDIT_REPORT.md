# USDFG Full Cost + Data Audit Report

**Goal:** Zero recurring cost wherever possible · No Firebase unless required · No paid services for UI signaling.

**Constraints:** No new paid services · No hidden listeners · No speculative scaling · No Firebase just for UI · No fake data implying payouts.

---

## STEP 1 — INVENTORY

### 1.1 Firebase / Firestore

| File | What it does | Cost / scales with users? |
|------|----------------|---------------------------|
| `client/src/lib/firebase/config.ts` | Initializes Firebase app, Firestore `db`, Auth. | Free tier; beyond that: reads/writes/storage scale. |
| `client/src/lib/firebase/firestore.ts` | All Firestore usage: challenges, players, teams, chats, notifications, locks, rewards, audit. | **Yes.** Reads, writes, deletes scale. Realtime listeners = read on every change. |
| `client/src/hooks/useChallenges.ts` | `listenToChallenges()` (onSnapshot) + fallback `fetchChallenges()`. | **Yes.** One persistent listener per app load; reads on any challenge change. |
| `client/src/pages/app/index.tsx` | Imports 50+ firestore helpers; uses `useChallenges`, `getLeaderboardPlayers/Teams`, `getPlayersOnlineCount`, `updatePlayerLastActive`, `listenToAllUserLocks`, `listenToLockNotifications`, `listenToChallengeNotifications`, `fetchChallengeById`, etc. | **Yes.** Multiple listeners + periodic Firestore calls. |
| `client/src/pages/app/category/[category].tsx` | `useChallenges()` for category filtering. | Same as useChallenges. |
| `client/src/pages/app/profile/[address].tsx` | `getPlayerStats`, `getPlayerEarningsByChallenge`. | One-time reads per profile view. |
| `client/src/components/arena/PlayerProfileModal.tsx` | `getPlayerEarningsByChallenge`, `getTeamByMember`, etc. | One-time reads. |
| `client/src/components/arena/ChatBox.tsx` | `onSnapshot` on `challenge_chats` for real-time chat. | **Yes.** Listener per open lobby; reads on every message. |
| `client/src/components/arena/StandardChallengeLobby.tsx` | Firestore `challenge_chats` (collection ref, getDocs/delete). | Reads/writes when chat used. |
| `client/src/components/arena/TeamManagementModal.tsx` | `uploadTeamImage`, getTeamByMember, etc. | Writes + doc size (base64 in Firestore). |
| `client/src/components/home/leaderboard-preview.tsx` | `getTopPlayers`, `getTopTeams`. | One-time read per load. |
| `client/src/pages/admin/DisputeConsole.tsx` | `listenToDisputedChallenges` (onSnapshot), `resolveAdminChallenge`. | Listener when admin page open; writes on resolve. |
| `client/src/lib/chain/contract.ts` | `fetchChallengeById` (Firestore) before some on-chain ops. | One-time read per action. |

**Firestore collections in use:**  
`challenges`, `users`, `player_stats`, `teams`, `challenge_chats`, `challenge_notifications`, `lock_notifications`, `voice_signals`, `trust_reviews`, `founder_rewards`, `stats`, `admin_audit_log`, `admins`.

---

### 1.2 Realtime listeners / subscriptions

| Location | What | Cost / scales? |
|----------|------|-----------------|
| `firestore.ts` → `listenToChallenges` | onSnapshot( challenges, orderBy createdAt ). | **Yes.** Every challenge doc change = read. |
| `firestore.ts` → `listenToUserChallenges` | onSnapshot( challenges where creator == userId ). | **Yes.** (Currently only in hook; if used, per-user.) |
| `firestore.ts` → `listenActiveForCreator` | onSnapshot( challenges where creator, status in [...] ). | **Yes.** Used for “active for creator” (if any). |
| `firestore.ts` → `listenToLockNotifications` | onSnapshot( lock_notifications where participants array-contains wallet ). | **Yes.** Per connected wallet. |
| `firestore.ts` → `listenToChallengeNotifications` | onSnapshot( challenge_notifications where targetPlayer, status ). | **Yes.** Per connected wallet. |
| `firestore.ts` → `listenToAllUserLocks` | onSnapshot( usersCollection ) — **entire users collection.** | **Yes.** Very expensive; every user doc change = read. |
| `firestore.ts` → `listenToDisputedChallenges` | onSnapshot( challenges where status == 'disputed' ). | **Yes.** When admin console open. |
| `ChatBox.tsx` | onSnapshot( challenge_chats where challengeId ). | **Yes.** One listener per open lobby; every message = read. |
| `useChallenges.ts` | Uses `listenToChallenges` (above). | Same as listenToChallenges. |
| `index.tsx` | Subscribes to listenToAllUserLocks, listenToLockNotifications, listenToChallengeNotifications. | All scale with usage. |

---

### 1.3 Polling (setInterval / useEffect fetch loops)

| File | What | Interval | Cost / scales? |
|------|------|----------|-----------------|
| `client/src/pages/app/index.tsx` | `setInterval(updateTimer, 1000)` | 1s | Client-only; no cost. |
| `client/src/pages/app/index.tsx` | `setInterval(checkTimeouts, 30000)` | 30s | Triggers Firestore reads/writes (revert/expiry logic). **Scales.** |
| `client/src/pages/app/index.tsx` | `setInterval(fetchUsdfgPrice, 30000)` | 30s | **Mock:** no API; local `Math.random()`. **Zero cost.** |
| `client/src/pages/app/index.tsx` | `setInterval(fetchPlayersOnline, 30000)` | 30s | Calls `getPlayersOnlineCount()` → Firestore query. **Scales.** |
| `client/src/pages/app/index.tsx` | `setInterval(updatePlayerLastActive, 5*60*1000)` | 5 min | `updatePlayerLastActive(wallet)` → Firestore write. **Scales.** |
| `client/src/pages/app/index.tsx` | `setInterval(sync..., 30000)` (if any) | 30s | Depends on implementation; if it touches Firestore, scales. |
| `client/src/hooks/useChallengeExpiry.ts` | `setInterval(checkExpired, 30000)` | 30s | Reads challenges (in-mem), calls Firestore (updateChallengeStatus, cleanupExpiredChallenge, etc.). **Scales.** |
| `client/src/hooks/useResultDeadlines.ts` | `setInterval(checkDeadlines, 60000)` | 1 min | Calls `checkResultDeadline(challengeId)` → Firestore. **Scales.** |
| `client/src/lib/version.ts` | `setInterval(checkVersion, VERSION_CHECK_INTERVAL)` | 60s | Fetches same-origin `/index.html` (cache-bust). **No paid service.** |

---

### 1.4 On-chain reads triggered on load / UI

| File | What | Cost |
|------|------|------|
| `client/src/lib/chain/rpc.ts` | Uses `clusterApiUrl('devnet')` or `VITE_SOLANA_RPC_ENDPOINT`. | Free tier = rate limits; paid RPC = $ if used. |
| `client/src/pages/app/index.tsx` | `getTokenAccountBalance`, `getAssociatedTokenAddress` for USDFG price area / balance. | RPC read per call. |
| `client/src/components/arena/WalletConnectSimple.tsx` | `connection.getBalance`, `getTokenAccountBalance` on connect. | RPC reads. |
| `client/src/lib/chain/contract.ts` | `getAccountInfo`, `getLatestBlockhash`, `sendRawTransaction`, `confirmTransaction`, etc. | RPC; scales with tx + confirmation. |
| `client/src/lib/firebase/firestore.ts` | `syncChallengeStatus` (if re-enabled) → `connection.getAccountInfo(challengePDA)`. | RPC read per challenge sync. |
| `client/src/lib/chain/events.ts` | `getAccountInfo`, `getMinimumBalanceForRentExemption`, etc. | RPC. |

On-chain reads are required for real balances and transactions; cost is RPC (free tier or paid), not Firebase.

---

### 1.5 Analytics, logging, monitoring

| Item | Where | Cost |
|------|--------|------|
| Firebase Analytics | Not explicitly initialized in app code; SDK may include compat. | If enabled: events = cost. |
| console.log | Throughout (e.g. firestore.ts, index.tsx). | No direct $; dev noise only. |
| Terms/Privacy | Text mentions “analytics and integrity”; no third-party SDK found in app code. | N/A. |

No Sentry, Mixpanel, PostHog, or gtag found in app source. No analytics service wired for events.

---

### 1.6 Background / cron-like / timers

| Item | What | Cost |
|------|------|------|
| `useChallengeExpiry` | setInterval 30s; expiry/cleanup/archive. | Firestore writes/deletes. **Scales.** |
| `useResultDeadlines` | setInterval 60s; result-deadline logic. | Firestore reads/writes. **Scales.** |
| `index.tsx` checkTimeouts | setInterval 30s; creator/joiner funding timeouts. | Firestore. **Scales.** |
| `index.tsx` updatePlayerLastActive | setInterval 5 min. | Firestore write per user. **Scales.** |
| `index.tsx` fetchPlayersOnline | setInterval 30s. | Firestore query. **Scales.** |
| Version check | setInterval 60s; fetch `/index.html`. | Same-origin; no paid service. |

---

### 1.7 API / UI-only signals (no core logic)

| Item | Purpose | Cost |
|------|----------|------|
| `fetchUsdfgPrice` | Displays “live” USDFG price. | **None.** Implemented as local `Math.random()`; no external API. |
| `getPlayersOnlineCount` | “Players online” count. | Firestore query every 30s. **Scales.** |
| `updatePlayerLastActive` | “Last active” / presence. | Firestore write every 5 min per user. **Scales.** |
| `listenToLockNotifications` | Friendly match toasts. | Firestore listener. **Scales.** |
| `listenToChallengeNotifications` | Challenge invite toasts. | Firestore listener. **Scales.** |
| `listenToAllUserLocks` | User locks (e.g. “in challenge”). | **Heavy:** onSnapshot(users) entire collection. **Scales badly.** |
| LiveActivityTicker | Marquee “live” messages. | See Step 3. |

---

## STEP 2 — CLASSIFY BY NECESSITY

| Item | Classification | Reason |
|------|----------------|--------|
| **Firestore: challenges CRUD, create/join/fund/result/claim/tournament** | **CRITICAL** | Core app: challenges, brackets, payouts, state. |
| **listenToChallenges (useChallenges)** | **CRITICAL** | Needed so challenge list updates (new/join/complete) without full refresh. |
| **fetchChallengeById** | **CRITICAL** | Used for lobby, claim, dispute, sync. |
| **getPlayerStats, getPlayerEarningsByChallenge, player_stats writes** | **CRITICAL** | Profiles, leaderboard, trust, earnings. |
| **getLeaderboardPlayers / getLeaderboardTeams (getTopPlayers/Teams)** | **CRITICAL** | Leaderboard. |
| **challenge_chats (add + read)** | **OPTIONAL** | In-lobby chat is nice; not required to run a match. |
| **ChatBox onSnapshot(challenge_chats)** | **OPTIONAL** | Real-time chat; could be poll or “load on open” to cut cost. |
| **lock_notifications + listenToLockNotifications** | **OPTIONAL** | Friendly-match UX; not required for core 1v1/tournament. |
| **challenge_notifications + listenToChallengeNotifications** | **OPTIONAL** | Invite toasts; could be replaced by “refresh list” or poll. |
| **listenToAllUserLocks (entire users collection)** | **WASTE** | Listener on full collection is expensive and unnecessary for lean build. |
| **getPlayersOnlineCount + 30s poll** | **COSMETIC** | “X players online” is perception only. |
| **updatePlayerLastActive + 5 min poll** | **COSMETIC** | “Last active” is perception only. |
| **fetchUsdfgPrice (mock)** | **COSMETIC** | Fake price; no real value. |
| **LiveActivityTicker** | **COSMETIC** | Static copy + CSS; no data cost. |
| **Version check (fetch index.html)** | **OPTIONAL** | Nice for “new version” prompt; not core. |
| **useChallengeExpiry (expiry/cleanup)** | **CRITICAL** | Prevents stale/expired challenges; storage hygiene. |
| **useResultDeadlines** | **CRITICAL** | Enforces result submission rules. |
| **Creator/joiner funding timeouts (checkTimeouts)** | **CRITICAL** | Core flow. |
| **listenToDisputedChallenges** | **CRITICAL** (for admin) | Admin dispute console. |
| **Profile/team images (base64 in Firestore)** | **OPTIONAL** | Nice; increases doc size and storage. |
| **Founder rewards, stats/total_rewarded, admin_audit_log** | **CRITICAL** (for product) | Founder payouts and audit. |
| **Trust reviews** | **CRITICAL** | Trust score. |
| **Firebase Auth (admin)** | **CRITICAL** (if admin used) | Admin dispute/payout. |
| **Solana RPC (balance, tx, confirm)** | **CRITICAL** | On-chain truth; cost = RPC only. |

---

## STEP 3 — ZERO-COST REPLACEMENTS

| Item | Current | Zero-cost replacement |
|------|---------|------------------------|
| **LiveActivityTicker** | Static array + CSS marquee. | **Already 100% client-side.** No change. Keep as-is. |
| **fetchUsdfgPrice** | Mock `Math.random()`. | Keep as static or single fixed value; remove 30s interval to save CPU. |
| **“Players online” count** | Firestore query every 30s. | **Remove** or replace with: static “Community” label, or “Active now” with no number, or client-only “Join the arena” copy. No query. |
| **updatePlayerLastActive (5 min)** | Firestore write. | **Remove** for non-critical users. Keep only when needed for a future feature (e.g. strict “online” gate). |
| **listenToAllUserLocks** | onSnapshot(users). | **Remove** or replace with: on “My challenges” only, or no global lock UI; rely on challenge status from listenToChallenges. |
| **listenToLockNotifications** | Real-time friendly-match toasts. | **Optional remove.** Alternative: no toasts; user refreshes or reopens “Friendly” section; or poll every 60s only when that tab is open. |
| **listenToChallengeNotifications** | Real-time challenge invites. | **Optional remove.** Alternative: “Check Live Challenges” CTA; or poll challenges when app focused. |
| **ChatBox real-time** | onSnapshot(challenge_chats). | **Optional:** Replace with “Load messages” button + getDocs once when opening chat; or poll every 10–15s only while lobby open. |
| **Lobby “live” badges** | Derived from challenge status (Firestore). | Keep; status is already from critical listenToChallenges. No extra cost if no extra listeners. |
| **Version check** | Fetch `/index.html` every 60s. | Keep; same-origin, no paid service. Or increase interval to 5 min. |

**Perception of life without data spend:**  
- Keep LiveActivityTicker (client-only).  
- Keep “LIVE” / “OPEN” badges from existing challenge data.  
- Drop or replace “Players online” number and lastActive heartbeat.  
- Reduce or drop lock/challenge notification listeners; use refresh or rare poll.

---

## STEP 4 — FIREBASE REDUCTION PLAN

### What truly requires Firestore

- **Challenges:** create, join, fund, submit result, complete, claim, tournament bracket, founder payout.  
- **Player stats:** wins/losses/totalEarned/trust, profile display name/country, earnings-by-challenge.  
- **Leaderboard:** read from player_stats/teams.  
- **Trust reviews:** store and aggregate.  
- **Admin:** dispute list, resolve, audit log; optional Auth for admin.  
- **Expiry/deadlines:** useChallengeExpiry, useResultDeadlines, funding timeouts (can stay serverless with Firestore as source of truth).  
- **Challenge list UX:** at least one efficient listener (e.g. listenToChallenges) or short-interval poll.

### What is convenience, not necessity

- Real-time chat (onSnapshot chats).  
- Real-time “players online” count.  
- Real-time “last active” and presence.  
- Real-time lock notifications (friendly match).  
- Real-time challenge notifications (invites).  
- listenToAllUserLocks (whole users collection).  
- Profile/team images stored in Firestore (could be external or optional).

### Smallest Firebase surface

1. **Keep:**  
   - One challenges listener: `listenToChallenges` (or single query + poll every 30–60s if you prefer fewer listeners).  
   - All challenge/player/team/review/founder/admin CRUD used by the flows above.  
   - fetchChallengeById, getPlayerStats, getPlayerEarningsByChallenge, getTopPlayers/Teams.  
   - Optional: one-time chat load when opening lobby (getDocs) or rare poll; no onSnapshot for chat if you want to cut cost.

2. **Remove or limit:**  
   - **listenToAllUserLocks** → remove or replace with logic that does not listen to full `users`.  
   - **getPlayersOnlineCount** + 30s poll → remove or make static/copy.  
   - **updatePlayerLastActive** 5 min poll → remove unless required later.  
   - **listenToLockNotifications** / **listenToChallengeNotifications** → remove or replace with “refresh” / occasional poll when relevant tab open.  
   - **ChatBox onSnapshot** → replace with load-on-open or poll when lobby open.

3. **No Firebase for “feel live” only:**  
   - No extra listeners for presence, online count, or notifications unless you explicitly accept their cost.  
   - LiveActivityTicker stays client-side only.

---

## STEP 5 — FINAL OUTPUT

### 1. What we KEEP

- **Firestore:** Challenges (and all challenge flows), player_stats, teams, trust_reviews, founder_rewards, stats, admin_audit_log, admins; optional challenge_chats for chat (read/write, no realtime if removed).  
- **One challenges listener** (e.g. listenToChallenges) or equivalent poll for list updates.  
- **fetchChallengeById**, getPlayerStats, getPlayerEarningsByChallenge, getTopPlayers, getTopTeams.  
- **useChallengeExpiry**, useResultDeadlines, funding timeouts (Firestore as source).  
- **listenToDisputedChallenges** for admin.  
- **Firebase Auth** for admin if in use.  
- **Solana RPC** for balances and transactions.  
- **Version check** (same-origin fetch).  
- **LiveActivityTicker** (client-only; no backend).

### 2. What we REMOVE

- **listenToAllUserLocks** (onSnapshot(users)).  
- **getPlayersOnlineCount** and its 30s polling.  
- **updatePlayerLastActive** 5 min polling (unless you later need it for a specific feature).  
- **listenToLockNotifications** and **listenToChallengeNotifications** (or replace with refresh/poll as above).  
- **ChatBox onSnapshot** (replace with load-on-open or poll).  
- **fetchUsdfgPrice** 30s interval (keep mock or static; drop timer if desired).

### 3. What we REPLACE with zero-cost logic

- **“Players online”** → Static text (“Join the arena”, “Community”, or “Active challenges” with no count) or remove.  
- **“Last active”** → Remove or show only when already loaded with profile (no heartbeat).  
- **Friendly / challenge toasts** → “Check your challenges” or refresh button; or poll only when relevant view open.  
- **Chat** → Load messages once when opening lobby, or poll every 10–15s only while lobby open.  
- **LiveActivityTicker** → No change; already 100% client-side.

### 4. What the app will still do after changes

- Create, join, fund, play, and resolve 1v1 and tournament challenges.  
- Show live challenge list (via listenToChallenges or poll).  
- Leaderboard, profiles, earnings by challenge, trust scores.  
- Founder payouts and admin dispute resolution.  
- In-lobby chat with load-on-open or poll (no realtime listener if removed).  
- No “X players online” or “last active” heartbeat unless you re-add them later with explicit cost.  
- Same premium/competitive feel with lower Firestore and no paid UI-signal services.

### 5. LiveActivityTicker confirmation

**LiveActivityTicker is 100% client-side.**

- **File:** `client/src/components/LiveActivityTicker.tsx`.  
- **Data:** Single in-code array `activityItems` (e.g. “New challenge created …”, “Challenge completed …”).  
- **Rendering:** Static list duplicated for marquee, CSS animation `tickerScroll` (translateX).  
- **No:** No Firebase, no API calls, no analytics, no network.  
- **Cost:** Zero. Safe to keep.

---

## Summary table (cost vs necessity)

| Category | Keep | Remove | Replace with zero-cost |
|----------|------|--------|-------------------------|
| Firestore listeners | listenToChallenges, listenToDisputedChallenges | listenToAllUserLocks, (optionally) listenToLockNotifications, listenToChallengeNotifications, ChatBox onSnapshot | — |
| Firestore polling | — | getPlayersOnlineCount (30s), updatePlayerLastActive (5 min) | “Players online” → static/copy; last active → remove or on-demand only |
| UI / “live” | LiveActivityTicker (client-only), challenge status badges | fetchUsdfgPrice interval (optional) | Price → static or keep mock without interval |
| Chat | Optional: getDocs when opening lobby | onSnapshot(challenge_chats) | Load once or poll only while lobby open |

**Result:** Lean founder build: core functionality and one main challenges feed stay on Firebase; all “live” UI that currently costs money (listeners + polls for presence/notifications/chat) is removed or replaced with zero-cost alternatives. No new paid services; no Firebase used solely for UI signaling.

---

## IMPLEMENTATION LOCK (Applied)

The following cuts were implemented per founder decision:

1. **listenToAllUserLocks** — Removed. Lock state derived from lock_notifications via getLockNotificationsForWallet on mount and after handleLockToggle.
2. **getPlayersOnlineCount + updatePlayerLastActive** — Removed from app (no polling). UI shows static "Join the arena".
3. **listenToLockNotifications** — Replaced with one-time fetch getLockNotificationsForWallet on wallet connect; refetch after lock toggle.
4. **listenToChallengeNotifications** — Removed. Users see new challenges via listenToChallenges.
5. **Chat onSnapshot** — Replaced with load-on-open + poll every 15s while lobby open; refetch after send.
6. **fetchUsdfgPrice** — 30s interval removed; called once on mount only.
7. **Version check** — Interval 60s to 5 minutes.

**Rule:** No new Firestore listeners without explicit approval. Firebase only for state that matters.

---

## FOUNDER VERDICT (LOCK)

*Canonical lock: Firebase only for state that matters. Do not touch the following.*

### KEEP — NON-NEGOTIABLE

- `challenges` CRUD + lifecycle
- `useChallengeExpiry`, `useResultDeadlines`
- funding / join / claim timeouts
- **`listenToChallenges`** (ONE global listener only)
- leaderboards (`getTopPlayers`, `getTopTeams`)
- player stats, trust, founder rewards
- admin dispute flow
- Solana RPC reads/writes
- **LiveActivityTicker (client-only)** — do not connect to Firestore. Ever.

### CUT (APPLIED)

- ~~`listenToAllUserLocks`~~ — removed; lock state from `getLockNotificationsForWallet` on demand
- ~~Presence~~ — `getPlayersOnlineCount` / `updatePlayerLastActive` removed from app
- ~~`listenToLockNotifications`~~ — replaced with one-time fetch on wallet connect + refetch after lock toggle
- ~~`listenToChallengeNotifications`~~ — removed; users see new challenges via `listenToChallenges`
- ~~Chat `onSnapshot`~~ — replaced with load-on-open + poll every 15s while lobby open; refetch after send
- ~~`fetchUsdfgPrice` 30s interval~~ — once on mount only
- ~~Version check 60s~~ — 5 minutes

### OPTIONAL (APPLIED)

- Version check interval: 5 min
- Profile/team images: keep for now; note doc size

### FINAL ARCHITECTURE

**Firebase ONLY:** challenges, player stats, trust, leaderboards, admin + disputes, founder rewards.

**Firebase NOT:** presence, online counts, activity feeds, “live” UI signals, heartbeats, global notification listeners.

If a feature exists **only to make it feel alive**, it must be: client-side, static, session-based, or motion-based.

---

## NO NEW LISTENERS RULE

**Do not add new Firestore listeners without explicit founder approval.**

- One global listener: `listenToChallenges` only.
- All other Firestore usage: one-time reads or scoped polling (e.g. chat poll only while lobby open).
- No Firestore usage purely for UI signaling.
- Before adding any `onSnapshot` or new real-time subscription: confirm it is for core state that matters, not perception.
