// @ts-nocheck
import { mongoService } from './mongoService';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export const notificationService = {
  async sendBroadcast(teamId: string, message: string, sender: string, messageType: string) {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    
    try {
      const notification = {
        message,
        sender,
        message_type: messageType,
        created_at: new Date(),
        team_id: teamId,
        replies: []
      };
      
      const result = await db.collection('notifications').insertOne(notification);
      return { ...notification, _id: result.insertedId };
    } finally {
      await client.close();
    }
  },

  async getNotifications(teamId: string, limit: number = 10) {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    
    try {
      const notifications = await db.collection('notifications')
        .find()
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
      
      return notifications;
    } finally {
      await client.close();
    }
  },

  async addReply(teamId: string, notificationId: string, message: string, sender: string) {
    const { client, db } = await mongoService.getTeamDatabase(teamId);
    
    try {
      const reply = {
        message,
        sender,
        created_at: new Date()
      };
      
      await db.collection('notifications').updateOne(
        { _id: new ObjectId(notificationId) },
        { $push: { replies: reply } } as any
      );
      
      return reply;
    } finally {
      await client.close();
    }
  }
};
