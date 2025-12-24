const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8001');

ws.on('open', () => {
  console.log('Connected to ACP server');
  const message = {
    id: 'test123',
    type: 'chat',
    data: {
      content: 'hello test',
      sessionId: 'test_session'
    },
    timestamp: Date.now()
  };
  console.log('Sending:', JSON.stringify(message));
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  ws.close();
});

ws.on('error', (error) => {
  console.log('Error:', error.message);
});

ws.on('close', () => {
  console.log('Connection closed');
});

setTimeout(() => {
  console.log('Timeout - closing connection');
  ws.close();
}, 5000);
