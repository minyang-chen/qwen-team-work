#!/bin/bash

echo "🔄 Starting Team Web..."
cd packages/team-web

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🚀 Starting UI Client on port ${VITE_PORT:-8003}..."
npm run dev
