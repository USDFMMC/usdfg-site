# Duplicates and Redundancies Audit Report

**Date:** 2026-01-09  
**Scope:** Full codebase scan for duplicate code, redundant logic, and unused patterns

---

## 🔴 CRITICAL DUPLICATES (High Priority)

### 1. **localStorage Phantom Connection Checks** (16+ instances)
**Files:**
- `client/src/components/arena/WalletConnectSimple.tsx` (6 instances)
- `client/src/pages/app/index.tsx` (9 instances)
- `client/src/lib/wallet/useUSDFGWallet.ts` (1 instance)

**Pattern:**
```typescript
localStorage.getItem('phantom_connected') === 'true'
localStorage.setItem('phantom_connected', 'true')
localStorage.removeItem('phantom_connected')
localStorage.removeItem('phantom_public_key')
```

**Recommendation:** Create utility functions:
- `getPhantomConnectionState(): { connected: boolean, publicKey: string | null }`
- `setPhantomConnectionState(connected: boolean, publicKey?: string): void`
- `clearPhantomConnectionState(): void`

**Impact:** High - Reduces code duplication, centralizes connection state management

---

### 2. **sessionStorage Phantom Connecting Checks** (13+ instances)
**Files:**
- `client/src/components/arena/WalletConnectSimple.tsx` (5 instances)
- `client/src/lib/wallet/mobile.ts` (2 instances)
- `client/src/App.tsx` (2 instances)
- `client/src/lib/wallet/useUSDFGWallet.ts` (1 instance)
- `client/src/lib/wallet/phantom-deeplink.ts` (2 instances)

**Pattern:**
```typescript
sessionStorage.getItem('phantom_connecting') === 'true'
sessionStorage.setItem('phantom_connecting', 'true')
sessionStorage.removeItem('phantom_connecting')
sessionStorage.getItem('phantom_connect_timestamp')
```

**Recommendation:** Create utility functions:
- `isPhantomConnecting(): boolean`
- `setPhantomConnecting(isConnecting: boolean): void`
- `getPhantomConnectTimestamp(): number | null`
- `clearPhantomConnectionState(): void`

**Impact:** High - Reduces duplication, ensures consistent state management

---

### 3. **Challenge Status Extraction** (23+ instances)
**Files:**
- `client/src/pages/app/index.tsx` (23 instances)

**Pattern:**
```typescript
const status = challenge.status || challenge.rawData?.status;
```

**Recommendation:** Create utility function:
```typescript
function getChallengeStatus(challenge: any): string {
  return challenge.status || challenge.rawData?.status || 'unknown';
}
```

**Impact:** Medium - Reduces repetition, ensures consistent fallback logic

---

### 4. **Challenge Creator Extraction** (16+ instances)
**Files:**
- `client/src/pages/app/index.tsx` (16 instances)

**Pattern:**
```typescript
const creatorWallet = challenge.creator || challenge.rawData?.creator || '';
const isCreator = creatorWallet.toLowerCase() === currentWallet;
```

**Recommendation:** Create utility functions:
```typescript
function getChallengeCreator(challenge: any): string {
  return challenge.creator || challenge.rawData?.creator || '';
}

function isChallengeCreator(challenge: any, wallet: string): boolean {
  const creator = getChallengeCreator(challenge);
  return creator.toLowerCase() === wallet.toLowerCase();
}
```

**Impact:** Medium - Reduces repetition, ensures consistent comparison logic

---

### 5. **Challenge Entry Fee Extraction** (19+ instances)
**Files:**
- `client/src/pages/app/index.tsx` (19 instances)

**Pattern:**
```typescript
const entryFee = challenge.entryFee || challenge.rawData?.entryFee || 0;
const prizePool = challenge.prizePool || (entryFee * 2);
```

**Recommendation:** Create utility functions:
```typescript
function getChallengeEntryFee(challenge: any): number {
  return challenge.entryFee || challenge.rawData?.entryFee || 0;
}

function getChallengePrizePool(challenge: any): number {
  return challenge.prizePool || challenge.challengeReward || (getChallengeEntryFee(challenge) * 2);
}
```

**Impact:** Medium - Reduces repetition, centralizes calculation logic

---

## 🟡 MODERATE DUPLICATES (Medium Priority)

### 6. **Duplicate Challenge Fetching Logic**
**Files:**
- `client/src/lib/chain/events.ts` - `fetchOpenChallenges()` and `fetchActiveChallenges()`

**Issue:** Both functions have nearly identical code (lines 122-163 vs 214-255). Only difference is the registry query.

**Recommendation:** Extract common logic:
```typescript
async function fetchChallengesFromRegistry(registryQuery: Query): Promise<ChallengeMeta[]> {
  // Common fetching logic
}

export async function fetchOpenChallenges(): Promise<ChallengeMeta[]> {
  return fetchChallengesFromRegistry(/* open challenges query */);
}

export async function fetchActiveChallenges(): Promise<ChallengeMeta[]> {
  return fetchChallengesFromRegistry(/* active challenges query */);
}
```

**Impact:** Medium - Reduces code duplication (~40 lines)

---

### 7. **Repeated fetchChallengeById Calls**
**Files:**
- `client/src/pages/app/index.tsx` - Multiple functions call `fetchChallengeById` multiple times

**Examples:**
- `handleDirectCreatorFund` - calls it 2-3 times
- `handleDirectJoinerFund` - calls it in a retry loop
- `handleDirectJoinerExpressIntent` - could benefit from caching

**Recommendation:** 
- Cache recent fetches (5-10 second TTL)
- Use React Query or similar for automatic caching
- Pass challenge data through props instead of re-fetching

**Impact:** Medium - Improves performance, reduces Firestore reads

---

### 8. **Duplicate Status Validation Logic**
**Files:**
- `client/src/pages/app/index.tsx` - Multiple places check for active/pending states

**Pattern:**
```typescript
status === 'active' || status === 'pending_waiting_for_opponent' || 
status === 'creator_confirmation_required' || status === 'creator_funded'
```

**Recommendation:** Create utility functions:
```typescript
function isChallengeActive(status: string): boolean {
  return status === 'active';
}

function isChallengeWaitingForPlayers(status: string): boolean {
  return status === 'pending_waiting_for_opponent' || 
         status === 'creator_confirmation_required' || 
         status === 'creator_funded';
}

function isChallengeInProgress(status: string): boolean {
  return isChallengeActive(status) || isChallengeWaitingForPlayers(status);
}
```

**Impact:** Low-Medium - Improves readability, reduces errors

---

## 🟢 MINOR DUPLICATES (Low Priority)

### 9. **Repeated Deadline Extraction**
**Files:**
- `client/src/pages/app/index.tsx` - Multiple places extract deadlines

**Pattern:**
```typescript
const creatorFundingDeadline = challenge.rawData?.creatorFundingDeadline || challenge.creatorFundingDeadline;
const joinerFundingDeadline = challenge.rawData?.joinerFundingDeadline || challenge.joinerFundingDeadline;
```

**Recommendation:** Add to challenge utility functions:
```typescript
function getCreatorFundingDeadline(challenge: any): Timestamp | null {
  return challenge.rawData?.creatorFundingDeadline || challenge.creatorFundingDeadline || null;
}

function getJoinerFundingDeadline(challenge: any): Timestamp | null {
  return challenge.rawData?.joinerFundingDeadline || challenge.joinerFundingDeadline || null;
}
```

**Impact:** Low - Minor code reduction

---

### 10. **Duplicate Wallet Address Formatting**
**Files:**
- Multiple files format wallet addresses as `address.slice(0, 4) + '...' + address.slice(-4)`

**Recommendation:** Create utility:
```typescript
function formatWalletAddress(address: string, startChars = 4, endChars = 4): string {
  if (!address || address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
```

**Impact:** Low - Minor code reduction, consistent formatting

---

## 📊 SUMMARY STATISTICS

- **Critical Duplicates:** 5 patterns (16-23 instances each)
- **Moderate Duplicates:** 3 patterns (2-19 instances each)
- **Minor Duplicates:** 2 patterns (multiple instances)

**Total Estimated Code Reduction:** ~200-300 lines if all duplicates are consolidated

**Priority Order:**
1. localStorage/sessionStorage utilities (HIGHEST - affects multiple files)
2. Challenge data extraction utilities (HIGH - affects main app file)
3. Challenge fetching consolidation (MEDIUM - reduces duplication)
4. Status validation utilities (MEDIUM - improves maintainability)
5. Minor utilities (LOW - nice to have)

---

## 🛠️ RECOMMENDED ACTION PLAN

### Phase 1: Create Utility Files (High Priority)
1. Create `client/src/lib/utils/wallet-state.ts` for localStorage/sessionStorage utilities
2. Create `client/src/lib/utils/challenge-helpers.ts` for challenge data extraction
3. Update all files to use new utilities

### Phase 2: Consolidate Duplicate Logic (Medium Priority)
1. Refactor challenge fetching functions
2. Add caching for `fetchChallengeById`
3. Create status validation utilities

### Phase 3: Minor Improvements (Low Priority)
1. Create formatting utilities
2. Add deadline extraction helpers

---

## ✅ BENEFITS OF REFACTORING

1. **Reduced Code Size:** ~200-300 lines of duplicate code eliminated
2. **Improved Maintainability:** Single source of truth for common operations
3. **Fewer Bugs:** Centralized logic reduces inconsistencies
4. **Better Performance:** Caching reduces redundant API calls
5. **Easier Testing:** Utilities can be unit tested independently

---

## ⚠️ RISKS

- **Breaking Changes:** Need to ensure all usages are updated
- **Testing Required:** Comprehensive testing after refactoring
- **Time Investment:** Estimated 4-6 hours for full refactoring

---

## 📝 NOTES

- Some duplication may be intentional for performance (e.g., inlining simple checks)
- Consider using a library like `lodash` or creating a custom utility library
- Use TypeScript to ensure type safety in utility functions
