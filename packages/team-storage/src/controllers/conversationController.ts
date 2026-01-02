import { Request, Response } from "express";
import { Session } from '../models/UnifiedModels.js';

export const createNewConversation = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };

export const getConversationList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const sessions = await Session.find({ userId, status: { $ne: 'saved' } })
      .sort({ lastActivity: -1 })
      .limit(limit)
      .select('sessionId createdAt lastActivity conversationHistory metadata');
    
    const conversations = sessions.map(s => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      messageCount: s.conversationHistory?.length || 0,
      name: s.metadata?.name || `Chat ${new Date(s.createdAt).toLocaleDateString()}`,
      preview: s.conversationHistory?.[s.conversationHistory.length - 1]?.content?.substring(0, 50) || 'New conversation'
    }));
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversation list error:', error);
    res.status(500).json({ conversations: [] });
  }
};

export const switchConversation = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const renameConversation = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const deleteConversation = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const searchConversations = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
