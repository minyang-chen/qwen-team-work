const http = require('http');
const { io } = require('socket.io-client');

async function testToolExecution() {
  // First, authenticate to get a token
  console.log('Authenticating with demo/demo...');
  
  const loginData = JSON.stringify({
    username: 'demo',
    password: 'demo'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 8002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const authResult = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.token) {
            console.log('✅ Authentication successful');
            // Decode JWT to get userId
            const payload = JSON.parse(Buffer.from(response.token.split('.')[1], 'base64').toString());
            console.log('JWT payload:', payload);
            resolve({ token: response.token, userId: payload.userId });
          } else {
            console.log('❌ Authentication failed:', response);
            reject(new Error('No token received'));
          }
        } catch (e) {
          console.log('❌ Auth response parse error:', data);
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // Now connect via Socket.IO with authentication
  console.log('Connecting to Socket.IO with token...');
  
  const socket = io('http://localhost:8002', {
    auth: {
      token: authResult.token
    }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to team-service Socket.IO');
    
    // Send a test message that should trigger tool execution
    const testMessage = {
      userId: authResult.userId,
      sessionId: 'test-session-' + Date.now(),
      message: 'Please use run_shell_command to execute "pwd && whoami && ls -la" to show where we are'
    };
    
    console.log('📤 Sending test message:', testMessage.message);
    socket.emit('chat:message', testMessage);
  });

  socket.on('message:chunk', (data) => {
    console.log('📥 Message Chunk:', JSON.stringify(data, null, 2));
  });

  socket.on('message', (data) => {
    console.log('📥 Response:', JSON.stringify(data, null, 2));
  });

  socket.on('chat:response', (data) => {
    console.log('📥 Chat Response:', JSON.stringify(data, null, 2));
  });

  socket.on('agent:response', (data) => {
    console.log('📥 Agent Response:', JSON.stringify(data, null, 2));
  });

  socket.on('error', (err) => {
    console.error('❌ Socket.IO error:', err);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO disconnected');
    process.exit(0);
  });

  // Close after 20 seconds
  setTimeout(() => {
    console.log('⏰ Closing connection...');
    socket.disconnect();
  }, 20000);
}

testToolExecution().catch(console.error);
