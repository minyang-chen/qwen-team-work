const io = require('socket.io-client');

async function testFileWriting() {
  console.log('Authenticating with demo/demo...');
  
  // Authenticate first
  const authResponse = await fetch('http://localhost:8002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'demo' })
  });
  
  if (!authResponse.ok) {
    throw new Error('Authentication failed');
  }
  
  const { token } = await authResponse.json();
  console.log('✅ Authentication successful');
  
  // Connect to Socket.IO with token
  console.log('Connecting to Socket.IO with token...');
  const socket = io('http://localhost:8002', {
    auth: { token }
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to team-service Socket.IO');
    
    // Send test message
    const testMessage = 'write a python script to print current date time. save to file under /workspace then run it.';
    console.log('📤 Sending test message:', testMessage);
    
    socket.emit('chat.message', {
      content: testMessage,
      sessionId: `test-session-${Date.now()}`
    });
    
    // Close after 15 seconds
    setTimeout(() => {
      console.log('⏰ Closing connection...');
      socket.disconnect();
    }, 30000);
  });
  
  socket.on('chat.message', (data) => {
    console.log('📥 Message Chunk:', JSON.stringify(data, null, 2));
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO disconnected');
    process.exit(0);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    process.exit(1);
  });
}

testFileWriting().catch(console.error);
