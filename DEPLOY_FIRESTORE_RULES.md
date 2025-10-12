# 🔥 Deploy Firestore Rules

I've created the `firestore.rules` file for you! Now you need to deploy it to Firebase.

## Option 1: Deploy via Firebase CLI (Recommended)

1. **Login to Firebase:**
   ```bash
   firebase login
   ```
   This will open a browser window to login with your Google account.

2. **Initialize Firebase (if needed):**
   ```bash
   firebase init
   ```
   - Select "Firestore" 
   - Choose your existing Firebase project
   - Accept default files (firestore.rules and firestore.indexes.json)

3. **Deploy the rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Option 2: Manual Copy-Paste (Easier!)

If you don't want to deal with Firebase CLI, just copy the rules manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your USDFG project
3. Go to **Firestore Database** → **Rules** tab
4. Copy the contents from `firestore.rules` file
5. Paste it in the Firebase Console
6. Click **Publish**

---

## What These Rules Do:

✅ **Challenges:** Anyone can read, authenticated users can create/update
✅ **Challenge Chats:** Anyone can read/write (temporary chat during matches)
✅ **Voice Signals:** Anyone can read/write (WebRTC signaling)

⚠️ **Note:** The chat and voice rules are currently open. Once everything works, you can make them more restrictive to only allow challenge participants.

---

## After Deploying:

Your voice chat and text chat will work! 🎉

Try opening the Submit Result Room again and:
- Type a message → should send instantly
- Voice should connect when both players are in the room
- Check browser console for success logs

