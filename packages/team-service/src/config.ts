import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local env file
const localEnvPath = resolve(__dirname, '../.env');
config({ path: localEnvPath });

console.log('🔥 CONFIG.TS LOADED - ENV VARS:', {
  BACKEND_URL: process.env['BACKEND_URL'],
  ACP_WEBSOCKET_URL: process.env['ACP_WEBSOCKET_URL']
});

// Server Configuration
export const PORT = parseInt(process.env['PORT'] || '3001', 10);
export const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3001';
export const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret-change-in-production';
export const CORS_ORIGIN = process.env['CORS_ORIGIN'] || 'http://localhost:3000';

// Qwen OAuth
export const QWEN_CLIENT_ID = process.env['QWEN_CLIENT_ID'] || '';
export const QWEN_CLIENT_SECRET = process.env['QWEN_CLIENT_SECRET'] || '';

// OpenAI/LLM Configuration
export const OPENAI_API_KEY = process.env['OPENAI_API_KEY'] || '';
export const OPENAI_BASE_URL = process.env['OPENAI_BASE_URL'] || 'https://api.openai.com/v1';
export const OPENAI_MODEL = process.env['OPENAI_MODEL'] || 'gpt-4';

// NFS Configuration
export const NFS_BASE_PATH = process.env['NFS_BASE_PATH'] || './nfs-storage';

// Session Configuration
export const MESSAGE_WINDOW_SIZE = parseInt(process.env['MESSAGE_WINDOW_SIZE'] || '50', 10);
export const SESSION_TOKEN_LIMIT = parseInt(process.env['SESSION_TOKEN_LIMIT'] || '32000', 10);

// Backend URLs
export const BACKEND_URL = process.env['BACKEND_URL'];
export const ACP_WEBSOCKET_URL = process.env['ACP_WEBSOCKET_URL'];

// Sandbox Configuration
export const SANDBOX_ENABLED = process.env['SANDBOX_ENABLED'] !== 'false';
export const SANDBOX_IMAGE = process.env['SANDBOX_IMAGE'] || 'node:20-bookworm';
export const SANDBOX_MEMORY = process.env['SANDBOX_MEMORY'] || '1g';
export const SANDBOX_CPUS = parseInt(process.env['SANDBOX_CPUS'] || '2', 10);
export const SANDBOX_NETWORK = process.env['SANDBOX_NETWORK'] || 'bridge';
export const SANDBOX_IDLE_TIMEOUT = parseInt(process.env['SANDBOX_IDLE_TIMEOUT'] || '3600000', 10);
export const SANDBOX_CLEANUP_INTERVAL = parseInt(process.env['SANDBOX_CLEANUP_INTERVAL'] || '300000', 10);
