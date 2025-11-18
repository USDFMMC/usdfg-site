#!/bin/bash
# Verify production bundle vs local build

cd "/Users/husseinali/Downloads/CryptoTracker 2/USDFGAMING-full-project/USDFG GitHub/usdfg-site"

echo "🔍 PRODUCTION BUNDLE VERIFICATION"
echo "=================================="
echo ""

# Check local bundle
echo "📦 LOCAL BUILD:"
LOCAL_BUNDLE=$(grep -o "index-[A-Za-z0-9]*\.js" dist/index.html 2>/dev/null | head -1)
if [ -z "$LOCAL_BUNDLE" ]; then
  echo "❌ No local build found. Run: npm run build"
  exit 1
fi
echo "   Bundle: $LOCAL_BUNDLE"
echo ""

# Check if bundle exists
BUNDLE_FILE=$(ls dist/assets/index-*.js 2>/dev/null | head -1)
if [ -z "$BUNDLE_FILE" ]; then
  echo "❌ Bundle file not found in dist/assets/"
  exit 1
fi

echo "📊 BUNDLE ANALYSIS:"
echo "   File: $BUNDLE_FILE"
echo "   Size: $(ls -lh "$BUNDLE_FILE" | awk '{print $5}')"
echo ""

# Check for debug log
echo "🔍 CODE VERIFICATION:"
DEBUG_COUNT=$(grep -c "USING DEEPLINK FROM FILE" "$BUNDLE_FILE" 2>/dev/null || echo "0")
if [ "$DEBUG_COUNT" -gt "0" ]; then
  echo "   ✅ Debug log found ($DEBUG_COUNT occurrences)"
else
  echo "   ❌ Debug log MISSING"
fi

# Check for redirect code
REDIRECT_COUNT=$(grep -c "window.location.origin.*app" "$BUNDLE_FILE" 2>/dev/null || echo "0")
if [ "$REDIRECT_COUNT" -gt "0" ]; then
  echo "   ✅ Redirect code found ($REDIRECT_COUNT occurrences)"
else
  echo "   ❌ Redirect code MISSING"
fi

# Check for deep link
DEEPLINK_COUNT=$(grep -c "phantom.app/ul/v1/connect" "$BUNDLE_FILE" 2>/dev/null || echo "0")
if [ "$DEEPLINK_COUNT" -gt "0" ]; then
  echo "   ✅ Deep link code found ($DEEPLINK_COUNT occurrences)"
else
  echo "   ❌ Deep link code MISSING"
fi

# Check for debug variable
DEBUG_VAR_COUNT=$(grep -c "__phantom_debug_redirect" "$BUNDLE_FILE" 2>/dev/null || echo "0")
if [ "$DEBUG_VAR_COUNT" -gt "0" ]; then
  echo "   ✅ Debug variable found ($DEBUG_VAR_COUNT occurrences)"
else
  echo "   ❌ Debug variable MISSING"
fi

echo ""
echo "📋 FIRST 30 LINES OF BUNDLE:"
echo "=================================="
head -30 "$BUNDLE_FILE" | sed 's/^/   /'
echo ""
echo "=================================="
echo ""

# Show bundle hash location
echo "🔗 PRODUCTION URL:"
echo "   https://usdfg.pro/assets/$LOCAL_BUNDLE"
echo ""
echo "📝 TO VERIFY IN SAFARI:"
echo "   1. Open: https://usdfg.pro/app"
echo "   2. Run in console:"
echo "      [...document.querySelectorAll('script')].map(s => s.src)"
echo "   3. Compare bundle hash to: $LOCAL_BUNDLE"
echo "   4. If different, production is serving cached bundle"
echo ""

