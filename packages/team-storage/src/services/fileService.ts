// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NFS_BASE_PATH } from '../config/env.js';
import { FileEmbedding } from '../models/UnifiedModels.js';
import { backendLogger } from '@qwen-team/shared';

const logger = backendLogger.child({ service: 'fileService' });

export const fileService = {
  async listFiles(workspacePath: string) {
    const fullPath = path.join(NFS_BASE_PATH, workspacePath);
    try {
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      return files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(workspacePath, file.name)
      }));
    } catch (error) {
      logger.error('Failed to list files', { error: (error as Error).message, workspacePath });
      return [];
    }
  },

  async readFile(filePath: string) {
    const fullPath = path.join(NFS_BASE_PATH, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('Failed to read file', { error: (error as Error).message, filePath });
      throw error;
    }
  },

  async writeFile(filePath: string, content: string) {
    const fullPath = path.join(NFS_BASE_PATH, filePath);
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch (error) {
      logger.error('Failed to write file', { error: (error as Error).message, filePath });
      throw error;
    }
  },

  async saveFile(workspacePath: string, fileName: string, content: string, userId: string, teamId: string) {
    const filePath = path.join(workspacePath, fileName);
    await this.writeFile(filePath, content);
    
    return {
      path: filePath,
      name: fileName,
      hash: crypto.createHash('md5').update(content).digest('hex')
    };
  },

  async getFullPath(workspacePath: string, fileName?: string) {
    if (fileName) {
      return path.join(NFS_BASE_PATH, workspacePath, fileName);
    }
    return path.join(NFS_BASE_PATH, workspacePath);
  },

  async verifyAccess(filePath: string, userId: string) {
    // Basic access verification - in production this would be more sophisticated
    return true;
  },

  async deleteFile(filePath: string) {
    const fullPath = path.join(NFS_BASE_PATH, filePath);
    try {
      await fs.unlink(fullPath);
      // Also remove from embeddings
      const { FileEmbedding } = await import('../models/UnifiedModels.js');
      await FileEmbedding.deleteMany({ filePath });
      return true;
    } catch (error) {
      logger.error('Failed to delete file', { error: (error as Error).message, filePath });
      throw error;
    }
  },

  async searchFiles(query: string, workspaceType: string, userId: string, teamId?: string, limit: number = 10) {
    try {
      const searchQuery: any = {
        $text: { $search: query },
        workspaceType,
        ownerId: userId
      };
      
      if (teamId) {
        searchQuery.teamId = teamId;
      }
      
      const results = await FileEmbedding.find(searchQuery, {
        score: { $meta: "textScore" }
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit);
      
      return results;
    } catch (error) {
      logger.error('Failed to search files', { error: (error as Error).message });
      return [];
    }
  }
};
