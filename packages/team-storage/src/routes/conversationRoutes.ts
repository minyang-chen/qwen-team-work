// @ts-nocheck
import { Router } from 'express';
import { createNewConversation, getConversationList, switchConversation, renameConversation, deleteConversation, searchConversations } from '../controllers/conversationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { Session } from '../models/UnifiedModels.js';

const router = Router();

router.use(authenticate);

router.post('/new', createNewConversation);
router.get('/list', getConversationList);
router.get('/search', searchConversations);
router.get('/:sessionId', switchConversation);
router.put('/:sessionId/rename', renameConversation);
router.delete('/:sessionId', deleteConversation);

// Auto-save conversation
router.post('/:sessionId/save', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages } = req.body;
    
    await Session.updateOne(
      { sessionId },
      { 
        $set: { 
          conversationHistory: messages,
          lastActivity: new Date()
        }
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save conversation error:', error);
    res.status(500).json({ message: 'Failed to save conversation' });
  }
});

export default router;
