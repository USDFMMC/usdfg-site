# USDFG UX Audit — Challenge Creation & Lobby Flow

**Goal:** Confirm whether flows feel like **entering an arena / making a decision / joining a room** — not like filling out a form, submitting an application, or onboarding paperwork.

**Scope:** Challenge creation, entering lobby, joining a challenge, getting ready to play. **Audit only — no refactors.**

---

## STEP 1 — CURRENT FLOW MAP

### A. Creating a challenge

| Step | What the player sees | What they click or input | Copy shown | Confirmations / modals |
|------|------------------------|---------------------------|------------|-------------------------|
| 1.0 | Arena home; nav + FAB | "Create Challenge" (nav or FAB) | — | — |
| 1.1 | Modal: "Create New Challenge"; progress dots 1–3 | — | Title: "Create New Challenge" | ElegantModal opens |
| 1.2 | **Step 1:** Challenge Type (Solo / Team / Tournament), Bracket Size (if Tournament), Who Can Accept (if Team), "Choose Your Game" (grid), Platform (dropdown), Your Username (input) | Select type; select game; select platform; type username. Optional: Custom Game Name, Custom Platform Name | "Challenge Type", "Choose Your Game", "Platform", "Your Username", "Custom Game Name", "Custom Platform Name", "Please enter the name of your custom game/platform" | — |
| 1.3 | Bottom: "Previous" (disabled on step 1), "Next" | Click "Next" | "Previous", "Next" | — |
| 1.4 | **Step 2:** "Challenge Configuration" — Challenge Mode (dropdown), mode explanation + "✨ Auto-Generate Rules", Tournament blurb (if tournament), **Challenge Amount (USDFG)** (input + ≈ USDC), Challenge Reward calc text, (admin) Founder fields | Select mode; enter amount; optional Auto-Generate Rules; (admin) founder count / participant reward / winner bonus | "Challenge Configuration", "Challenge Mode", "Challenge Amount (USDFG)", "≈ X.XX USDC (conversion estimate)", "Challenge Reward: X USDFG", "🏆 (Founder: Enter 0 for free entry)" | — |
| 1.5 | Same row: "Previous", "Next" | Click "Next" | — | — |
| 1.6 | **Step 3:** "Challenge Rules" — Rules & Conditions (textarea), helper text | Type or edit rules | "Challenge Rules", "Rules & Conditions", "Enter detailed rules for your challenge...", "Be specific about game settings, time limits, and winning conditions." | — |
| 1.7 | "Previous", "Create Challenge" | Click "Create Challenge" | "Create Challenge" | — |
| 1.8 | (If not connected) Yellow banner + "Connect Wallet" | "Connect Wallet" | "Connect your wallet to create challenges and compete for rewards!" | — |
| 1.9 | After submit | — | — | Modal closes; challenge created; lobby opens (creator sees Standard Lobby or Tournament Lobby) |

**Entry point:** Nav or FAB "Create Challenge" → Create Challenge Modal (ElegantModal + CreateChallengeForm, 3 steps).

---

### B. Entering a lobby

| Step | What the player sees | What they click or input | Copy shown | Confirmations / modals |
|------|------------------------|---------------------------|------------|-------------------------|
| 2.1 | Arena home; challenge cards (game, mode, players, "👁️ Watch", share, **💰 Entry** / **🏆 Reward**, creator, platform) | Tap/click a challenge card | Card: "Entry" (label), "X USDFG"; "Reward", "X USDFG" | — |
| 2.2 | Lobby opens directly (no intermediate detail sheet in main flow) | — | — | StandardChallengeLobby or TournamentBracketView opens (RightSidePanel / panel) |
| 2.3 | Lobby: challenge title, game • mode • platform, **Status** pill, Challenge Amount / Challenge Reward / Players / Format, and one primary CTA block (role + status driven) | See below (Join / Fund / Submit / Claim / Delete) | Status: "Waiting for opponent" / "Creator confirmation required" / "Waiting for challenger to fund" / "Match Active" / "Match completed" / etc. | — |

**Note:** ChallengeDetailSheet exists (bottom sheet with details + "Confirm and Fund", "Express Join Intent", "Fund Now", "View Challenge (Watch as Spectator)", "Close") but is **not** opened from the main challenge-card click in the traced code; card click calls `openChallengeLobby(challenge)` and opens the lobby directly. Detail sheet may be used from another path (e.g. deep link or future entry).

---

### C. Joining a challenge

| Step | What the player sees | What they click or input | Copy shown | Confirmations / modals |
|------|------------------------|---------------------------|------------|-------------------------|
| 3.1 | Open lobby (from card click) with status e.g. "Waiting for opponent" | — | Status, Challenge Amount, Challenge Reward, etc. | — |
| 3.2 | Blue block: single primary button | "Join Challenge" | "Join Challenge", "No wallet required", "This step only signals your intent to compete. You won't be charged and your wallet will not open." | — |
| 3.3 | After click | — | — | `expressJoinIntent`; alert: "✅ Join intent recorded! Creator can now fund the challenge."; lobby stays open (user is now pending_joiner) |
| 3.4 | (If team-only challenge) | — | — | Notification: "This challenge is only open to teams. You must be part of a team to join..." (if no team) |

No multi-step "application" or extra confirmation modal for join; one click to express intent.

---

### D. Getting ready to play (funding & confirmations)

| Step | Who | What the player sees | What they click or input | Copy shown | Confirmations / modals |
|------|-----|------------------------|---------------------------|------------|-------------------------|
| 4.1 | Creator (after someone joined) | Status "Creator confirmation required"; amber block with deadline (e.g. "Xm remaining"); single primary button | "Fund Challenge" | "Fund Challenge", "This will open your wallet", "X USDFG + standard network fee", "Funding locks your USDFG into escrow until the match is resolved." | Wallet signs; then success (lobby stays open) |
| 4.2 | Joiner (after creator funded) | Status "Waiting for challenger to fund"; green block with deadline; single primary button | "Fund Entry" | "Waiting for challenger to fund", "Fund Entry", "This will open your wallet", "X USDFG + standard network fee", "Your funds are held securely in escrow until the match is completed." | Wallet signs; then success |
| 4.3 | Pending joiner (waiting for creator to fund) | Blue block, no button | — | "Waiting for creator to fund", "No transaction required", "Creator deadline: Xm remaining" | — |
| 4.4 | Creator (waiting for joiner to fund) | Green block, no button | — | "Waiting for challenger to fund", "No wallet required", "Challenger deadline: …" | — |
| 4.5 | Both funded | Status "Match Active"; amber "Submit Result" block (if not yet submitted) | "Submit Result" | "Match Active", "Submit Result", "No wallet required", "Results are recorded off-chain and verified before payout." | — |

**Detail sheet (when used):** Creator sees "✨ Confirm and Fund Challenge ✨"; joiner sees "Express Join Intent (No Payment)" or "Fund Now (X USDFG)". Copy is action-oriented.

---

## STEP 2 — "FORM ENERGY" FLAGS

| Step / area | Flag | Notes |
|--------------|------|--------|
| **Create — Step 1** | ⚠️ Neutral | Game grid + platform + username is config, but labels ("Challenge Type", "Your Username") are clear. Toggles (Solo/Team/Tournament) feel like choices. |
| **Create — Step 1** | ❌ Form-like | "Your Username" + placeholder "Enter your gaming username"; "Please enter the name of your custom game/platform" — small form energy. |
| **Create — Step 2** | ⚠️ Neutral | "Challenge Configuration" + "Challenge Amount (USDFG)" + conversion estimate. One amount input; reward is derived and shown. |
| **Create — Step 2** | ❌ Form-like | Label "Challenge Amount (USDFG)" + helper text and (admin) founder fields add some form feel. |
| **Create — Step 3** | ❌ Form-like | "Challenge Rules", "Rules & Conditions", "Enter detailed rules...", "Be specific about game settings..." — classic form/textarea. |
| **Create — Navigation** | ❌ Form-like | "Previous" / "Next" / "Create Challenge" — wizard language; "Create Challenge" is submit-style. |
| **Create — Validation** | ❌ Form-like | "Please fix the following errors:" + bullet list. |
| **Lobby — Status & details** | ✅ Decision-based | Single primary CTA per state (Join / Fund Challenge / Fund Entry / Submit Result / Claim / Delete). Status text is short and state-driven. |
| **Lobby — Join** | ✅ Decision-based | One button "Join Challenge" + "No wallet required" + intent copy — reduces anxiety, feels like committing to play. |
| **Lobby — Funding** | ✅ Decision-based | "Fund Challenge" / "Fund Entry" — action verbs; escrow copy is brief. |
| **Lobby — Submit result** | ✅ Decision-based | "Submit Result" + "Did you win this match?" + Win/Loss choice — clear decision. |
| **Card (list)** | ⚠️ Neutral | "Entry" / "Reward" on card — compact; "Entry" has slight form/gambling connotation (see Language audit). |

**Summary:** Creation flow has clear **form energy** (multi-step wizard, labels, textarea, validation, "Previous/Next/Create Challenge"). Lobby flow is **largely decision-based** (one primary action per state, action-oriented copy, "No wallet required" where relevant).

---

## STEP 3 — LANGUAGE AUDIT (LEGAL SAFE)

| Term | Present in UI? | Where | Replaced with (if any) |
|------|-----------------|-------|-------------------------|
| **Buy-in** | No | — | Not used. |
| **Entry fee** | **Yes (code + one card label)** | Data/code: `entryFee` everywhere. UI: CreateChallengeForm uses **"Challenge Amount (USDFG)"**; lobby/detail use **"Challenge Amount"**; **challenge card** uses **"💰 Entry"** (label above amount). | "Challenge Amount" (and "Challenge Amount (USDFG)" in create). Card still says "Entry". |
| **Stake** | No | — | Not used. |
| **Wager** | No | — | Not used. |
| **Prize** | **Yes (code only)** | Data/code: `prizePool`, `prizeClaimed`, `claimPrize`, etc. UI: **"Challenge Reward"** or **"🏆 Reward"** (card). No visible "prize" in user-facing copy. | "Challenge Reward" in UI; "Reward" on card. |

**Recommendation for audit:**  
- **Entry:** On the **challenge card** only, the label is "Entry" (with "Reward" for the pool). Everywhere else (create flow, lobby, detail sheet) uses "Challenge Amount" and "Challenge Reward". Consider aligning card to "Challenge Amount" / "Challenge Reward" for consistency and to avoid "entry" (closer to entry-fee wording).  
- **Prize:** Not shown in UI; "Challenge Reward" / "Reward" is used. Safe.  
- **Buy-in / Stake / Wager:** Not used. Safe.

---

## STEP 4 — ACTION DENSITY CHECK

**Rule:** Only one primary action button visible at any given lobby state; no screen with multiple "important" buttons at once; lobby actions state-driven (OPEN → CONFIRM/FUND → FUND ENTRY → ACTIVE → SUBMIT RESULT → COMPLETE / CLAIM).

### Lobby (StandardChallengeLobby)

- **State machine:** One primary CTA per (role, status): Join **or** Fund Challenge (creator) **or** Fund Entry (joiner) **or** Submit Result **or** Claim Reward **or** Cancel/Delete. Implemented via `ctaState` (showJoin, showCreatorFund, showJoinerFund, showSubmit, showClaim, showCancel) — mutually exclusive per view. **✅ Compliant.**
- **Submit result:** Unfolds inline (Win/Loss + proof + "Submit Result"); still one primary flow. **✅ OK.**
- **Creator — deadline expired:** Creator can see "Cancel/Delete Challenge" and possibly status messaging in same view; only one primary action (Cancel/Delete). **✅ OK.**
- **Edit Challenge Amount:** In lobby, "Edit" next to Challenge Amount opens inline edit (input + Save/Cancel). Secondary; primary CTA remains one. **✅ OK.**

### Violations / edge cases

1. **ChallengeDetailSheet (when used):** Can show **Cancel Challenge** + **Confirm and Fund Challenge** (creator) or **Express Join Intent** + **Close** (joiner). Two prominent buttons in one view. **❌ Violation:** Multiple primary/secondary actions on one sheet (e.g. Cancel + Fund, or Join + Close). Mitigation: Close is secondary; primary is one of Fund / Join. Still, two CTAs above the fold.
2. **Create Challenge Modal — Step 3:** "Previous" and "Create Challenge" side by side. **⚠️ Neutral:** Standard wizard; one primary (Create Challenge), one back (Previous). Acceptable.
3. **Mobile detail sheet (sticky footer):** Multiple buttons stacked (e.g. Cancel, Confirm and Fund, Close). **❌ Violation:** Same as (1) for mobile.

**Summary:** Lobby itself is **state-driven and one-primary-CTA**. Detail sheet (and its mobile sticky footer) can show **multiple prominent actions** at once — only violation noted.

---

## STEP 5 — ALREADY GOOD (DO NOT TOUCH)

1. **Single primary CTA per lobby state** — Join, Fund Challenge, Fund Entry, Submit Result, Claim, or Delete are mutually exclusive by role/status. No competing primary buttons in the lobby.
2. **Join is one click** — "Join Challenge" with "No wallet required" and intent-only copy. No multi-step application or extra confirmation modal.
3. **Funding copy is action-led** — "Fund Challenge" / "Fund Entry" (not "Submit payment" or "Complete payment"). Escrow line is short and clear.
4. **Status labels are short and arena-like** — "Waiting for opponent", "Creator confirmation required", "Match Active", "Match completed" — not form labels.
5. **Submit result is a clear decision** — "Did you win this match?" + Win/Loss + optional proof + one "Submit Result" button. Feels like reporting an outcome, not filling a form.
6. **"No wallet required" / "No transaction required"** where true — reduces anxiety for join and for submit result.
7. **Challenge card → lobby is direct** — Tapping a card opens the lobby immediately (no mandatory intermediate detail step). Fast path into the "room".
8. **Challenge Amount / Challenge Reward in create and lobby** — Consistent, non-gambling wording (except card "Entry" — see Language).
9. **No "Submit" or "Continue" for funding** — Uses "Fund Challenge" / "Fund Entry" and "Confirm and Fund Challenge" on detail sheet.
10. **Tournament flow** — Bracket view and tournament-specific CTAs (e.g. Submit Final Result) stay state-driven; same one-primary-CTA idea.

**Do not change:** The lobby state machine, the single-CTA rule, the join-in-one-click flow, the funding and submit-result copy, and the direct card → lobby entry.

---

## STEP 6 — OUTPUT SUMMARY

### Current flow map

- **Creation:** Nav/FAB "Create Challenge" → Modal (3 steps: Game/Platform/Username → Configuration/Amount → Rules) → "Previous" / "Next" / "Create Challenge" → Lobby opens.
- **Entering lobby:** Tap challenge card → Lobby opens directly (Standard or Tournament).
- **Joining:** In lobby, one "Join Challenge" click → intent recorded, lobby stays open.
- **Getting ready:** Creator sees "Fund Challenge"; joiner sees "Fund Entry"; then "Match Active" → "Submit Result" (Win/Loss + proof) → "Claim" for winner.

### Form-friction flags

- **Creation:** ⚠️/❌ Wizard with labels, textarea, validation, "Previous/Next/Create Challenge" — clear form energy.
- **Lobby:** ✅ Largely decision-based; one primary CTA per state; action-oriented copy.

### Language confirmation

- **Entry fee:** Replaced in UI with "Challenge Amount" / "Challenge Amount (USDFG)" except on **card** ("Entry"). "Prize" replaced with "Challenge Reward" / "Reward". Buy-in, stake, wager not used.

### Action-density issues

- **Lobby:** Compliant (one primary CTA per state).
- **ChallengeDetailSheet:** Multiple prominent buttons (e.g. Cancel + Fund, or Join + Close) in one view — only violation.

### Already good — do not touch

- Single primary CTA per lobby state; join in one click; funding/submit copy; status wording; direct card → lobby; "No wallet required" where true; Challenge Amount / Challenge Reward usage in create and lobby; no submit/continue for funding.

---

**End of audit. No refactors recommended in this document.**
