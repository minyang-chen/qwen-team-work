import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local env file FIRST, before any other imports
const localEnvPath = resolve(__dirname, '../.env');
config({ path: localEnvPath });

console.log('🔥 CONFIG.TS LOADED - ENV VARS:', {
  BACKEND_URL: process.env['BACKEND_URL'],
  ACP_WEBSOCKET_URL: process.env['ACP_WEBSOCKET_URL']
});

// Now import after env is loaded
import { configManager, uiServerLogger } from '@qwen-team/shared';

const logger = uiServerLogger.child({ service: 'config' });
logger.info('UI Server loading local env', { path: localEnvPath, exists: existsSync(localEnvPath) });

// Use validated configuration
const uiConfig = configManager.getUIServerConfig();

export const PORT = uiConfig.PORT;
export const BASE_URL = uiConfig.BASE_URL;
export const JWT_SECRET = uiConfig.JWT_SECRET;
export const QWEN_CLIENT_ID = uiConfig.QWEN_CLIENT_ID;
export const QWEN_CLIENT_SECRET = uiConfig.QWEN_CLIENT_SECRET;
export const OPENAI_API_KEY = uiConfig.OPENAI_API_KEY;
export const OPENAI_BASE_URL = uiConfig.OPENAI_BASE_URL;
export const OPENAI_MODEL = uiConfig.OPENAI_MODEL;
export const CORS_ORIGIN = uiConfig.CORS_ORIGIN;
export const NFS_BASE_PATH = uiConfig.NFS_BASE_PATH || '../../infrastructure/nfs-data';
export const MESSAGE_WINDOW_SIZE = uiConfig.MESSAGE_WINDOW_SIZE;
export const SESSION_TOKEN_LIMIT = uiConfig.SESSION_TOKEN_LIMIT;

// Additional environment variables not in uiConfig
export const BACKEND_URL = process.env['BACKEND_URL'];
export const ACP_WEBSOCKET_URL = process.env['ACP_WEBSOCKET_URL'];

// Sandbox Configuration
export const SANDBOX_ENABLED = process.env['SANDBOX_ENABLED'] !== 'false';
export const SANDBOX_IMAGE = process.env['SANDBOX_IMAGE'] || 'node:20-bookworm';
export const SANDBOX_MEMORY = process.env['SANDBOX_MEMORY'] || '1g';
export const SANDBOX_CPUS = parseInt(process.env['SANDBOX_CPUS'] || '2');
export const SANDBOX_NETWORK = process.env['SANDBOX_NETWORK'] || 'bridge';
export const SANDBOX_IDLE_TIMEOUT = parseInt(
  process.env['SANDBOX_IDLE_TIMEOUT'] || '3600000',
); // 1 hour
export const SANDBOX_CLEANUP_INTERVAL = parseInt(
  process.env['SANDBOX_CLEANUP_INTERVAL'] || '300000',
); // 5 minutes
