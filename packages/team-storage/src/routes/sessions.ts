import { Router } from 'express';
import { Session } from '../models/UnifiedModels.js';

const router = Router();

// Save session
router.post('/save', async (req, res) => {
  try {
    const { userId, name, conversationHistory, artifacts } = req.body;
    
    if (!userId || !name) {
      res.status(400).json({ message: 'userId and name are required' });
      return;
    }

    // Check if session with same name exists
    const existing = await Session.findOne({ userId, 'metadata.name': name });
    if (existing) {
      res.status(409).json({ message: `Session "${name}" already exists. Use /delete_session first.` });
      return;
    }

    const session = new Session({
      sessionId: `saved-${userId}-${name}-${Date.now()}`,
      userId,
      status: 'saved',
      workspacePath: '',
      conversationHistory: conversationHistory || [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      metadata: { name, artifacts: artifacts || [] },
      createdAt: new Date(),
      lastActivity: new Date()
    });

    await session.save();
    res.json({ message: 'Session saved successfully', sessionId: session.sessionId });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ message: 'Failed to save session' });
  }
});

// Load session
router.get('/load/:userId/:name', async (req, res) => {
  try {
    const { userId, name } = req.params;
    
    const session = await Session.findOne({ userId, 'metadata.name': name, status: 'saved' });
    if (!session) {
      res.status(404).json({ message: `Session "${name}" not found` });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Load session error:', error);
    res.status(500).json({ message: 'Failed to load session' });
  }
});

// List sessions
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sessions = await Session.find({ userId, status: 'saved' })
      .select('metadata.name conversationHistory lastActivity createdAt')
      .sort({ lastActivity: -1 });

    const formatted = sessions.map(s => ({
      name: s.metadata?.name || 'Unnamed',
      conversationHistory: s.conversationHistory,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt
    }));

    res.json(formatted);
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ message: 'Failed to list sessions' });
  }
});

// Delete session
router.delete('/delete/:userId/:name', async (req, res) => {
  try {
    const { userId, name } = req.params;
    
    const result = await Session.deleteOne({ userId, 'metadata.name': name, status: 'saved' });
    
    if (result.deletedCount === 0) {
      res.status(404).json({ message: `Session "${name}" not found` });
      return;
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: 'Failed to delete session' });
  }
});

export default router;
