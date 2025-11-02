# How to Create a Free USDFG Claim Event

## Option 1: Browser Console (Easiest)

1. **Deploy Firestore Rules First** (if not already deployed):
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Open your Arena page** in the browser (http://localhost:5173/app)

3. **Open browser console** (F12 or Cmd+Option+I)

4. **Copy and paste this code** into the console:

```javascript
(async function() {
  const { db } = await import('/src/lib/firebase/config.ts');
  const { collection, addDoc, Timestamp } = await import('firebase/firestore');
  
  const claimEvent = {
    isActive: true,
    totalAmount: 500,
    amountPerClaim: 10,
    maxClaims: 50,
    currentClaims: 0,
    claimedBy: [],
    activatedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
    createdAt: Timestamp.now()
  };
  
  const docRef = await addDoc(collection(db, 'free_claims'), claimEvent);
  console.log('✅ Claim event created! ID:', docRef.id);
  alert('✅ Created! Refresh page to see it.');
})();
```

5. **Press Enter** - the event will be created!

6. **Refresh the page** - The "Win Rate" box will change to "Claim Free USDFG" 🎁

## Option 2: Firebase Console

1. Go to Firebase Console → Firestore Database
2. Click "+ Start collection"
3. Collection ID: `free_claims`
4. Document ID: Click "Auto-ID"
5. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `isActive` | boolean | `true` |
| `totalAmount` | number | `500` |
| `amountPerClaim` | number | `10` |
| `maxClaims` | number | `50` |
| `currentClaims` | number | `0` |
| `claimedBy` | array | Leave empty `[]` |
| `activatedAt` | timestamp | Click calendar → "now" |
| `expiresAt` | timestamp | Set 1 hour from now |
| `createdAt` | timestamp | Click calendar → "now" |

6. Click "Save"

## Option 3: Deploy Firestore Rules First

If you get permission errors, deploy the updated Firestore rules:

```bash
firebase deploy --only firestore:rules
```

The rules file (`firestore.rules`) has been updated to allow writes to `free_claims` collection.

## Testing

Once created:
- ✅ Refresh your Arena page
- ✅ The "Win Rate" stat box will transform into "Claim Free USDFG" 
- ✅ Shows amount (e.g., "10 USDFG")
- ✅ Shows remaining claims (e.g., "50 left")
- ✅ Clicking it will claim for connected wallets
- ✅ Updates in real-time as people claim

## Next Steps

1. **Implement token transfer** - Add SPL token transfer logic to actually send USDFG
2. **Set up automation** - Create Cloud Functions or cron jobs to randomly activate events
3. **Monitor claims** - Track how many people claim and adjust amounts/frequency

