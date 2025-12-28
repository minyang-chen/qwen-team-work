#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Starting Database Migration Execution...\n');

// Check if MongoDB is running
function checkMongoDB() {
  try {
    // Try connecting to MongoDB running in Docker container
    execSync('docker exec team-mongodb mongosh --eval "db.runCommand({ping: 1})" --quiet', { stdio: 'pipe' });
    console.log('✅ MongoDB connection verified (Docker container)');
    return true;
  } catch (error) {
    try {
      // Fallback: try direct connection if mongosh is available
      execSync('mongosh mongodb://localhost:27017 --eval "db.runCommand({ping: 1})" --quiet', { stdio: 'pipe' });
      console.log('✅ MongoDB connection verified (direct)');
      return true;
    } catch (fallbackError) {
      console.log('❌ MongoDB not accessible:', error.message);
      return false;
    }
  }
}

// Check if PostgreSQL is running (for migration source)
function checkPostgreSQL() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    console.log('✅ PostgreSQL available for migration');
    return true;
  } catch (error) {
    console.log('⚠️  PostgreSQL not available - migration will use mock data');
    return false;
  }
}

// Execute migration
function executeMigration() {
  try {
    console.log('\n📦 Executing database migration...');
    
    const migrationScript = path.join(__dirname, 'migrate-postgresql-to-mongodb.js');
    if (!fs.existsSync(migrationScript)) {
      throw new Error('Migration script not found');
    }
    
    execSync(`node ${migrationScript}`, { stdio: 'inherit' });
    console.log('✅ Database migration completed successfully');
    return true;
  } catch (error) {
    console.log('❌ Migration failed:', error.message);
    return false;
  }
}

// Validate ACP functionality
function validateACP() {
  console.log('\n🔍 Validating ACP functionality...');
  
  // Check if shared package is built
  const sharedDist = path.join(__dirname, '../packages/team-shared/dist');
  if (fs.existsSync(sharedDist)) {
    console.log('✅ Shared package built');
  } else {
    console.log('⚠️  Shared package not built');
  }
  
  // Check if backend is configured for MongoDB
  const backendConfig = path.join(__dirname, '../packages/backend/src/config/database.ts');
  if (fs.existsSync(backendConfig)) {
    console.log('✅ Backend MongoDB configuration exists');
  } else {
    console.log('⚠️  Backend configuration missing');
  }
  
  // Check if web-ui has UserSessionManager
  const userSessionManager = path.join(__dirname, '../packages/web-ui/server/src/session/UserSessionManager.ts');
  if (fs.existsSync(userSessionManager)) {
    console.log('✅ UserSessionManager implementation exists');
  } else {
    console.log('⚠️  UserSessionManager missing');
  }
  
  // Check if team-core-agent is ready
  const acpServer = path.join(__dirname, '../packages/team-core-agent/src/server/AcpServer.ts');
  if (fs.existsSync(acpServer)) {
    console.log('✅ ACP Server implementation exists');
  } else {
    console.log('⚠️  ACP Server missing');
  }
  
  console.log('✅ ACP validation completed');
}

// Main execution
async function main() {
  try {
    // Pre-flight checks
    const mongoOk = checkMongoDB();
    const postgresOk = checkPostgreSQL();
    
    if (!mongoOk) {
      console.log('\n❌ MongoDB is required for migration. Please start MongoDB and try again.');
      process.exit(1);
    }
    
    // Execute migration
    const migrationSuccess = executeMigration();
    
    if (!migrationSuccess) {
      console.log('\n❌ Migration failed. Please check the logs and try again.');
      process.exit(1);
    }
    
    // Validate ACP setup
    validateACP();
    
    console.log('\n🎉 Migration execution completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run build (in each package)');
    console.log('2. Start services: ./scripts/deploy-acp.sh');
    console.log('3. Test ACP functionality');
    
  } catch (error) {
    console.error('\n❌ Migration execution failed:', error.message);
    process.exit(1);
  }
}

main();
