# Comprehensive Gambling/Wagering Language Scan Report

**Date:** 2026-01-09  
**Scope:** User-facing text only (UI labels, alerts, messages, legal text)  
**Excluded:** Code comments, variable names, console logs, technical documentation

---

## ✅ ACCEPTABLE INSTANCES (Legal Disclaimers - Keep As-Is)

These instances appear in legal disclaimers stating what USDFG is NOT. Per instructions, these should be kept.

### Terms.tsx - Legal Disclaimers
- **"gambling"** - Line 162, 193, 202, 221, 405, 411, 549, 743
  - Context: "No Gambling", "does not offer any form of gambling", "not gambling"
  - ✅ **KEEP** - Negative legal disclaimer

- **"wagering"** - Line 193, 405
  - Context: "does not offer any form of... wagering", "not a bet, wager"
  - ✅ **KEEP** - Negative legal disclaimer

- **"bet"** - Line 405
  - Context: "not a bet, wager, or speculative investment"
  - ✅ **KEEP** - Negative legal disclaimer

- **"betting"** - Line 202, 221, 743
  - Context: "No gambling, betting, or games of chance"
  - ✅ **KEEP** - Negative legal disclaimer

- **"lottery"** / **"lotteries"** - Line 193, 221
  - Context: "does not offer any form of gambling, wagering, lotteries"
  - ✅ **KEEP** - Negative legal disclaimer

- **"games of chance"** - Line 193, 202, 221, 414
  - Context: "does not offer... games of chance", "no games of chance"
  - ✅ **KEEP** - Negative legal disclaimer

- **"chance"** - Line 193, 202, 221, 414
  - Context: "games of chance", "chance plays no role"
  - ✅ **KEEP** - Negative legal disclaimer

- **"earnings"** - Line 100, 510, 513
  - Context: "No Guarantee of Earnings", "does not guarantee earnings"
  - ✅ **KEEP** - Negative legal disclaimer

- **"profit"** - Line 220 (whitepaper.tsx), 781 (terms.tsx)
  - Context: "no promises of profit", "no profit expectation"
  - ✅ **KEEP** - Negative legal disclaimer

- **"yield"** - Line 220 (whitepaper.tsx), 261 (whitepaper.tsx)
  - Context: "no promises of... yield", "no passive yield"
  - ✅ **KEEP** - Negative legal disclaimer

- **"passive income"** - Line 513 (terms.tsx), 261 (whitepaper.tsx)
  - Context: "not an investment or passive income scheme", "no passive yield"
  - ✅ **KEEP** - Negative legal disclaimer

### Other Acceptable Instances

- **"luck"** / **"lucky"** - Multiple files
  - Context: "not luck", "not those who get lucky", "skill—not luck"
  - ✅ **KEEP** - Positive disclaimers emphasizing skill over luck

- **"pool"** - client/src/pages/app/index.tsx lines 563, 579, 6505
  - Context: "8 Ball Pool" (game name), "map pool" (game term)
  - ✅ **KEEP** - Game terminology, not gambling-related

- **"draw"** - client/src/pages/app/index.tsx line 6417
  - Context: "Draw = penalties" (game rule)
  - ✅ **KEEP** - Game terminology

- **"fund"** - Multiple files
  - Context: "fund the challenge", "fund platform operations"
  - ✅ **KEEP** - Operational language (escrow funding), not gambling terminology

- **"withdraw"** - client/src/pages/terms.tsx line 405
  - Context: "Users may withdraw earned tokens"
  - ✅ **KEEP** - Token management language, not gambling terminology

---

## ⚠️ POTENTIAL ISSUES (User-Facing - Needs Review)

### 1. "Total Earnings" - User-Facing UI Label

**File:** `client/src/pages/app/profile/[address].tsx`  
**Line:** 204  
**Context:**
```tsx
<CardTitle className="text-sm font-medium text-gray-400">Total Earnings</CardTitle>
```

**Issue:** "Earnings" can imply financial returns/profit, which may trigger regulatory concerns.

**Recommendation:** Consider replacing with:
- "Total Rewards"
- "Total Earned"
- "Total USDFG Earned"

**Also appears in:**
- `client/src/components/arena/ProfileCard.tsx` line 73: `{stats.totalEarnings} USDFG`
- `client/src/lib/derive/stats.ts` - Variable names (technical, acceptable)

---

## ✅ VERIFIED CLEAN (No Issues Found)

### Terms Not Found in User-Facing Text:
- ✅ **"casino"** - 0 instances
- ✅ **"raffle"** - 0 instances
- ✅ **"jackpot"** - 0 instances
- ✅ **"sweepstakes"** - 0 instances
- ✅ **"pot"** (gambling context) - 0 instances (only "8 Ball Pool" game name)
- ✅ **"kitty"** - 0 instances
- ✅ **"purse"** - 0 instances
- ✅ **"bankroll"** - 0 instances
- ✅ **"odds"** - 0 instances
- ✅ **"spin"** (gambling context) - 0 instances (only CSS "animate-spin")
- ✅ **"roll"** (gambling context) - 0 instances
- ✅ **"random win"** - 0 instances
- ✅ **"cash prize"** - 0 instances
- ✅ **"cash reward"** - 0 instances
- ✅ **"real money"** - 0 instances
- ✅ **"money match"** - 0 instances
- ✅ **"paid match"** - 0 instances
- ✅ **"paid competition"** - 0 instances
- ✅ **"fee to play"** - 0 instances
- ✅ **"pay to enter"** - 0 instances
- ✅ **"winnings"** - 0 instances (already replaced)
- ✅ **"payout"** (user-facing) - 0 instances (only in console logs/comments)
- ✅ **"cash out"** - 0 instances
- ✅ **"collect money"** - 0 instances
- ✅ **"take the money"** - 0 instances
- ✅ **"wagered"** - 0 instances
- ✅ **"staked"** (gambling context) - 0 instances
- ✅ **"risked"** - 0 instances
- ✅ **"betting pool"** - 0 instances
- ✅ **"prize money"** - 0 instances
- ✅ **"ROI"** - 0 instances

---

## Summary

### ✅ Status: **LARGELY CLEAN**

**Total User-Facing Issues Found:** 1

**Issue:**
- "Total Earnings" label in profile UI (1 instance)

**Recommendation:**
Replace "Total Earnings" with "Total Rewards" or "Total Earned" to avoid "earnings" framing that could imply financial returns.

**All Other Instances:**
- Legal disclaimers (gambling, wagering, bet, betting, etc.) - ✅ Keep as negative disclaimers
- Game terminology (pool, draw) - ✅ Acceptable
- Operational language (fund, withdraw) - ✅ Acceptable
- Positive skill disclaimers (not luck) - ✅ Acceptable

---

## Action Items

1. **Review "Total Earnings" label** - Consider replacing with "Total Rewards" or "Total Earned"
2. **No other changes needed** - All other instances are either:
   - Legal disclaimers (should be kept)
   - Game terminology (acceptable)
   - Technical code (excluded from scope)

---

## Verification Method

- Searched all quoted strings (user-facing text)
- Excluded code comments, variable names, console logs
- Kept legal disclaimers that say "not a bet / not wagering" per instructions
- Verified game terminology is acceptable


