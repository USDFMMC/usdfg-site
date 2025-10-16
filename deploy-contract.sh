#!/bin/bash

# USDFG Smart Contract Deployment Script
# This script will help you deploy the updated smart contract to Solana devnet

set -e  # Exit on error

echo "🚀 USDFG Smart Contract Deployment"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI is not installed${NC}"
    echo ""
    echo "Please install it by running:"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.20/install)\""
    echo ""
    echo "Then add Solana to your PATH:"
    echo "export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""
    exit 1
fi

echo -e "${GREEN}✅ Solana CLI found: $(solana --version)${NC}"

# Check if Anchor CLI is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI is not installed${NC}"
    echo ""
    echo "Please install it by running:"
    echo "cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "avm install 0.30.1"
    echo "avm use 0.30.1"
    exit 1
fi

echo -e "${GREEN}✅ Anchor CLI found: $(anchor --version)${NC}"

# Check Solana configuration
echo ""
echo "📍 Current Solana Configuration:"
solana config get

# Prompt to set to devnet if not already
CURRENT_CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ "$CURRENT_CLUSTER" != *"devnet"* ]]; then
    echo -e "${YELLOW}⚠️  Not configured for devnet${NC}"
    read -p "Set to devnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana config set --url devnet
        echo -e "${GREEN}✅ Configured for devnet${NC}"
    else
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Check wallet balance
echo ""
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low balance. You need at least 2 SOL for deployment${NC}"
    read -p "Airdrop 2 SOL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Requesting airdrop..."
        solana airdrop 2
        sleep 5
        echo -e "${GREEN}✅ Airdrop successful${NC}"
    else
        echo -e "${YELLOW}Continuing with current balance...${NC}"
    fi
fi

# Build the contract
echo ""
echo "🔨 Building smart contract..."
echo ""

if anchor build; then
    echo ""
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo ""
    echo -e "${RED}❌ Build failed${NC}"
    echo ""
    echo "Common issues:"
    echo "1. Missing cargo-build-sbf: Run 'solana-install init'"
    echo "2. Rust version mismatch: Update with 'rustup update'"
    echo "3. Dependency issues: Try 'cargo clean' and rebuild"
    exit 1
fi

# Show program ID
echo ""
echo "📍 Program ID: 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY"
echo ""

# Ask if user wants to deploy
read -p "Deploy to devnet? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy
echo ""
echo "🚀 Deploying to devnet..."
echo ""

if anchor deploy; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🎉 Smart contract deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Copy the IDL to frontend:"
    echo "   cp target/idl/usdfg_smart_contract.json client/src/lib/chain/"
    echo ""
    echo "2. Initialize the contract with admin wallet"
    echo ""
    echo "3. Rebuild and redeploy your frontend:"
    echo "   cd client && npm run build"
    echo ""
    echo "4. Test challenge creation"
    echo ""
    echo "Program deployed at: 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY"
    echo "Explorer: https://explorer.solana.com/address/7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY?cluster=devnet"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo ""
    echo "Try running: anchor deploy --program-name usdfg_smart_contract"
    exit 1
fi

