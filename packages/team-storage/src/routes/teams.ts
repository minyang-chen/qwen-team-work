// @ts-nocheck
import { Router } from 'express';
import { authenticate, requireTeamAccess } from '../middleware/authMiddleware';
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
} from '../controllers/teamController';

const router = Router();

// Team management routes
router.post('/create', authenticate, createTeam);
router.post('/join', authenticate, joinTeam);
router.post('/signin', authenticate, teamSignin);
router.get('/search', authenticate, searchTeams);
router.get('/user-teams', authenticate, getUserTeams);
router.delete('/:teamId', authenticate, deleteTeam);
router.put('/:teamId', authenticate, updateTeam);
router.get('/:teamId/members', authenticate, getTeamMembers);
router.post('/:teamId/members', authenticate, addTeamMember);
router.delete('/:teamId/members/:userId', authenticate, removeTeamMember);
router.put('/:teamId/members/:userId/status', authenticate, updateMemberStatus);

export default router;
