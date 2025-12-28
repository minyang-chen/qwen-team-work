export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  service: string;
  correlationId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private service: string;
  private logLevel: LogLevel;

  constructor(service: string, logLevel: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.logLevel = logLevel;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      context,
      correlationId: context?.correlationId
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // Output to console with structured format
    const levelName = LogLevel[level];
    const output = JSON.stringify(entry);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${levelName}] ${output}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${levelName}] ${output}`);
        break;
      default:
        console.log(`[${levelName}] ${output}`);
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.service, this.logLevel);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      const mergedContext = { ...additionalContext, ...context };
      originalLog(level, message, mergedContext, error);
    };
    
    return childLogger;
  }
}

// Factory function for creating service loggers
export function createLogger(service: string): Logger {
  const logLevel = process.env.LOG_LEVEL ? 
    LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] : 
    LogLevel.INFO;
  
  return new Logger(service, logLevel);
}

// Default logger instances
export const backendLogger = createLogger('team-backend');
export const uiServerLogger = createLogger('team-ui-server');
export const coreAgentLogger = createLogger('team-core-agent');
export const sharedLogger = createLogger('shared');
