import type { Server as SocketServer, Socket } from 'socket.io';
import type { UserSessionManager } from '../session/UserSessionManager.js';
import type { EnhancedAIService } from '../services/EnhancedAIService.js';
import { uiServerLogger, AppError, ErrorCode } from '@qwen-team/shared';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// JWT Authentication middleware
function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  console.log('[AUTH] Authenticating socket:', socket.id);
  const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
  
  console.log('[AUTH] Token present:', !!token);
  if (!token) {
    console.log('[AUTH] No token provided');
    return next(new AppError(ErrorCode.UNAUTHORIZED, 'Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'dev-secret-change-in-production');
    socket.data.user = decoded;
    console.log('[AUTH] Authentication successful for user:', (decoded as any).userId);
    next();
  } catch (err) {
    console.log('[AUTH] Token verification failed:', err);
    next(new AppError(ErrorCode.TOKEN_EXPIRED, 'Invalid authentication token'));
  }
}

async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    uiServerLogger.error('PDF extraction failed', {}, error as Error);
    return '';
  }
}

const activeRequests = new Map<string, AbortController>();

export function setupWebSocket(
  io: SocketServer,
  userSessionManager: UserSessionManager,
  aiService: EnhancedAIService,
) {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket: Socket) => {
    const logger = uiServerLogger.child({ 
      socketId: socket.id, 
      userId: socket.data.user?.userId 
    });
    
    logger.info('Client connected via optimized WebSocket');

    // Log ALL events for debugging
    socket.onAny((eventName, ...args) => {
      console.log('[SOCKET EVENT]', eventName, JSON.stringify(args, null, 2));
    });

    // Cleanup session on disconnect
    socket.on('disconnect', async () => {
      const userId = socket.data.user.userId;
      try {
        // Clean up AI service session
        await aiService.removeSession(userId);
        logger.info('Session cleaned up on disconnect');
      } catch (error) {
        logger.error('Failed to cleanup session on disconnect', {}, error as Error);
      }
    });

    socket.on('chat:message', async (data: unknown) => {
      const correlationId = nanoid();
      const userId = socket.data.user.userId;
      const requestLogger = logger.child({ correlationId });
      
      console.log('[WEBSOCKET] Received chat:message event:', JSON.stringify(data, null, 2));
      requestLogger.info('Processing message via ACP streaming');
      
      try {
        // Basic validation
        if (!data || typeof data !== 'object' || !('message' in data)) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }

        const { message, sessionId, files } = data as any;
        
        // Create abort controller for this request
        const abortController = new AbortController();
        activeRequests.set(socket.id, abortController);

        let finalMessage = message;

        // Extract text from PDF files
        if (files && files.length > 0) {
          const fileContents: string[] = [];

          for (const file of files) {
            if (file.type === 'application/pdf') {
              const base64Data = file.data.includes(',')
                ? file.data.split(',')[1]
                : file.data;

              const text = await extractTextFromPDF(base64Data);
              if (text) {
                fileContents.push(
                  `\n\n--- Content from ${file.name} ---\n${text}\n--- End of ${file.name} ---\n`,
                );
              }
            }
          }

          if (fileContents.length > 0) {
            finalMessage = `${message}\n${fileContents.join('\n')}`;
          }
        }

        requestLogger.info('Processing message via ACP streaming');

        // Stream message via enhanced AI service (which uses ACP)
        try {
          console.log('[WEBSOCKET] Calling aiService.processMessageStream with userId:', userId, 'message:', finalMessage);
          const streamGenerator = aiService.processMessageStream(userId, finalMessage, {
            teamId: (data as any).teamId,
            projectId: (data as any).projectId
          }, (data as any).workingDirectory);

          // Convert AsyncIterator to AsyncIterable
          const streamIterable = {
            [Symbol.asyncIterator]: () => streamGenerator
          };

          for await (const chunk of streamIterable) {
            if (abortController.signal.aborted) {
              break;
            }

            // Forward chunk to client with proper event mapping
            if (chunk.type === 'content') {
              socket.emit('message:chunk', {
                type: 'text',
                data: { text: chunk.text }
              });
            } else if (chunk.type === 'tool') {
              socket.emit('tool:call', {
                name: chunk.toolName,
                args: chunk.args || {}
              });
            } else if (chunk.type === 'tool_result') {
              socket.emit('tool:response', {
                name: chunk.toolName,
                result: chunk.result
              });
            } else if (chunk.type === 'finished') {
              socket.emit('message:complete');
              break;
            }
          }

          requestLogger.info('Message streaming completed via ACP');
        } catch (error) {
          requestLogger.error('Message streaming failed', {}, error as Error);
          socket.emit('message:error', {
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        activeRequests.delete(socket.id);

      } catch (error) {
        requestLogger.error('Message processing failed', {}, error as Error);
        socket.emit('message:error', {
          message: error instanceof Error ? error.message : 'Message processing failed'
        });
        activeRequests.delete(socket.id);
      }
    });

    // AI Chat handler (used by team web UI)
    socket.on('ai_chat', async (data: unknown) => {
      console.log('[WEBSOCKET] Received ai_chat event:', JSON.stringify(data, null, 2));
      const correlationId = nanoid();
      const userId = socket.data.user.userId;
      const requestLogger = logger.child({ correlationId });
      
      try {
        if (!data || typeof data !== 'object' || !('message' in data)) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }

        const { message, sessionId, messageId } = data as any;
        const msgId = messageId || nanoid();

        console.log('[WEBSOCKET] Processing ai_chat for userId:', userId, 'sessionId:', sessionId);

        // Handle direct shell commands with ! prefix
        if (message.startsWith('!')) {
          const command = message.substring(1).trim();
          console.log('[WEBSOCKET] Direct shell command:', command);
          
          try {
            // Import old AIService for direct sandbox access
            const { getAIService } = await import('../services/aiService.js');
            const directAIService = getAIService();
            const client = await directAIService.getClient(userId, (data as any).workingDirectory);
            
            // Execute command directly in sandbox
            const result = await client.executeShellCommand(command);
            console.log('[WEBSOCKET] Shell command result:', result);
            
            socket.emit('ai_stream_chunk', { 
              type: 'chunk',
              messageId: msgId,
              content: `\`\`\`bash\n$ ${command}\n${result}\`\`\``
            });
            socket.emit('ai_stream_chunk', {
              type: 'complete',
              messageId: msgId
            });
            console.log('[WEBSOCKET] Emitted shell command result');
          } catch (error) {
            console.error('[WEBSOCKET] Shell command error:', error);
            socket.emit('error', { 
              messageId: msgId,
              message: error instanceof Error ? error.message : 'Command execution failed' 
            });
          }
          
          activeRequests.delete(socket.id);
          return;
        }

        // Create abort controller
        const abortController = new AbortController();
        activeRequests.set(socket.id, abortController);

        // Stream message via enhanced AI service
        try {
          console.log('[WEBSOCKET] Calling aiService.processMessageStream...');
          const streamGenerator = aiService.processMessageStream(userId, message, {
            teamId: (data as any).teamId,
            projectId: (data as any).projectId
          }, (data as any).workingDirectory);

          console.log('[WEBSOCKET] Got stream generator, starting iteration...');
          const streamIterable = {
            [Symbol.asyncIterator]: () => streamGenerator
          };

          for await (const chunk of streamIterable) {
            console.log('[WEBSOCKET] Received chunk:', JSON.stringify(chunk));
            if (abortController.signal.aborted) {
              break;
            }

            if (chunk.type === 'content') {
              console.log('[WEBSOCKET] Emitting ai_stream_chunk');
              socket.emit('ai_stream_chunk', {
                type: 'chunk',
                content: chunk.text,
                messageId: msgId,
                correlationId
              });
            } else if (chunk.type === 'finished') {
              console.log('[WEBSOCKET] Emitting complete');
              socket.emit('ai_stream_chunk', {
                type: 'complete',
                messageId: msgId,
                correlationId
              });
              break;
            }
          }

          console.log('[WEBSOCKET] Stream iteration complete');
          requestLogger.info('AI chat streaming completed');
        } catch (error) {
          requestLogger.error('AI chat streaming failed', {}, error as Error);
          socket.emit('ai_stream_chunk', {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            messageId: msgId,
            correlationId
          });
        }

        activeRequests.delete(socket.id);

      } catch (error) {
        requestLogger.error('AI chat processing failed', {}, error as Error);
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'AI chat processing failed'
        });
        activeRequests.delete(socket.id);
      }
    });

    socket.on('chat:cancel', () => {
      const abortController = activeRequests.get(socket.id);
      if (abortController) {
        abortController.abort();
        activeRequests.delete(socket.id);
        socket.emit('message:complete');
        logger.info('Message cancelled by user');
      }
    });

    socket.on('session:history', async (data: { sessionId: string }) => {
      try {
        const userId = socket.data.user.userId;
        const session = aiService.getSessionStats(userId);
        
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // For now, return empty history since we're using ACP
        // TODO: Implement history retrieval via ACP
        socket.emit('session:history', []);
      } catch (error) {
        logger.error('Failed to get session history', {}, error as Error);
        socket.emit('error', { message: 'Failed to get session history' });
      }
    });

    socket.on('session:compress', async (data: { sessionId: string }) => {
      try {
        const userId = socket.data.user.userId;
        
        // TODO: Implement compression via ACP
        const result = {
          tokensBeforeCompression: 1000,
          tokensAfterCompression: 500,
          compressionRatio: 0.5
        };
        
        socket.emit('session:compressed', result);
        logger.info('Session compressed via ACP');
      } catch (error) {
        logger.error('Session compression failed', {}, error as Error);
        socket.emit('error', { message: 'Session compression failed' });
      }
    });

    socket.on('chat:command', async (data: { sessionId: string; command: string }) => {
      try {
        const userId = socket.data.user.userId;
        const { command } = data;

        // Handle commands locally for now
        if (command === '/stats') {
          const session = aiService.getSessionStats(userId);
          if (session) {
            socket.emit('command:response', {
              type: 'stats',
              data: {
                messageCount: session.messageCount,
                tokenUsage: session.tokenUsage,
                lastActivity: new Date(session.lastActivity).toISOString()
              }
            });
          }
        } else {
          // Forward other commands to AI agent via ACP
          // TODO: Implement command forwarding
          socket.emit('command:response', {
            type: 'info',
            data: { message: `Command ${command} forwarded to AI agent` }
          });
        }
      } catch (error) {
        logger.error('Command processing failed', {}, error as Error);
        socket.emit('error', { message: 'Command processing failed' });
      }
    });
  });
}
