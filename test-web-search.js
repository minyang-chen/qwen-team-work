#!/usr/bin/env node

const { io } = require('socket.io-client');

const TEST_URL = 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/team-sections';
const SERVER_URL = 'http://localhost:8002';

async function testWebSearch() {
  console.log('🧪 Testing web search functionality...');
  
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL);
    let responseReceived = false;
    
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        socket.disconnect();
        reject(new Error('❌ Test timeout - no response received within 30 seconds'));
      }
    }, 30000);

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      
      const testMessage = `search the web for "${TEST_URL}"`;
      
      console.log('📤 Sending test message:', testMessage);
      socket.emit('message', testMessage);
    });

    socket.on('response', (data) => {
      console.log('📥 Received response');
      responseReceived = true;
      clearTimeout(timeout);
      
      if (data && (data.includes('Tailwind') || data.includes('team') || data.includes('UI'))) {
        console.log('✅ Web search working! Response contains relevant content');
        console.log('📄 Response preview:', data.substring(0, 200) + '...');
        socket.disconnect();
        resolve(true);
      } else {
        console.log('⚠️  Response received but may not contain web search results');
        console.log('📄 Response:', data);
        socket.disconnect();
        resolve(false);
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`❌ Socket.IO error: ${error.message || error}`));
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
    });
  });
}

// Run test
testWebSearch()
  .then((success) => {
    console.log(success ? '🎉 Test PASSED' : '⚠️  Test completed with warnings');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test FAILED:', error.message);
    process.exit(1);
  });
