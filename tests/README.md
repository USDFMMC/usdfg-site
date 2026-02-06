# Challenge Flow Tests

Automated test suite for challenge state machine validation.

## Run Tests

```bash
npm run test:challenge-flow
```

## What It Tests

- State machine logic and transitions
- Firestore function validation
- Contract function validation  
- UI state logic
- Timeout handling
- Safety checks
- **Mic request flow**: spectator request mic, creator approve/deny/replace, `createMicRequest`/`approveMicRequest`/`MAX_VOICE_SPEAKERS`, and UI error feedback

**Note**: For manual E2E testing with real wallets, see `TESTING_CHECKLIST.md` in the root directory.

