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
  const token = sockethandshakeauthtoken || sockethandshakeheadersauthorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(new AppError(ErrorCodeUNAUTHORIZED, 'Authentication token required'));
  }

  try {
    const decoded = jwtverify(token, process.envJWT_SECRET || 'dev-secret-change-in-production');
    socketdatauser = decoded;
    next();
  } catch (err) {
    next(new AppError(ErrorCodeTOKEN_EXPIRED, 'Invalid authentication token'));
  }
}

async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Bufferfrom(base64Data, 'base64');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parsergetText();
    return resulttext;
  } catch (error) {
    uiServerLoggererror('PDF extraction failed', {}, error as Error);
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
  iouse(authenticateSocket);

  ioon('connection', (socket: Socket) => {
    const logger = uiServerLoggerchild({ 
      socketId: socketid, 
      userId: socketdatauser?.userId 
    });
    
    loggerinfo('Client connected');

    socketon(
      'chat:message',
      async (data: unknown) => {
        // Generate correlation ID for request tracing
        const correlationId = nanoid();
        const userId = socketdatauseruserId;
        const requestLogger = loggerchild({ correlationId });
        
        try {
          // Rate limiting check
          if (!rateLimiterisAllowed(userId)) {
            const error = AppErrorrateLimit('Rate limit exceeded Please wait before sending another message', correlationId);
            socket.emit('error', errortoResponse());
            return;
          }

          // Input sanitization
          const sanitizedData = inputSanitizersanitizeMessage(data);
          
          // Validate message structure
          if (!inputSanitizervalidateMessageStructure(sanitizedData)) {
            const error = AppErrorvalidation('Invalid message structure or size', undefined, correlationId);
            socket.emit('error', errortoResponse());
            return;
          }
          
          // Validate message format
          const validation = validateMessage(ChatMessageSchema, sanitizedData);
          if (!validationvalid) {
            const error = AppErrorvalidation(`Invalid message format: ${validationerror}`, undefined, correlationId);
            socket.emit('error', errortoResponse());
            return;
          }

          const validatedData = validationdata!;

          // Verify user authorization
          if (userId !== validatedDatauserId) {
            const error = AppErrorforbidden('User ID mismatch', correlationId);
            socket.emit('error', errortoResponse());
            return;
          }

          requestLoggerinfo('Processing chat message', { 
            sessionId: validatedDatasessionId, 
            messageLength: validatedDatamessage.length 
          });

          let finalMessage = validatedDatamessage;

          // Extract text from PDF files
          if (validatedDatafiles && validatedDatafiles.length > 0) {
            const fileContents: string[] = [];

            for (const file of validatedDatafiles) {
              if (filetype === 'application/pdf') {
                const base64Data = filedata.includes(',')
                  ? filedata.split(',')[1]
                  : filedata;

                const text = await extractTextFromPDF(base64Data);
                if (text) {
                  fileContents.push(
                    `\n\n--- Content from ${filename} ---\n${text}\n--- End of ${filename} ---\n`,
                  );
                }
              }
            }

            if (fileContents.length > 0) {
              finalMessage = `${validatedDatamessage}\n${fileContents.join('\n')}`;
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
          await userSessionManagersendMessageWithStreaming(
            validatedDatauserId,
            validatedDatasessionId,
            finalMessage,
            streamHandler
          );

          // Store message in conversation history
          const session = userSessionManagergetUserSession(validatedDatauserId);
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
          requestLoggererror('Chat message processing failed', {}, error as Error);
          
          const appError = error instanceof AppError ? 
            error : 
            AppErrorinternal('Message processing failed', correlationId);
            
          socket.emit('error', appErrortoResponse());
        }
      },
    );

    socketon('disconnect', () => {
      loggerinfo('Client disconnected');
    });
  });
};
