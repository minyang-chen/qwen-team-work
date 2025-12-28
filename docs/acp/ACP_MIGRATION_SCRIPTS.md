# ACP Migration Scripts & Transition Strategy

## Overview

Migration scripts and strategies for transitioning from the current system to ACP-based architecture with minimal downtime and data loss.

## Migration Strategy

### **Phase 1: Preparation**
- Database schema migration
- NFS directory structure setup
- Backup existing data

### **Phase 2: Parallel Deployment**
- Deploy ACP components alongside existing system
- Feature flag controlled rollout
- Data synchronization

### **Phase 3: Cutover**
- Gradual user migration
- Session transfer
- Legacy system deprecation

---

## Migration Scripts

### **0. PostgreSQL to MongoDB Migration Script**

#### **`scripts/migrate-postgresql-to-mongodb.js`**
```javascript
const { Pool } = require('pg');
const mongoose = require('mongoose');

class PostgreSQLToMongoMigration {
  constructor() {
    this.pgPool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB
    });
    this.mongoUri = process.env.MONGODB_URI;
  }

  async migrate() {
    console.log('🔄 Starting PostgreSQL to MongoDB migration...\n');
    
    try {
      // Connect to databases
      await mongoose.connect(this.mongoUri);
      console.log('✅ Connected to MongoDB');
      
      // 1. Export PostgreSQL data
      console.log('\n📤 Exporting PostgreSQL data...');
      const pgData = await this.exportPostgreSQLData();
      
      // 2. Create MongoDB collections and indexes
      console.log('\n🏗️  Creating MongoDB collections...');
      await this.createMongoCollections();
      
      // 3. Transform and import data
      console.log('\n🔄 Transforming and importing data...');
      await this.importUsers(pgData.users);
      await this.importTeams(pgData.teams, pgData.teamMembers);
      await this.importApiKeys(pgData.apiKeys);
      await this.importFileEmbeddings(pgData.fileEmbeddings);
      
      // 4. Create vector search indexes
      console.log('\n🔍 Creating vector search indexes...');
      await this.createVectorIndexes();
      
      // 5. Validate migration
      console.log('\n✅ Validating migration...');
      await this.validateMigration(pgData);
      
      console.log('\n🎉 PostgreSQL to MongoDB migration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  async exportPostgreSQLData() {
    const data = {};
    
    // Export users
    const usersResult = await this.pgPool.query('SELECT * FROM users WHERE is_active = true');
    data.users = usersResult.rows;
    console.log(`  📋 Exported ${data.users.length} users`);
    
    // Export teams
    const teamsResult = await this.pgPool.query('SELECT * FROM teams WHERE is_active = true');
    data.teams = teamsResult.rows;
    console.log(`  📋 Exported ${data.teams.length} teams`);
    
    // Export team members
    const teamMembersResult = await this.pgPool.query(`
      SELECT tm.*, u.username, u.email 
      FROM team_members tm 
      JOIN users u ON tm.user_id = u.id 
      WHERE tm.status = 'active'
    `);
    data.teamMembers = teamMembersResult.rows;
    console.log(`  📋 Exported ${data.teamMembers.length} team members`);
    
    // Export API keys
    const apiKeysResult = await this.pgPool.query('SELECT * FROM api_keys WHERE is_active = true');
    data.apiKeys = apiKeysResult.rows;
    console.log(`  📋 Exported ${data.apiKeys.length} API keys`);
    
    // Export file embeddings
    const embeddingsResult = await this.pgPool.query('SELECT * FROM file_embeddings');
    data.fileEmbeddings = embeddingsResult.rows;
    console.log(`  📋 Exported ${data.fileEmbeddings.length} file embeddings`);
    
    return data;
  }

  async createMongoCollections() {
    const db = mongoose.connection.db;
    
    // Create collections with validation
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['username', 'email', 'fullName', 'passwordHash'],
          properties: {
            username: { bsonType: 'string' },
            email: { bsonType: 'string' },
            fullName: { bsonType: 'string' },
            passwordHash: { bsonType: 'string' },
            nfsWorkspacePath: { bsonType: 'string' },
            isActive: { bsonType: 'bool' }
          }
        }
      }
    });

    await db.createCollection('teams', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['teamName', 'createdBy'],
          properties: {
            teamName: { bsonType: 'string' },
            createdBy: { bsonType: 'objectId' },
            members: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['userId', 'role', 'status'],
                properties: {
                  userId: { bsonType: 'objectId' },
                  role: { bsonType: 'string' },
                  status: { enum: ['active', 'disabled'] }
                }
              }
            }
          }
        }
      }
    });

    // Create indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('teams').createIndex({ teamName: 1 }, { unique: true });
    await db.collection('apiKeys').createIndex({ apiKey: 1 }, { unique: true });
    await db.collection('fileEmbeddings').createIndex({ filePath: 1 }, { unique: true });
    
    console.log('  ✅ Created MongoDB collections and indexes');
  }

  async importUsers(users) {
    const db = mongoose.connection.db;
    const userDocs = users.map(user => ({
      _id: new mongoose.Types.ObjectId(),
      originalId: user.id, // Keep for reference during migration
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      passwordHash: user.password_hash,
      nfsWorkspacePath: user.nfs_workspace_path,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isActive: user.is_active
    }));
    
    await db.collection('users').insertMany(userDocs);
    console.log(`  ✅ Imported ${userDocs.length} users`);
    
    // Store mapping for team imports
    this.userIdMapping = {};
    userDocs.forEach(doc => {
      this.userIdMapping[doc.originalId] = doc._id;
    });
  }

  async importTeams(teams, teamMembers) {
    const db = mongoose.connection.db;
    
    // Group team members by team
    const membersByTeam = {};
    teamMembers.forEach(member => {
      if (!membersByTeam[member.team_id]) {
        membersByTeam[member.team_id] = [];
      }
      membersByTeam[member.team_id].push({
        userId: this.userIdMapping[member.user_id],
        role: member.role,
        status: member.status,
        joinedAt: member.joined_at
      });
    });
    
    const teamDocs = teams.map(team => ({
      _id: new mongoose.Types.ObjectId(),
      originalId: team.id,
      teamName: team.team_name,
      specialization: team.specialization,
      description: team.description,
      nfsWorkspacePath: team.nfs_workspace_path,
      createdBy: this.userIdMapping[team.created_by],
      members: membersByTeam[team.id] || [],
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      isActive: team.is_active
    }));
    
    await db.collection('teams').insertMany(teamDocs);
    console.log(`  ✅ Imported ${teamDocs.length} teams with embedded members`);
  }

  async importApiKeys(apiKeys) {
    const db = mongoose.connection.db;
    const apiKeyDocs = apiKeys.map(key => ({
      _id: new mongoose.Types.ObjectId(),
      userId: this.userIdMapping[key.user_id],
      apiKey: key.api_key,
      createdAt: key.created_at,
      expiresAt: key.expires_at,
      isActive: key.is_active
    }));
    
    await db.collection('apiKeys').insertMany(apiKeyDocs);
    console.log(`  ✅ Imported ${apiKeyDocs.length} API keys`);
  }

  async importFileEmbeddings(embeddings) {
    const db = mongoose.connection.db;
    const embeddingDocs = embeddings.map(emb => ({
      _id: new mongoose.Types.ObjectId(),
      filePath: emb.file_path,
      fileName: emb.file_name,
      workspaceType: emb.workspace_type,
      ownerId: this.userIdMapping[emb.owner_id],
      teamId: emb.team_id ? this.teamIdMapping[emb.team_id] : null,
      contentHash: emb.content_hash,
      embedding: Array.from(emb.embedding), // Convert pgvector to array
      metadata: emb.metadata,
      createdAt: emb.created_at,
      updatedAt: emb.updated_at
    }));
    
    await db.collection('fileEmbeddings').insertMany(embeddingDocs);
    console.log(`  ✅ Imported ${embeddingDocs.length} file embeddings`);
  }

  async createVectorIndexes() {
    const db = mongoose.connection.db;
    
    // Create vector search index for file embeddings
    await db.collection('fileEmbeddings').createSearchIndex({
      name: 'file_vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [{
          type: 'vector',
          path: 'embedding',
          numDimensions: 768,
          similarity: 'cosine'
        }]
      }
    });
    
    console.log('  ✅ Created vector search indexes');
  }

  async validateMigration(originalData) {
    const db = mongoose.connection.db;
    
    // Validate counts
    const userCount = await db.collection('users').countDocuments();
    const teamCount = await db.collection('teams').countDocuments();
    const apiKeyCount = await db.collection('apiKeys').countDocuments();
    const embeddingCount = await db.collection('fileEmbeddings').countDocuments();
    
    console.log(`  📊 Validation Results:`);
    console.log(`     Users: ${userCount}/${originalData.users.length}`);
    console.log(`     Teams: ${teamCount}/${originalData.teams.length}`);
    console.log(`     API Keys: ${apiKeyCount}/${originalData.apiKeys.length}`);
    console.log(`     Embeddings: ${embeddingCount}/${originalData.fileEmbeddings.length}`);
    
    if (userCount !== originalData.users.length ||
        teamCount !== originalData.teams.length ||
        apiKeyCount !== originalData.apiKeys.length ||
        embeddingCount !== originalData.fileEmbeddings.length) {
      throw new Error('Data count mismatch - migration validation failed');
    }
    
    console.log('  ✅ Migration validation passed');
  }
}

// Run migration
async function main() {
  const migrator = new PostgreSQLToMongoMigration();
  await migrator.migrate();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { PostgreSQLToMongoMigration };
```

### **0.1 Pre-Migration Validation Script (Updated)**

#### **`scripts/pre-migration-validation.js`**
```javascript
const mongoose = require('mongoose');
const { Pool } = require('pg');
const fs = require('fs').promises;

class PreMigrationValidator {
  async validate() {
    console.log('🔍 Running pre-migration validation...\n');
    
    const checks = [
      this.checkDatabaseConnections(),
      this.checkNFSAccess(),
      this.checkActiveSessions(),
      this.checkDiskSpace(),
      this.checkBackupSpace(),
      this.validateConfiguration()
    ];
    
    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.error('❌ Pre-migration validation failed:');
      failures.forEach(f => console.error(`  - ${f.reason}`));
      process.exit(1);
    }
    
    console.log('✅ All pre-migration checks passed\n');
  }

  async checkActiveSessions() {
    const activeSessions = await this.getActiveSessions();
    if (activeSessions.length > 0) {
      console.warn(`⚠️  ${activeSessions.length} active sessions detected`);
      console.log('   Recommendation: Notify users and wait for sessions to complete');
      return { warning: true, count: activeSessions.length };
    }
    return { warning: false };
  }

  async checkDiskSpace() {
    const required = 10 * 1024 * 1024 * 1024; // 10GB
    const available = await this.getAvailableDiskSpace();
    if (available < required) {
      throw new Error(`Insufficient disk space: ${available} < ${required}`);
    }
  }

  async checkBackupSpace() {
    const backupPath = process.env.BACKUP_PATH || '/backup';
    const required = 5 * 1024 * 1024 * 1024; // 5GB
    const available = await this.getAvailableDiskSpace(backupPath);
    if (available < required) {
      throw new Error(`Insufficient backup space: ${available} < ${required}`);
    }
  }
}

module.exports = { PreMigrationValidator };
```

### **0.1 Active Session Notification Script**

#### **`scripts/notify-active-sessions.js`**
```javascript
class SessionNotifier {
  async notifyActiveSessions() {
    const activeSessions = await this.getActiveSessions();
    
    console.log(`📢 Notifying ${activeSessions.length} active users...\n`);
    
    for (const session of activeSessions) {
      await this.sendNotification(session.userId, {
        type: 'maintenance',
        message: 'System maintenance scheduled. Please save your work.',
        estimatedDowntime: '30 minutes',
        scheduledTime: new Date(Date.now() + 3600000) // 1 hour from now
      });
    }
    
    console.log('✅ All users notified\n');
  }

  async waitForSessionsToComplete(timeoutMinutes = 60) {
    const startTime = Date.now();
    const timeout = timeoutMinutes * 60 * 1000;
    
    while (Date.now() - startTime < timeout) {
      const activeSessions = await this.getActiveSessions();
      
      if (activeSessions.length === 0) {
        console.log('✅ All sessions completed');
        return;
      }
      
      console.log(`⏳ Waiting for ${activeSessions.length} sessions to complete...`);
      await this.delay(30000); // Check every 30 seconds
    }
    
    console.warn('⚠️  Timeout reached. Some sessions still active.');
  }
}

module.exports = { SessionNotifier };
```

### **1. Database Migration Script**

#### **`scripts/migrate-database.js`**
```javascript
const mongoose = require('mongoose');
const { Pool } = require('pg');

class DatabaseMigrator {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_acp_sessions';
    this.pgConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'qwen_user',
      password: process.env.POSTGRES_PASSWORD || 'qwen_password',
      database: process.env.POSTGRES_DB || 'qwen_db'
    };
  }

  async migrate() {
    console.log('🚀 Starting database migration...');
    
    try {
      // Connect to databases
      await mongoose.connect(this.mongoUri);
      const pgPool = new Pool(this.pgConfig);
      
      // Create ACP collections
      await this.createAcpCollections();
      
      // Migrate existing sessions
      await this.migrateExistingSessions(pgPool);
      
      // Create indexes
      await this.createIndexes();
      
      console.log('✅ Database migration completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async createAcpCollections() {
    console.log('📝 Creating ACP collections...');
    
    const db = mongoose.connection.db;
    
    // Create collections
    await db.createCollection('activesessions');
    await db.createCollection('savedsessions');
    await db.createCollection('conversationhistories');
    
    console.log('✅ ACP collections created');
  }

  async migrateExistingSessions(pgPool) {
    console.log('🔄 Migrating existing sessions...');
    
    // Get existing JWT sessions from PostgreSQL
    const result = await pgPool.query(`
      SELECT user_id, session_token, workspace_path, created_at, expires_at, last_activity
      FROM user_sessions 
      WHERE expires_at > NOW()
    `);
    
    const db = mongoose.connection.db;
    let migratedCount = 0;
    
    for (const row of result.rows) {
      try {
        // Create ACP active session
        await db.collection('activesessions').insertOne({
          sessionId: row.session_token, // Use JWT token as temporary session ID
          userId: row.user_id,
          createdAt: row.created_at,
          lastActivity: row.last_activity || row.created_at,
          status: 'active',
          workspacePath: row.workspace_path,
          resourceUsage: {
            memory: 0,
            cpu: 0,
            tokenUsage: { input: 0, output: 0, total: 0 }
          }
        });
        
        migratedCount++;
        
      } catch (error) {
        console.warn(`⚠️ Failed to migrate session for user ${row.user_id}:`, error.message);
      }
    }
    
    console.log(`✅ Migrated ${migratedCount} sessions`);
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    // Active sessions indexes
    await db.collection('activesessions').createIndex({ userId: 1, status: 1 });
    await db.collection('activesessions').createIndex({ lastActivity: 1 });
    await db.collection('activesessions').createIndex({ sessionId: 1 }, { unique: true });
    
    // Saved sessions indexes
    await db.collection('savedsessions').createIndex({ userId: 1, lastSaved: -1 });
    await db.collection('savedsessions').createIndex({ sessionId: 1 });
    
    // Conversation history indexes
    await db.collection('conversationhistories').createIndex({ sessionId: 1 }, { unique: true });
    
    console.log('✅ Database indexes created');
  }
}

// Run migration
async function main() {
  const migrator = new DatabaseMigrator();
  await migrator.migrate();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseMigrator };
```

### **2. NFS Migration Script**

#### **`scripts/migrate-nfs.js`**
```javascript
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class NFSMigrator {
  constructor() {
    this.oldNfsPath = process.env.OLD_NFS_PATH || '/nfs';
    this.newNfsPath = process.env.NEW_NFS_PATH || '/nfs';
  }

  async migrate() {
    console.log('🚀 Starting NFS migration...');
    
    try {
      // Create new directory structure
      await this.createDirectoryStructure();
      
      // Migrate existing workspaces
      await this.migrateWorkspaces();
      
      // Set proper permissions
      await this.setPermissions();
      
      console.log('✅ NFS migration completed successfully');
      
    } catch (error) {
      console.error('❌ NFS migration failed:', error);
      throw error;
    }
  }

  async createDirectoryStructure() {
    console.log('📁 Creating new directory structure...');
    
    const directories = [
      path.join(this.newNfsPath, 'private'),
      path.join(this.newNfsPath, 'shared'),
      path.join(this.newNfsPath, 'temp')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      console.log(`✅ Created directory: ${dir}`);
    }
  }

  async migrateWorkspaces() {
    console.log('🔄 Migrating existing workspaces...');
    
    const oldPrivatePath = path.join(this.oldNfsPath, 'private');
    
    try {
      const userDirs = await fs.readdir(oldPrivatePath);
      
      for (const userId of userDirs) {
        await this.migrateUserWorkspace(userId);
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ No existing workspaces to migrate');
        return;
      }
      throw error;
    }
  }

  async migrateUserWorkspace(userId) {
    const oldUserPath = path.join(this.oldNfsPath, 'private', userId);
    const newUserPath = path.join(this.newNfsPath, 'private', userId);
    
    try {
      // Create user directory structure
      await fs.mkdir(path.join(newUserPath, 'active'), { recursive: true });
      await fs.mkdir(path.join(newUserPath, 'saved'), { recursive: true });
      await fs.mkdir(path.join(newUserPath, 'temp'), { recursive: true });
      
      // Check if old workspace exists and has content
      const stats = await fs.stat(oldUserPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(oldUserPath);
        
        if (files.length > 0) {
          // Create a migration session for existing workspace
          const migrationSessionId = `migration_${Date.now()}`;
          const migrationPath = path.join(newUserPath, 'saved', migrationSessionId);
          
          // Copy existing workspace to saved session
          execSync(`cp -r "${oldUserPath}" "${migrationPath}"`);
          
          console.log(`✅ Migrated workspace for user ${userId} to session ${migrationSessionId}`);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to migrate workspace for user ${userId}:`, error.message);
    }
  }

  async setPermissions() {
    console.log('🔒 Setting proper permissions...');
    
    // Set permissions for private directories
    const privatePath = path.join(this.newNfsPath, 'private');
    execSync(`chmod -R 700 "${privatePath}"`);
    
    // Set permissions for shared directories
    const sharedPath = path.join(this.newNfsPath, 'shared');
    execSync(`chmod -R 770 "${sharedPath}"`);
    
    console.log('✅ Permissions set');
  }
}

// Run migration
async function main() {
  const migrator = new NFSMigrator();
  await migrator.migrate();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('NFS migration failed:', error);
    process.exit(1);
  });
}

module.exports = { NFSMigrator };
```

### **3. Session Migration Script**

#### **`scripts/migrate-sessions.js`**
```javascript
const mongoose = require('mongoose');
const { AcpClient } = require('../packages/web-ui/server/dist/acp/AcpClient');

class SessionMigrator {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_acp_sessions';
    this.acpAgentUrl = process.env.ACP_AGENT_URL || 'ws://localhost:8080';
  }

  async migrate() {
    console.log('🚀 Starting session migration...');
    
    try {
      await mongoose.connect(this.mongoUri);
      
      // Get all active sessions from database
      const activeSessions = await this.getActiveSessions();
      
      // Migrate each session
      for (const session of activeSessions) {
        await this.migrateSession(session);
      }
      
      console.log('✅ Session migration completed successfully');
      
    } catch (error) {
      console.error('❌ Session migration failed:', error);
      throw error;
    }
  }

  async getActiveSessions() {
    const db = mongoose.connection.db;
    return await db.collection('activesessions').find({ status: 'active' }).toArray();
  }

  async migrateSession(session) {
    try {
      console.log(`🔄 Migrating session ${session.sessionId} for user ${session.userId}`);
      
      // Create new ACP session
      const acpClient = new AcpClient();
      await acpClient.connect(this.acpAgentUrl, session.userId);
      
      // Transfer session data
      await this.transferSessionData(session, acpClient);
      
      // Update session status
      await this.updateSessionStatus(session.sessionId, 'migrated');
      
      console.log(`✅ Migrated session ${session.sessionId}`);
      
    } catch (error) {
      console.warn(`⚠️ Failed to migrate session ${session.sessionId}:`, error.message);
      await this.updateSessionStatus(session.sessionId, 'migration_failed');
    }
  }

  async transferSessionData(oldSession, acpClient) {
    // Transfer conversation history if exists
    const db = mongoose.connection.db;
    const conversation = await db.collection('conversationhistories')
      .findOne({ sessionId: oldSession.sessionId });
    
    if (conversation && conversation.messages.length > 0) {
      // Restore conversation in new session
      await acpClient.restoreConversation(conversation.messages);
    }
    
    // Transfer workspace files (handled by NFS migration)
    // Files are already in the correct location after NFS migration
  }

  async updateSessionStatus(sessionId, status) {
    const db = mongoose.connection.db;
    await db.collection('activesessions').updateOne(
      { sessionId },
      { $set: { status, migratedAt: new Date() } }
    );
  }
}

// Run migration
async function main() {
  const migrator = new SessionMigrator();
  await migrator.migrate();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Session migration failed:', error);
    process.exit(1);
  });
}

module.exports = { SessionMigrator };
```

### **4. Rollback Script**

#### **`scripts/rollback-migration.js`**
```javascript
const mongoose = require('mongoose');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class MigrationRollback {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_acp_sessions';
    this.pgConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'qwen_user',
      password: process.env.POSTGRES_PASSWORD || 'qwen_password',
      database: process.env.POSTGRES_DB || 'qwen_db'
    };
    this.backupPath = process.env.BACKUP_PATH || '/backup';
  }

  async rollback() {
    console.log('🔄 Starting migration rollback...');
    
    try {
      // Restore database backup
      await this.restoreDatabase();
      
      // Restore NFS backup
      await this.restoreNFS();
      
      // Clean up ACP collections
      await this.cleanupAcpData();
      
      console.log('✅ Migration rollback completed successfully');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  async restoreDatabase() {
    console.log('📦 Restoring database backup...');
    
    const pgPool = new Pool(this.pgConfig);
    
    // Restore PostgreSQL backup
    const backupFile = path.join(this.backupPath, 'postgres_backup.sql');
    
    try {
      await fs.access(backupFile);
      // Execute backup restoration
      const { execSync } = require('child_process');
      execSync(`psql -h ${this.pgConfig.host} -U ${this.pgConfig.user} -d ${this.pgConfig.database} -f ${backupFile}`);
      
      console.log('✅ PostgreSQL backup restored');
    } catch (error) {
      console.warn('⚠️ PostgreSQL backup not found or restoration failed');
    }
  }

  async restoreNFS() {
    console.log('📁 Restoring NFS backup...');
    
    const nfsBackupPath = path.join(this.backupPath, 'nfs_backup');
    const nfsPath = process.env.NFS_BASE_PATH || '/nfs';
    
    try {
      await fs.access(nfsBackupPath);
      
      // Restore NFS backup
      const { execSync } = require('child_process');
      execSync(`cp -r "${nfsBackupPath}"/* "${nfsPath}"/`);
      
      console.log('✅ NFS backup restored');
    } catch (error) {
      console.warn('⚠️ NFS backup not found or restoration failed');
    }
  }

  async cleanupAcpData() {
    console.log('🧹 Cleaning up ACP data...');
    
    await mongoose.connect(this.mongoUri);
    const db = mongoose.connection.db;
    
    // Drop ACP collections
    const collections = ['activesessions', 'savedsessions', 'conversationhistories'];
    
    for (const collection of collections) {
      try {
        await db.collection(collection).drop();
        console.log(`✅ Dropped collection: ${collection}`);
      } catch (error) {
        if (error.code !== 26) { // Collection doesn't exist
          console.warn(`⚠️ Failed to drop collection ${collection}:`, error.message);
        }
      }
    }
  }
}

// Run rollback
async function main() {
  const rollback = new MigrationRollback();
  await rollback.rollback();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
}

module.exports = { MigrationRollback };
```

### **4.1 Incremental Rollback Script**

#### **`scripts/incremental-rollback.js`**
```javascript
class IncrementalRollback {
  async rollbackPhase(phase) {
    console.log(`🔄 Rolling back phase: ${phase}`);
    
    switch (phase) {
      case 'database':
        await this.rollbackDatabase();
        break;
      case 'nfs':
        await this.rollbackNFS();
        break;
      case 'sessions':
        await this.rollbackSessions();
        break;
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
    
    // Validate rollback success
    await this.validateRollback(phase);
    console.log(`✅ Phase ${phase} rolled back successfully`);
  }

  async rollbackToCheckpoint(checkpointId) {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    
    for (const phase of checkpoint.completedPhases.reverse()) {
      await this.rollbackPhase(phase);
    }
  }

  async validateRollback(phase) {
    const validator = new PreMigrationValidator();
    
    switch (phase) {
      case 'database':
        await validator.checkDatabaseConnections();
        break;
      case 'nfs':
        await validator.checkNFSAccess();
        break;
      case 'sessions':
        await validator.checkActiveSessions();
        break;
    }
  }
}
```

### **4.2 Health Check Integration**

#### **`scripts/health-check-migration.js`**
```javascript
class HealthCheckMigration {
  async runMigrationWithHealthChecks() {
    console.log('🏥 Starting migration with health monitoring...\n');
    
    // Pre-migration health baseline
    const baseline = await this.captureHealthBaseline();
    
    try {
      // Run migration phases with health monitoring
      await this.migrateWithMonitoring(baseline);
      
      // Post-migration health validation
      await this.validatePostMigrationHealth(baseline);
      
    } catch (error) {
      console.error('❌ Migration failed health checks:', error);
      await this.emergencyRollback();
      throw error;
    }
  }

  async migrateWithMonitoring(baseline) {
    const phases = ['database', 'nfs', 'sessions'];
    
    for (const phase of phases) {
      console.log(`\n🔄 Migrating ${phase} with health monitoring...`);
      
      // Pre-phase health check
      await this.checkPhaseHealth(phase, baseline);
      
      // Run migration phase
      await this.runMigrationPhase(phase);
      
      // Post-phase health validation
      await this.validatePhaseHealth(phase, baseline);
      
      // Create checkpoint
      await this.createCheckpoint(phase);
    }
  }

  async checkPhaseHealth(phase, baseline) {
    const currentHealth = await this.captureHealthMetrics();
    
    // Check critical metrics
    if (currentHealth.memoryUsage > baseline.memoryUsage * 1.5) {
      throw new Error(`Memory usage too high: ${currentHealth.memoryUsage}`);
    }
    
    if (currentHealth.diskUsage > baseline.diskUsage * 1.2) {
      throw new Error(`Disk usage too high: ${currentHealth.diskUsage}`);
    }
    
    // Check service availability
    await this.checkServiceHealth();
  }

  async captureHealthMetrics() {
    return {
      memoryUsage: process.memoryUsage().heapUsed,
      diskUsage: await this.getDiskUsage(),
      dbConnections: await this.getActiveDbConnections(),
      timestamp: Date.now()
    };
  }
}
```

### **5. Master Migration Script (Updated)**

#### **`scripts/run-migration.js`**
```javascript
const { DatabaseMigrator } = require('./migrate-database');
const { NFSMigrator } = require('./migrate-nfs');
const { SessionMigrator } = require('./migrate-sessions');

class MasterMigrator {
  async runFullMigration() {
    console.log('🚀 Starting full ACP migration...');
    
    try {
      // Phase 1: Database migration
      console.log('\n📊 Phase 1: Database Migration');
      const dbMigrator = new DatabaseMigrator();
      await dbMigrator.migrate();
      
      // Phase 2: NFS migration
      console.log('\n📁 Phase 2: NFS Migration');
      const nfsMigrator = new NFSMigrator();
      await nfsMigrator.migrate();
      
      // Phase 3: Session migration
      console.log('\n🔄 Phase 3: Session Migration');
      const sessionMigrator = new SessionMigrator();
      await sessionMigrator.migrate();
      
      console.log('\n🎉 Full migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Start qwen-core-agent service');
      console.log('2. Update web-ui configuration');
      console.log('3. Test ACP functionality');
      console.log('4. Monitor system performance');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      console.log('\nTo rollback, run: npm run rollback-migration');
      throw error;
    }
  }
}

// Run full migration
async function main() {
  const migrator = new MasterMigrator();
  await migrator.runFullMigration();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Full migration failed:', error);
    process.exit(1);
  });
}
```

## Migration Commands

### **`package.json` Scripts**
```json
{
  "scripts": {
    "migrate:database": "node scripts/migrate-database.js",
    "migrate:nfs": "node scripts/migrate-nfs.js", 
    "migrate:sessions": "node scripts/migrate-sessions.js",
    "migrate:full": "node scripts/run-migration.js",
    "rollback:migration": "node scripts/rollback-migration.js",
    "backup:create": "node scripts/create-backup.js",
    "migration:status": "node scripts/check-migration-status.js"
  }
}
```

This migration strategy provides a comprehensive approach to transitioning from the current system to ACP architecture with proper backup, rollback, and validation mechanisms.

## **Updated Migration Commands with Database Migration**

### **`package.json` Scripts (Enhanced)**
```json
{
  "scripts": {
    "migrate:db-postgresql-to-mongodb": "node scripts/migrate-postgresql-to-mongodb.js",
    "migrate:validate-db": "node scripts/validate-migration.js",
    "migrate:rollback-db": "node scripts/rollback-to-postgresql.js",
    "pre-migration:validate": "node scripts/pre-migration-validation.js",
    "pre-migration:notify": "node scripts/notify-active-sessions.js",
    "migrate:nfs": "node scripts/migrate-nfs.js", 
    "migrate:sessions": "node scripts/migrate-sessions.js",
    "migrate:full": "node scripts/run-migration.js",
    "rollback:migration": "node scripts/rollback-migration.js",
    "rollback:incremental": "node scripts/incremental-rollback.js",
    "rollback:emergency": "node scripts/incremental-rollback.js --emergency",
    "backup:create": "node scripts/create-backup.js",
    "migration:status": "node scripts/check-migration-status.js",
    "health:check": "node scripts/health-check-migration.js"
  }
}
```

## **Migration Execution Order**

### **Phase 0: Database Migration (Pre-ACP)**
```bash
# 1. Validate current system
npm run pre-migration:validate

# 2. Create backup
npm run backup:create

# 3. Migrate PostgreSQL to MongoDB
npm run migrate:db-postgresql-to-mongodb

# 4. Validate database migration
npm run migrate:validate-db

# 5. Update application code (manual deployment)
# Deploy updated backend services with MongoDB-only code
```

### **Phase 1-4: ACP Implementation**
```bash
# After database migration is complete and validated
npm run migrate:full  # Runs NFS and session migrations for ACP
```

## **Benefits of MongoDB-Only Architecture**

### **✅ Simplified Migration Strategy**
- **Single database migration** instead of dual-database complexity
- **Unified backup/restore** procedures
- **Simplified connection management**
- **Better data consistency** with single transaction model

### **✅ ACP Implementation Benefits**
- **Document-based sessions** perfect for ACP message structure
- **Native vector search** for conversation embeddings (free)
- **Flexible schema** for evolving ACP protocol
- **Better scaling** for session-based workloads
- **Unified query interface** for all data operations

### **✅ Operational Benefits**
- **Lower infrastructure costs** (one database instead of two)
- **Simplified monitoring** and alerting
- **Easier disaster recovery** procedures
- **Reduced operational complexity**

This comprehensive migration approach ensures a smooth transition to MongoDB-only architecture, providing a solid foundation for ACP implementation with simplified operations and better performance.
