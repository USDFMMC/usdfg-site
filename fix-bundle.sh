#!/bin/bash
# Force new bundle hash to clear Safari/Phantom cache

cd "/Users/husseinali/Downloads/CryptoTracker 2/USDFGAMING-full-project/USDFG GitHub/usdfg-site"

echo "🗑️  Deleting dist folder..."
rm -rf dist

echo "🔨 Building fresh bundle..."
npm run build

echo "✅ Verifying new bundle..."
NEW_BUNDLE=$(grep -o "index-[A-Za-z0-9]*\.js" dist/index.html | head -1)
echo "📦 New bundle: $NEW_BUNDLE"

echo "🔍 Checking for debug log..."
DEBUG_COUNT=$(grep -c "USING DEEPLINK FROM FILE" dist/assets/index-*.js 2>/dev/null || echo "0")
if [ "$DEBUG_COUNT" -gt "0" ]; then
  echo "✅ Debug log found ($DEBUG_COUNT occurrences)"
else
  echo "❌ Debug log missing!"
  exit 1
fi

echo "🔍 Checking bundle size..."
BUNDLE_SIZE=$(ls -lh dist/assets/index-*.js | awk '{print $5}' | head -1)
echo "📊 Bundle size: $BUNDLE_SIZE"

echo ""
echo "🚀 Ready to commit and push!"
echo "Run: git add . && git commit -m 'Fix: Force new bundle hash' && git push origin main"

