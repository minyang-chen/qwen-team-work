import { Request, Response } from "express";
import { Session } from '../models/UnifiedModels.js';
import mongoose from 'mongoose';

export const createNewConversation = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };

export const getConversationList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 100;
    
    console.log('[CONVERSATION LIST] userId:', userId);
    
    const sessions = await Session.find({ 
      userId: new mongoose.Types.ObjectId(userId), 
      status: { $ne: 'saved' } 
    })
      .sort({ lastActivity: -1 })
      .limit(limit)
      .select('sessionId createdAt lastActivity conversationHistory metadata');
    
    console.log('[CONVERSATION LIST] Found', sessions.length, 'sessions');
    
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

export const switchConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId, userId });
    
    if (!session) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    res.json({
      sessionId: session.sessionId,
      messages: session.conversationHistory || [],
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      name: session.metadata?.name || `Chat ${new Date(session.createdAt).toLocaleDateString()}`
    });
  } catch (error) {
    console.error('Switch conversation error:', error);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
};

export const renameConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    console.log('[RENAME] Renaming conversation:', sessionId, 'to:', name);

    // Update session name in MongoDB
    // Note: Session schema doesn't have a 'name' field, so we'll add it to metadata
    const result = await Session.updateOne(
      { 
        sessionId,
        $or: [
          { userId: userId },
          { userId: new mongoose.Types.ObjectId(userId) }
        ]
      },
      { 
        $set: { 
          'metadata.name': name,
          lastActivity: new Date()
        }
      }
    );

    console.log('[RENAME] Update result:', result);

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, message: 'Conversation renamed' });
  } catch (error) {
    console.error('Rename conversation error:', error);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
};

export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.userId;

    console.log('[DELETE] Request params:', { sessionId, userId, user: (req as any).user });

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // First, check if session exists
    const session = await Session.findOne({ sessionId });
    console.log('[DELETE] Found session:', session ? { sessionId: session.sessionId, userId: session.userId } : 'not found');

    // Delete session from MongoDB - try both userId formats
    const result = await Session.deleteOne({ 
      sessionId,
      $or: [
        { userId: userId },
        { userId: new mongoose.Types.ObjectId(userId) }
      ]
    });

    console.log('[DELETE] MongoDB result:', result);

    if (result.deletedCount === 0) {
      // Try deleting without userId check (for orphaned sessions)
      const fallbackResult = await Session.deleteOne({ sessionId });
      console.log('[DELETE] Fallback delete result:', fallbackResult);
      
      if (fallbackResult.deletedCount === 0) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

export const searchConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const query = (req.query.q || req.query.query) as string;

    if (!query || !query.trim()) {
      res.json({ conversations: [] });
      return;
    }

    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    console.log('[SEARCH] Searching for:', query, 'escaped:', escapedQuery, 'userId:', userId);

    // Search in message content using MongoDB regex
    const sessions = await Session.find({
      $and: [
        {
          $or: [
            { userId: userId },
            { userId: new mongoose.Types.ObjectId(userId) }
          ]
        },
        {
          // Search in message content
          'conversationHistory.content': { $regex: escapedQuery, $options: 'i' }
        }
      ]
    })
    .sort({ lastActivity: -1 })
    .limit(50)
    .lean();

    console.log('[SEARCH] Found sessions:', sessions.length);

    const conversations = sessions.map(session => {
      const firstMessage = session.conversationHistory?.[0]?.content || '';
      const customName = (session.metadata as any)?.name;
      const defaultName = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
      
      return {
        sessionId: session.sessionId,
        name: customName || defaultName || 'Untitled Conversation',
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        messageCount: session.conversationHistory?.length || 0,
        preview: firstMessage.substring(0, 100) || ''
      };
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
};
