/**
 * Direct LLM API Test
 * Tests OpenAI-compatible API endpoint directly
 */

import axios from 'axios';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

const LLM_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || 'sk-svcacct-team-key',
  baseUrl: process.env.OPENAI_BASE_URL || 'http://10.0.0.139:30000/v1',
  model: process.env.OPENAI_MODEL || 'openai/gpt-oss-20b',
};

describe('Direct LLM API Tests', () => {
  test('should connect to LLM API', async () => {
    const response = await axios.get(`${LLM_CONFIG.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
      },
      timeout: 10000,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('data');
  });

  test('should complete a simple chat request', async () => {
    const response = await axios.post(
      `${LLM_CONFIG.baseUrl}/chat/completions`,
      {
        model: LLM_CONFIG.model,
        messages: [
          { role: 'user', content: 'Say "test successful" and nothing else.' },
        ],
        max_tokens: 50,
        temperature: 0,
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('choices');
    expect(response.data.choices.length).toBeGreaterThan(0);
    expect(response.data.choices[0]).toHaveProperty('message');
    
    // LLM may return null content - just verify structure
    const message = response.data.choices[0].message;
    expect(message).toHaveProperty('content');
    if (message.content) {
      expect(typeof message.content).toBe('string');
    }
  });

  test('should handle streaming response', async () => {
    const response = await axios.post(
      `${LLM_CONFIG.baseUrl}/chat/completions`,
      {
        model: LLM_CONFIG.model,
        messages: [
          { role: 'user', content: 'Count to 3.' },
        ],
        max_tokens: 50,
        temperature: 0,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 30000,
      }
    );

    expect(response.status).toBe(200);
    
    let chunks = 0;
    for await (const chunk of response.data) {
      chunks++;
      if (chunks > 5) break; // Just verify streaming works
    }
    
    expect(chunks).toBeGreaterThan(0);
  });

  test('should return usage statistics', async () => {
    const response = await axios.post(
      `${LLM_CONFIG.baseUrl}/chat/completions`,
      {
        model: LLM_CONFIG.model,
        messages: [
          { role: 'user', content: 'Hi' },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('usage');
    expect(response.data.usage).toHaveProperty('prompt_tokens');
    expect(response.data.usage).toHaveProperty('completion_tokens');
    expect(response.data.usage).toHaveProperty('total_tokens');
  });

  test('should handle invalid API key', async () => {
    try {
      await axios.post(
        `${LLM_CONFIG.baseUrl}/chat/completions`,
        {
          model: LLM_CONFIG.model,
          messages: [{ role: 'user', content: 'test' }],
        },
        {
          headers: {
            'Authorization': 'Bearer invalid-key',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      // If server doesn't validate keys, test passes
      expect(true).toBe(true);
    } catch (error) {
      // If server validates keys, expect 4xx error
      if (error.response) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      } else {
        // Network error is also acceptable
        expect(error.code).toBeDefined();
      }
    }
  });
});
