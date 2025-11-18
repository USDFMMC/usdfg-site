# 🔍 Safari Debug Instructions

## **THE PROBLEM**

No logs appear when clicking Connect → **Service Worker is serving cached old JS bundle**

## **THE FIX**

✅ Service worker now **bypasses cache for all .js bundles**
✅ Debug page created at `/debug-deeplink.html`
✅ All changes committed and pushed

---

## **IMMEDIATE STEPS (Do This Now)**

### **Step 1: Clear Service Worker Cache**

**In Safari on iPhone:**

1. Open Safari
2. Go to `https://usdfg.pro/app`
3. Open Debug Console (Settings → Advanced → Web Inspector)
4. Paste this command:

```javascript
(async () => {
  if ('caches' in window) {
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
      console.log('🗑️ Deleted cache:', name);
    }
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
      console.log('🗑️ Unregistered SW:', reg.scope);
    }
  }
  console.log('🔄 Reloading page...');
  window.location.reload(true);
})();
```

### **Step 2: Use Debug Page**

**Navigate to:**
```
https://usdfg.pro/debug-deeplink.html
```

This page will automatically:
- ✅ Check current page URL
- ✅ List all scripts
- ✅ Check debug variables
- ✅ Check service worker status
- ✅ Provide buttons to clear caches

### **Step 3: Run Debug Commands**

**Paste these commands ONE AT A TIME in Safari console:**

#### **Command 1: Check Page**
```javascript
console.log('📍 URL:', window.location.href);
console.log('📍 Pathname:', window.location.pathname);
```

#### **Command 2: Check Debug Variables**
```javascript
console.log('🔍 __phantom_debug_redirect:', window.__phantom_debug_redirect);
console.log('🔍 launchPhantomDeepLink:', typeof window.launchPhantomDeepLink);
```

#### **Command 3: List Scripts**
```javascript
Array.from(document.querySelectorAll('script')).forEach((s, i) => {
  console.log(`${i + 1}. ${s.src || 'INLINE'}`);
});
```

#### **Command 4: Check Service Worker**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Active:', reg?.active ? 'YES' : 'NO');
  console.log('SW Scope:', reg?.scope);
});
```

---

## **WHAT TO SEND ME**

After running the commands, send me:

1. ✅ Output of `window.location.href`
2. ✅ Output of `document.querySelectorAll('script')` (the script URLs)
3. ✅ Output of `window.__phantom_debug_redirect`
4. ✅ Screenshot of clicking the main JS bundle (the `index-xxxxx.js` file)

---

## **ROOT CAUSE IDENTIFIED**

**The Service Worker was caching JS bundles**, which meant:
- ❌ Old deep link code was being served
- ❌ New redirect URL fix wasn't being used  
- ❌ No logs appeared because old code was running

**The Fix:**
- ✅ Service worker now **bypasses cache for all .js files**
- ✅ JS bundles always load fresh from network
- ✅ New code will run immediately after deployment

---

## **AFTER DEPLOYMENT**

1. **Clear service worker** (use command above)
2. **Hard refresh** (Cmd+Shift+R)
3. **Click Connect** - you should now see:
   ```
   🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts
   🔗 Redirect link (ALWAYS /app): https://usdfg.pro/app
   ```

---

## **FILES CHANGED**

1. ✅ `client/public/sw.js` - Now bypasses cache for .js bundles
2. ✅ `client/public/debug-deeplink.html` - Debug page created
3. ✅ All changes committed and pushed

**The service worker fix is the key - it was serving old cached code!**

