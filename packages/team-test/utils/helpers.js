// Test utilities and helpers
import axios from 'axios';

export const PORTS = {
  STORAGE: 8000,
  AI_AGENT: 8001,
  SERVICE: 8002,
  WEB: 8003
};

export const URLS = {
  STORAGE: `http://localhost:${PORTS.STORAGE}`,
  AI_AGENT: `ws://localhost:${PORTS.AI_AGENT}`,
  SERVICE: `http://localhost:${PORTS.SERVICE}`,
  WEB: `http://localhost:${PORTS.WEB}`
};

export async function waitForService(url, maxAttempts = 30, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      return true;
    } catch (error) {
      if (i === maxAttempts - 1) throw new Error(`Service ${url} not ready`);
      await sleep(delay);
    }
  }
  return false;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestUser() {
  const id = Date.now();
  return {
    username: `test_user_${id}`,
    email: `test_${id}@example.com`,
    full_name: `Test User ${id}`,
    password: 'test123456'
  };
}

export function generateTestTeam() {
  const id = Date.now();
  return {
    name: `Test Team ${id}`,
    specialization: 'Testing',
    description: 'Automated test team'
  };
}

export async function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export class TestCleanup {
  constructor() {
    this.resources = [];
  }

  add(type, id, cleanupFn) {
    this.resources.push({ type, id, cleanupFn });
  }

  async cleanup() {
    for (const resource of this.resources.reverse()) {
      try {
        await resource.cleanupFn();
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type} ${resource.id}:`, error.message);
      }
    }
    this.resources = [];
  }
}
