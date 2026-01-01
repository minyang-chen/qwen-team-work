const WebSocket = require('ws');

// Connect directly to team-service WebSocket
const ws = new WebSocket('ws://localhost:8002');

ws.on('open', function open() {
  console.log('Connected to team-service');
  
  // Send a test message that should trigger tool execution
  const testMessage = {
    type: 'chat.message',
    content: 'list files in current directory using ls command',
    sessionId: 'test-session-' + Date.now()
  };
  
  console.log('Sending test message:', testMessage.content);
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  try {
    const response = JSON.parse(data.toString());
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (e) {
    console.log('Raw response:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('Connection closed');
  process.exit(0);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
}, 10000);
