import { z } from 'zod';

// Schema version management
export interface SchemaVersion {
  version: string;
  timestamp: number;
  description: string;
  migrations: SchemaMigration[];
}

export interface SchemaMigration {
  from: string;
  to: string;
  transform: (data: any) => any;
  validate?: (data: any) => boolean;
}

export class SchemaVersionManager {
  private versions = new Map<string, SchemaVersion>();
  private migrations = new Map<string, SchemaMigration[]>();

  constructor() {
    this.initializeVersions();
  }

  private initializeVersions(): void {
    // Version 1.0 - Initial schema
    this.registerVersion({
      version: '1.0',
      timestamp: Date.now(),
      description: 'Initial unified message schema',
      migrations: []
    });

    // Future version example
    this.registerVersion({
      version: '1.1',
      timestamp: Date.now(),
      description: 'Added message priority and routing',
      migrations: [{
        from: '1.0',
        to: '1.1',
        transform: (data: any) => ({
          ...data,
          priority: 'normal',
          routing: { service: 'default' }
        }),
        validate: (data: any) => data.priority && data.routing
      }]
    });
  }

  registerVersion(version: SchemaVersion): void {
    this.versions.set(version.version, version);
    
    // Index migrations by source version
    version.migrations.forEach(migration => {
      if (!this.migrations.has(migration.from)) {
        this.migrations.set(migration.from, []);
      }
      this.migrations.get(migration.from)!.push(migration);
    });
  }

  // Migrate data from one version to another
  migrate(data: any, fromVersion: string, toVersion: string): { success: boolean; data?: any; error?: string } {
    if (fromVersion === toVersion) {
      return { success: true, data };
    }

    try {
      let currentData = data;
      let currentVersion = fromVersion;

      // Find migration path
      const path = this.findMigrationPath(fromVersion, toVersion);
      if (!path) {
        return { success: false, error: `No migration path from ${fromVersion} to ${toVersion}` };
      }

      // Apply migrations in sequence
      for (const migration of path) {
        currentData = migration.transform(currentData);
        
        // Validate if validator exists
        if (migration.validate && !migration.validate(currentData)) {
          return { success: false, error: `Migration validation failed: ${migration.from} -> ${migration.to}` };
        }
        
        currentVersion = migration.to;
      }

      return { success: true, data: currentData };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Find shortest migration path between versions
  private findMigrationPath(from: string, to: string): SchemaMigration[] | null {
    const visited = new Set<string>();
    const queue: { version: string; path: SchemaMigration[] }[] = [{ version: from, path: [] }];

    while (queue.length > 0) {
      const { version, path } = queue.shift()!;
      
      if (version === to) {
        return path;
      }

      if (visited.has(version)) {
        continue;
      }
      visited.add(version);

      const migrations = this.migrations.get(version) || [];
      for (const migration of migrations) {
        queue.push({
          version: migration.to,
          path: [...path, migration]
        });
      }
    }

    return null;
  }

  // Get current schema version
  getCurrentVersion(): string {
    const versions = Array.from(this.versions.keys()).sort();
    return versions[versions.length - 1];
  }

  // Get all available versions
  getVersions(): SchemaVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Check if version exists
  hasVersion(version: string): boolean {
    return this.versions.has(version);
  }

  // Auto-migrate message to current version
  autoMigrate(message: any): { success: boolean; data?: any; error?: string } {
    const messageVersion = message.version || '1.0';
    const currentVersion = this.getCurrentVersion();
    
    if (messageVersion === currentVersion) {
      return { success: true, data: message };
    }

    return this.migrate(message, messageVersion, currentVersion);
  }
}

// Message validator with version support
export class VersionedMessageValidator {
  private schemaManager = new SchemaVersionManager();
  private schemas = new Map<string, z.ZodSchema>();

  constructor() {
    this.initializeSchemas();
  }

  private initializeSchemas(): void {
    // Register schemas for each version
    this.schemas.set('1.0', z.object({
      id: z.string(),
      correlationId: z.string(),
      timestamp: z.number(),
      version: z.literal('1.0'),
      type: z.string(),
      data: z.any()
    }));

    // Future version schema
    this.schemas.set('1.1', z.object({
      id: z.string(),
      correlationId: z.string(),
      timestamp: z.number(),
      version: z.literal('1.1'),
      type: z.string(),
      data: z.any(),
      priority: z.enum(['low', 'normal', 'high']),
      routing: z.object({
        service: z.string(),
        region: z.string().optional()
      })
    }));
  }

  // Validate message with automatic migration
  validateWithMigration(message: any): { 
    success: boolean; 
    data?: any; 
    error?: string; 
    migrated?: boolean 
  } {
    const messageVersion = message.version || '1.0';
    const currentVersion = this.schemaManager.getCurrentVersion();
    
    let processedMessage = message;
    let migrated = false;

    // Migrate if needed
    if (messageVersion !== currentVersion) {
      const migrationResult = this.schemaManager.migrate(message, messageVersion, currentVersion);
      if (!migrationResult.success) {
        return { success: false, error: migrationResult.error };
      }
      processedMessage = migrationResult.data;
      migrated = true;
    }

    // Validate with current schema
    const schema = this.schemas.get(currentVersion);
    if (!schema) {
      return { success: false, error: `No schema found for version ${currentVersion}` };
    }

    try {
      const validated = schema.parse(processedMessage);
      return { success: true, data: validated, migrated };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || error.message 
      };
    }
  }

  // Register new schema version
  registerSchema(version: string, schema: z.ZodSchema): void {
    this.schemas.set(version, schema);
  }
}

export const schemaVersionManager = new SchemaVersionManager();
export const versionedMessageValidator = new VersionedMessageValidator();
