import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { configManager } from '@qwen-team/shared';

// Load local .env file first
const localEnvPath = path.join(__dirname, '../.env');
console.log('Backend loading local .env from:', localEnvPath);
console.log('Local .env exists:', existsSync(localEnvPath));
dotenv.config({ path: localEnvPath });

// Get validated configuration
const config = configManager.getBackendConfig();

// Export configuration values (for backward compatibility)
export const PORT = config.PORT;
export const NODE_ENV = config.NODE_ENV;
export const MONGODB_URI = config.MONGODB_URI;
export const NFS_BASE_PATH = config.NFS_BASE_PATH;
export const JWT_SECRET = config.JWT_SECRET;
export const OPENAI_API_KEY = config.OPENAI_API_KEY;
export const OPENAI_BASE_URL = config.OPENAI_BASE_URL;
export const OPENAI_MODEL = config.OPENAI_MODEL;
export const EMBEDDING_BASE_URL = config.EMBEDDING_BASE_URL;
export const EMBEDDING_MODEL = config.EMBEDDING_MODEL;

// Legacy exports (deprecated - use config directly)
export const MONGO_URL = config.MONGODB_URI;
export const JWT_EXPIRES_IN = '24h';
export const EMBEDDING_API_KEY = config.OPENAI_API_KEY;
export const BCRYPT_ROUNDS = 10;
