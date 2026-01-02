#!/usr/bin/env node

// Test script to verify team agent via WebSocket with authentication

const http = require('http');
const WebSocket = require('ws');

// Step 1: Login
function login() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      username: 'demo',
      password: 'demo'
    });

    const options = {
      hostname: 'localhost',
      port: 8002,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.token) {
            console.log('✅ Login successful');
            resolve(response.token);
          } else {
            reject(new Error('No token in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

// Step 2: Connect WebSocket and send message
async function testAgent() {
  try {
    const token = await login();
    
    console.log('Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:8002');
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      console.log('Sending quicksort request...\n');
      
      ws.send(JSON.stringify({
        type: 'ai_chat',
        message: 'create a quick sort script'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'chunk') {
        process.stdout.write(message.text);
      } else if (message.type === 'done') {
        console.log('\n\n✅ Response complete');
        ws.close();
      } else if (message.type === 'error') {
        console.error('\n❌ Error:', message.error);
        ws.close();
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('close', () => {
      console.log('WebSocket closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAgent();
