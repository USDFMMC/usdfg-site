# 🤖 Automated Payout System - Setup Guide

## Overview

This system **automatically** processes challenge payouts when both players agree on a winner. No manual intervention needed - scales to 10,000+ challenges!

---

## ✅ Security Features

The automated system validates EVERYTHING before releasing funds:

1. ✅ **Both players submitted results**
2. ✅ **Results match winner** (one YES, one NO)
3. ✅ **Challenge has on-chain PDA** (escrow exists)
4. ✅ **Not already paid out** (prevents duplicates)
5. ✅ **Winner is real participant** (creator or challenger)
6. ✅ **No result tampering** (validates logic)

---

## 📋 Setup Steps

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 3: Configure Admin Private Key

**CRITICAL:** The admin keypair must be stored securely in Firebase Functions config.

#### Option A: Use Your Existing Admin Wallet

1. Export your admin wallet's private key from Phantom:
   - Open Phantom
   - Settings → Security & Privacy → Export Private Key
   - **⚠️  NEVER share this key with anyone!**

2. Convert to array format (use Node.js):
   ```javascript
   // In Node.js REPL or a script
   const bs58 = require('bs58');
   const privateKeyBase58 = 'YOUR_PRIVATE_KEY_FROM_PHANTOM';
   const privateKeyArray = Array.from(bs58.decode(privateKeyBase58));
   console.log(JSON.stringify(privateKeyArray));
   ```

3. Set in Firebase config:
   ```bash
   firebase functions:config:set solana.admin_private_key='[1,2,3,...]'
   ```

#### Option B: Generate New Admin Keypair (Recommended)

1. Generate a new keypair for automated payouts:
   ```bash
   solana-keygen new --outfile admin-keypair.json
   ```

2. Convert to array format:
   ```bash
   cat admin-keypair.json
   ```

3. Set in Firebase config:
   ```bash
   firebase functions:config:set solana.admin_private_key='[1,2,3,...]'
   ```

4. **Fund the admin wallet** with SOL for transaction fees:
   ```bash
   # Get the public key
   solana-keygen pubkey admin-keypair.json
   
   # Send SOL to it (on devnet for testing)
   solana airdrop 5 <ADMIN_PUBLIC_KEY> --url devnet
   ```

5. **Initialize admin state on smart contract:**
   - Update `ADMIN_WALLET` in `client/src/lib/chain/config.ts` to your new admin public key
   - Call `initialize()` on the smart contract with the new admin address

### Step 4: Deploy Cloud Functions

```bash
# Build functions
cd functions
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### Step 5: Test the System

1. Create a challenge with your main wallet
2. Accept with a different wallet
3. Both players submit results (one YES, one NO)
4. **Watch the magic happen!** The Cloud Function will automatically:
   - Detect the winner
   - Validate all security checks
   - Call the smart contract
   - Release funds to winner

---

## 🔍 Monitoring

### View Function Logs

```bash
# Real-time logs
firebase functions:log --follow

# Filter for payouts
firebase functions:log --only processChallengePayout
```

### Check Firestore

After automated payout, the challenge document will have:
- `payoutTriggered: true`
- `payoutSignature: "<TRANSACTION_SIGNATURE>"`
- `payoutTimestamp: <TIMESTAMP>`

### Check On-Chain

Visit Solana Explorer with the transaction signature:
```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

---

## 🛠️ Manual Payout (For Disputes)

If a challenge is **disputed** (both players claim they won), you can manually resolve it:

### Frontend Integration (Add to Admin UI)

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const manualPayout = httpsCallable(functions, 'manualPayout');

// Call when admin picks a winner
const result = await manualPayout({ 
  challengeId: 'challenge_id_here', 
  winner: 'winner_wallet_address' 
});
```

This will:
1. Mark the challenge as completed with the admin-chosen winner
2. Trigger the automated payout system
3. Release funds from escrow

---

## 🚨 Error Handling

If a payout fails, the challenge document will have:
- `payoutError: "<ERROR_MESSAGE>"`
- `payoutErrorTimestamp: <TIMESTAMP>`

Common errors:
- **"Admin private key not configured"** → Set Firebase config (Step 3)
- **"Insufficient funds"** → Admin wallet needs more SOL for transaction fees
- **"Invalid winner"** → Bug in result submission logic (investigate Firestore data)
- **"Challenge has no on-chain PDA"** → Challenge wasn't created on-chain properly

---

## 💰 Cost Estimate

Firebase Cloud Functions pricing:
- **Free tier:** 2M invocations/month
- **After free tier:** $0.40 per million invocations

**Example:**
- 10,000 challenges/month = 10,000 function invocations
- Well within free tier ✅
- Even 100K challenges/month = FREE ✅

Solana transaction fees:
- ~0.000005 SOL per transaction
- 10,000 challenges = 0.05 SOL (~$5 at $100/SOL)

**Total cost for 10K challenges: ~$5/month** 🎉

---

## 🔐 Security Best Practices

1. ✅ **Never commit private keys** to Git
2. ✅ **Use Firebase Functions config** for secrets
3. ✅ **Rotate admin keypair** if compromised
4. ✅ **Monitor function logs** for suspicious activity
5. ✅ **Set up alerts** for failed payouts
6. ✅ **Test on devnet** before mainnet
7. ✅ **Use dedicated admin wallet** (not your personal wallet)

---

## 🎯 Next Steps

After setup:
1. ✅ Test with 1-2 challenges on devnet
2. ✅ Monitor logs for any errors
3. ✅ Verify on-chain transactions on Solana Explorer
4. ✅ Once confirmed working, update to mainnet RPC in `functions/src/index.ts`
5. ✅ Update `PROGRAM_ID` and `USDFG_MINT` for mainnet

---

## 📞 Support

If you encounter issues:
1. Check function logs: `firebase functions:log`
2. Check Firestore for error fields on challenge documents
3. Verify admin wallet has SOL for transaction fees
4. Verify smart contract is deployed and initialized

---

**🎉 Congratulations!** You now have a fully automated, secure, scalable payout system that requires ZERO manual intervention!

