#!/usr/bin/env node

// Test script to verify team agent via ACP

const http = require('http');

const requestData = {
  type: 'chat.send',
  data: {
    message: "create a quick sort script",
    sessionId: 'test-session-' + Date.now()
  }
};

const postData = JSON.stringify(requestData);

const options = {
  hostname: 'localhost',
  port: 8001,
  path: '/acp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing team agent via ACP with quicksort request...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('=== Response ===');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();
