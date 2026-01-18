# Routing Fix for Cloudflare Pages - 404 on /app

## Problem
Getting 404 errors on `https://usdfg.pro/app` because:
1. Domain is currently pointing to **Netlify** (not Cloudflare Pages)
2. Netlify needs `_redirects` file for SPA routing
3. Cloudflare Pages needs `_routes.json` for routing

## Solution: Switch Domain to Cloudflare Pages

### Step 1: Remove Domain from Netlify

1. **Go to Netlify Dashboard**
   - https://app.netlify.com
   - Find your site
   - Go to **Domain settings**
   - Remove `usdfg.pro` from custom domains

2. **Or Update DNS**
   - Remove the CNAME/A record pointing to Netlify
   - Point it to Cloudflare Pages instead

### Step 2: Connect Domain to Cloudflare Pages

1. **In Cloudflare Pages Dashboard**
   - Go to **Workers & Pages** → **usdfg-site**
   - Click **"Custom domains"** tab
   - Click **"Set up a custom domain"**
   - Enter `usdfg.pro`
   - Follow the DNS setup instructions

2. **Add CNAME Record**
   - Go to **DNS** → **Records** for `usdfg.pro`
   - Add CNAME:
     - **Type**: CNAME
     - **Name**: `@` (or leave blank)
     - **Target**: `usdfg-site.pages.dev`
     - **Proxy**: ON (orange cloud) ✅

### Step 3: Verify Routing Configuration

Cloudflare Pages uses `_routes.json` for routing. The file should be:

**File: `client/public/_routes.json`**
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", "/favicon.ico"]
}
```

This tells Cloudflare Pages:
- Include all routes (`/*`)
- Exclude static assets (`/assets/*`, `/favicon.ico`)
- All other routes will serve `index.html` for SPA routing

### Step 4: Rebuild and Deploy

1. **Commit the routing files**:
   ```bash
   git add client/public/_routes.json client/public/_redirects
   git commit -m "Add routing config for Cloudflare Pages and Netlify"
   git push
   ```

2. **Cloudflare Pages will auto-deploy**
   - Wait for deployment to complete
   - Check deployment status in Cloudflare Pages dashboard

3. **Test the site**:
   - Wait 2-5 minutes after deployment
   - Test in incognito: https://usdfg.pro/app
   - Should work now!

## Alternative: Keep Using Netlify

If you want to keep using Netlify instead:

1. **Keep domain pointing to Netlify**
2. **Ensure `_redirects` file exists** in `client/public/`:
   ```
   /app/*    /index.html   200
   /app      /index.html   200
   /*        /index.html   200
   ```
3. **Redeploy on Netlify**
   - Netlify will pick up the `_redirects` file
   - Routes should work after redeploy

## Current Status

- ✅ `_redirects` file created (for Netlify)
- ✅ `_routes.json` exists (for Cloudflare Pages)
- ⚠️ Domain needs to be switched from Netlify to Cloudflare Pages

## After Switching to Cloudflare Pages

Once the domain is connected to Cloudflare Pages:
1. Routes will work automatically via `_routes.json`
2. `/app` will serve `index.html` (SPA routing)
3. React Router will handle client-side routing
4. No more 404 errors!

## Verify It's Working

After switching to Cloudflare Pages:
1. Check response headers - should NOT see `x-nf-request-id`
2. Should see `cf-ray` header (Cloudflare)
3. `/app` route should return 200 (not 404)
4. React app should load correctly
