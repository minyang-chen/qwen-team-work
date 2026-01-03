import type { RequestHandler } from 'express';
import { Router } from 'express';
import mongoose from 'mongoose';
import { signup, login } from '../controllers/authController.js';
import {
  createTeam,
  joinTeam,
  teamSignin,
  searchTeams,
  getUserTeams,
  deleteTeam,
  updateTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberStatus,
} from '../controllers/teamController.js';
import {
  listTeams,
  selectTeam,
  getActiveTeam,
} from '../controllers/teamSelectionController.js';
import {
  sendMessage,
  getChatHistory,
} from '../controllers/chatController.js';
import sessionRoutes from './sessions.js';
import attachmentRoutes from './attachments.js';
import { Session } from '../models/UnifiedModels.js';
import {
  createNewConversation,
  getConversationList,
  switchConversation,
  renameConversation,
  deleteConversation,
  searchConversations,
  addContext,
  removeContext,
  getContexts,
  addSkill,
  removeSkill,
  editSkill,
  getSkills,
} from '../controllers/conversationController.js';
import {
  listFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  searchFiles,
} from '../controllers/fileController.js';
import {
  getProfile,
  updateProfile,
  regenerateApiKey,
} from '../controllers/userController.js';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../controllers/todoController.js';
import {
  sendBroadcast,
  getNotifications,
  replyToNotification,
} from '../controllers/notificationController.js';
import { projectController } from '../controllers/projectController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { healthMonitor } from '../utils/healthCheck.js';
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } from '../config/env.js';

const router = Router();

// Auth routes
router.post('/api/auth/signup', signup);
router.post('/api/auth/login', login);

// Health check route
router.get('/api/health', (req, res) => {
  const groupedHealth = healthMonitor.getGroupedHealthStatus();
  const isHealthy = healthMonitor.isHealthy();
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    teamServices: groupedHealth.teamServices,
    infrastructure: groupedHealth.infrastructure,
    aiServices: groupedHealth.aiServices
  });
});

// Debug route to check sessions
router.get('/api/debug/sessions', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const total = await Session.countDocuments();
    const userSessions = await Session.countDocuments({ userId });
    const withMessages = await Session.countDocuments({ 'conversationHistory.0': { $exists: true } });
    
    const samples = await Session.find({ userId }).limit(3).select('sessionId userId conversationHistory');
    
    res.json({
      total,
      userSessions,
      withMessages,
      userId,
      samples: samples.map(s => ({
        sessionId: s.sessionId,
        userId: s.userId,
        messageCount: s.conversationHistory?.length || 0,
        firstMessage: s.conversationHistory?.[0]?.content?.substring(0, 50)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Team selection routes
router.get('/api/team/list', authenticate, listTeams);
router.post('/api/team/select', authenticate, selectTeam);
router.get('/api/team/active', authenticate, getActiveTeam);

// User routes
router.get('/api/profile', authenticate, getProfile);
router.get('/api/user/me', authenticate, (req, res) => {
  res.json({ userId: req.user?.id });
});
router.get('/api/user/profile', authenticate, getProfile);
router.put('/api/user/profile', authenticate, updateProfile);
router.post('/api/user/regenerate-api-key', authenticate, regenerateApiKey);

// Todo routes
router.get('/api/todos', authenticate, getTodos);
router.post('/api/todos', authenticate, createTodo);
router.put('/api/todos/:id', authenticate, updateTodo);
router.delete('/api/todos/:id', authenticate, deleteTodo);

// Team routes
router.post('/api/teams/create', authenticate, createTeam);
router.post('/api/teams/join', authenticate, joinTeam);
router.get('/api/teams/search', authenticate, searchTeams);
router.get('/api/teams/my-teams', authenticate, getUserTeams);
router.delete('/api/teams/delete', authenticate, deleteTeam);
router.put('/api/teams/update', authenticate, updateTeam);
router.post('/api/teams/signin', teamSignin);

// Chat routes
router.post('/api/chat/message', authenticate, sendMessage);
router.get('/api/chat/history', authenticate, getChatHistory);

// Session management routes
router.use('/api/sessions', sessionRoutes);

// Attachment management routes
router.use('/api/attachments', attachmentRoutes);

// Conversation management routes
router.post('/api/conversations/new', authenticate, createNewConversation);
router.get('/api/conversations/list', authenticate, getConversationList);
router.get('/api/conversations/search', authenticate, searchConversations);
router.get('/api/conversations/:sessionId', authenticate, switchConversation);
router.put('/api/conversations/:sessionId/rename', authenticate, renameConversation);
router.delete('/api/conversations/:sessionId', authenticate, deleteConversation);

// Context management routes
router.post('/api/conversations/:sessionId/contexts', authenticate, addContext);
router.delete('/api/conversations/:sessionId/contexts/:name', authenticate, removeContext);
router.get('/api/conversations/:sessionId/contexts', authenticate, getContexts);

// Skill management routes
router.post('/api/conversations/:sessionId/skills', authenticate, addSkill);
router.delete('/api/conversations/:sessionId/skills/:name', authenticate, removeSkill);
router.put('/api/conversations/:sessionId/skills/:name', authenticate, editSkill);
router.get('/api/conversations/:sessionId/skills', authenticate, getSkills);

// Auto-save conversation
router.post('/api/conversations/:sessionId/save', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages } = req.body;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    
    console.log('[AUTO-SAVE] Saving conversation:', sessionId, 'userId:', userId, 'messages:', messages?.length);
    
    await Session.updateOne(
      { sessionId },
      { 
        $set: { 
          conversationHistory: messages,
          lastActivity: new Date(),
          userId: new mongoose.Types.ObjectId(userId)  // Convert to ObjectId
        },
        $setOnInsert: {
          sessionId,
          status: 'active',
          workspacePath: '',
          tokenUsage: { input: 0, output: 0, total: 0 },
          metadata: {},
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save conversation error:', error);
    res.status(500).json({ message: 'Failed to save conversation' });
  }
});

// Team member routes
router.get('/api/teams/:teamId/members', authenticate, getTeamMembers);
router.post('/api/teams/:teamId/members', authenticate, addTeamMember);
router.delete(
  '/api/teams/:teamId/members/:memberId',
  authenticate,
  removeTeamMember,
);
router.patch(
  '/api/teams/:teamId/members/:memberId/status',
  authenticate,
  updateMemberStatus,
);

// Notification routes
router.post('/api/teams/:teamId/broadcast', authenticate, sendBroadcast);
router.get('/api/teams/:teamId/notifications', authenticate, getNotifications);
router.post(
  '/api/teams/:teamId/notifications/:notificationId/reply',
  authenticate,
  replyToNotification,
);

// OpenAI config for task agent
router.get('/api/team/openai-config', authenticate, (req, res) => {
  res.json({
    apiKey: OPENAI_API_KEY,
    baseUrl: OPENAI_BASE_URL,
    model: OPENAI_MODEL,
  });
});

// File routes
router.get('/api/files/list', authenticate, listFiles);
router.post('/api/files/upload', authenticate, uploadFile);
router.get('/api/files/download', authenticate, downloadFile);
router.delete('/api/files/delete', authenticate, deleteFile);
router.post('/api/files/search', authenticate, searchFiles);

// Project management routes
router.post('/api/teams/:teamId/projects', authenticate, projectController);
router.get('/api/teams/:teamId/projects', authenticate, projectController);
router.get('/api/teams/:teamId/projects/:projectId', authenticate, projectController);
router.put('/api/teams/:teamId/projects/:projectId', authenticate, projectController);

// Backward-compatible project routes (teamId from query)
router.post('/api/projects', authenticate, projectController);
router.get('/api/projects', authenticate, projectController);
router.put('/api/projects/:projectId', authenticate, projectController);

// Project sections routes
router.post('/api/teams/:teamId/sections', authenticate, projectController);
router.get('/api/teams/:teamId/projects/:projectId/sections', authenticate, projectController);
router.get('/api/teams/:teamId/sections/:sectionId', authenticate, projectController);
router.put('/api/teams/:teamId/sections/:sectionId', authenticate, projectController);

// Project stats routes
router.post('/api/teams/:teamId/stats', authenticate, projectController);
router.get('/api/teams/:teamId/projects/:projectId/stats', authenticate, projectController);
router.put('/api/teams/:teamId/projects/:projectId/stats', authenticate, projectController);

// Requirements routes
router.get('/api/teams/:teamId/requirements', authenticate, projectController);
router.post('/api/teams/:teamId/requirements', authenticate, projectController);
router.put('/api/teams/:teamId/requirements/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/requirements/:id', authenticate, projectController);

// Architecture routes
router.get('/api/teams/:teamId/architecture', authenticate, projectController);
router.post('/api/teams/:teamId/architecture', authenticate, projectController);
router.put('/api/teams/:teamId/architecture/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/architecture/:id', authenticate, projectController);

// Design routes
router.get('/api/teams/:teamId/design', authenticate, projectController);
router.post('/api/teams/:teamId/design', authenticate, projectController);
router.put('/api/teams/:teamId/design/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/design/:id', authenticate, projectController);

// Implementation routes
router.get('/api/teams/:teamId/implementation', authenticate, projectController);
router.post('/api/teams/:teamId/implementation', authenticate, projectController);
router.put('/api/teams/:teamId/implementation/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/implementation/:id', authenticate, projectController);

// Tasks routes
router.get('/api/teams/:teamId/tasks', authenticate, projectController);
router.post('/api/teams/:teamId/tasks', authenticate, projectController);
router.put('/api/teams/:teamId/tasks/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/tasks/:id', authenticate, projectController);

// Code routes
router.get('/api/teams/:teamId/code', authenticate, projectController);
router.post('/api/teams/:teamId/code', authenticate, projectController);
router.put('/api/teams/:teamId/code/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/code/:id', authenticate, projectController);

// Issues routes
router.get('/api/teams/:teamId/issues', authenticate, projectController);
router.post('/api/teams/:teamId/issues', authenticate, projectController);
router.put('/api/teams/:teamId/issues/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/issues/:id', authenticate, projectController);

// Meetings routes
router.get('/api/teams/:teamId/meetings', authenticate, projectController);
router.post('/api/teams/:teamId/meetings', authenticate, projectController);
router.put('/api/teams/:teamId/meetings/:id', authenticate, projectController);
router.delete('/api/teams/:teamId/meetings/:id', authenticate, projectController);

export default router;
