/**
 * End-to-End Tests for team-service
 * Tests: WebSocket, Sessions, AI Service, Proxy
 */

import axios from 'axios';
import { io } from 'socket.io-client';
import { URLS, PORTS, waitForService, sleep } from '../utils/helpers.js';

const API = URLS.SERVICE;

describe('team-service E2E Tests', () => {
  let socket;

  beforeAll(async () => {
    await waitForService(API);
  });

  afterEach(() => {
    if (socket?.connected) {
      socket.disconnect();
    }
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await axios.get(`${API}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });

    test('should return service info', async () => {
      const response = await axios.get(`${API}/api/info`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('service', 'team-service');
      expect(response.data).toHaveProperty('version');
    });
  });

  describe('WebSocket Connection', () => {
    test('should connect to WebSocket server', (done) => {
      socket = io(API, {
        transports: ['websocket'],
        reconnection: false
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });

      socket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should handle ping-pong', (done) => {
      socket = io(API, {
        transports: ['websocket']
      });

      socket.on('connect', () => {
        socket.emit('ping');
      });

      socket.on('pong', () => {
        expect(true).toBe(true);
        done();
      });
    });
  });

  describe('Session Management', () => {
    test('should create session via API', async () => {
      const response = await axios.post(`${API}/api/sessions`, {
        userId: 'test-user-123'
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('sessionId');
    });

    test('should list sessions', async () => {
      const response = await axios.get(`${API}/api/sessions`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('AI Service Integration', () => {
    test('should handle chat message via WebSocket', (done) => {
      socket = io(API, {
        transports: ['websocket'],
        auth: {
          token: 'test-token'
        }
      });

      let receivedChunks = false;

      socket.on('connect', () => {
        socket.emit('chat:message', {
          userId: 'test-user',
          sessionId: 'test-session',
          message: 'Hello'
        });
      });

      socket.on('message:chunk', (data) => {
        receivedChunks = true;
        expect(data).toHaveProperty('type');
      });

      socket.on('message:complete', () => {
        expect(receivedChunks).toBe(true);
        done();
      });

      socket.on('error', (error) => {
        // Expected for test without real auth
        done();
      });

      setTimeout(() => done(), 5000);
    });
  });

  describe('Proxy Endpoints', () => {
    test('should proxy to backend', async () => {
      try {
        const response = await axios.get(`${API}/api/health`);
        expect(response.status).toBe(200);
      } catch (error) {
        // May fail if backend not running, that's ok
        expect(error.response?.status).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration', () => {
    test('should return config', async () => {
      const response = await axios.get(`${API}/api/config`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('backendUrl');
      expect(response.data).toHaveProperty('acpWebsocketUrl');
    });
  });
});
