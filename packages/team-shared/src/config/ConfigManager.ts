export interface ConfigSchema {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  BASE_URL?: string;
  CORS_ORIGIN?: string;
  
  // LLM
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  
  // Redis
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  
  // UI Server specific
  MESSAGE_WINDOW_SIZE?: number;
  SESSION_TOKEN_LIMIT?: number;
  
  // Backend specific
  MONGODB_URI?: string;
  JWT_SECRET?: string;
  NFS_BASE_PATH?: string;
  EMBEDDING_BASE_URL?: string;
  EMBEDDING_MODEL?: string;
}

export class ConfigManager {
  private config: ConfigSchema | null = null;

  constructor() {
    // Don't load immediately - wait for first access
  }

  private loadAndValidate(): ConfigSchema {
    const config: ConfigSchema = {
      PORT: parseInt(process.env["PORT"] || '8001'),
      NODE_ENV: (process.env["NODE_ENV"] as any) || 'development',
      OPENAI_API_KEY: process.env["OPENAI_API_KEY"] || '',
      OPENAI_BASE_URL: process.env["OPENAI_BASE_URL"],
      OPENAI_MODEL: process.env["OPENAI_MODEL"],
      REDIS_HOST: process.env["REDIS_HOST"],
      REDIS_PORT: process.env["REDIS_PORT"] ? parseInt(process.env["REDIS_PORT"]) : undefined,
      REDIS_PASSWORD: process.env["REDIS_PASSWORD"],
      REDIS_DB: process.env["REDIS_DB"] ? parseInt(process.env["REDIS_DB"]) : undefined,
      MESSAGE_WINDOW_SIZE: process.env["MESSAGE_WINDOW_SIZE"] ? parseInt(process.env["MESSAGE_WINDOW_SIZE"]) : 100,
      SESSION_TOKEN_LIMIT: process.env["SESSION_TOKEN_LIMIT"] ? parseInt(process.env["SESSION_TOKEN_LIMIT"]) : 32000,
      MONGODB_URI: process.env["MONGODB_URI"],
      JWT_SECRET: process.env["JWT_SECRET"],
      NFS_BASE_PATH: process.env["NFS_BASE_PATH"],
      EMBEDDING_BASE_URL: process.env["EMBEDDING_BASE_URL"],
      EMBEDDING_MODEL: process.env["EMBEDDING_MODEL"],
    };

    // Validate required fields
    if (!config.OPENAI_API_KEY && config.NODE_ENV !== 'test') {
      throw new Error('OPENAI_API_KEY is required');
    }

    return config;
  }
  
  private ensureLoaded(): void {
    if (!this.config) {
      this.config = this.loadAndValidate();
    }
  }

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    this.ensureLoaded();
    return this.config![key];
  }

  getAll(): Readonly<ConfigSchema> {
    this.ensureLoaded();
    return { ...this.config! };
  }
  
  getBackendConfig() {
    this.ensureLoaded();
    return {
      MONGODB_URI: this.config!.MONGODB_URI,
      JWT_SECRET: this.config!.JWT_SECRET,
      PORT: this.config!.PORT,
      NODE_ENV: this.config!.NODE_ENV,
      NFS_BASE_PATH: this.config!.NFS_BASE_PATH,
      OPENAI_API_KEY: this.config!.OPENAI_API_KEY,
      OPENAI_BASE_URL: this.config!.OPENAI_BASE_URL,
      OPENAI_MODEL: this.config!.OPENAI_MODEL,
      EMBEDDING_BASE_URL: this.config!.EMBEDDING_BASE_URL,
      EMBEDDING_MODEL: this.config!.EMBEDDING_MODEL,
    };
  }
  
  getUIServerConfig() {
    this.ensureLoaded();
    return {
      PORT: this.config!.PORT,
      NODE_ENV: this.config!.NODE_ENV,
      BASE_URL: this.config!.BASE_URL,
      CORS_ORIGIN: this.config!.CORS_ORIGIN,
      JWT_SECRET: this.config!.JWT_SECRET,
      MESSAGE_WINDOW_SIZE: this.config!.MESSAGE_WINDOW_SIZE,
      SESSION_TOKEN_LIMIT: this.config!.SESSION_TOKEN_LIMIT,
      OPENAI_API_KEY: this.config!.OPENAI_API_KEY,
      OPENAI_BASE_URL: this.config!.OPENAI_BASE_URL,
      OPENAI_MODEL: this.config!.OPENAI_MODEL,
    };
  }
}

export const configManager = new ConfigManager();
