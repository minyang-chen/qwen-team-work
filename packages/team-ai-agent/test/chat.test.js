const WebSocket = require('ws');

async function testChatFunctionality() {
  console.log('Testing chat functionality...');
  
  const ws = new WebSocket('ws://localhost:8080');
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      const chatMessage = {
        id: 'test-chat-1',
        type: 'chat',
        data: {
          content: 'Hello, test message',
          sessionId: 'test-session-chat'
        },
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(chatMessage));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      
      if (response.id === 'test-chat-1' && response.success && response.data.content) {
        console.log('✓ Chat functionality test passed');
        console.log('  Response:', response.data.content.substring(0, 50) + '...');
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Chat test timeout')), 5000);
  });
}

if (require.main === module) {
  testChatFunctionality()
    .then(() => console.log('✓ Chat functionality test passed'))
    .catch(error => {
      console.error('✗ Chat functionality test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testChatFunctionality };
