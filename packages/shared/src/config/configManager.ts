import { z } from 'zod';

// Base configuration schema
const BaseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO')
});

// Backend configuration schema
export const BackendConfigSchema = BaseConfigSchema.extend({
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3002'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().url().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  NFS_BASE_PATH: z.string().default('/mnt/nfs'),
  CORS_ORIGIN: z.string().default('*'),
  CORE_AGENT_URL: z.string().url().default('ws://localhost:8001'),
  TEAM_UI_SERVER_URL: z.string().url().default('http://localhost:3001'),
  TEAM_UI_CLIENT_URL: z.string().url().default('http://localhost:3000')
});

// UI Server configuration schema
export const UIServerConfigSchema = BaseConfigSchema.extend({
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3001'),
  JWT_SECRET: z.string().min(32),
  QWEN_CLIENT_ID: z.string().optional(),
  QWEN_CLIENT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().optional(),
  BASE_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('*'),
  MESSAGE_WINDOW_SIZE: z.string().transform(Number).pipe(z.number().min(1)).default('100'),
  SESSION_TOKEN_LIMIT: z.string().transform(Number).pipe(z.number().min(1000)).default('32000'),
  NFS_BASE_PATH: z.string().optional()
});

// Core Agent configuration schema
export const CoreAgentConfigSchema = BaseConfigSchema.extend({
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8001'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().optional(),
  MONGODB_URI: z.string().url().optional()
});

// Type exports
export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type UIServerConfig = z.infer<typeof UIServerConfigSchema>;
export type CoreAgentConfig = z.infer<typeof CoreAgentConfigSchema>;

// Configuration factory
export class ConfigManager {
  private static instance: ConfigManager;
  private configs = new Map<string, unknown>();

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getBackendConfig(): BackendConfig {
    if (!this.configs.has('backend')) {
      try {
        const config = BackendConfigSchema.parse(process.env);
        this.configs.set('backend', config);
        console.log('✅ Backend configuration validated successfully');
      } catch (error) {
        console.error('❌ Backend configuration validation failed:', error);
        process.exit(1);
      }
    }
    return this.configs.get('backend') as BackendConfig;
  }

  getUIServerConfig(): UIServerConfig {
    if (!this.configs.has('ui-server')) {
      try {
        const config = UIServerConfigSchema.parse(process.env);
        this.configs.set('ui-server', config);
        console.log('✅ UI Server configuration validated successfully');
      } catch (error) {
        console.error('❌ UI Server configuration validation failed:', error);
        process.exit(1);
      }
    }
    return this.configs.get('ui-server') as UIServerConfig;
  }

  getCoreAgentConfig(): CoreAgentConfig {
    if (!this.configs.has('core-agent')) {
      try {
        const config = CoreAgentConfigSchema.parse(process.env);
        this.configs.set('core-agent', config);
        console.log('✅ Core Agent configuration validated successfully');
      } catch (error) {
        console.error('❌ Core Agent configuration validation failed:', error);
        process.exit(1);
      }
    }
    return this.configs.get('core-agent') as CoreAgentConfig;
  }

  // Validate required environment variables exist
  validateRequiredEnv(service: 'backend' | 'ui-server' | 'core-agent'): void {
    const requiredVars: Record<string, string[]> = {
      'backend': ['MONGODB_URI', 'JWT_SECRET'],
      'ui-server': ['JWT_SECRET'],
      'core-agent': []
    };

    const missing = requiredVars[service].filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables for ${service}:`, missing);
      process.exit(1);
    }
  }
}

// Singleton instance
export const configManager = ConfigManager.getInstance();
