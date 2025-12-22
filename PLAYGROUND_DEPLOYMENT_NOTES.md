# Solana Playground Deployment Notes

## Program ID vs Wallet Address

**Important:** 
- `declare_id!` should be the PROGRAM ID (the deployed program address)
- The wallet address (pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM) is used to PAY for transactions, not as the program ID

## Finding the Correct Program ID in Playground

1. After deploying in Playground, check the deployment logs
2. Look for "Program Id:" - this is your program ID
3. The wallet address shown is just the payer wallet

## If You're Getting "Not Enough SOL" Errors

This means the WALLET signing the transaction doesn't have enough SOL:
- In Playground: Use the wallet with 5 SOL to sign transactions
- In Frontend: Make sure your Phantom wallet has devnet SOL (use a faucet)

## Current Configuration

- Program ID in code: pZL8bLnnNwLaeG36a2XUAGunbh9sFnMBUY6xEVoNStM
- If this was the program ID from Playground deployment, keep it
- If this was just a wallet address, you need to find the actual program ID from Playground

