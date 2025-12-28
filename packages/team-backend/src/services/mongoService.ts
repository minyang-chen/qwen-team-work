// @ts-nocheck
import mongoose from 'mongoose';

export const mongoService = {
  async createUserDatabase(userId: string) {
    // In MongoDB, we don't create separate databases per user
    // Instead, we use collections with user-specific data
    const dbName = `user_${userId}`;
    return dbName;
  },

  async createTeamDatabase(teamId: string) {
    const dbName = `team_${teamId}`;
    return dbName;
  },

  async getUserDatabase(userId: string) {
    const { getMongoClient } = await import('../config/database');
    const client = await getMongoClient();
    const dbName = `user_${userId}`;
    const db = client.db(dbName);
    
    return { client, db };
  },

  async getTeamDatabase(teamId: string) {
    const { getMongoClient } = await import('../config/database');
    const client = await getMongoClient();
    const dbName = `team_${teamId}`;
    const db = client.db(dbName);
    
    return { client, db };
  }
};
