#!/bin/bash

echo "🔄 Starting Team Storage..."
cd packages/team-storage

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

echo "🚀 Starting Backend on port ${SERVICE_BACKEND_PORT:-8000}..."
npm start
