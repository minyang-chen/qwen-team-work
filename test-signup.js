#!/usr/bin/env node

// Simple test client for signup API
const fetch = require('node-fetch');

async function testSignup() {
  const signupData = {
    username: 'testuser123',
    email: 'test@example.com',
    full_name: 'Test User',
    password: 'testpassword123'
  };

  console.log('🧪 Testing signup API...');
  console.log('📤 Sending request to: http://localhost:8002/api/auth/signup');
  console.log('📤 Request body:', JSON.stringify(signupData, null, 2));

  try {
    const response = await fetch('http://localhost:8002/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
      redirect: 'manual' // Don't follow redirects automatically
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 302) {
      console.log('🔴 Got 302 redirect - this is the problem!');
      console.log('🔴 Location header:', response.headers.get('location'));
    }

    const responseText = await response.text();
    console.log('📥 Response body:', responseText);

    if (response.status === 200) {
      console.log('✅ Signup API working correctly!');
    } else {
      console.log('❌ Signup API not working as expected');
    }

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

// Also test a simple GET to see if server is responding
async function testServer() {
  console.log('🧪 Testing server health...');
  try {
    const response = await fetch('http://localhost:8002/api/config/ui');
    console.log('📥 Health check status:', response.status);
    if (response.status === 200) {
      console.log('✅ Server is responding');
    }
  } catch (error) {
    console.error('💥 Server not responding:', error.message);
  }
}

async function main() {
  await testServer();
  console.log('---');
  await testSignup();
}

main().catch(console.error);
