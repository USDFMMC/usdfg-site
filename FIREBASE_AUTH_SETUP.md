# Firebase Authentication Setup - Step by Step

## Access Firebase Console

1. **Go to Firebase Console homepage:**
   https://console.firebase.google.com/

2. **Sign in with your Google account** (the one that has access to the `usdfg-app` project)

3. **Select your project:**
   - Click on "usdfg-app" project
   - If you don't see it, make sure you're signed in with the correct Google account

4. **Navigate to Authentication:**
   - In the left sidebar, click "Authentication" (or "Build" → "Authentication")
   - If you see "Get started", click it

5. **Enable Email/Password:**
   - Click on the "Sign-in method" tab (or "Providers" tab)
   - Find "Email/Password" in the list
   - Click on it
   - Toggle "Enable" to ON
   - Click "Save"

## Alternative: Direct Navigation

If you're already signed in, try these direct links:

**Authentication Providers:**
https://console.firebase.google.com/project/usdfg-app/authentication/providers

**Users List:**
https://console.firebase.google.com/project/usdfg-app/authentication/users

**Firestore Database:**
https://console.firebase.google.com/project/usdfg-app/firestore

**Firestore Rules:**
https://console.firebase.google.com/project/usdfg-app/firestore/rules

## Troubleshooting

**"Project not found" or "Access denied":**
- Make sure you're signed in with the Google account that owns/has access to the Firebase project
- Check if the project name is exactly "usdfg-app"

**Can't find Authentication:**
- Look in the left sidebar under "Build"
- Or use the search bar at the top to search for "Authentication"

**Email/Password option not visible:**
- Make sure you're on the "Sign-in method" or "Providers" tab
- Scroll down the list - it should be there

## After Enabling Email/Password

Once Email/Password is enabled, run:
```bash
node setup-admin.js admin@usdfg.pro YourPassword123
```

This will create the admin user automatically.
