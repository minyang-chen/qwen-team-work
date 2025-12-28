// Core ACP message protocol types
export interface AcpMessage {
  id: string;           // Unique message identifier (UUID/nanoid)
  type: string;         // Message type (e.g., "chat.send", "session.create")
  payload: any;         // Message-specific data
  data?: any;           // Alias for payload for backward compatibility
  timestamp: number;    // Unix timestamp in milliseconds
  version?: string;     // Protocol version (default: "1.0")
  source?: string;      // Sender identifier
  target?: string;      // Recipient identifier (optional)
  correlation?: string; // For linking related messages
}

export interface AcpResponse {
  id: string;           // Same as request ID
  success: boolean;     // Operation success status
  data?: any;          // Response payload (if successful)
  error?: AcpError;    // Error details (if failed)
  timestamp: number;    // Response timestamp
  duration?: number;    // Processing time in milliseconds
}

export interface AcpError {
  code: string;         // Error code (e.g., "INVALID_SESSION")
  message: string;      // Human-readable error message
  details?: any;        // Additional error context
}

// Message Types
export type MessageType = 
  | 'agent.discover'
  | 'agent.announce'
  | 'session.create'
  | 'session.destroy'
  | 'session.recover'
  | 'session.extend'
  | 'session.getStats'
  | 'session.updateTokens'
  | 'chat.send'
  | 'chat.stream'
  | 'tools.execute'
  | 'config.get'
  | 'config.update'
  | 'workspace.get'
  | 'health.check'
  | 'health.ok';

// Agent Discovery Types
export interface AgentConfig {
  id: string;
  endpoint: string;
  capabilities: string[];
  priority: number;
  healthCheck: string;
  metadata: {
    name: string;
    version: string;
    models?: string[];
    maxSessions?: number;
  };
}

export interface DiscoveredAgent {
  agentId: string;
  endpoint: string;
  capabilities: string[];
  metadata: {
    name: string;
    version: string;
    models?: string[];
    maxSessions?: number;
  };
  lastSeen: number;
}

// Connection and Session Types
export interface ConnectOptions {
  userId?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

export interface ClientSession {
  id: string;
  agentUrl: string;
  userId?: string;
  capabilities: string[];
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: { input: number; output: number; total: number };
  metadata: Record<string, any>;
}

export interface ServerSession {
  id: string;
  clientId: string;
  userId?: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  tokenUsage: { input: number; output: number; total: number };
  context: {
    conversationHistory: ChatMessage[];
    systemPrompt?: string;
    preferences?: SessionPreferences;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
  };
  state: 'active' | 'idle' | 'terminated';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenUsage?: { input: number; output: number };
}

export interface SessionPreferences {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

// Execution and Tool Types
export interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  resourceUsage?: {
    memory: number;
    cpu: number;
  };
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

// User Credentials
export interface UserCredentials {
  type?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accessToken?: string;
  refreshToken?: string;
}
