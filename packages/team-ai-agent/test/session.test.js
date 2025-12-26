const WebSocket = require('ws');

async function testSessionManagement() {
  console.log('Testing session management...');
  
  const ws = new WebSocket('ws://localhost:8080');
  
  return new Promise((resolve, reject) => {
    let testStep = 0;
    const sessionId = 'test-session-' + Date.now();
    
    ws.on('open', () => {
      // Test session creation
      const createMessage = {
        id: 'test-create-1',
        type: 'session',
        data: {
          action: 'create',
          sessionId: sessionId,
          userId: 'test-user'
        },
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(createMessage));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      
      if (response.id === 'test-create-1' && response.success) {
        console.log('✓ Session creation test passed');
        testStep++;
        
        // Test session retrieval
        const getMessage = {
          id: 'test-get-1',
          type: 'session',
          data: {
            action: 'get',
            sessionId: sessionId
          },
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(getMessage));
      } else if (response.id === 'test-get-1' && response.success) {
        console.log('✓ Session retrieval test passed');
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Session test timeout')), 5000);
  });
}

if (require.main === module) {
  testSessionManagement()
    .then(() => console.log('✓ Session management test passed'))
    .catch(error => {
      console.error('✗ Session management test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSessionManagement };
