import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from local .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { AcpServer } from './server/AcpServer.js';
import { AgentConfig } from '@qwen-code/shared';
import { configManager, coreAgentLogger } from '@qwen-team/shared';

// Load and validate configuration
const config = configManager.getCoreAgentConfig();
const logger = coreAgentLogger.child({ service: 'team-core-agent' });

// Load agent configuration - replace with actual config loading
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

logger.info('Starting Core Agent server', {
  port: config.PORT,
  env: config.NODE_ENV,
  agentCount: agents.length
});

const server = new AcpServer(config.PORT, agents);

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  server.close();
  process.exit(0);
});
