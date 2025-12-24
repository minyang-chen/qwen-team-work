#!/usr/bin/env node

// Comprehensive test for user login flow and system integration
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BASE_URL = 'http://localhost:8000';
const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password: 'testpass123'
};

let authToken = '';
let userId = '';
let teamId = '';

function log(message, status = 'INFO') {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔍';
  console.log(`${statusIcon} [${timestamp}] ${message}`);
}

function apiCall(endpoint, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, ok: res.statusCode < 400 });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data }, ok: res.statusCode < 400 });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, data: { error: error.message }, ok: false });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testHealthCheck() {
  log('Testing backend health check...');
  const result = await apiCall('/health');
  
  if (result.ok) {
    log('Backend health check passed', 'PASS');
    return true;
  } else {
    log(`Backend health check failed: ${result.status}`, 'FAIL');
    return false;
  }
}

async function testDockerServices() {
  log('Testing Docker services...');
  
  try {
    const { stdout } = await execAsync('docker ps --filter name=team-mongodb --format "{{.Names}}"');
    
    if (stdout.includes('team-mongodb')) {
      log('Docker MongoDB service is running', 'PASS');
      return true;
    } else {
      log('Docker MongoDB service not found', 'FAIL');
      return false;
    }
  } catch (error) {
    log(`Docker service check failed: ${error.message}`, 'FAIL');
    return false;
  }
}

async function testUserRegistration() {
  log('Testing user registration...');
  const result = await apiCall('/api/auth/signup', 'POST', TEST_USER);
  
  if (result.ok) {
    log('User registration passed', 'PASS');
    userId = result.data.user?.id || result.data.userId;
    return true;
  } else {
    log(`User registration failed: ${JSON.stringify(result.data)}`, 'FAIL');
    return false;
  }
}

async function testUserLogin() {
  log('Testing user login...');
  const result = await apiCall('/api/auth/login', 'POST', {
    username: TEST_USER.username,
    password: TEST_USER.password
  });
  
  if (result.ok && result.data.session_token) {
    authToken = result.data.session_token;
    userId = result.data.user_id;
    log('User login passed', 'PASS');
    return true;
  } else {
    log(`User login failed: ${JSON.stringify(result.data)}`, 'FAIL');
    return false;
  }
}

async function testUserProfile() {
  log('Testing user profile retrieval...');
  const result = await apiCall('/api/user/profile');
  
  if (result.ok && result.data.username === TEST_USER.username) {
    log('User profile retrieval passed', 'PASS');
    return true;
  } else {
    log(`User profile failed: ${JSON.stringify(result.data)}`, 'FAIL');
    return false;
  }
}

async function testTeamCreation() {
  log('Testing team creation...');
  const teamData = {
    team_name: 'Test Team',
    specialization: 'Development',
    description: 'Test team for integration testing'
  };
  
  const result = await apiCall('/api/teams/create', 'POST', teamData);
  
  if (result.ok) {
    teamId = result.data.id || result.data._id;
    log('Team creation passed', 'PASS');
    return true;
  } else {
    log(`Team creation failed: ${JSON.stringify(result.data)}`, 'FAIL');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting comprehensive user flow integration test...');
  log('='.repeat(60));
  
  const tests = [
    { name: 'Backend Health Check', fn: testHealthCheck },
    { name: 'Docker Services', fn: testDockerServices },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'User Profile', fn: testUserProfile },
    { name: 'Team Creation', fn: testTeamCreation }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`${test.name} threw error: ${error.message}`, 'FAIL');
      failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('='.repeat(60));
  log(`🎯 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    log('🎉 All tests passed! System is fully functional.', 'PASS');
  } else {
    log(`⚠️  ${failed} tests failed. Check logs above for details.`, 'FAIL');
  }
  
  return failed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    log(`Test runner error: ${error.message}`, 'FAIL');
    process.exit(1);
  });
