const io = require('socket.io-client');

async function testFileWriting() {
  console.log('Authenticating with demo/demo...');
  
  const authResponse = await fetch('http://localhost:8002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'demo' })
  });
  
  const { token } = await authResponse.json();
  console.log('✅ Authentication successful');
  
  const socket = io('http://localhost:8002', {
    auth: { token }
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to team-service Socket.IO');
    
    // Test simple file write
    socket.emit('chat.message', {
      content: 'Please use write_file to create a file at /workspace/test.py with content "print(\'Hello World\')"',
      sessionId: `test-session-${Date.now()}`
    });
    
    setTimeout(() => socket.disconnect(), 20000);
  });
  
  socket.on('chat.message', (data) => {
    console.log('📥 Response:', JSON.stringify(data, null, 2));
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected');
    process.exit(0);
  });
}

testFileWriting().catch(console.error);
