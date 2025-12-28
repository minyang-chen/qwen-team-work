const WebSocket = require('ws');

async function testAcpIntegration() {
  console.log('Starting ACP Integration Test...');
  
  const ws = new WebSocket('ws://localhost:8080');
  
  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      console.log('✓ WebSocket connection established');
      
      // Test ping
      const pingMessage = {
        id: 'test-ping-1',
        type: 'ping',
        data: {},
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(pingMessage));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      console.log('✓ Received response:', response.id);
      
      if (response.id === 'test-ping-1' && response.success && response.data.pong) {
        console.log('✓ Ping test passed');
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      console.error('✗ WebSocket error:', error.message);
      reject(error);
    });
    
    setTimeout(() => {
      reject(new Error('Test timeout'));
    }, 5000);
  });
}

if (require.main === module) {
  testAcpIntegration()
    .then(() => console.log('✓ Integration test passed'))
    .catch(error => {
      console.error('✗ Integration test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testAcpIntegration };
