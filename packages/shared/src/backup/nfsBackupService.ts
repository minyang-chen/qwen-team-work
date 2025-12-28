import { promises as fs } from 'fs';
import path from 'path';

export interface ConversationMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata: {
    correlationId: string;
    timestamp: Date;
    version: string;
  };
}

export class NFSBackupService {
  private readonly backupPath: string;

  constructor() {
    this.backupPath = process.env.NFS_BASE_PATH || '/nfs-data/backups';
  }

  async backupSession(sessionId: string, conversationHistory: ConversationMessage[]): Promise<void> {
    const backupDir = path.join(this.backupPath, 'sessions');
    await fs.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `${sessionId}.json`);
    const backupData = {
      sessionId,
      conversationHistory,
      backupDate: new Date().toISOString(),
      messageCount: conversationHistory.length
    };

    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
  }

  async restoreSession(sessionId: string): Promise<ConversationMessage[]> {
    const backupFile = path.join(this.backupPath, 'sessions', `${sessionId}.json`);
    
    try {
      const data = await fs.readFile(backupFile, 'utf-8');
      const backup = JSON.parse(data);
      return backup.conversationHistory || [];
    } catch (error) {
      return [];
    }
  }

  async exportConversation(sessionId: string, format: 'json' | 'txt' = 'json'): Promise<string> {
    const exportDir = path.join(this.backupPath, 'exports');
    await fs.mkdir(exportDir, { recursive: true });

    const conversation = await this.restoreSession(sessionId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = path.join(exportDir, `${sessionId}_${timestamp}.${format}`);

    if (format === 'txt') {
      const text = conversation.map(msg => 
        `[${msg.metadata.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      await fs.writeFile(exportFile, text);
    } else {
      const exportData = {
        sessionId,
        exportDate: new Date().toISOString(),
        messageCount: conversation.length,
        conversation
      };
      await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));
    }

    return exportFile;
  }

  async importConversation(filePath: string): Promise<ConversationMessage[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const imported = JSON.parse(data);
      
      // Handle both direct conversation arrays and export format
      return imported.conversation || imported;
    } catch (error) {
      throw new Error(`Failed to import conversation: ${error}`);
    }
  }

  async schedulePeriodicBackup(sessionId: string, intervalMs: number = 300000): Promise<NodeJS.Timeout> {
    return setInterval(async () => {
      try {
        // This would be called with actual session data
        console.log(`Periodic backup for session ${sessionId}`);
      } catch (error) {
        console.error('Backup failed:', error);
      }
    }, intervalMs);
  }
}
