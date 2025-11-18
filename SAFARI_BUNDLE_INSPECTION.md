# Safari Bundle Inspection Guide

## 🎯 Goal

Identify the **actual JavaScript bundle** running in production on Safari to verify:
1. Which build is being served
2. Whether the deep-link code is present
3. Why Phantom shows wrong URL

---

## 📋 Step-by-Step Instructions

### Step 1: Open Safari on iPhone

1. Open Safari
2. Navigate to: `https://usdfg.pro/app`
3. Wait for page to fully load

### Step 2: Open Safari Web Inspector

**On Mac (connected iPhone):**
1. Connect iPhone to Mac via USB
2. On Mac: Safari → Develop → [Your iPhone Name] → usdfg.pro
3. Web Inspector opens

**On iPhone (if you have access):**
- Settings → Safari → Advanced → Web Inspector (enable)
- Then use Mac Safari to connect

### Step 3: Run Script List Command

In the **Console** tab of Web Inspector, paste and run:

```javascript
[...document.querySelectorAll("script")].map(s => s.src)
```

**Copy the FULL output** and save it.

**Expected output format:**
```javascript
[
  "https://usdfg.pro/assets/index-XXXXX.js",
  "https://usdfg.pro/assets/vendor-XXXXX.js",
  // ... more scripts
]
```

### Step 4: Identify Main Bundle

Look for the script that starts with:
- `index-` (main app bundle)
- Usually the largest file
- Usually loaded first

**Example:**
```
https://usdfg.pro/assets/index-BrSNzN5S.js
```

### Step 5: Download and Inspect Bundle

**Option A: Direct Download**
1. Copy the full URL (e.g., `https://usdfg.pro/assets/index-BrSNzN5S.js`)
2. Open in new tab
3. View source
4. Copy first 50-100 lines

**Option B: Using Console**
In Safari Console, run:
```javascript
fetch('https://usdfg.pro/assets/index-BrSNzN5S.js')
  .then(r => r.text())
  .then(text => {
    console.log('=== FIRST 100 LINES ===');
    console.log(text.split('\n').slice(0, 100).join('\n'));
  });
```

### Step 6: Search for Deep Link Code

In the bundle content, search for:
- `USING DEEPLINK FROM FILE`
- `phantom-deeplink`
- `window.location.origin.*app`
- `redirect_link`
- `phantom.app/ul/v1/connect`

---

## 🔍 What to Look For

### ✅ Good Signs (Correct Bundle):
- Contains: `🔥 USING DEEPLINK FROM FILE: phantom-deeplink.ts`
- Contains: `window.location.origin}/app`
- Contains: `__phantom_debug_redirect`
- Contains: `phantom.app/ul/v1/connect`

### ❌ Bad Signs (Wrong Bundle):
- No debug logs
- Contains: `window.location.href` (old code)
- Contains: `window.location.origin` without `/app`
- Missing: `phantom-deeplink` references
- Old bundle hash (doesn't match latest build)

---

## 📊 Verification Checklist

After inspecting the bundle:

- [ ] Found main bundle URL
- [ ] Downloaded bundle content
- [ ] Searched for debug log: `USING DEEPLINK FROM FILE`
- [ ] Searched for redirect code: `window.location.origin.*app`
- [ ] Searched for deep link: `phantom.app/ul/v1/connect`
- [ ] Compared bundle hash to local build
- [ ] Verified bundle timestamp (if available)

---

## 🚨 If Bundle is Wrong

If the production bundle doesn't contain the correct code:

1. **Check Netlify Deployment:**
   - Verify latest commit is deployed
   - Check build logs for errors
   - Verify build completed successfully

2. **Check Bundle Hash:**
   - Compare production hash to local `dist/index.html`
   - If different, Netlify may be serving cached build

3. **Force Cache Clear:**
   - Follow `FIX_PHANTOM_CACHE_ISSUE.md` steps
   - Rebuild and redeploy

---

## 📝 Report Template

After inspection, provide:

```
Bundle URL: https://usdfg.pro/assets/index-XXXXX.js
Bundle Hash: XXXXX
Local Hash: (from dist/index.html)

Debug Log Found: YES/NO
Redirect Code Found: YES/NO
Deep Link Code Found: YES/NO

First 30 lines:
[paste here]
```

---

## 🔧 Alternative: Local Verification

If you can't access Safari console, verify locally:

```bash
# Check what SHOULD be in production
grep -o "index-[A-Za-z0-9]*\.js" dist/index.html

# Check if bundle contains correct code
grep -c "USING DEEPLINK FROM FILE" dist/assets/index-*.js

# View first 50 lines of bundle
head -50 dist/assets/index-*.js
```

This shows what **should** be deployed, but the production bundle may differ due to caching.

