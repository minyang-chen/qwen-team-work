#!/bin/bash

echo "🚀 Starting Qwen Code Web UI..."
echo ""
echo "Server will run on: http://localhost:3000"
echo "Client will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

cd "$(dirname "$0")/../.."
npm run web-ui:dev
