# Fix Missing cargo-build-sbf Tool

## The Issue
`cargo-build-sbf` is missing. This tool comes with Solana platform tools.

## Quick Fix - Run These Commands:

### Option 1: Install via Homebrew (Easiest)
```bash
# Install Solana via Homebrew
brew install solana

# Verify installation
cargo-build-sbf --version
```

### Option 2: Manual Install
```bash
# Download and install Solana platform tools
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"

# Add to your current session
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Add to your shell permanently
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
cargo-build-sbf --version
```

### Option 3: Use Agave Tools (Alternative)
```bash
# Install via cargo
cargo install --git https://github.com/anza-xyz/agave.git platform-tools

# Or
cargo install solana-cli
```

## After Installing, Build & Deploy:

```bash
cd "/Users/husseinali/Downloads/CryptoTracker 2/USDFGAMING-full-project/USDFG GitHub/usdfg-site"

# Build
anchor build

# Deploy
anchor deploy
```

## Quick Test:
```bash
cargo-build-sbf --version
```

If this shows a version number, you're good to go!

