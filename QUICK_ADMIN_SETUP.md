# Quick Admin Setup (5 minutes)

## Step 1: Enable Email/Password Auth (2 min)

1. Open: https://console.firebase.google.com/project/usdfg-app/authentication/providers
2. Click "Email/Password" 
3. Toggle "Enable" ON
4. Click "Save"

## Step 2: Create Admin User (1 min)

Run this command:
```bash
node setup-admin.js admin@usdfg.pro YourPassword123
```

Or manually:
1. Firebase Console → Authentication → Users → "Add user"
2. Enter email + password → Copy UID
3. Firestore → `admins` collection → Add document
4. Document ID = UID
5. Fields: `email`, `uid`, `createdAt`, `active: true`

## Step 3: Deploy Rules (1 min)

```bash
firebase deploy --only firestore:rules
```

## Step 4: Test (1 min)

1. Go to: https://usdfg.pro/admin/disputes
2. Login with your email/password
3. Connect wallet
4. Done! ✅

---

**That's it!** You can now resolve disputes.
