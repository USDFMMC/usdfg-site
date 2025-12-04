# Service Worker Analysis Report

## Current Status

### ❌ What's Missing:

1. **Service Worker Registration**: The code is actively UNREGISTERING service workers in `index.html`
2. **Service Worker Source File**: No `sw.js` or `service-worker.js` in source code (only in old `dist/` build)
3. **Vite PWA Plugin**: Not installed - `vite-plugin-pwa` is missing
4. **Registration in Entry File**: No service worker registration in `main.tsx`
5. **Manifest.json start_url**: Currently `/app` but should be `/` (app moved to root)

### ✅ What Exists:

1. **Manifest.json**: Exists at `client/public/manifest.json` but has wrong `start_url`
2. **Old Service Worker**: `dist/sw.js` exists but is from old build and not being used

## Lighthouse Error

**Error**: "Does not register a service worker that controls page and start_url."

**Root Cause**: 
- Service workers are being actively unregistered
- No service worker registration code exists
- Manifest.json start_url doesn't match actual app location

## Required Fixes

### 1. Install vite-plugin-pwa
```bash
npm install -D vite-plugin-pwa
```

### 2. Update vite.config.ts
Add PWA plugin configuration

### 3. Remove Service Worker Unregister Code
Remove the unregister code from `index.html`

### 4. Update manifest.json
Change `start_url` from `/app` to `/`

### 5. Register Service Worker
Add registration code to `main.tsx` (or let vite-plugin-pwa handle it)

## Correct Setup for Vite + React + Netlify

1. Use `vite-plugin-pwa` for automatic service worker generation
2. Service worker should control root `/` and start_url `/`
3. Use `workbox` strategy (included in vite-plugin-pwa)
4. Ensure service worker is included in build output
5. Register service worker on app load

