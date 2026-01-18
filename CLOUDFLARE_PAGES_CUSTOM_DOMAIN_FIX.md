# Cloudflare Pages Custom Domain Fix for usdfg.pro

## Problem
The latest deployment is live on `usdfg-site.pages.dev` but `usdfg.pro` is showing an old version.

## Solution: Verify Custom Domain Configuration

### Step 1: Check Custom Domain in Cloudflare Pages

1. **Go to Cloudflare Pages Dashboard**
   - Navigate to: https://dash.cloudflare.com
   - Go to **Workers & Pages** → **usdfg-site**
   - Click the **"Custom domains"** tab

2. **Verify Domain is Connected**
   - You should see `usdfg.pro` listed
   - Status should show as **"Active"** (green checkmark)
   - If it shows "Pending" or has an error, click to resolve it

3. **Check DNS Records**
   - The custom domain should have a CNAME record pointing to your Pages deployment
   - Go to **DNS** → **Records** in Cloudflare
   - Look for a CNAME record:
     - **Name**: `@` or `usdfg.pro`
     - **Target**: `usdfg-site.pages.dev` or similar
     - **Proxy status**: Proxied (orange cloud)

### Step 2: Force Custom Domain Update

If the domain is connected but showing old content:

1. **In Cloudflare Pages Dashboard**:
   - Go to **Custom domains** tab
   - Find `usdfg.pro`
   - Click the **three dots (⋯)** menu
   - Select **"Remove custom domain"**
   - Wait 30 seconds
   - Click **"Set up a custom domain"**
   - Re-add `usdfg.pro`
   - Wait for DNS propagation (1-5 minutes)

2. **Purge Cloudflare Cache**:
   - Go to **Caching** → **Configuration**
   - Click **"Purge Everything"**
   - Wait 30-60 seconds

### Step 3: Verify Deployment is Live

1. **Check Latest Deployment**:
   - In Cloudflare Pages → **Deployments** tab
   - Verify the latest deployment (commit `1c58095`) is marked as **Production**
   - If not, click the three dots (⋯) → **"Retry deployment"** or **"Rollback to this deployment"**

2. **Test Both URLs**:
   - Test `usdfg-site.pages.dev` - should show latest version
   - Test `usdfg.pro` - should match the Pages URL
   - Use incognito/private window to avoid browser cache

### Step 4: Check Build Output Directory

Cloudflare Pages needs to know where your built files are:

1. **Go to Settings** tab in Cloudflare Pages
2. **Check Build configuration**:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `dist` (should match your Vite output)
   - **Root directory**: `/` (or leave empty)

3. **Verify Build Output**:
   - After deployment, check the build logs
   - Should see files being uploaded from `dist/` directory
   - Should see `index.html` in the output

## Quick Fix Checklist

- [ ] Custom domain `usdfg.pro` is listed in **Custom domains** tab
- [ ] Custom domain status is **"Active"** (green)
- [ ] Latest deployment (commit `1c58095`) is set as **Production**
- [ ] DNS CNAME record points to Pages deployment
- [ ] Cloudflare cache has been purged
- [ ] Tested in incognito window

## If Still Not Working

### Option 1: Retry Latest Deployment

1. Go to **Deployments** tab
2. Find the latest deployment (commit `1c58095`)
3. Click three dots (⋯) → **"Retry deployment"**
4. Wait for build to complete
5. Verify it's set as Production

### Option 2: Check Build Configuration

1. Go to **Settings** → **Builds & deployments**
2. Verify:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 18.x or 20.x
   - **Environment variables**: Check if any are needed

### Option 3: Manual Domain Reconnection

1. **Remove custom domain**:
   - Custom domains tab → Remove `usdfg.pro`

2. **Wait 2 minutes**

3. **Re-add custom domain**:
   - Click **"Set up a custom domain"**
   - Enter `usdfg.pro`
   - Follow the DNS setup instructions if needed

4. **Purge cache** after reconnection

## Verify Fix

After completing the steps above:

1. **Wait 2-5 minutes** for DNS/cache propagation
2. **Test in incognito window**: https://usdfg.pro
3. **Check browser console** for any errors
4. **Verify wallet connection** works
5. **Check that latest features** (tournament fixes) are visible

## Expected Result

- `usdfg.pro` should show the same content as `usdfg-site.pages.dev`
- Both should show the latest deployment (commit `1c58095`)
- Wallet connection should work correctly
- All recent fixes should be visible
