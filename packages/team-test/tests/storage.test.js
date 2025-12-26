/**
 * End-to-End Tests for team-storage
 * Tests: Auth, Teams, Projects, Todos, Files, Sessions
 */

import axios from 'axios';
import { URLS, waitForService, generateTestUser, generateTestTeam, TestCleanup } from '../utils/helpers.js';

const API = URLS.STORAGE;
const cleanup = new TestCleanup();

describe('team-storage E2E Tests', () => {
  let authToken;
  let userId;
  let teamId;

  beforeAll(async () => {
    await waitForService(API);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await axios.get(`${API}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });
  });

  describe('Authentication', () => {
    test('should signup new user', async () => {
      const user = generateTestUser();
      const response = await axios.post(`${API}/api/auth/signup`, user);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      
      authToken = response.data.token;
      userId = response.data.user.id;
      
      cleanup.add('user', userId, async () => {
        // User cleanup handled by test teardown
      });
    });

    test('should login existing user', async () => {
      const user = generateTestUser();
      await axios.post(`${API}/api/auth/signup`, user);
      
      const response = await axios.post(`${API}/api/auth/login`, {
        username: user.username,
        password: user.password
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
      try {
        await axios.post(`${API}/api/auth/login`, {
          username: 'nonexistent',
          password: 'wrong'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Teams', () => {
    test('should create team', async () => {
      const team = generateTestTeam();
      const response = await axios.post(`${API}/api/teams/create`, team, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('team_id');
      
      teamId = response.data.team_id;
      
      cleanup.add('team', teamId, async () => {
        // Team cleanup
      });
    });

    test('should list user teams', async () => {
      const response = await axios.get(`${API}/api/teams/my-teams`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test('should get team members', async () => {
      const response = await axios.get(`${API}/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Projects', () => {
    let projectId;

    test('should create project', async () => {
      const project = {
        name: 'Test Project',
        description: 'E2E test project',
        status: 'active'
      };
      
      const response = await axios.post(`${API}/api/projects`, project, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { teamId }
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('_id');
      
      projectId = response.data._id;
    });

    test('should list projects', async () => {
      const response = await axios.get(`${API}/api/projects`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { teamId }
      });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should update project', async () => {
      const response = await axios.put(`${API}/api/projects/${projectId}`, {
        description: 'Updated description'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Todos', () => {
    let todoId;

    test('should create todo', async () => {
      const response = await axios.post(`${API}/api/todos`, {
        text: 'Test todo',
        completed: false
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('_id');
      
      todoId = response.data._id;
    });

    test('should list todos', async () => {
      const response = await axios.get(`${API}/api/todos`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should update todo', async () => {
      const response = await axios.put(`${API}/api/todos/${todoId}`, {
        completed: true
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
    });

    test('should delete todo', async () => {
      const response = await axios.delete(`${API}/api/todos/${todoId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('User Profile', () => {
    test('should get user profile', async () => {
      const response = await axios.get(`${API}/api/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('username');
      expect(response.data).toHaveProperty('email');
    });

    test('should update user profile', async () => {
      const response = await axios.put(`${API}/api/user/profile`, {
        full_name: 'Updated Name'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
    });
  });
});
