# Cloudflare Cache Fix for usdfg.pro

## Problem
Cloudflare is serving cached content on `usdfg.pro` even though the site has been updated on Netlify.

## Solution: Purge Cloudflare Cache

### Option 1: Purge Everything (Recommended after deployment)

1. **Log into Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your domain (`usdfg.pro`)

2. **Purge All Files**
   - Click **Caching** → **Configuration**
   - Click **Purge Everything**
   - Confirm the purge

3. **Wait 30-60 seconds** for cache to clear

4. **Test the site** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Option 2: Purge by URL (More Targeted)

If you only want to clear specific files:

1. Go to **Caching** → **Configuration**
2. Click **Custom Purge**
3. Enter URLs to purge:
   ```
   https://usdfg.pro/*
   https://usdfg.pro/index.html
   https://usdfg.pro/app/*
   ```
4. Click **Purge**

### Option 3: Use Cloudflare API (Automated)

If you have a Cloudflare API token:

```bash
# Get your Zone ID from Cloudflare dashboard
# Get API token from: https://dash.cloudflare.com/profile/api-tokens

curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

## Prevent Future Cache Issues

### 1. Update Cloudflare Cache Rules

In Cloudflare Dashboard:
- Go to **Caching** → **Configuration**
- Set **Browser Cache TTL** to "Respect Existing Headers"
- This ensures Cloudflare respects the `Cache-Control: no-cache` headers we set in `netlify.toml`

### 2. Add Page Rules (Optional)

Create a Page Rule for HTML files:
- **URL Pattern**: `usdfg.pro/*.html` or `usdfg.pro/`
- **Settings**:
  - Cache Level: Bypass
  - Edge Cache TTL: 2 hours (or shorter)

### 3. Development Mode (Temporary)

For testing, enable **Development Mode**:
- Go to **Caching** → **Configuration**
- Toggle **Development Mode** ON
- This bypasses cache for 3 hours
- **Remember to turn it off** when done!

## Verify Cache is Cleared

1. **Check Response Headers**:
   ```bash
   curl -I https://usdfg.pro/
   ```
   Look for `CF-Cache-Status: MISS` (cache miss) or `DYNAMIC` (bypassed)

2. **Check Build Timestamp**:
   - Open browser DevTools → Network tab
   - Reload page
   - Check `index.html` response
   - Should show recent timestamp

3. **Hard Refresh**:
   - Desktop: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Mobile: Clear browser cache or use incognito mode

## Quick Fix Script

If you have Cloudflare API credentials, save this as `purge-cloudflare.sh`:

```bash
#!/bin/bash

# Set these variables
ZONE_ID="your_zone_id_here"
API_TOKEN="your_api_token_here"

echo "🔄 Purging Cloudflare cache for usdfg.pro..."

curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

echo ""
echo "✅ Cache purge complete! Wait 30-60 seconds, then test the site."
```

## After Purging

1. **Wait 30-60 seconds** for changes to propagate
2. **Test in incognito/private window** to avoid browser cache
3. **Check the site** - should show latest version
4. **Verify wallet connection** works correctly

## If Still Not Working

1. **Check Netlify deployment**:
   - Go to Netlify dashboard
   - Verify latest deployment is live
   - Check deployment logs for errors

2. **Check DNS**:
   - Verify `usdfg.pro` points to Netlify
   - DNS should be proxied through Cloudflare (orange cloud)

3. **Check Cloudflare SSL/TLS**:
   - Should be set to "Full" or "Full (strict)"
   - This ensures proper connection to Netlify

4. **Contact Support**:
   - If cache persists after purging, contact Cloudflare support
   - They can check for any edge cache issues
