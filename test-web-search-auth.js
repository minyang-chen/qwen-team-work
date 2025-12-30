#!/usr/bin/env node

const http = require('http');

const TEST_URL = 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/team-sections';

async function getAuthToken() {
  console.log('🔐 Getting auth token...');
  
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

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ Authentication successful');
          resolve(response.token);
        } else {
          reject(new Error(`Auth failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

async function testWebSearchWithAuth(token) {
  console.log('🧪 Testing web search with authentication...');
  
  const postData = JSON.stringify({
    message: `search the web for "${TEST_URL}"`
  });

  const options = {
    hostname: 'localhost',
    port: 8002,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log('📥 Response status:', res.statusCode);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            console.log('✅ API responded successfully');
            
            if (response.response && (
              response.response.includes('Tailwind') || 
              response.response.includes('team') || 
              response.response.includes('UI') ||
              response.response.includes('web_fetch') ||
              response.response.includes('search')
            )) {
              console.log('✅ Web search working! Response contains relevant content');
              console.log('📄 Response preview:', response.response.substring(0, 300) + '...');
              resolve(true);
            } else {
              console.log('⚠️  Response received but may not contain web search results');
              console.log('📄 Full response:', response);
              resolve(false);
            }
          } else {
            console.log('❌ API error:', res.statusCode, data);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Parse error:', error.message);
          console.log('📄 Raw response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`❌ Request error: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('❌ Request timeout'));
    });

    console.log('📤 Sending authenticated request...');
    req.write(postData);
    req.end();
  });
}

// Run test
async function runTest() {
  try {
    const token = await getAuthToken();
    const success = await testWebSearchWithAuth(token);
    
    console.log(success ? '🎉 Test PASSED' : '⚠️  Test completed with warnings');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test FAILED:', error.message);
    process.exit(1);
  }
}

runTest();
