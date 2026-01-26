# Challenge Flow Tests

Automated test suite for challenge state machine validation.

## Run Tests

```bash
npm run test:challenge-flow
```

```bash
npm run test:tournament-firestore
```

## What It Tests

- State machine logic and transitions
- Firestore function validation
- Contract function validation  
- UI state logic
- Timeout handling
- Safety checks
- Firestore emulator tournament integration (8 players)

**Note**: The Firestore tournament integration test runs against the local emulator
(`firebase emulators:exec --only firestore`) and will not touch production data.
For manual E2E testing with real wallets, see `TESTING_CHECKLIST.md`.

