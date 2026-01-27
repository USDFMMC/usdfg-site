# Admin Setup Guide

## Quick Setup Steps

### 1. Enable Firebase Authentication

1. Go to Firebase Console: https://console.firebase.google.com/project/usdfg-app/authentication/providers
2. Click "Get started" or go to Authentication → Sign-in method
3. Click on "Email/Password"
4. Enable "Email/Password" provider
5. Click "Save"

### 2. Create First Admin User

**Option A: Using the setup script (Recommended)**

```bash
node setup-admin.js admin@usdfg.pro YourSecurePassword123
```

**Option B: Manual setup**

1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Click "Add user"
5. Copy the User UID
6. Go to Firestore → `admins` collection
7. Click "Add document"
8. Set Document ID = User UID (from step 5)
9. Add fields:
   - `email` (string): admin@usdfg.pro
   - `uid` (string): [same as document ID]
   - `createdAt` (timestamp): [current timestamp]
   - `active` (boolean): true
   - `addedBy` (string): "system"
10. Click "Save"

### 3. Deploy Firestore Rules

The Firestore rules have been updated to allow admin access. Deploy them:

```bash
firebase deploy --only firestore:rules
```

Or if you don't have Firebase CLI installed, deploy via Firebase Console:
1. Go to: https://console.firebase.google.com/project/usdfg-app/firestore/rules
2. Copy the contents of `firestore.rules`
3. Paste into the rules editor
4. Click "Publish"

### 4. Test Admin Access

1. Go to: https://usdfg.pro/admin/disputes
2. You should see a login form
3. Enter your admin email and password
4. After login, connect your wallet
5. You should see the Dispute Console

## Troubleshooting

**"Email/Password authentication is not enabled"**
- Make sure you enabled Email/Password in Firebase Console (Step 1)

**"Permission denied" when creating admin document**
- Temporarily allow writes to `admins` collection in Firestore rules
- Or create the admin document manually in Firebase Console

**"You are not authorized" after login**
- Make sure the admin document exists in Firestore `admins` collection
- Check that the document ID matches the Firebase Auth UID exactly
- Verify `active: true` in the admin document

**Login form not showing**
- Check browser console for errors
- Verify route is `/admin/disputes` (not `/admin`)
- Make sure Firebase Auth is initialized correctly

## Adding More Admins

To add more admins later:

1. Create Firebase Auth user (Authentication → Users → Add user)
2. Copy the UID
3. Create document in `admins` collection with:
   - Document ID = UID
   - Fields: `{ email, uid, createdAt, active: true, addedBy: <your-uid> }`

Or use the setup script again with a different email.
