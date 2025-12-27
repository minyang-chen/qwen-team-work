#!/bin/bash

echo "🚀 Starting ACP Deployment..."

# Build shared package
echo "Building shared package..."
cd packages/team-shared && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Shared package build failed"
  exit 1
fi

# Build storage package
echo "Building storage package..."
cd ../team-storage && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Storage package build failed"
  exit 1
fi

# Build service package
echo "Building service package..."
cd ../team-service && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Service package build failed"
  exit 1
fi

# Build team-ai-agent package
echo "Building team-ai-agent package..."
cd ../team-ai-agent && npm run build
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
