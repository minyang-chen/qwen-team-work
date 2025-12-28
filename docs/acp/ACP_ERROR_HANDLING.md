# ACP Error Handling & Validation Implementation

## Overview

Comprehensive error handling and message validation system for the ACP protocol, ensuring robust communication and proper error reporting across all components.

## Error Code System

### **Error Categories**
```typescript
enum ErrorCategory {
  MESSAGE = 'MESSAGE',
  SESSION = 'SESSION', 
  PROCESSING = 'PROCESSING',
  SYSTEM = 'SYSTEM',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTH',
  RESOURCE = 'RESOURCE'
}

const ERROR_CODES = {
  // Message Errors (1000-1099)
  MESSAGE_PARSE_ERROR: 'MSG_1001',
  INVALID_MESSAGE_FORMAT: 'MSG_1002',
  UNKNOWN_MESSAGE_TYPE: 'MSG_1003',
  MESSAGE_TOO_LARGE: 'MSG_1004',
  INVALID_MESSAGE_ID: 'MSG_1005',
  
  // Session Errors (2000-2099)
  SESSION_NOT_FOUND: 'SES_2001',
  SESSION_CREATION_FAILED: 'SES_2002',
  SESSION_LIMIT_EXCEEDED: 'SES_2003',
  SESSION_EXPIRED: 'SES_2004',
  SESSION_ALREADY_EXISTS: 'SES_2005',
  INVALID_SESSION_STATE: 'SES_2006',
  
  // Processing Errors (3000-3099)
  CHAT_PROCESSING_ERROR: 'PRO_3001',
  CODE_EXECUTION_ERROR: 'PRO_3002',
  STREAM_ERROR: 'PRO_3003',
  TIMEOUT_ERROR: 'PRO_3004',
  PROCESSING_INTERRUPTED: 'PRO_3005',
  
  // System Errors (4000-4099)
  INTERNAL_ERROR: 'SYS_4001',
  RESOURCE_EXHAUSTED: 'SYS_4002',
  SERVICE_UNAVAILABLE: 'SYS_4003',
  DATABASE_ERROR: 'SYS_4004',
  NETWORK_ERROR: 'SYS_4005',
  
  // Validation Errors (5000-5099)
  INVALID_PAYLOAD: 'VAL_5001',
  MISSING_REQUIRED_FIELD: 'VAL_5002',
  INVALID_FIELD_TYPE: 'VAL_5003',
  FIELD_OUT_OF_RANGE: 'VAL_5004',
  INVALID_ENUM_VALUE: 'VAL_5005',
  
  // Authentication Errors (6000-6099)
  AUTHENTICATION_FAILED: 'AUTH_6001',
  AUTHORIZATION_DENIED: 'AUTH_6002',
  INVALID_TOKEN: 'AUTH_6003',
  TOKEN_EXPIRED: 'AUTH_6004',
  INSUFFICIENT_PERMISSIONS: 'AUTH_6005',
  
  // Resource Errors (7000-7099)
  WORKSPACE_NOT_FOUND: 'RES_7001',
  WORKSPACE_ACCESS_DENIED: 'RES_7002',
  STORAGE_FULL: 'RES_7003',
  FILE_NOT_FOUND: 'RES_7004',
  MEMORY_LIMIT_EXCEEDED: 'RES_7005'
};
```

## Message Validation System

### **1. `packages/shared/src/validation/MessageValidator.ts`**
```typescript
import { AcpMessage } from '../types/AcpTypes';

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

interface MessageSchema {
  type: string;
  requiredFields: string[];
  optionalFields?: string[];
  payloadSchema?: any;
}

export class MessageValidator {
  private schemas = new Map<string, MessageSchema>();

  constructor() {
    this.initializeSchemas();
  }

  validate(message: AcpMessage): ValidationResult {
    // Basic structure validation
    const basicValidation = this.validateBasicStructure(message);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // Message type validation
    const typeValidation = this.validateMessageType(message);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Payload validation
    const payloadValidation = this.validatePayload(message);
    if (!payloadValidation.valid) {
      return payloadValidation;
    }

    return { valid: true };
  }

  private validateBasicStructure(message: any): ValidationResult {
    if (!message || typeof message !== 'object') {
      return {
        valid: false,
        error: 'Message must be an object',
        details: { code: 'INVALID_MESSAGE_FORMAT' }
      };
    }

    const requiredFields = ['id', 'type', 'payload', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in message)) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
          details: { code: 'MISSING_REQUIRED_FIELD', field }
        };
      }
    }

    // Validate field types
    if (typeof message.id !== 'string' || message.id.length === 0) {
      return {
        valid: false,
        error: 'Message ID must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'id' }
      };
    }

    if (typeof message.type !== 'string' || message.type.length === 0) {
      return {
        valid: false,
        error: 'Message type must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'type' }
      };
    }

    if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
      return {
        valid: false,
        error: 'Timestamp must be a positive number',
        details: { code: 'INVALID_FIELD_TYPE', field: 'timestamp' }
      };
    }

    return { valid: true };
  }

  private validateMessageType(message: AcpMessage): ValidationResult {
    const schema = this.schemas.get(message.type);
    if (!schema) {
      return {
        valid: false,
        error: `Unknown message type: ${message.type}`,
        details: { code: 'UNKNOWN_MESSAGE_TYPE', type: message.type }
      };
    }

    return { valid: true };
  }

  private validatePayload(message: AcpMessage): ValidationResult {
    const schema = this.schemas.get(message.type);
    if (!schema) return { valid: true };

    if (!message.payload || typeof message.payload !== 'object') {
      return {
        valid: false,
        error: 'Payload must be an object',
        details: { code: 'INVALID_PAYLOAD' }
      };
    }

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!(field in message.payload)) {
        return {
          valid: false,
          error: `Missing required payload field: ${field}`,
          details: { code: 'MISSING_REQUIRED_FIELD', field }
        };
      }
    }

    // Validate specific message types
    return this.validateSpecificPayload(message.type, message.payload);
  }

  private validateSpecificPayload(type: string, payload: any): ValidationResult {
    switch (type) {
      case 'session.create':
        return this.validateSessionCreatePayload(payload);
      case 'chat.send':
        return this.validateChatSendPayload(payload);
      case 'code.execute':
        return this.validateCodeExecutePayload(payload);
      default:
        return { valid: true };
    }
  }

  private validateSessionCreatePayload(payload: any): ValidationResult {
    if (!payload.userId || typeof payload.userId !== 'string') {
      return {
        valid: false,
        error: 'userId must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'userId' }
      };
    }

    if (payload.preferences && typeof payload.preferences !== 'object') {
      return {
        valid: false,
        error: 'preferences must be an object',
        details: { code: 'INVALID_FIELD_TYPE', field: 'preferences' }
      };
    }

    return { valid: true };
  }

  private validateChatSendPayload(payload: any): ValidationResult {
    if (!payload.sessionId || typeof payload.sessionId !== 'string') {
      return {
        valid: false,
        error: 'sessionId must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'sessionId' }
      };
    }

    if (!payload.content || typeof payload.content !== 'string') {
      return {
        valid: false,
        error: 'content must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'content' }
      };
    }

    if (payload.content.length > 100000) { // 100KB limit
      return {
        valid: false,
        error: 'content exceeds maximum length',
        details: { code: 'FIELD_OUT_OF_RANGE', field: 'content', max: 100000 }
      };
    }

    return { valid: true };
  }

  private validateCodeExecutePayload(payload: any): ValidationResult {
    const validLanguages = ['python', 'javascript', 'bash', 'sql', 'typescript'];
    
    if (!payload.language || !validLanguages.includes(payload.language)) {
      return {
        valid: false,
        error: `Invalid language. Must be one of: ${validLanguages.join(', ')}`,
        details: { code: 'INVALID_ENUM_VALUE', field: 'language', validValues: validLanguages }
      };
    }

    if (!payload.code || typeof payload.code !== 'string') {
      return {
        valid: false,
        error: 'code must be a non-empty string',
        details: { code: 'INVALID_FIELD_TYPE', field: 'code' }
      };
    }

    return { valid: true };
  }

  private initializeSchemas(): void {
    this.schemas.set('session.create', {
      type: 'session.create',
      requiredFields: ['userId'],
      optionalFields: ['preferences', 'metadata']
    });

    this.schemas.set('session.destroy', {
      type: 'session.destroy',
      requiredFields: ['sessionId']
    });

    this.schemas.set('chat.send', {
      type: 'chat.send',
      requiredFields: ['sessionId', 'content'],
      optionalFields: ['options']
    });

    this.schemas.set('code.execute', {
      type: 'code.execute',
      requiredFields: ['sessionId', 'code', 'language'],
      optionalFields: ['options']
    });

    // Add more schemas as needed
  }
}
```

### **2. Enhanced Error Handler**

#### **`packages/qwen-core-agent/src/protocol/ErrorHandler.ts`**
```typescript
import { AcpResponse, AcpError } from '@qwen-code/shared';
import { Logger } from '../utils/Logger';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  messageType?: string;
  timestamp: number;
  requestId?: string;
}

export class ErrorHandler {
  private logger: Logger;
  private errorStats = new Map<string, number>();

  constructor() {
    this.logger = new Logger('ErrorHandler');
  }

  createErrorResponse(
    messageId: string,
    code: string,
    message?: string,
    details?: any,
    context?: ErrorContext
  ): AcpResponse {
    // Track error statistics
    this.errorStats.set(code, (this.errorStats.get(code) || 0) + 1);

    const error: AcpError = {
      code,
      message: message || this.getDefaultMessage(code),
      details: this.sanitizeDetails(details)
    };

    // Log error with context
    this.logError(code, error, context);

    return {
      id: messageId,
      success: false,
      error,
      timestamp: Date.now()
    };
  }

  createValidationErrorResponse(
    messageId: string,
    validationResult: any
  ): AcpResponse {
    return this.createErrorResponse(
      messageId,
      validationResult.details?.code || 'VALIDATION_ERROR',
      validationResult.error,
      validationResult.details
    );
  }

  private getDefaultMessage(code: string): string {
    const messages: Record<string, string> = {
      // Message errors
      'MSG_1001': 'Failed to parse message',
      'MSG_1002': 'Invalid message format',
      'MSG_1003': 'Unknown message type',
      'MSG_1004': 'Message too large',
      'MSG_1005': 'Invalid message ID',

      // Session errors
      'SES_2001': 'Session not found',
      'SES_2002': 'Failed to create session',
      'SES_2003': 'Maximum sessions exceeded',
      'SES_2004': 'Session expired',
      'SES_2005': 'Session already exists',
      'SES_2006': 'Invalid session state',

      // Processing errors
      'PRO_3001': 'Chat processing failed',
      'PRO_3002': 'Code execution failed',
      'PRO_3003': 'Streaming error',
      'PRO_3004': 'Operation timed out',
      'PRO_3005': 'Processing interrupted',

      // System errors
      'SYS_4001': 'Internal server error',
      'SYS_4002': 'System resources exhausted',
      'SYS_4003': 'Service unavailable',
      'SYS_4004': 'Database error',
      'SYS_4005': 'Network error',

      // Validation errors
      'VAL_5001': 'Invalid payload',
      'VAL_5002': 'Missing required field',
      'VAL_5003': 'Invalid field type',
      'VAL_5004': 'Field value out of range',
      'VAL_5005': 'Invalid enum value',

      // Authentication errors
      'AUTH_6001': 'Authentication failed',
      'AUTH_6002': 'Authorization denied',
      'AUTH_6003': 'Invalid token',
      'AUTH_6004': 'Token expired',
      'AUTH_6005': 'Insufficient permissions',

      // Resource errors
      'RES_7001': 'Workspace not found',
      'RES_7002': 'Workspace access denied',
      'RES_7003': 'Storage full',
      'RES_7004': 'File not found',
      'RES_7005': 'Memory limit exceeded'
    };

    return messages[code] || 'Unknown error';
  }

  private sanitizeDetails(details: any): any {
    if (!details) return undefined;

    if (details instanceof Error) {
      return {
        name: details.name,
        message: details.message,
        stack: process.env.NODE_ENV === 'development' ? details.stack : undefined
      };
    }

    // Remove sensitive information
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private logError(code: string, error: AcpError, context?: ErrorContext): void {
    const logData = {
      code,
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    };

    // Log based on error severity
    if (code.startsWith('SYS_') || code.startsWith('PRO_')) {
      this.logger.error('ACP Error:', logData);
    } else if (code.startsWith('VAL_') || code.startsWith('MSG_')) {
      this.logger.warn('ACP Validation Error:', logData);
    } else {
      this.logger.info('ACP Error:', logData);
    }
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorStats);
  }

  clearErrorStats(): void {
    this.errorStats.clear();
  }
}
```

### **3. Rate Limiting & Security**

#### **`packages/qwen-core-agent/src/middleware/RateLimiter.ts`**
```typescript
import WebSocket from 'ws';
import { AcpMessage } from '@qwen-code/shared';
import { ErrorHandler } from '../protocol/ErrorHandler';

interface RateLimit {
  requests: number;
  windowStart: number;
  blocked: boolean;
}

export class RateLimiter {
  private clientLimits = new Map<WebSocket, RateLimit>();
  private errorHandler: ErrorHandler;
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {
    this.errorHandler = new ErrorHandler();
  }

  checkLimit(client: WebSocket, message: AcpMessage): boolean {
    const now = Date.now();
    let limit = this.clientLimits.get(client);

    if (!limit || now - limit.windowStart > this.windowMs) {
      // New window
      limit = {
        requests: 1,
        windowStart: now,
        blocked: false
      };
      this.clientLimits.set(client, limit);
      return true;
    }

    limit.requests++;

    if (limit.requests > this.maxRequests) {
      limit.blocked = true;
      return false;
    }

    return true;
  }

  isBlocked(client: WebSocket): boolean {
    const limit = this.clientLimits.get(client);
    return limit?.blocked || false;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [client, limit] of this.clientLimits) {
      if (now - limit.windowStart > this.windowMs * 2) {
        this.clientLimits.delete(client);
      }
    }
  }
}
```

### **4. Input Sanitization**

#### **`packages/shared/src/utils/InputSanitizer.ts`**
```typescript
export class InputSanitizer {
  static sanitizeString(input: string, maxLength: number = 10000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  static sanitizeCode(code: string): string {
    // Remove potentially dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /:\(\)\{.*\}/, // Fork bomb
      /eval\s*\(/, // eval()
      /exec\s*\(/, // exec()
    ];

    let sanitized = code;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Code contains potentially dangerous patterns');
      }
    }

    return this.sanitizeString(sanitized, 50000); // 50KB limit
  }

  static sanitizeFilePath(path: string): string {
    // Remove directory traversal attempts
    let sanitized = path.replace(/\.\./g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Ensure it's within allowed directories
    if (!sanitized.startsWith('/tmp/qwen-workspace-') && 
        !sanitized.startsWith('/nfs/private/')) {
      throw new Error('Invalid file path');
    }

    return sanitized;
  }
}
```

## Error Recovery Strategies

### **1. Automatic Retry Logic**
```typescript
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
      }
    }
    
    throw lastError!;
  }
}
```

### **2. Circuit Breaker Pattern**
```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

This comprehensive error handling system provides robust validation, detailed error reporting, and recovery mechanisms for the ACP protocol implementation.
