#!/bin/bash

# Test shell command preprocessing and Docker execution

echo "🧪 Testing shell command preprocessing and Docker execution..."

# Start services in background
cd /workdisk/hosting/my_qwen_code/qwen-team-work
./start-services.sh &
SERVICES_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Test the !pwd command via curl
echo "🔧 Testing !pwd command..."
curl -X POST http://localhost:8002/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}' > /tmp/session_response.json

SESSION_ID=$(cat /tmp/session_response.json | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "📝 Created session: $SESSION_ID"

# Send !pwd command
echo "🚀 Sending !pwd command..."
curl -X POST "http://localhost:8002/api/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"message": "!pwd"}' > /tmp/pwd_response.json

echo "📋 Response:"
cat /tmp/pwd_response.json | head -20

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVICES_PID 2>/dev/null
rm -f /tmp/session_response.json /tmp/pwd_response.json

echo "✅ Test completed"
