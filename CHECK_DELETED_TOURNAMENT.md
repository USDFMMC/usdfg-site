# How to Check if Tournament Was Deleted

## Quick Check

The tournament might have been deleted if it was completed before we added the 24-hour retention logic. Here's how to check:

## Option 1: Check Firestore Console

1. Go to Firebase Console: https://console.firebase.google.com/project/usdfg-app/firestore
2. Navigate to the `challenges` collection
3. Search for the tournament by:
   - Challenge ID (if you have it)
   - Creator wallet: `3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`
   - Format: `tournament`
   - Status: `completed`

If you don't see it, it was likely deleted.

## Option 2: Check Browser Console

Open browser console and run:
```javascript
// This will show all challenges in Firestore
// Look for completed tournaments
```

## Option 3: Check if Tournament Still Exists

If you have the challenge ID, you can check directly:
1. Open the app
2. Try to navigate to: `/app?challengeId=YOUR_CHALLENGE_ID`
3. If it doesn't load, the tournament was deleted

## What Happened?

**Before the fix:**
- Completed challenges (including Founder Tournaments) were deleted after 2 hours
- No completion timestamp was recorded
- The 24-hour retention wasn't working properly

**After the fix:**
- Founder Tournaments now record `tournament.completedAt` timestamp
- They're retained for 24 hours before deletion
- Better detection of completion time

## If Tournament Was Deleted

Unfortunately, if the tournament was already deleted, you'll need to:

1. **Check Firestore backups** (if enabled)
2. **Manually distribute rewards** using the participant list from memory/logs
3. **For future tournaments**: They will now be retained for 24 hours

## Prevention

Going forward:
- ✅ Completed Founder Tournaments will stay for 24 hours
- ✅ Completion timestamp is now properly recorded
- ✅ Admin can access payout UI during the 24-hour window

## Next Steps

1. Check Firestore to confirm if tournament exists
2. If deleted, manually distribute rewards based on:
   - Tournament participants list
   - Founder participant reward amount
   - Founder winner bonus amount
   - Champion wallet address

3. For future tournaments, the payout UI will be available for 24 hours after completion.
