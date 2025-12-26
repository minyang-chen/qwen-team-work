#!/bin/bash

echo "🧹 Clean ACP build process..."

# Clean ACP packages only
echo "🗑️  Cleaning ACP packages..."
rm -rf packages/shared/{node_modules,dist,package-lock.json} 2>/dev/null || true
rm -rf packages/team-backend/{node_modules,dist,package-lock.json} 2>/dev/null || true
rm -rf packages/team-ai-agent/{node_modules,dist,package-lock.json} 2>/dev/null || true
rm -rf packages/web-ui/server/{node_modules,package-lock.json} 2>/dev/null || true
rm -rf packages/web-ui/client/{node_modules,package-lock.json} 2>/dev/null || true

# Build in dependency order
echo "📦 Building shared package..."
cd packages/shared && npm install --no-audit --no-fund && npm run build && cd ../..

echo "📦 Building backend package..."
cd packages/team-backend && npm install --no-audit --no-fund && npm run build && cd ../..

echo "📦 Building ACP core agent..."
cd packages/team-ai-agent && npm install --no-audit --no-fund && npm run build && cd ../..

echo "📦 Installing web UI packages..."
cd packages/web-ui/server && npm install --no-audit --no-fund && cd ../../..
cd packages/web-ui/client && npm install --no-audit --no-fund && cd ../../..

echo "✅ ACP clean build completed!"
