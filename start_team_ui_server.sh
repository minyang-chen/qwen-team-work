#!/bin/bash

echo "🔄 Starting Team UI Server..."
cd packages/team-ui/server

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

echo "🚀 Starting UI Server on port ${WEBUI_SERVER_PORT:-8002}..."
npm start
