export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface SessionMetadata {
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  compressionCount: number;
  deviceId?: string;
  userAgent?: string;
}

export interface MessageMetadata {
  correlationId: string;
  timestamp: Date;
  version: string;
  tokenUsage?: TokenUsage;
  processingTime?: number;
  model?: string;
}

export interface FileAttachment {
  fileName: string;
  fileType: string;
  filePath: string;
  contentHash: string;
  fileSize: number;
}

export interface ToolCall {
  callId: string;
  name: string;
  args: any;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface ConversationMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: FileAttachment[];
  toolCalls?: ToolCall[];
  metadata: MessageMetadata;
  timestamp: Date;
}

export interface EnhancedSessionData {
  sessionId: string;
  userId: string;
  conversationHistory: ConversationMessage[];
  tokenUsage: TokenUsage;
  metadata: SessionMetadata;
  workspaceDir?: string;
  client?: any;
  config?: any;
}
