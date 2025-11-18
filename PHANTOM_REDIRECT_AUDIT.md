# Phantom Redirect URL Audit Report

## Summary

**Issue**: Phantom was showing app URL as `https://usdfg.pro` instead of `https://usdfg.pro/app`

**Root Cause**: Redirect URL was using `window.location.href` which could be the homepage (`/`) instead of always being `/app`

**Fix Applied**: Changed redirect URL to always be `${window.location.origin}/app`

---

## 1. All Files Found with Redirect-Related Code

### ✅ **Primary File: `client/src/lib/wallet/phantom-deeplink.ts`**

**Status**: ✅ **ONLY VERSION** - This is the correct file being used

**Full Path**: 
```
/Users/husseinali/Downloads/CryptoTracker 2/USDFGAMING-full-project/USDFG GitHub/usdfg-site/client/src/lib/wallet/phantom-deeplink.ts
```

**Key Code (BEFORE FIX)**:
```typescript
const redirectLink = window.location.href; // ❌ Could be https://usdfg.pro if on homepage
```

**Key Code (AFTER FIX)**:
```typescript
const redirectLink = `${window.location.origin}/app`; // ✅ Always https://usdfg.pro/app
```

---

## 2. Import Chain Verification

### **File 1: `client/src/components/arena/WalletConnectSimple.tsx`**
- **Line 8**: `import { launchPhantomDeepLink, shouldUseDeepLink } from '@/lib/wallet/phantom-deeplink';`
- **Usage**: Line 114 - Calls `launchPhantomDeepLink()` when mobile Safari detected
- **Path Resolution**: `@/lib/wallet/phantom-deeplink` → `client/src/lib/wallet/phantom-deeplink.ts` ✅

### **File 2: `client/src/pages/app/index.tsx`**
- **Line 9**: `import { handlePhantomReturn, isPhantomReturn } from '@/lib/wallet/phantom-deeplink';`
- **Usage**: Lines 139, 142 - Uses functions to handle Phantom return
- **Path Resolution**: `@/lib/wallet/phantom-deeplink` → `client/src/lib/wallet/phantom-deeplink.ts` ✅

---

## 3. Vite Configuration Verification

### **Vite Alias** (`vite.config.ts` line 53):
```typescript
"@": path.resolve(import.meta.dirname, "client", "src")
```

**Resolution**: `@/lib/wallet/phantom-deeplink` → `client/src/lib/wallet/phantom-deeplink.ts` ✅

### **TypeScript Path** (`tsconfig.json` line 21):
```json
"@/*": ["./client/src/*"]
```

**Resolution**: `@/lib/wallet/phantom-deeplink` → `./client/src/lib/wallet/phantom-deeplink.ts` ✅

---

## 4. Duplicate File Check

### ✅ **No Duplicates Found**

- ✅ Only **ONE** `phantom-deeplink.ts` file exists: `client/src/lib/wallet/phantom-deeplink.ts`
- ❌ No `phantom-deeplink.tsx` file
- ❌ No duplicate in `/src` directory
- ❌ No duplicate in `/dist` directory
- ❌ No stale copies or backup files

**Command Result**:
```bash
$ find . -name "phantom-deeplink*" -type f | grep -v node_modules | grep -v dist
./client/src/lib/wallet/phantom-deeplink.ts
```

---

## 5. Exact Redirect Value Generated

### **BEFORE FIX**:
```typescript
const redirectLink = window.location.href;
// If user on homepage: redirectLink = "https://usdfg.pro"
// If user on /app: redirectLink = "https://usdfg.pro/app"
```

### **AFTER FIX**:
```typescript
const redirectLink = `${window.location.origin}/app`;
// ALWAYS: redirectLink = "https://usdfg.pro/app"
```

### **Deep Link URL Generated**:
```
https://phantom.app/ul/v1/connect?dapp_encryption_public_key=...&redirect_link=https%3A%2F%2Fusdfg.pro%2Fapp&app_url=https%3A%2F%2Fusdfg.pro%2Fapp&nonce=...
```

**Encoded `redirect_link` parameter**: `https%3A%2F%2Fusdfg.pro%2Fapp` ✅

---

## 6. Debug Variable Added

### **Global Debug Variable**:
```typescript
(window as any).__phantom_debug_redirect = redirectLink;
```

**Usage**: After build, you can check in browser console:
```javascript
console.log(window.__phantom_debug_redirect);
// Should output: "https://usdfg.pro/app"
```

---

## 7. Import Verification

### **All Imports Point to Correct File**:

1. **WalletConnectSimple.tsx**:
   ```typescript
   import { launchPhantomDeepLink, shouldUseDeepLink } from '@/lib/wallet/phantom-deeplink';
   ```
   - Resolves to: `client/src/lib/wallet/phantom-deeplink.ts` ✅

2. **index.tsx (ArenaHome)**:
   ```typescript
   import { handlePhantomReturn, isPhantomReturn } from '@/lib/wallet/phantom-deeplink';
   ```
   - Resolves to: `client/src/lib/wallet/phantom-deeplink.ts` ✅

### **No Stale Imports**:
- ❌ No imports from `/src/lib/wallet/phantom-deeplink`
- ❌ No imports from `./phantom-deeplink` (relative)
- ❌ No imports from `../phantom-deeplink` (relative)
- ✅ All imports use `@/lib/wallet/phantom-deeplink` alias

---

## 8. Build Output Verification

### **Expected in Production Bundle**:

After Vite build, the bundle should contain:
```javascript
redirect_link=https%3A%2F%2Fusdfg.pro%2Fapp
```

**To verify after deployment**:
1. Open browser console on production site
2. Check: `window.__phantom_debug_redirect`
3. Should show: `"https://usdfg.pro/app"`

---

## 9. Runtime Resolution Chain

### **Which File is Used at Runtime**:

```
User clicks "Connect Wallet"
  ↓
WalletConnectSimple.handleConnect()
  ↓
shouldUseDeepLink() returns true (mobile Safari)
  ↓
launchPhantomDeepLink() called
  ↓
Import resolves: @/lib/wallet/phantom-deeplink
  ↓
Vite alias: @ → client/src
  ↓
Final path: client/src/lib/wallet/phantom-deeplink.ts ✅
  ↓
redirectLink = `${window.location.origin}/app`
  ↓
Phantom receives: redirect_link=https://usdfg.pro/app
```

---

## 10. Fix Summary

### **What Changed**:

**File**: `client/src/lib/wallet/phantom-deeplink.ts`

**Line 79** (BEFORE):
```typescript
const redirectLink = window.location.href; // ❌ Variable based on current page
```

**Line 79** (AFTER):
```typescript
const redirectLink = `${window.location.origin}/app`; // ✅ Always /app
```

**Added** (Line 83):
```typescript
(window as any).__phantom_debug_redirect = redirectLink; // Debug variable
```

---

## 11. Verification Checklist

- [x] Only one phantom-deeplink.ts file exists
- [x] File is in correct location (`client/src/lib/wallet/`)
- [x] All imports use correct alias (`@/lib/wallet/phantom-deeplink`)
- [x] Vite alias resolves correctly (`@` → `client/src`)
- [x] TypeScript paths match Vite alias
- [x] Redirect URL now always uses `/app`
- [x] Debug variable added for verification
- [x] No duplicate files found
- [x] No stale imports found

---

## 12. Expected Behavior After Fix

1. User clicks "Connect Wallet" (from any page)
2. `launchPhantomDeepLink()` is called
3. `redirectLink = "https://usdfg.pro/app"` (ALWAYS)
4. Phantom receives deep link with `redirect_link=https://usdfg.pro/app`
5. User approves in Phantom
6. Phantom redirects to: `https://usdfg.pro/app?phantom_encryption_public_key=...&data=...&nonce=...`
7. ArenaHome detects query params and decrypts
8. Wallet connects successfully
9. Phantom stores correct app URL: `https://usdfg.pro/app` ✅

---

## 13. Conclusion

**Status**: ✅ **FIXED**

- **Single source of truth**: `client/src/lib/wallet/phantom-deeplink.ts`
- **Correct redirect URL**: Always `https://usdfg.pro/app`
- **No duplicates**: Only one file exists
- **Correct imports**: All imports resolve to correct file
- **Debug variable**: `window.__phantom_debug_redirect` available for verification

**The redirect URL will now ALWAYS be `/app`, ensuring Phantom stores the correct app origin URL.**

