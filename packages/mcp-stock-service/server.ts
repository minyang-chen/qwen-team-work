#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Your Name
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple MCP server that implements the Model Context Protocol directly
// Using a minimal JSON-RPC implementation over stdio

import readline from 'readline';
import { createCache } from './data/cache.js';
import { stockSymbolLookupHandler } from './tools/stock-symbol-lookup.js';

// Debug logging to stderr (only when MCP_DEBUG or VERBOSE is set)
const debugEnabled = process.env['MCP_DEBUG'] === 'true' || process.env['VERBOSE'] === 'true';
function debug(msg: string) {
  if (debugEnabled) {
    process.stderr.write(`[MCP-DEBUG] ${msg}\n`);
  }
}

debug('Stock Symbol MCP server starting...');

interface JSONRPCMessage {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface MCPRequestHandler {
  (params: any): Promise<any>;
}

// Simple JSON-RPC implementation for MCP
class SimpleJSONRPC {
  private handlers: Map<string, MCPRequestHandler>;
  private rl: readline.Interface;

  constructor() {
    this.handlers = new Map();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.rl.on('line', (line: string) => {
      debug(`Received line: ${line}`);
      try {
        const message: JSONRPCMessage = JSON.parse(line);
        debug(`Parsed message: ${JSON.stringify(message)}`);
        this.handleMessage(message);
      } catch (e: unknown) {
        if (e instanceof Error) {
          debug(`Parse error: ${e.message}`);
        } else {
          debug(`Parse error: ${String(e)}`);
        }
      }
    });
  }

  send(message: JSONRPCMessage) {
    const msgStr = JSON.stringify(message);
    debug(`Sending message: ${msgStr}`);
    process.stdout.write(msgStr + '\n');
  }

  async handleMessage(message: JSONRPCMessage) {
    if (message.method && this.handlers.has(message.method)) {
      try {
        const handler = this.handlers.get(message.method)!;
        const result = await handler(message.params || {});
        if (message.id !== undefined) {
          this.send({
            jsonrpc: '2.0',
            id: message.id,
            result
          });
        }
      } catch (error: unknown) {
        if (message.id !== undefined) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.send({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: errorMessage
            }
          });
        }
      }
    } else if (message.id !== undefined) {
      this.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
  }

  on(method: string, handler: MCPRequestHandler) {
    this.handlers.set(method, handler);
  }
}

// Create MCP server
const rpc = new SimpleJSONRPC();

// Create cache instance
const cache = createCache();

// Handle initialize
rpc.on('initialize', async (params) => {
  debug('Handling initialize request');
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: 'qwen-stock-symbol-service',
      version: '1.0.0'
    }
  };
});

// Handle tools/list
rpc.on('tools/list', async () => {
  debug('Handling tools/list request');
  return {
    tools: [{
      name: 'stock_symbol_lookup',
      description: 'Resolves company names to stock symbols and validates stock symbols using SEC\'s company ticker data. The service downloads the company ticker data on first use and caches it for 24 hours.',
      inputSchema: {
        type: 'object',
        properties: {
          companyName: {
            type: 'string',
            description: 'The company name to look up the stock symbol for'
          },
          stockSymbol: {
            type: 'string',
            description: 'The stock symbol to validate'
          }
        },
        oneOf: [
          { required: ['companyName'] },
          { required: ['stockSymbol'] }
        ]
      }
    }]
  };
});

// Handle tools/call
rpc.on('tools/call', async (params) => {
  debug(`Handling tools/call request for tool: ${params.name}`);
  if (params.name === 'stock_symbol_lookup') {
    const result = await stockSymbolLookupHandler(params.arguments, cache);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  }
  throw new Error('Unknown tool: ' + params.name);
});

// Send initialization notification
rpc.send({
  jsonrpc: '2.0',
  method: 'initialized'
});

debug('Stock Symbol MCP server initialized');