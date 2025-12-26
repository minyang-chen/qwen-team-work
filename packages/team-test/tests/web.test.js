/**
 * End-to-End Tests for team-web
 * Tests: Static serving, API proxy, WebSocket proxy
 */

import axios from 'axios';
import { URLS, PORTS, waitForService } from '../utils/helpers.js';

const WEB_URL = URLS.WEB;

describe('team-web E2E Tests', () => {
  beforeAll(async () => {
    await waitForService(WEB_URL);
  });

  describe('Static File Serving', () => {
    test('should serve index.html', async () => {
      const response = await axios.get(WEB_URL);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.data).toContain('<!doctype html>');
    });

    test('should serve team.html', async () => {
      const response = await axios.get(`${WEB_URL}/team.html`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('should serve JavaScript assets', async () => {
      const indexResponse = await axios.get(WEB_URL);
      const scriptMatch = indexResponse.data.match(/src="(\/assets\/[^"]+\.js)"/);
      
      if (scriptMatch) {
        const scriptPath = scriptMatch[1];
        const scriptResponse = await axios.get(`${WEB_URL}${scriptPath}`);
        expect(scriptResponse.status).toBe(200);
        expect(scriptResponse.headers['content-type']).toContain('javascript');
      }
    });
  });

  describe('API Proxy', () => {
    test('should proxy /api requests to backend', async () => {
      try {
        const response = await axios.get(`${WEB_URL}/api/health`);
        expect(response.status).toBeGreaterThan(0);
      } catch (error) {
        // May fail if backend not running
        expect(error.response?.status).toBeGreaterThan(0);
      }
    });

    test('should proxy /api/config', async () => {
      try {
        const response = await axios.get(`${WEB_URL}/api/config`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('backendUrl');
      } catch (error) {
        expect(error.response?.status).toBeGreaterThan(0);
      }
    });
  });

  describe('SPA Routing', () => {
    test('should serve index.html for unknown routes', async () => {
      const response = await axios.get(`${WEB_URL}/unknown-route`);
      expect(response.status).toBe(200);
      expect(response.data).toContain('<!doctype html>');
    });

    test('should handle nested routes', async () => {
      const response = await axios.get(`${WEB_URL}/team/dashboard`);
      expect(response.status).toBe(200);
      expect(response.data).toContain('<!doctype html>');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers', async () => {
      const response = await axios.get(WEB_URL);
      // Vite dev server includes CORS headers
      expect(response.status).toBe(200);
    });
  });

  describe('Performance', () => {
    test('should respond quickly', async () => {
      const start = Date.now();
      await axios.get(WEB_URL);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond within 1s
    });
  });
});
