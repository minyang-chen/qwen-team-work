// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getChatHistory, sendMessage } from '../controllers/chatController.js';

const router = Router();

// Chat routes
router.get('/history/:sessionId', authenticate, getChatHistory);
router.post('/message', authenticate, sendMessage);

export default router;
