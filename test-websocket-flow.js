#!/usr/bin/env node

/**
 * End-to-End WebSocket Communication Test
 * Tests: client → ui-server → backend → core-agent communication flow
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test configuration
const TEST_CONFIG = {
  UI_SERVER_URL: process.env.UI_SERVER_URL || 'http://localhost:8002',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  TEST_USER_ID: 'test-user-123',
  TEST_SESSION_ID: 'test-session-456'
};

// Generate test JWT token
function generateTestToken() {
  return jwt.sign(
    { 
      userId: TEST_CONFIG.TEST_USER_ID,
      username: 'test-user',
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    TEST_CONFIG.JWT_SECRET
  );
}

// Test WebSocket connection and message flow
async function testWebSocketFlow() {
  console.log('🚀 Starting End-to-End WebSocket Communication Test\n');

  const token = generateTestToken();
  console.log('✅ Generated JWT token for test user');

  return new Promise((resolve, reject) => {
    const socket = io(TEST_CONFIG.UI_SERVER_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: false,
      timeout: 10000
    });

    let testPassed = false;
    let receivedChunks = [];

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!testPassed) {
        console.error('❌ Test failed: Connection timeout');
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }
    }, 15000);

    socket.on('connect', () => {
      console.log('✅ Connected to UI Server WebSocket');
      
      // Send test message
      const testMessage = 'Hello, this is a test message to verify the communication flow.';
      console.log('📤 Sending test message:', testMessage);
      
      socket.emit('chat:message', {
        userId: TEST_CONFIG.TEST_USER_ID,
        sessionId: TEST_CONFIG.TEST_SESSION_ID,
        message: testMessage
      });
    });

    socket.on('message:chunk', (data) => {
      console.log('📥 Received chunk:', data);
      if (data.type === 'text' && data.data?.text) {
        receivedChunks.push(data.data.text);
      }
    });

    socket.on('message:complete', () => {
      console.log('✅ Message streaming completed');
      console.log('📊 Total chunks received:', receivedChunks.length);
      console.log('📝 Full response:', receivedChunks.join(''));
      
      clearTimeout(connectionTimeout);
      testPassed = true;
      socket.disconnect();
      
      console.log('\n🎉 End-to-End WebSocket Communication Test PASSED!');
      console.log('✅ Communication flow verified: client → ui-server → backend → core-agent');
      resolve();
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      clearTimeout(connectionTimeout);
      socket.disconnect();
      reject(error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      clearTimeout(connectionTimeout);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      if (!testPassed) {
        clearTimeout(connectionTimeout);
        reject(new Error(`Disconnected: ${reason}`));
      }
    });
  });
}

// Test backend HTTP endpoint (optional)
async function testBackendEndpoint() {
  console.log('\n🔍 Testing Backend HTTP Endpoint...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const token = generateTestToken();
    
    const response = await fetch(`${TEST_CONFIG.BACKEND_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Backend HTTP endpoint is accessible');
    } else {
      console.log('⚠️  Backend HTTP endpoint returned:', response.status);
    }
  } catch (error) {
    console.log('⚠️  Backend HTTP endpoint test failed:', error.message);
  }
}

// Main test execution
async function runTests() {
  try {
    await testBackendEndpoint();
    await testWebSocketFlow();
    
    console.log('\n🏆 All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Ensure all services are running (ui-server, backend, core-agent)');
    console.error('2. Check that ports 8000, 8001, 8002 are accessible');
    console.error('3. Verify JWT_SECRET matches across all services');
    console.error('4. Check service logs for detailed error information');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test terminated');
  process.exit(1);
});

// Run tests
runTests();
