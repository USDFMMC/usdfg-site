# Complete Guide: Switch from Netlify to Cloudflare Pages

## Current Situation
- Domain `usdfg.pro` is still pointing to Netlify (causing 404s)
- You want to use Cloudflare Pages instead
- Cloudflare Pages project is set up and ready

## Step-by-Step Migration

### Step 1: Complete Cloudflare Domain Setup

1. **Finish Nameserver Update** (if not done yet):
   - Cloudflare should have given you nameservers
   - Update them at your domain registrar
   - Wait for activation (1-2 hours, usually faster)

2. **Verify Domain is Active in Cloudflare**:
   - Go to **Domains** → `usdfg.pro`
   - Should show "Active" status (green checkmark)

### Step 2: Connect Domain to Cloudflare Pages

1. **Go to Cloudflare Pages**:
   - **Workers & Pages** → **usdfg-site** → **Custom domains** tab

2. **Add Custom Domain**:
   - Click **"Set up a custom domain"**
   - Enter `usdfg.pro`
   - It should work now (no DNS transfer prompt)

3. **Add CNAME Record** (if not automatic):
   - Go to **DNS** → **Records** for `usdfg.pro`
   - Add CNAME:
     - **Type**: CNAME
     - **Name**: `@` (or leave blank for root)
     - **Target**: `usdfg-site.pages.dev`
     - **Proxy**: ON (orange cloud) ✅
   - Save

4. **Wait for Activation**:
   - Status should change to "Active" within 2-5 minutes
   - You'll see it in the Custom domains list

### Step 3: Remove Netlify DNS Records

1. **Check Current DNS Records**:
   - Go to **DNS** → **Records** for `usdfg.pro`
   - Look for any records pointing to Netlify:
     - CNAME records with `netlify.app` or `netlify.com`
     - A records pointing to Netlify IPs

2. **Remove Netlify Records**:
   - Delete any CNAME/A records pointing to Netlify
   - Keep only the CNAME pointing to `usdfg-site.pages.dev`

3. **Verify DNS**:
   - All traffic should go through Cloudflare
   - No more `x-nf-request-id` headers

### Step 4: Verify Routing Works

Cloudflare Pages uses `_routes.json` for SPA routing. The file is already configured:

**File: `client/public/_routes.json`**
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", "/favicon.ico"]
}
```

This tells Cloudflare Pages:
- All routes (`/*`) should be handled by the app
- Static assets (`/assets/*`, `/favicon.ico`) are excluded
- All other routes serve `index.html` for React Router

### Step 5: Test the Site

1. **Wait 2-5 minutes** after domain activation
2. **Test in incognito window**:
   - `https://usdfg.pro` - should load
   - `https://usdfg.pro/app` - should load (no 404!)
   - `https://usdfg.pro/app/challenge/new` - should work

3. **Check Response Headers**:
   - Should see `cf-ray` (Cloudflare)
   - Should NOT see `x-nf-request-id` (Netlify)
   - Should see `server: cloudflare`

## Troubleshooting

### Still Getting 404s?

1. **Check DNS Propagation**:
   - Use https://dnschecker.org
   - Verify CNAME points to `usdfg-site.pages.dev`
   - Wait up to 24 hours for full propagation

2. **Clear Browser Cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito/private window

3. **Verify Cloudflare Pages Deployment**:
   - Check **Deployments** tab
   - Latest deployment should be "Production"
   - Should show green checkmark

4. **Check Custom Domain Status**:
   - **Custom domains** tab
   - `usdfg.pro` should show "Active" (green)
   - If "Pending", wait a bit longer

### Domain Still Pointing to Netlify?

1. **Check DNS Records**:
   - Remove any Netlify CNAME/A records
   - Ensure only Cloudflare Pages CNAME exists

2. **Check Nameservers**:
   - Should be Cloudflare nameservers
   - Not your registrar's default nameservers

3. **Wait for DNS Propagation**:
   - Can take 1-24 hours
   - Usually much faster (1-2 hours)

## Files to Keep/Remove

### Keep (for Cloudflare Pages):
- ✅ `client/public/_routes.json` - Cloudflare Pages routing
- ✅ `netlify.toml` - Can keep for reference, but Cloudflare Pages uses different config
- ✅ All source files

### Optional (Netlify-specific, can remove):
- ⚠️ `client/public/_redirects` - Netlify only, not needed for Cloudflare Pages
- ⚠️ `netlify.toml` - Not used by Cloudflare Pages, but harmless to keep

## After Migration

Once everything is working:
1. ✅ Domain points to Cloudflare Pages
2. ✅ All routes work (`/app`, `/app/*`, etc.)
3. ✅ No more 404 errors
4. ✅ Faster performance (Cloudflare CDN)
5. ✅ Better caching and security

## Next Steps

1. Complete nameserver update (if not done)
2. Connect domain to Cloudflare Pages
3. Remove Netlify DNS records
4. Test all routes
5. Enjoy faster, more reliable hosting! 🚀
