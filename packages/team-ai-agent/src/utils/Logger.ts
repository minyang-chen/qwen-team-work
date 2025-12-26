export class Logger {
  static info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }
}
