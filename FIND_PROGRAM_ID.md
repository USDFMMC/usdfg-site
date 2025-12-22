# Finding the Correct Program ID from Solana Playground

## The Problem
The error "This program may not be used for executing instructions" means the address we're using is NOT a deployed program.

The address `pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM` is your **wallet address**, not the **program ID**.

## How to Find the Real Program ID

1. **In Solana Playground**, after deployment completes, look for:
   - Console output that says "Program Id: <address>"
   - OR check the "Build & Deploy" panel
   - OR look in the terminal/console for the deployment address

2. **The program ID will be DIFFERENT from the wallet address**

3. **Once you find it**, we need to:
   - Update `declare_id!` in the contract code
   - Update `PROGRAM_ID` in `client/src/lib/chain/config.ts`
   - Update `Anchor.toml`
   - Redeploy if needed

## Quick Check
You can verify if an address is a program:
- Go to: https://explorer.solana.com/address/YOUR_ADDRESS?cluster=devnet
- If it shows "Program" → it's correct
- If it shows "Account" → it's wrong (that's just a wallet)

