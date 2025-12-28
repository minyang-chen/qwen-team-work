/**
 * Team User Authentication Tests
 * Tests user signup and login flow
 */

import axios from 'axios';
import { URLS, waitForService } from '../utils/helpers.js';

const BACKEND_URL = URLS.STORAGE;

describe('Team User Authentication', () => {
  beforeAll(async () => {
    await waitForService(BACKEND_URL);
  });

  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User'
  };

  let authToken = '';

  test('should signup new user', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      full_name: testUser.fullName
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    expect(response.data).toHaveProperty('user');
    expect(response.data.user.username).toBe(testUser.username);
    
    authToken = response.data.token;
  });

  test('should login with correct credentials', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    expect(response.data).toHaveProperty('user');
    expect(response.data.user.username).toBe(testUser.username);
  });

  test('should reject login with wrong password', async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username: testUser.username,
        password: 'WrongPassword123!'
      });
      fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
      expect(error.response.data).toHaveProperty('error');
    }
  });

  test('should reject login with non-existent user', async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username: 'nonexistent_user_12345',
        password: 'SomePassword123!'
      });
      fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
      expect(error.response.data).toHaveProperty('error');
    }
  });

  test('should access protected route with valid token', async () => {
    const response = await axios.get(`${BACKEND_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('username', testUser.username);
  });

  test('should reject protected route without token', async () => {
    try {
      await axios.get(`${BACKEND_URL}/api/profile`);
      fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});
