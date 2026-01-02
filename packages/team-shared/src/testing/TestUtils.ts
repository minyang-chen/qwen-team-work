/**
 * Test utilities for team packages
 * Adapted from CLI's testing patterns
 */

import { vi } from 'vitest';
import type { TeamConfig } from '../config/ConfigValidator.js';

export interface Theme {
  name: string;
  type: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
}

// Mock implementations
export const mockThemeManager = {
  getTheme: vi.fn().mockReturnValue({
    name: 'Test Theme',
    type: 'light',
    colors: {
      primary: '#1976d2',
      secondary: '#424242',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#212121',
      textSecondary: '#757575',
      border: '#e0e0e0',
      accent: '#ff4081',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
  } as Theme),
  setTheme: vi.fn(),
  getCurrentTheme: vi.fn().mockReturnValue('test-theme'),
  getAvailableThemes: vi.fn().mockReturnValue(['test-theme']),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

export const mockI18n = {
  setLanguage: vi.fn(),
  getCurrentLanguage: vi.fn().mockReturnValue('en'),
  getSupportedLanguages: vi.fn().mockReturnValue(['en', 'zh']),
  translate: vi.fn().mockImplementation((key: string) => key),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

export const mockErrorHandler = {
  handleError: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

export const mockConfigValidator = {
  validateConfig: vi.fn().mockReturnValue({ valid: true }),
  getDefaultConfig: vi.fn().mockReturnValue({
    server: { port: 3000, host: 'localhost', cors: { enabled: true, origins: [] } },
    database: { url: 'mongodb://localhost:27017', name: 'test' },
    auth: { enabled: false, sessionTimeout: 3600 },
    acp: { enabled: false, port: 8080, agents: [] },
    ui: { theme: 'test', language: 'en', features: { darkMode: false, notifications: true } },
  } as TeamConfig),
};

// Test helpers
export function createMockWebSocket() {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
  };
  return mockWs as unknown as WebSocket;
}

export function createMockResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  } as unknown as Response;
}

export function mockFetch(responses: Record<string, any>) {
  return vi.fn().mockImplementation((url: string) => {
    const response = responses[url] || responses['*'];
    if (response instanceof Error) {
      return Promise.reject(response);
    }
    return Promise.resolve(createMockResponse(response));
  });
}

// Test data factories
export function createTestUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    teams: [],
    ...overrides,
  };
}

export function createTestTeam(overrides: Partial<any> = {}) {
  return {
    id: 'test-team-id',
    name: 'Test Team',
    description: 'A test team',
    members: [],
    projects: [],
    ...overrides,
  };
}

export function createTestMessage(overrides: Partial<any> = {}) {
  return {
    id: 'test-message-id',
    content: 'Test message',
    userId: 'test-user-id',
    timestamp: new Date().toISOString(),
    type: 'text',
    ...overrides,
  };
}

// Async test helpers
export async function waitFor(condition: () => boolean, timeout = 1000) {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (!condition()) {
    throw new Error('Condition not met within timeout');
  }
}

export function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
