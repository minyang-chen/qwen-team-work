import { z } from 'zod';

// Base message interface
export const BaseMessageSchema = z.object({
  id: z.string().min(1),
  correlationId: z.string().min(1),
  timestamp: z.number().positive(),
  version: z.literal('1.0')
});

// File attachment schema
export const FileAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  contentHash: z.string().min(1),
  filePath: z.string().optional(), // NFS path after upload
  data: z.string().optional() // base64 data for upload
});

// Tool call schema
export const ToolCallSchema = z.object({
  callId: z.string().min(1),
  name: z.string().min(1),
  args: z.record(z.any()),
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'failed']),
  result: z.any().optional(),
  error: z.string().optional()
});

// Token usage schema
export const TokenUsageSchema = z.object({
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative()
});

// Chat message data
export const ChatDataSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  content: z.string().min(1),
  attachments: z.array(FileAttachmentSchema).optional(),
  metadata: z.record(z.any()).optional()
});

// Tool message data
export const ToolDataSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  toolCall: ToolCallSchema
});

// Session message data
export const SessionDataSchema = z.object({
  userId: z.string().min(1),
  workingDirectory: z.string().optional(),
  credentials: z.record(z.any()).optional()
});

// Health check data
export const HealthDataSchema = z.object({
  service: z.string().min(1),
  timestamp: z.number().positive()
});

// WebSocket message types
export const ChatMessageSchema = BaseMessageSchema.extend({
  type: z.literal('chat.send'),
  data: ChatDataSchema
});

export const ToolCallMessageSchema = BaseMessageSchema.extend({
  type: z.literal('tool.call'),
  data: ToolDataSchema
});

export const MessageChunkSchema = BaseMessageSchema.extend({
  type: z.literal('message.chunk'),
  data: z.object({
    content: z.string(),
    isComplete: z.boolean().default(false),
    tokenUsage: TokenUsageSchema.optional()
  })
});

export const MessageAckSchema = BaseMessageSchema.extend({
  type: z.literal('message.ack'),
  data: z.object({
    originalMessageId: z.string().min(1),
    status: z.enum(['received', 'processed', 'stored', 'failed']),
    error: z.string().optional()
  })
});

// ACP message types
export const AcpMessageSchema = BaseMessageSchema.extend({
  type: z.enum(['chat.send', 'tool.execute', 'session.create', 'health.check']),
  data: z.union([ChatDataSchema, ToolDataSchema, SessionDataSchema, HealthDataSchema]),
  userId: z.string().min(1),
  sessionId: z.string().optional()
});

// MongoDB persistence schema
export const ConversationMessageSchema = z.object({
  messageId: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileType: z.string(),
    filePath: z.string(),
    contentHash: z.string()
  })).optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  metadata: z.object({
    correlationId: z.string(),
    tokenUsage: TokenUsageSchema.optional(),
    processingTime: z.number().optional(),
    version: z.string().default('1.0')
  }),
  timestamp: z.date()
});

// Type exports
export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type FileAttachment = z.infer<typeof FileAttachmentSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type ChatData = z.infer<typeof ChatDataSchema>;
export type ToolData = z.infer<typeof ToolDataSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type HealthData = z.infer<typeof HealthDataSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ToolCallMessage = z.infer<typeof ToolCallMessageSchema>;
export type MessageChunk = z.infer<typeof MessageChunkSchema>;
export type MessageAck = z.infer<typeof MessageAckSchema>;
export type AcpMessage = z.infer<typeof AcpMessageSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// Union types
export type WebSocketMessage = ChatMessage | ToolCallMessage | MessageChunk | MessageAck;
export type AnyMessage = WebSocketMessage | AcpMessage;
