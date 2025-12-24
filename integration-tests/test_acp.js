const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8001');

ws.on('open', () => {
  console.log('✅ Connected to ACP server');
  
  const testMessage = {
    id: 'test-123',
    type: 'chat',
    data: {
      content: 'Hello ACP server',
      sessionId: 'test-session'
    },
    timestamp: Date.now()
  };
  
  console.log('📤 Sending:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', (data) => {
  console.log('📥 Received:', data.toString());
  ws.close();
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
});

setTimeout(() => {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.log('⏰ Connection timeout');
    ws.close();
  }
}, 5000);
