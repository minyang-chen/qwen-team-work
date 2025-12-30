const formatTimestamp = () => new Date().toISOString();

export const backendLogger = {
  child: (meta: any) => ({
    info: (...args: any[]) => console.log(`[${formatTimestamp()}] [INFO]`, ...args),
    error: (...args: any[]) => console.error(`[${formatTimestamp()}] [ERROR]`, ...args),
    warn: (...args: any[]) => console.warn(`[${formatTimestamp()}] [WARN]`, ...args),
    debug: (...args: any[]) => console.debug(`[${formatTimestamp()}] [DEBUG]`, ...args),
    child: (childMeta: any) => backendLogger.child({ ...meta, ...childMeta }),
  }),
  info: (...args: any[]) => console.log(`[${formatTimestamp()}] [INFO]`, ...args),
  error: (...args: any[]) => console.error(`[${formatTimestamp()}] [ERROR]`, ...args),
  warn: (...args: any[]) => console.warn(`[${formatTimestamp()}] [WARN]`, ...args),
  debug: (...args: any[]) => console.debug(`[${formatTimestamp()}] [DEBUG]`, ...args),
};

export const uiServerLogger = backendLogger;
