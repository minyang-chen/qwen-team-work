import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from local .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { AcpServer } from './server/AcpServer.js';
import { AIExecutionEngine } from './execution/AIExecutionEngine.js';
import { EnhancedChatHandler } from './handlers/EnhancedChatHandler.js';
import { ResponseBuilder } from './protocol/ResponseBuilder.js';
import { ErrorHandler } from './protocol/ErrorHandler.js';
import { AgentConfig, AcpMessage } from '@qwen-team/shared';
import * as config from './config/env.js';

// Initialize AI execution components
const aiEngine = new AIExecutionEngine();
const responseBuilder = new ResponseBuilder();
const errorHandler = new ErrorHandler();
const chatHandler = new EnhancedChatHandler(aiEngine, responseBuilder, errorHandler);

// Load agent configuration
const agents: AgentConfig[] = [
  {
    id: 'qwen-core-1',
    endpoint: `ws://localhost:${config.PORT}`,
    capabilities: ['chat', 'code', 'tools', 'streaming'],
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

console.log({
  service: 'team-ai-agent',
  level: 'info',
  timestamp: new Date().toISOString(),
  message: 'Starting Enhanced AI Agent server',
  port: config.PORT,
  env: config.NODE_ENV,
  agentCount: agents.length
});

const server = new AcpServer(config.PORT, agents);

// Register enhanced chat handler
server.registerHandler('chat.send', (msg: AcpMessage) => chatHandler.handleChatMessage(msg));
server.registerHandler('tools.execute', (msg: AcpMessage) => chatHandler.handleToolExecution(msg));

// Start the server
server.start().then(() => {
  console.log('[INFO] Enhanced ACP Server fully started and initialized');
}).catch((error) => {
  console.error('[ERROR] Failed to start Enhanced ACP Server:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('[INFO] Received SIGTERM, shutting down gracefully');
  await chatHandler.cleanup();
  server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[INFO] Received SIGINT, shutting down gracefully');
  await chatHandler.cleanup();
  server.close();
  process.exit(0);
});

// Export components for external use
export { AIExecutionEngine, EnhancedChatHandler, ResponseBuilder, ErrorHandler };
export * from './execution/AIExecutionEngine.js';
export * from './execution/EnhancedToolExecutor.js';
export * from './handlers/EnhancedChatHandler.js';
export * from './server/ServerClient.js';
export * from './server/types.js';
