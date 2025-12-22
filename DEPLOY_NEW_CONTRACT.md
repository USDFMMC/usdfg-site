# Deploy Updated Smart Contract

## Problem
The deployed contract at `3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp` is an old version that:
- Still expects `creator_token_account` during challenge creation
- Still charges fees during challenge creation
- Doesn't match the new intent-first flow (no payment until both players confirm)

## Solution
You need to upgrade the deployed program. You have two options:

### Option 1: Upgrade Existing Program (if you have upgrade authority)

1. **Get the program keypair file** for `3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp`
   - This should be in your deployment keypairs
   - Or use: `solana program show 3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp` to see upgrade authority

2. **Update the contract to match the program ID:**
   ```bash
   # Update declare_id! in programs/usdfg_smart_contract/src/lib.rs
   declare_id!("3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp");
   ```

3. **Build and upgrade:**
   ```bash
   anchor build
   anchor upgrade target/deploy/usdfg_smart_contract.so --program-id 3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp
   ```

### Option 2: Deploy New Program (recommended if you don't have upgrade authority)

1. **Update frontend config to use new program ID:**
   - The contract code declares: `DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK`
   - Update `client/src/lib/chain/config.ts`:
     ```typescript
     export const PROGRAM_ID = new PublicKey('DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK');
     ```

2. **Deploy the new contract:**
   ```bash
   anchor build
   anchor deploy
   ```

3. **Copy the IDL:**
   ```bash
   cp target/idl/usdfg_smart_contract.json client/src/lib/chain/
   ```

## What Changed in the New Contract

- ✅ `create_challenge` no longer requires token accounts
- ✅ No payment during challenge creation (metadata only)
- ✅ New state flow: `PendingWaitingForOpponent` → `CreatorConfirmationRequired` → `CreatorFunded` → `Active`
- ✅ Users only pay after both players are confirmed

## Verification

After deployment, test challenge creation:
1. Create a challenge - should succeed without payment
2. Check that status is `pending_waiting_for_opponent`
3. No funds should be moved

