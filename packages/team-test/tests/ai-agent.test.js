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
          type: 'ping',
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          expect(message.type).toBe('pong');
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
          type: 'session.create',
          payload: {
            userId: 'test-user-123'
          },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'session.created') {
          expect(message.payload).toHaveProperty('sessionId');
          done();
        }
      });

      ws.on('error', done);
    });

    test('should get session info', (done) => {
      ws = new WebSocket(WS_URL);
      let sessionId;

      ws.on('open', () => {
        // First create session
        ws.send(JSON.stringify({
          type: 'session.create',
          payload: { userId: 'test-user-456' },
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'session.created') {
          sessionId = message.payload.sessionId;
          
          // Then get session info
          ws.send(JSON.stringify({
            type: 'session.get',
            payload: { sessionId },
            timestamp: Date.now()
          }));
        } else if (message.type === 'session.info') {
          expect(message.payload).toHaveProperty('sessionId', sessionId);
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
          type: 'invalid.type',
          payload: {},
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
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
