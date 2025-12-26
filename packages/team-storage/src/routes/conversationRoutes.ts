// @ts-nocheck
import { Router } from 'express';
import { createNewConversation, getConversationList, switchConversation, renameConversation, deleteConversation, searchConversations } from '../controllers/conversationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/new', createNewConversation);
router.get('/list', getConversationList);
router.get('/search', searchConversations);
router.get('/:sessionId', switchConversation);
router.put('/:sessionId/rename', renameConversation);
router.delete('/:sessionId', deleteConversation);

export default router;
