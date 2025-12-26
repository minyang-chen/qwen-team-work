#!/bin/bash

# ACP Build Script - Build only ACP-related packages
set -e

echo "🔄 Building ACP packages..."

# Build shared package first (dependency for others)
echo "📦 Building shared package..."
cd packages/shared && npm run build && cd ../..

# Build backend package
echo "📦 Building backend package..."
cd packages/team-backend && npm run build && cd ../..

# Build team-ai-agent package
echo "📦 Building team-ai-agent package..."
cd packages/team-ai-agent && npm run build && cd ../..

echo "✅ All ACP packages built successfully!"
echo ""
echo "Next steps:"
echo "1. ./scripts/deploy-acp.sh"
echo "2. Test ACP functionality"
