const { spawn } = require('child_process');
const { testAcpIntegration } = require('./integration.test');
const { testSessionManagement } = require('./session.test');
const { testChatFunctionality } = require('./chat.test');

async function runAllTests() {
  console.log('🚀 Starting ACP Integration Tests\n');
  
  // Start the server
  console.log('Starting ACP server...');
  const server = spawn('node', ['src/index.js'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Run tests
    await testAcpIntegration();
    await testSessionManagement();
    await testChatFunctionality();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up server
    server.kill();
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
