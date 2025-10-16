#!/bin/bash
# Install Solana Platform Tools

echo "🔧 Installing Solana Platform Tools..."
echo ""

# Try different installation methods
if command -v brew &> /dev/null; then
    echo "📦 Found Homebrew, installing via brew..."
    brew install solana
else
    echo "📦 Installing via official installer..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
fi

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Run this to add Solana to your PATH permanently:"
echo 'echo export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH" >> ~/.zshrc'
echo ""
echo "Then reload your shell:"
echo "source ~/.zshrc"

