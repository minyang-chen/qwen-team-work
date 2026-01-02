export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
}

export interface EnhancedServerConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  sessionId?: string;
  workingDirectory?: string;
  approvalMode?: 'yolo' | 'default';
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
  enableSandbox?: boolean;
  // Enhanced features
  teamId?: string;
  projectId?: string;
  mcpServers?: any;
  toolPreferences?: any;
  collaborationMode?: 'individual' | 'shared' | 'review';
}

export interface EnhancedQueryResult {
  text: string;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  toolResults?: any[];
  sessionContext?: any;
}

export interface EnhancedStreamChunk {
  type: 'content' | 'tool' | 'tool_result' | 'error' | 'finished';
  text?: string;
  toolName?: string;
  result?: string;
  error?: string;
}

export interface QueryResult {
  text: string;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface StreamChunk {
  type: 'content' | 'tool' | 'tool_result' | 'error' | 'finished';
  text?: string;
  toolName?: string;
  result?: string;
}
