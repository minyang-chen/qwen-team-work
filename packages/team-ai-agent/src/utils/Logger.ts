export class Logger {
  static info(message: string, ...args: any[]): void {
    console.info({
      service: 'team-ai-agent',
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...args
    });
  }

  static error(message: string, error?: any): void {
    console.error({
      service: 'team-ai-agent',
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error?.message || error
    });
  }
}
