/**
 * Example test file demonstrating CLI-inspired testing patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  mockThemeManager, 
  mockI18n, 
  mockErrorHandler,
  createTestUser,
  createTestMessage,
  waitFor,
  flushPromises
} from '@qwen-team/shared';
import { ThemeManager } from '../themes/ThemeManager';
import { ConfigValidator } from '@qwen-team/shared';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    themeManager = new ThemeManager();
  });

  it('should initialize with default theme', () => {
    expect(themeManager.getCurrentTheme()).toBe('qwen-light');
  });

  it('should change theme and notify listeners', async () => {
    const listener = vi.fn();
    const unsubscribe = themeManager.subscribe(listener);

    themeManager.setTheme('qwen-dark');

    await flushPromises();

    expect(themeManager.getCurrentTheme()).toBe('qwen-dark');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Qwen Dark',
        type: 'dark'
      })
    );

    unsubscribe();
  });

  it('should return available themes', () => {
    const themes = themeManager.getAvailableThemes();
    expect(themes).toContain('qwen-light');
    expect(themes).toContain('qwen-dark');
    expect(themes).toContain('github-light');
    expect(themes).toContain('github-dark');
  });

  it('should handle invalid theme gracefully', () => {
    themeManager.setTheme('invalid-theme');
    expect(themeManager.getCurrentTheme()).toBe('qwen-light'); // Should remain unchanged
  });
});

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  it('should validate correct config', () => {
    const config = validator.getDefaultConfig();
    const result = validator.validateConfig(config);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject invalid port numbers', () => {
    const config = {
      ...validator.getDefaultConfig(),
      server: {
        ...validator.getDefaultConfig().server,
        port: 99999 // Invalid port
      }
    };

    const result = validator.validateConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toContain('port');
  });

  it('should reject missing required fields', () => {
    const config = {
      server: {
        port: 3000,
        // Missing host and cors
      }
    };

    const result = validator.validateConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('Test Utilities', () => {
  it('should create test user with defaults', () => {
    const user = createTestUser();
    
    expect(user).toMatchObject({
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      teams: []
    });
  });

  it('should create test user with overrides', () => {
    const user = createTestUser({ 
      username: 'customuser',
      email: 'custom@example.com'
    });
    
    expect(user.username).toBe('customuser');
    expect(user.email).toBe('custom@example.com');
    expect(user.id).toBe('test-user-id'); // Default preserved
  });

  it('should create test message', () => {
    const message = createTestMessage({
      content: 'Hello world'
    });
    
    expect(message).toMatchObject({
      id: 'test-message-id',
      content: 'Hello world',
      userId: 'test-user-id',
      type: 'text'
    });
    expect(message.timestamp).toBeDefined();
  });

  it('should wait for condition', async () => {
    let condition = false;
    
    setTimeout(() => {
      condition = true;
    }, 50);

    await waitFor(() => condition, 100);
    
    expect(condition).toBe(true);
  });

  it('should timeout when condition not met', async () => {
    await expect(
      waitFor(() => false, 50)
    ).rejects.toThrow('Condition not met within timeout');
  });
});
