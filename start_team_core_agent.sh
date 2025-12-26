#!/bin/bash

echo "🔄 Starting Team Core Agent..."
cd packages/team-ai-agent

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build if needed
if [ ! -d dist ]; then
  echo "🔨 Building..."
  npm run build
fi

echo "🚀 Starting Core Agent on port ${ACP_SERVER_PORT:-8001}..."
npm start
