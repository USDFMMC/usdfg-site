# Production Bundle Analysis & Fix

## ✅ Build Configuration Verification

### Current Setup
1. **Vite Config** (`vite.config.ts`):
   - `root: path.resolve(import.meta.dirname, "client")` - Source is in `client/`
   - `outDir: path.resolve(import.meta.dirname, "dist")` - Builds to root `dist/`
   - ✅ **CORRECT**

2. **Netlify Config** (`netlify.toml`):
   - `publish = "dist"` - Deploys from root `dist/`
   - ✅ **CORRECT**

3. **Build Output**:
   - Main bundle: `dist/assets/index-BrSNzN5S.js`
   - Referenced in: `dist/index.html` as `/assets/index-BrSNzN5S.js`
   - ✅ **CORRECT**

## 🔍 Bundle Verification Results

### Local Bundle Check
- **File**: `dist/assets/index-BrSNzN5S.js`
- **Debug Log**: ✅ Contains `🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts`
- **Redirect Code**: ✅ Contains correct redirect logic
- **Status**: **LOCAL BUNDLE IS CORRECT**

## 🚨 The Problem

The **code is correct**, but there's a **deployment/caching mismatch**:

1. **Local bundle** has correct code
2. **Production** may be serving an **old cached bundle**
3. **Service worker** may be caching the old bundle
4. **Netlify** may not be deploying the latest bundle

## 🛠️ Complete Fix Procedure

### Step 1: Rebuild with Fresh Bundle Hash

The bundle filename includes a hash (`index-BrSNzN5S.js`). When you rebuild, Vite will generate a new hash, ensuring the new bundle is loaded.

```bash
# Clean build
rm -rf dist
npm run build

# Verify new bundle
ls -la dist/assets/index-*.js
```

### Step 2: Verify Bundle Contains Correct Code

```bash
# Check for debug log
grep -c "USING DEEPLINK FROM FILE" dist/assets/index-*.js

# Check for redirect code
grep -o "window.location.origin.*app" dist/assets/index-*.js | head -1
```

### Step 3: Deploy to Netlify

```bash
# Commit and push
git add .
git commit -m "Fix: Update deep link redirect URL to /app"
git push origin main

# Netlify will auto-deploy
```

### Step 4: Force Cache Invalidation

After deployment, the new bundle hash will force browsers to fetch the new file. However, you may need to:

1. **Clear Service Worker** (run in browser console):
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
location.reload();
```

2. **Hard Refresh**: Safari → Cmd+Shift+R

### Step 5: Verify Production Bundle

After deployment, check the live site:

1. **Open**: https://usdfg.pro/app
2. **Open Console**: Safari → Develop → Show Web Inspector
3. **Check Script URLs**:
```javascript
console.log([...document.querySelectorAll("script")].map(s => s.src));
```

4. **Verify Bundle**:
   - The script URL should be `/assets/index-XXXXX.js` (new hash)
   - Check `window.__phantom_debug_redirect` should be `https://usdfg.pro/app`

## 📋 Verification Checklist

- [ ] Rebuilt bundle (`npm run build`)
- [ ] Verified bundle contains debug log
- [ ] Verified bundle contains correct redirect code
- [ ] Committed and pushed to GitHub
- [ ] Netlify deployment completed
- [ ] Cleared service worker cache
- [ ] Hard refreshed browser
- [ ] Verified production script URL (new hash)
- [ ] Verified `window.__phantom_debug_redirect` is correct
- [ ] Tested Phantom deep link connection

## 🎯 Expected Result

After completing all steps:

1. **Production bundle** will have new hash (e.g., `index-XXXXX.js`)
2. **Debug log** will appear: `🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts`
3. **Redirect variable** will be: `https://usdfg.pro/app`
4. **Phantom** will show: `https://usdfg.pro/app` as connected app
5. **Deep link** will redirect to `/app` correctly

## 🔧 If Issue Persists

If Phantom still shows wrong URL after all steps:

1. **Check Netlify Deploy Logs**: Verify the build completed successfully
2. **Check Bundle Hash**: Ensure production is serving the new bundle
3. **Check Service Worker**: Ensure it's not caching the old bundle
4. **Check Browser Cache**: Clear all Safari caches completely
5. **Check CDN Cache**: Netlify may have CDN cache - wait 5-10 minutes

## 📝 Notes

- The bundle hash changes on every build, ensuring cache busting
- Service worker bypass for JS files ensures fresh bundles
- Netlify auto-deploys on git push
- The fix is in the code - it just needs to be deployed and cached cleared

