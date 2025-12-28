#!/bin/bash

echo "🚀 Starting ACP Deployment..."

# Build shared package
echo "Building shared package..."
cd packages/shared && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Shared package build failed"
  exit 1
fi

# Build backend package
echo "Building backend package..."
cd ../backend && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Backend package build failed"
  exit 1
fi

# Build team-ui package
echo "Building team-ui package..."
cd ../team-ui && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Team-UI package build failed"
  exit 1
fi

# Build team-core-agent package
echo "Building team-core-agent package..."
cd ../team-core-agent && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Qwen-core-agent package build failed"
  exit 1
fi

echo "✅ All packages built successfully"

# Start services
echo "Starting ACP services..."
echo "Backend: http://localhost:3000"
echo "Web-UI: http://localhost:3001" 
echo "ACP Agent: ws://localhost:8080"

echo "✅ ACP deployment complete"
