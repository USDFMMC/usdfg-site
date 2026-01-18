#!/bin/bash

# Cloudflare Cache Purge Script for usdfg.pro
# 
# Usage:
#   1. Set your Cloudflare Zone ID and API Token below
#   2. Run: ./purge-cloudflare.sh
#
# To get your Zone ID:
#   - Go to Cloudflare Dashboard → Select usdfg.pro
#   - Zone ID is shown in the right sidebar
#
# To get API Token:
#   - Go to: https://dash.cloudflare.com/profile/api-tokens
#   - Create token with "Zone.Cache Purge" permission

# ============================================
# CONFIGURATION - SET THESE VALUES
# ============================================
ZONE_ID="your_zone_id_here"
API_TOKEN="your_api_token_here"

# ============================================
# SCRIPT
# ============================================

echo "🔄 Cloudflare Cache Purge for usdfg.pro"
echo "========================================"
echo ""

# Check if credentials are set
if [ "$ZONE_ID" = "your_zone_id_here" ] || [ "$API_TOKEN" = "your_api_token_here" ]; then
  echo "❌ ERROR: Please set ZONE_ID and API_TOKEN in this script"
  echo ""
  echo "To get your Zone ID:"
  echo "  1. Go to https://dash.cloudflare.com"
  echo "  2. Select usdfg.pro domain"
  echo "  3. Zone ID is shown in the right sidebar"
  echo ""
  echo "To get API Token:"
  echo "  1. Go to https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Create token with 'Zone.Cache Purge' permission"
  echo ""
  exit 1
fi

# Purge all cache
echo "📤 Sending purge request to Cloudflare..."
echo ""

RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Cache purge successful!"
  echo ""
  echo "⏳ Wait 30-60 seconds for changes to propagate..."
  echo "🧪 Test the site: https://usdfg.pro"
  echo "💡 Use incognito/private window to avoid browser cache"
else
  echo "❌ Cache purge failed!"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Check your Zone ID and API Token are correct."
  exit 1
fi
