# Automated Challenge Flow Testing

This directory contains automated tests for the challenge flow state machine.

## Setup

1. Install test dependencies:
```bash
npm install --save-dev @coral-xyz/anchor firebase-admin
```

2. Set up Firebase Admin credentials:
   - Create a service account in Firebase Console
   - Download the JSON key file
   - Set environment variable: `FIREBASE_ADMIN_KEY` (JSON string) or place file at `tests/firebase-admin-key.json`

3. Ensure you have devnet SOL and USDFG tokens for test wallets

## Running Tests

```bash
npm run test:challenge-flow
```

## Test Coverage

- ✅ Happy path (full flow)
- ✅ Creator timeout scenarios
- ✅ Joiner timeout scenarios  
- ✅ Adversarial scenarios (creator can't fund before joiner)
- ✅ Contract refund verification
- ✅ Firestore state consistency
- ✅ On-chain state consistency

## Test Output

Tests will output:
- ✅ Passed tests
- ❌ Failed tests with error details
- 📊 Summary statistics

