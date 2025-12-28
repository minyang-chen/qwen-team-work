// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import { NFS_BASE_PATH } from '../config/env';

export const nfsService = {
  async createPrivateWorkspace(userId: string) {
    const workspacePath = path.join(NFS_BASE_PATH, 'users', userId);
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      return workspacePath;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  },

  async createTeamWorkspace(teamId: string) {
    const workspacePath = path.join(NFS_BASE_PATH, 'teams', teamId);
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      return workspacePath;
    } catch (error) {
      console.error('Error creating team workspace:', error);
      throw error;
    }
  }
};
