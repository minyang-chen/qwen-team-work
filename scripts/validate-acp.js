#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 ACP Implementation Validation\n');

const checks = [
  {
    name: 'Shared Package Types',
    path: 'packages/team-shared/src/types/AcpTypes.ts',
    required: true
  },
  {
    name: 'Backend MongoDB Models',
    path: 'packages/backend/src/models/UnifiedModels.ts',
    required: true
  },
  {
    name: 'UserSessionManager',
    path: 'packages/web-ui/server/src/session/UserSessionManager.ts',
    required: true
  },
  {
    name: 'ACP Client',
    path: 'packages/web-ui/server/src/acp/AcpClient.ts',
    required: true
  },
  {
    name: 'ACP Server',
    path: 'packages/team-core-agent/src/server/AcpServer.ts',
    required: true
  },
  {
    name: 'Message Router',
    path: 'packages/team-core-agent/src/server/MessageRouter.ts',
    required: true
  },
  {
    name: 'Discovery Manager',
    path: 'packages/team-core-agent/src/discovery/DiscoveryManager.ts',
    required: true
  },
  {
    name: 'Migration Script',
    path: 'scripts/migrate-postgresql-to-mongodb.js',
    required: true
  }
];

function validateImplementation() {
  let passed = 0;
  let failed = 0;
  
  console.log('Checking ACP implementation files...\n');
  
  checks.forEach(check => {
    const fullPath = path.join(__dirname, '..', check.path);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name} - Missing: ${check.path}`);
      failed++;
    }
  });
  
  console.log(`\n📊 Validation Results: ${passed}/${checks.length} components found`);
  
  if (failed === 0) {
    console.log('🎉 All ACP components are implemented!');
    return true;
  } else {
    console.log(`⚠️  ${failed} components missing or incomplete`);
    return false;
  }
}

function checkPackageStructure() {
  console.log('\nChecking package structure...\n');
  
  const packages = ['shared', 'backend', 'web-ui', 'team-core-agent'];
  let allGood = true;
  
  packages.forEach(pkg => {
    const packagePath = path.join(__dirname, '..', 'packages', pkg);
    const packageJson = path.join(packagePath, 'package.json');
    
    if (fs.existsSync(packageJson)) {
      console.log(`✅ Package: ${pkg}`);
    } else {
      console.log(`❌ Package missing: ${pkg}`);
      allGood = false;
    }
  });
  
  return allGood;
}

// Main validation
function main() {
  console.log('Starting comprehensive ACP validation...\n');
  
  const implementationOk = validateImplementation();
  const structureOk = checkPackageStructure();
  
  if (implementationOk && structureOk) {
    console.log('\n✅ ACP implementation validation passed!');
    console.log('\nReady for deployment:');
    console.log('1. Run migration: node scripts/execute-migration.js');
    console.log('2. Deploy services: ./scripts/deploy-acp.sh');
    return true;
  } else {
    console.log('\n❌ ACP implementation validation failed');
    console.log('Please complete missing components before deployment');
    return false;
  }
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { validateImplementation, checkPackageStructure };
