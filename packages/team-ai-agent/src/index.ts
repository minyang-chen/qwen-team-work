import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from local .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { AcpServer } from './server/AcpServer.js';
import { AgentConfig } from '@qwen-team/shared';
import * as config from './config/env.js';

// Load agent configuration
const agents: AgentConfig[] = [
  {
    id: 'qwen-core-1',
    endpoint: `ws://localhost:${config.PORT}`,
    capabilities: ['chat', 'code'],
    priority: 1,
    healthCheck: '/health',
    metadata: {
      name: 'Qwen Core Agent 1',
      version: '1.0.0',
      models: ['qwen-coder'],
      maxSessions: 100
    }
  }
];

console.log('[INFO] Starting Core Agent server', {
  port: config.PORT,
  env: config.NODE_ENV,
  agentCount: agents.length
});

const server = new AcpServer(config.PORT, agents);

process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM, shutting down gracefully');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT, shutting down gracefully');
  server.close();
  process.exit(0);
});
