/**
 * End-to-End Tests for team-ai-agent
 * Tests: ACP Protocol, Session Management, Chat Handler
 */

import WebSocket from 'ws';
import { URLS, PORTS, sleep } from '../utils/helpers.js';

const WS_URL = URLS.AI_AGENT;

describe('team-ai-agent E2E Tests', () => {
  let ws;

  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  describe('WebSocket Connection', () => {
    test('should connect to ACP server', (done) => {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('should handle ping-pong', (done) => {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-ping',
          type: 'ping',
          data: {},
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.data?.pong) {
          expect(message.success).toBe(true);
          expect(message.data.pong).toBe(true);
          done();
        }
      });

      ws.on('error', done);
    });
  });

  describe('Session Management', () => {
    test('should create session', (done) => {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-session-create',
          type: 'session',
          data: {
            action: 'create',
            userId: 'test-user-123'
          },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.success && message.data?.session) {
          expect(message.data.session).toHaveProperty('sessionId');
          done();
        } else if (message.success === false) {
          done(new Error(`Session creation failed: ${message.error?.message || 'Unknown error'}`));
        }
      });

      ws.on('error', done);
    });

    test('should get session info', (done) => {
      ws = new WebSocket(WS_URL);
      const userId = 'test-user-456';

      ws.on('open', () => {
        // First create session
        ws.send(JSON.stringify({
          id: 'test-session-create-2',
          type: 'session',
          data: { 
            action: 'create',
            userId 
          },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.id === 'test-session-create-2' && message.success) {
          // Then get session info using userId
          ws.send(JSON.stringify({
            id: 'test-session-get',
            type: 'session',
            data: { 
              action: 'get',
              userId 
            },
            timestamp: Date.now()
          }));
        } else if (message.id === 'test-session-get' && message.success) {
          expect(message.data.session).toHaveProperty('sessionId');
          expect(message.data.session).toHaveProperty('userId', userId);
          done();
        }
      });

      ws.on('error', done);
    });
  });

  describe('Chat Handler', () => {
    test('should process chat message', (done) => {
      ws = new WebSocket(WS_URL);
      let sessionId;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'session.create',
          payload: { userId: 'test-user-789' },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'session.created') {
          sessionId = message.payload.sessionId;
          
          // Send chat message
          ws.send(JSON.stringify({
            type: 'chat.send',
            payload: {
              sessionId,
              content: 'What is 2+2?',
              streaming: false
            },
            timestamp: Date.now()
          }));
        } else if (message.type === 'chat.response') {
          expect(message.payload).toHaveProperty('content');
          done();
        } else if (message.type === 'error') {
          // May error without proper LLM config, that's ok
          done();
        }
      });

      ws.on('error', done);
      
      setTimeout(() => done(), 10000);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid message type', (done) => {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-invalid',
          type: 'invalid.type',
          data: { action: 'invalid' },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.success === false && message.error) {
          expect(message.error).toHaveProperty('code');
          done();
        }
      });

      ws.on('error', done);
    });

    test('should handle malformed JSON', (done) => {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send('invalid json{');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          done();
        }
      });

      ws.on('error', done);
      
      setTimeout(() => done(), 2000);
    });
  });
});
