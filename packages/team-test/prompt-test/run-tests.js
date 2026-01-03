#!/usr/bin/env node

/**
 * Prompt Test Runner
 * Tests chat prompts from CHAT_PROMPTS.md against team-ai-agent via WebSocket
 */

const http = require('http');
const io = require('socket.io-client');

const STORAGE_BASE = 'http://localhost:8000';
const WS_BASE = 'http://localhost:8002'; // team-service WebSocket server

// Test user credentials
const TEST_USER = {
  username: 'demo',
  password: 'demo'
};

// Test prompts from CHAT_PROMPTS.md
const TEST_PROMPTS = [
  { id: 1, prompt: 'hello', description: 'Simple greeting' },
  { id: 2, prompt: 'ls -all', description: 'List files command' },
  { id: 3, prompt: 'pwd', description: 'Print working directory' },
  { id: 4, prompt: '!ls -all', description: 'Shell command with !' },
  { id: 5, prompt: 'write a short happy holiday letter', description: 'Content generation' },
  { id: 6, prompt: 'write a quick sort in python', description: 'Code generation' },
  { id: 7, prompt: 'view current directory file content of README.MD', description: 'File reading' },
  { id: 8, prompt: 'get this url: https://ca.news.yahoo.com/no-job-losses-under-recycling-213432122.html and provide a quick summary of key points', description: 'Web scraping' },
  { id: 9, prompt: 'I am bowkett', description: 'User memory set' },
  { id: 10, prompt: 'what was my name?', description: 'User memory recall' },
  { id: 11, prompt: '/help', description: 'Help command' },
  { id: 12, prompt: 'how many files in current directory?', description: 'File counting' },
  { id: 13, prompt: 'can you create a sample.txt file with content say hello', description: 'File creation' },
  { id: 14, prompt: 'delete sample.txt file', description: 'File deletion' }
];

// HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Login and get token
async function login() {
  console.log('\n🔐 Logging in as:', TEST_USER.username);
  
  const url = new URL(`${STORAGE_BASE}/api/auth/login`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, TEST_USER);
  
  if (response.status === 200 && response.data.token) {
    console.log('✅ Login successful');
    return response.data.token;
  } else {
    throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
  }
}

// Create new session
async function createSession(token) {
  console.log('\n📝 Creating new session...');
  
  const url = new URL(`${STORAGE_BASE}/api/conversations/new`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const response = await makeRequest(options, {});
  
  if (response.status === 200) {
    // Get the latest session
    const listUrl = new URL(`${STORAGE_BASE}/api/conversations/list`);
    const listOptions = {
      hostname: listUrl.hostname,
      port: listUrl.port,
      path: listUrl.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const listResponse = await makeRequest(listOptions);
    const sessionId = listResponse.data.conversations?.[0]?.sessionId;
    
    if (sessionId) {
      console.log('✅ Session created:', sessionId);
      return sessionId;
    }
  }
  
  throw new Error('Failed to create session');
}

// Send chat message via WebSocket
async function sendMessage(socket, sessionId, prompt) {
  return new Promise((resolve, reject) => {
    const messageId = Date.now().toString();
    let responseText = '';
    let timeout;
    
    // Listen for response chunks
    const handleChunk = (data) => {
      if (data.messageId === messageId) {
        if (data.type === 'chunk') {
          responseText += data.content;
        } else if (data.type === 'complete') {
          clearTimeout(timeout);
          socket.off('ai_stream_chunk', handleChunk);
          resolve({ status: 200, data: { text: responseText } });
        } else if (data.type === 'error') {
          clearTimeout(timeout);
          socket.off('ai_stream_chunk', handleChunk);
          reject(new Error(data.message));
        }
      }
    };
    
    socket.on('ai_stream_chunk', handleChunk);
    
    // Send message
    socket.emit('ai_chat', {
      userId: TEST_USER.username,
      sessionId,
      message: prompt,
      messageId
    });
    
    // Timeout after 30 seconds
    timeout = setTimeout(() => {
      socket.off('ai_stream_chunk', handleChunk);
      reject(new Error('Timeout waiting for response'));
    }, 30000);
  });
}

// Run single prompt test
async function runPromptTest(socket, sessionId, testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Test ${testCase.id}: ${testCase.description}`);
  console.log(`💬 Prompt: "${testCase.prompt}"`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const startTime = Date.now();
    const response = await sendMessage(socket, sessionId, testCase.prompt);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`✅ Response received`);
      if (response.data.text) {
        const preview = response.data.text.substring(0, 200);
        console.log(`📝 Preview: ${preview}${response.data.text.length > 200 ? '...' : ''}`);
      }
      return { success: true, duration, response: response.data };
    } else {
      console.log(`❌ Failed: ${JSON.stringify(response.data)}`);
      return { success: false, duration, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Prompt Tests');
  console.log(`📍 Storage: ${STORAGE_BASE}`);
  console.log(`📍 WebSocket: ${WS_BASE}`);
  
  let socket;
  
  try {
    // Login
    const token = await login();
    
    // Create session
    const sessionId = await createSession(token);
    
    // Connect WebSocket
    console.log('\n🔌 Connecting to WebSocket...');
    socket = io(WS_BASE, {
      transports: ['websocket'],
      reconnection: false,
      auth: {
        token
      }
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      socket.on('connect_error', (error) => {
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
    
    // Run tests
    const results = [];
    for (const testCase of TEST_PROMPTS) {
      const result = await runPromptTest(socket, sessionId, testCase);
      results.push({ ...testCase, ...result });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(80)}`);
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - Test ${r.id}: ${r.description}`);
        console.log(`    Error: ${r.error}`);
      });
    }
    
    console.log(`\n${'='.repeat(80)}`);
    
    if (socket) socket.disconnect();
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test runner failed:', error.message);
    if (socket) socket.disconnect();
    process.exit(1);
  }
}

// Run tests
runTests();
