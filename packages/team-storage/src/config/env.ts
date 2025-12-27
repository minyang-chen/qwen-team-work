import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env file
const localEnvPath = path.join(__dirname, '../../.env');
console.log('Backend loading local .env from:', localEnvPath);
console.log('Local .env exists:', existsSync(localEnvPath));
dotenv.config({ path: localEnvPath });

// Export configuration values
export const PORT = parseInt(process.env.PORT || '8000', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qwen_code';
export const NFS_BASE_PATH = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';
export const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'qwen-coder-plus';
export const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || '';
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || '';
export const CORE_AGENT_URL = process.env.CORE_AGENT_URL || 'ws://localhost:8001';
export const TEAM_UI_SERVER_URL = process.env.TEAM_UI_SERVER_URL || 'http://localhost:8002';
export const TEAM_UI_CLIENT_URL = process.env.TEAM_UI_CLIENT_URL || 'http://localhost:8003';
export const UI_SERVER_URL = process.env.UI_SERVER_URL || 'http://localhost:8002';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8003';

// Legacy exports (deprecated - use direct env vars)
export const MONGO_URL = MONGODB_URI;
export const JWT_EXPIRES_IN = '24h';
export const EMBEDDING_API_KEY = OPENAI_API_KEY;
export const BCRYPT_ROUNDS = 10;
