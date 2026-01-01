#!/usr/bin/env node

const { exec } = require('child_process');

async function checkServiceHealth() {
  console.log('🧪 Testing service health...');
  
  const { default: fetch } = await import('node-fetch');
  
  try {
    const response = await fetch('http://localhost:8002/health');
    const health = await response.json();
    
    if (health.status === 'healthy') {
      console.log('✅ Service is healthy');
      console.log('⏱️  Uptime:', Math.round(health.uptime), 'seconds');
      return true;
    } else {
      console.log('❌ Service unhealthy:', health);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function checkToolExecution() {
  console.log('\n🔧 Checking if tool execution is enabled...');
  
  return new Promise((resolve) => {
    // Check the built ServerClient for chat-only mode
    exec('grep -n "Chat-only mode" /workdisk/hosting/my_qwen_code/qwen-team-work/packages/team-server-sdk/dist/ServerClient.js 2>/dev/null || echo "No chat-only mode found"', (error, stdout, stderr) => {
      if (stdout.includes('Chat-only mode')) {
        console.log('❌ Tool execution is DISABLED (chat-only mode active)');
        console.log('📄 Found:', stdout.trim());
        resolve(false);
      } else {
        console.log('✅ Tool execution is ENABLED (no chat-only mode found)');
        resolve(true);
      }
    });
  });
}

async function checkRecentActivity() {
  console.log('\n📋 Checking recent server activity...');
  
  return new Promise((resolve) => {
    exec('tail -10 /workdisk/hosting/my_qwen_code/qwen-team-work/packages/team-service/server.log 2>/dev/null || echo "No server log found"', (error, stdout, stderr) => {
      if (stdout && stdout.length > 10) {
        console.log('📄 Recent server activity:');
        console.log(stdout);
        resolve(true);
      } else {
        console.log('⚠️  No recent server activity or log file not found');
        resolve(false);
      }
    });
  });
}

// Run tests
async function runTests() {
  console.log('🎯 Web Search Readiness Test\n');
  
  const healthOk = await checkServiceHealth();
  const toolsEnabled = await checkToolExecution();
  const activityFound = await checkRecentActivity();
  
  console.log('\n📊 Test Results:');
  console.log('- Service Health:', healthOk ? '✅ PASS' : '❌ FAIL');
  console.log('- Tool Execution:', toolsEnabled ? '✅ ENABLED' : '❌ DISABLED');
  console.log('- Server Activity:', activityFound ? '✅ ACTIVE' : '⚠️  QUIET');
  
  const overallStatus = healthOk && toolsEnabled;
  
  console.log('\n🎯 Overall Status:', overallStatus ? '✅ READY FOR WEB SEARCH' : '❌ NOT READY');
  
  if (overallStatus) {
    console.log('\n💡 Manual Test Instructions:');
    console.log('1. Open http://localhost:8003 in browser');
    console.log('2. Navigate to Task Agent page');
    console.log('3. Send message: search the web for "https://tailwindcss.com"');
    console.log('4. Watch for tool execution in server logs');
    console.log('5. Verify response contains web content');
  } else {
    console.log('\n🔧 Issues to fix:');
    if (!healthOk) console.log('- Service is not healthy or not running');
    if (!toolsEnabled) console.log('- Tool execution is disabled (chat-only mode)');
  }
  
  process.exit(overallStatus ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});
