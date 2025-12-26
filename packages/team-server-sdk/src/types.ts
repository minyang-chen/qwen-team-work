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

export interface ServerConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  sessionId?: string;
  workingDirectory?: string;
  approvalMode?: 'yolo' | 'default';
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
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
  type: 'content' | 'tool' | 'finished';
  text?: string;
  toolName?: string;
}
