# USDFG Arena PWA - Development Guide

## Quick Start

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
- **Dev URL**: `http://localhost:5173`
- **Arena URL**: `http://localhost:5173/app`

### Build for Production
```bash
npm run build
```

## Arena URLs

| **Route** | **URL** | **Description** |
|-----------|---------|-----------------|
| Landing Page | `/` | Marketing site with "Enter the Arena" CTAs |
| Arena Home | `/app` | Main gaming platform with challenges & leaderboard |
| Create Challenge | `/app/challenge/new` | Form to create new gaming challenges |
| Player Profile | `/app/profile/:address` | Public player stats and history |

## PWA Testing

### Install PWA
1. Open `http://localhost:5173/app` in Chrome/Edge
2. Look for install button in address bar
3. Click "Install USDFG Arena"
4. App will install as native-like experience

### Test Offline Mode
1. Install the PWA first
2. Open DevTools → Network tab
3. Check "Offline" checkbox
4. Navigate to `/app` - should still load from cache
5. Uncheck "Offline" to restore connection

### PWA Features
- ✅ **Offline Support** - App works without internet
- ✅ **Install Prompt** - Smart installation hints
- ✅ **App Shortcuts** - Quick access to create challenges
- ✅ **Mobile Optimized** - Full mobile experience

## Development Notes

### Architecture
- **Client-Side Only** - No server required, all data derived from blockchain
- **React Router DOM** - Full SPA routing with proper navigation
- **PWA Ready** - Service worker + manifest for native app experience
- **Netlify Deploy** - Automatic SPA redirects configured

### Key Components
- `src/pages/app/` - Arena pages (home, create, profile)
- `src/components/arena/` - Arena-specific components
- `src/lib/chain/` - Mock Solana blockchain integration
- `src/lib/derive/` - Client-side statistics derivation

### Mock Data
- All blockchain data is currently mocked
- Replace `lib/chain/events.ts` with real Solana RPC calls
- Stats are derived client-side from challenge events

## Deployment

### Netlify (Automatic)
- Push to main branch
- Netlify auto-deploys from `dist/public`
- SPA redirects configured via `public/_redirects`

### Manual Build
```bash
npm run build
# Deploy contents of dist/public/
```

## Troubleshooting

### Common Issues
1. **Routes not working** - Check `public/_redirects` has `/* /index.html 200`
2. **PWA not installing** - Verify `manifest.json` and service worker registration
3. **Import errors** - Run `npm install` to ensure all dependencies

### Console Errors
- Check browser console for any import/compilation errors
- Verify all Arena components are properly imported in `App.tsx`
- Ensure React Router DOM is installed (`npm list react-router-dom`)

## Next Steps

1. **Replace mock data** with real Solana blockchain integration
2. **Add wallet connection** (Phantom, Solflare)
3. **Implement challenge creation** blockchain transactions
4. **Add real-time updates** for active challenges
5. **Enhance offline functionality** with IndexedDB

---

**The USDFG Arena is ready for development!** 🎮
