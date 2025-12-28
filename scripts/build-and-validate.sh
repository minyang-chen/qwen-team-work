#!/bin/bash

echo "🚀 Building and Validating ACP Implementation..."

# Exit on any error
set -e

# Build packages in dependency order
echo "📦 Building shared package..."
cd packages/shared && npm run build
echo "✅ Shared package built"

echo "📦 Building backend package..."
cd ../backend && npm run build
echo "✅ Backend package built"

echo "📦 Building web-ui package..."
cd ../web-ui && npm run build
echo "✅ Web-UI package built"

echo "📦 Building team-core-agent package..."
cd ../team-core-agent && npm run build
echo "✅ Qwen-core-agent package built"

# Return to root
cd ../..

echo "🔍 Validating ACP implementation..."
node scripts/validate-acp.cjs

echo "🎉 Build and validation complete!"
echo ""
echo "Next steps:"
echo "1. Set up MongoDB: Update MONGODB_URI in .env.team"
echo "2. Test ACP: cd packages/team-core-agent && npm start"
echo "3. Deploy: ./scripts/deploy-acp.sh"
