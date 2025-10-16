# Deploy Updated Smart Contract

## Prerequisites

You need to have the Solana platform tools installed. If you don't have them, run:

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"
```

Then add Solana to your PATH (add this to your `~/.zshrc` or `~/.bashrc`):
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Step 1: Configure Solana CLI

Set Solana to use devnet:
```bash
solana config set --url devnet
```

Check your wallet balance (you need SOL for deployment):
```bash
solana balance
```

If you need devnet SOL, airdrop some:
```bash
solana airdrop 2
```

## Step 2: Build the Smart Contract

From the project root:

```bash
cd "/Users/husseinali/Downloads/CryptoTracker 2/USDFGAMING-full-project/USDFG GitHub/usdfg-site"
anchor build
```

This will compile the smart contract and generate:
- `target/deploy/usdfg_smart_contract.so` (the compiled program)
- `target/idl/usdfg_smart_contract.json` (the IDL/interface)

## Step 3: Deploy to Devnet

Deploy the program:

```bash
anchor deploy
```

This will deploy to devnet using the program keypair at:
`target/deploy/usdfg_smart_contract-keypair.json`

**Program ID**: `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY`

## Step 4: Initialize the Smart Contract

After deployment, you need to initialize it with the admin wallet. Use the admin wallet address from your config:
`3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`

You can do this through your frontend or write a script.

## Step 5: Initialize the Price Oracle

The price oracle PDA also needs to be initialized (even though it's not used for challenge creation in the new contract):

```bash
# You'll need to call initialize_price_oracle from your frontend or a script
```

## Step 6: Update Frontend Configuration

The frontend has already been updated to use the new program ID. After deployment:

1. Copy the generated IDL to the frontend:
```bash
cp target/idl/usdfg_smart_contract.json client/src/lib/chain/usdfg_smart_contract.json
```

2. Build and deploy your frontend:
```bash
cd client
npm run build
# Deploy to your hosting platform
```

## Verification

After deployment, verify the program is deployed:

```bash
solana program show 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY
```

## Troubleshooting

### Error: "cargo build-sbf not found"

Run this to install the platform tools:
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"
```

### Error: "Insufficient funds"

Airdrop more SOL:
```bash
solana airdrop 2
```

### Error: "Program already deployed"

If you need to redeploy (upgrade), use:
```bash
anchor upgrade target/deploy/usdfg_smart_contract.so --program-id 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY
```

## Summary of Changes

The new smart contract (`updated_smart_contract.rs`) has these improvements over the old one:

✅ **Removed Oracle Dependency** - No oracle check needed for challenge creation
✅ **Simplified Account Structure** - Removed unnecessary oracle accounts  
✅ **Better Error Handling** - More descriptive error messages
✅ **Security Improvements** - Reentrancy protection, admin checks
✅ **Fixed Escrow Logic** - Proper PDA-based escrow system

## New Program Details

- **Program ID**: `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY`
- **Network**: Devnet
- **Admin Wallet**: `3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`
- **USDFG Token Mint**: `7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX`

## Next Steps

1. Run through the deployment steps above
2. Initialize the contract with your admin wallet
3. Test challenge creation from the frontend
4. If everything works, you can close challenges from the old contract

