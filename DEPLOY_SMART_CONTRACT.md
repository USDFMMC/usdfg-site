# 🚀 Deploy Smart Contract - Complete Guide

## Step 1: Go to Solana Playground
1. Open [https://beta.solana.com/](https://beta.solana.com/)
2. Create a new project
3. Name it "usdfg-smart-contract"

## Step 2: Copy the Smart Contract Code
Copy the **entire contents** of `COPY_THIS_TO_PLAYGROUND.rs` and paste it into the `lib.rs` file in Solana Playground.

## Step 3: Build the Contract
1. Click **Build** button
2. Wait for compilation to complete
3. Check for any errors

## Step 4: Deploy the Contract
1. Click **Deploy** button
2. Wait for deployment to complete
3. **IMPORTANT**: Note the program ID that gets generated

## Step 5: Update Frontend
Once deployed, update the frontend with the correct program ID:

```typescript
// In client/src/lib/chain/config.ts
export const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID_HERE');
```

## Step 6: Test
Try creating a challenge to test if everything works.

## 🔧 Current Issue
The program ID `BRY2pCUWF4hq6cxz6Sm4BwG9NdurVqrgMneXA97JX8wu` is not a deployed smart contract - it's just a regular account.

## ✅ What We Need
A properly deployed smart contract with:
- Executable: true
- Proper program data
- All the functions (initialize, create_challenge, etc.)