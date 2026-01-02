#!/usr/bin/env node

// Test script to verify team agent handles quicksort request

const http = require('http');

const requestData = {
  message: "create a quick sort script"
};

const postData = JSON.stringify(requestData);

const options = {
  hostname: 'localhost',
  port: 8002,
  path: '/api/ai/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing team agent with quicksort request...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    // Print chunks as they arrive
    process.stdout.write(chunk.toString());
  });
  
  res.on('end', () => {
    console.log('\n\n=== Response Complete ===');
    console.log('Status:', res.statusCode);
    console.log('Total length:', data.length);
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();
