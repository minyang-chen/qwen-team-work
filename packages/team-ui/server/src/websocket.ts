import type { Server as SocketServer, Socket } from 'socket.io';
import type { UserSessionManager } from './session/UserSessionManager.js';
import { ClientAdapter } from './ClientAdapter.js';
import { SandboxedToolExecutor } from './SandboxedToolExecutor.js';
import { SandboxManager } from './SandboxManager.js';
import { SANDBOX_ENABLED, SESSION_TOKEN_LIMIT } from './config.js';
import { ChatMessageSchema, validateMessage } from './validation/messageSchemas.js';
import { rateLimiter } from './utils/rateLimiter.js';
import { inputSanitizer } from './utils/inputSanitizer.js';
import { uiServerLogger, AppError, ErrorCode } from '@qwen-team/shared';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// JWT Authentication middleware
function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(new AppError(ErrorCode.UNAUTHORIZED, 'Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'dev-secret-change-in-production');
    socket.data.user = decoded;
    next();
  } catch (err) {
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
const sandboxManager = new SandboxManager();

export function setupWebSocket(
  io: SocketServer,
  userSessionManager: UserSessionManager,
) {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket: Socket) => {
    const logger = uiServerLogger.child({ 
      socketId: socket.id, 
      userId: socket.data.user?.userId 
    });
    
    logger.info('Client connected');

    socket.on(
      'chat:message',
      async (data: unknown) => {
        // Generate correlation ID for request tracing
        const correlationId = nanoid();
        const userId = socket.data.user.userId;
        const requestLogger = logger.child({ correlationId });
        
        try {
          // Rate limiting check
          if (!rateLimiter.isAllowed(userId)) {
            const error = AppError.rateLimit('Rate limit exceeded Please wait before sending another message', correlationId);
            socket.emit('error', error.toResponse());
            return;
          }

          // Input sanitization
          const sanitizedData = inputSanitizer.sanitizeMessage(String(data));
          
          // Validate message structure
          if (!inputSanitizer.validateMessageStructure(sanitizedData)) {
            const error = AppError.validation('Invalid message structure or size', undefined, correlationId);
            socket.emit('error', error.toResponse());
            return;
          }
          
          // Validate message format
          const validation = validateMessage(ChatMessageSchema, sanitizedData);
          if (!validation.valid) {
            const error = AppError.validation(`Invalid message format: ${validation.error}`, undefined, correlationId);
            socket.emit('error', error.toResponse());
            return;
          }

          const validatedData = validation.data!;

          // Verify user authorization
          if (userId !== validatedData.userId) {
            const error = AppError.forbidden('User ID mismatch', correlationId);
            socket.emit('error', error.toResponse());
            return;
          }

          requestLogger.info('Processing chat message', { 
            sessionId: validatedData.sessionId, 
            messageLength: validatedData.message.length 
          });

          let finalMessage = validatedData.message;

          // Extract text from PDF files
          if (validatedData.files && validatedData.files.length > 0) {
            const fileContents: string[] = [];

            for (const file of validatedData.files) {
              if (file.type === 'application/pdf') {
                const base64Data = file.data.includes(',')
                  ? file.data.split(',')[1]
                  : file.data;

                const text = await extractTextFromPDF(base64Data);
                if (text) {
                  fileContents.push(
                    `\n\n--- Content from ${file.name || 'unknown'} ---\n${text}\n--- End of ${file.name || 'unknown'} ---\n`,
                  );
                }
              }
            }

            if (fileContents.length > 0) {
              finalMessage = `${validatedData.message}\n${fileContents.join('\n')}`;
            }
          }

          // Create streaming handler with correlation ID
          const streamHandler = {
            onChunk: (chunk: string) => {
              socket.emit('message:chunk', { 
                type: 'text', 
                data: { text: chunk },
                correlationId 
              });
            },
            onComplete: () => {
              socket.emit('message:complete', { correlationId });
            },
            onError: (error: Error) => {
              socket.emit('error', { 
                message: error.message,
                code: 'STREAMING_ERROR',
                correlationId 
              });
            }
          };

          // Send message via backend with streaming
          await userSessionManager.sendMessageWithStreaming(
            validatedData.userId,
            validatedData.sessionId,
            finalMessage,
            streamHandler
          );

          // Store message in conversation history
          const session = userSessionManager.getUserSession(validatedData.userId);
          if (session) {
            const userMessage: any = {
              messageId: `msg_${Date.now()}_user`,
              role: 'user',
              content: finalMessage,
              metadata: {
                correlationId,
                timestamp: new Date(),
                version: '1.0'
              }
            };
            // Note: This would need proper interface alignment
            // session.conversationHistory.push(userMessage);
          }

        } catch (error) {
          requestLogger.error('Chat message processing failed', {}, error as Error);
          
          const appError = error instanceof AppError ? 
            error : 
            AppError.internal('Message processing failed', correlationId);
            
          socket.emit('error', appError.toResponse());
        }
      },
    );

    socket.on('disconnect', () => {
      logger.info('Client disconnected');
    });
  });
};
