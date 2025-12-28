import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { configManager, uiServerLogger } from '@qwen-team/shared';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(importmetaurl);
const __dirname = dirname(__filename);

// Load local env file
const localEnvPath = resolve(__dirname, '/env');
const logger = uiServerLoggerchild({ service: 'config' });
loggerinfo('UI Server loading local env', { path: localEnvPath, exists: existsSync(localEnvPath) });
config({ path: localEnvPath });

// Use validated configuration
const uiConfig = configManagergetUIServerConfig();

export const PORT = uiConfigPORT;
export const BASE_URL = uiConfigBASE_URL;
export const JWT_SECRET = uiConfigJWT_SECRET;
export const QWEN_CLIENT_ID = uiConfigQWEN_CLIENT_ID;
export const QWEN_CLIENT_SECRET = uiConfigQWEN_CLIENT_SECRET;
export const OPENAI_API_KEY = uiConfigOPENAI_API_KEY;
export const OPENAI_BASE_URL = uiConfigOPENAI_BASE_URL;
export const OPENAI_MODEL = uiConfigOPENAI_MODEL;
export const CORS_ORIGIN = uiConfigCORS_ORIGIN;
export const NFS_BASE_PATH = uiConfigNFS_BASE_PATH;
export const MESSAGE_WINDOW_SIZE = uiConfigMESSAGE_WINDOW_SIZE;
export const SESSION_TOKEN_LIMIT = uiConfigSESSION_TOKEN_LIMIT;

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

// Session Configuration
export const SESSION_TOKEN_LIMIT = parseInt(
  process.env['SESSION_TOKEN_LIMIT'] || '32000',
);
export const MESSAGE_WINDOW_SIZE = parseInt(
  process.env['MESSAGE_WINDOW_SIZE'] || '100',
);
