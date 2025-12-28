#!/bin/bash
# Quick fix verification for team-service auth

echo "🔍 Checking auth middleware fix..."

# Check if the fix is in the built file
if grep -q "auth_token" /workdisk/hosting/my_qwen_code/qwen-team-work/packages/team-service/dist/middleware/auth.js; then
  echo "✅ Fix is in built code"
else
  echo "❌ Fix NOT in built code - rebuild needed"
  exit 1
fi

# Check if service is running
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
  echo "✅ Service is running"
else
  echo "❌ Service is NOT running"
  exit 1
fi

echo ""
echo "📋 To apply the fix:"
echo "1. Stop team-service (Ctrl+C)"
echo "2. Restart: cd packages/team-service && npm run dev"
echo ""
echo "🧪 Test after restart:"
echo "1. Login via web UI"
echo "2. Try creating a team"
