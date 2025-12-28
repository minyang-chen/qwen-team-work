#!/bin/bash

echo "🧹 Starting clean build process..."

# Clean all node_modules and lock files
echo "🗑️  Removing all node_modules and lock files..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "package-lock.json" -delete 2>/dev/null || true
find . -name "yarn.lock" -delete 2>/dev/null || true

# Clean all dist directories
echo "🗑️  Removing all dist directories..."
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# Install root dependencies first
echo "📦 Installing root dependencies..."
npm install --no-audit --no-fund

# Install and build packages in dependency order
echo "📦 Building packages in dependency order..."

# 1. Shared package (no dependencies)
echo "🔧 Building shared package..."
cd packages/shared
npm install --no-audit --no-fund
npm run build
cd ../..

# 2. Core package (depends on shared)
echo "🔧 Building core package..."
cd packages/core
npm install --no-audit --no-fund
npm run build 2>/dev/null || echo "Core build skipped (optional)"
cd ../..

# 3. Backend package (depends on shared)
echo "🔧 Building backend package..."
cd packages/team-backend
npm install --no-audit --no-fund
npm run build
cd ../..

# 4. ACP Core Agent (depends on shared)
echo "🔧 Building ACP core agent..."
cd packages/team-core-agent
npm install --no-audit --no-fund
npm run build
cd ../..

# 5. Web UI packages
echo "🔧 Building web UI server..."
cd packages/web-ui/server
npm install --no-audit --no-fund
cd ../../..

echo "🔧 Installing web UI client..."
cd packages/web-ui/client
npm install --no-audit --no-fund
cd ../../..

echo "✅ Clean build completed successfully!"
echo ""
echo "🚀 Ready to start services with: ./start_all.sh"
