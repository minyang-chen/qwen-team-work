// Test fixtures and mock data
export const mockUser = {
  username: 'test_user',
  email: 'test@example.com',
  full_name: 'Test User',
  password: 'test123456'
};

export const mockTeam = {
  team_name: 'Test Team',
  specialization: 'Software Development',
  description: 'A test team for automated testing'
};

export const mockProject = {
  name: 'Test Project',
  description: 'A test project',
  status: 'active'
};

export const mockTodo = {
  text: 'Test todo item',
  completed: false
};

export const mockChatMessage = {
  content: 'Hello, this is a test message',
  sessionId: 'test-session-123'
};

export const mockAcpMessage = {
  type: 'chat.send',
  payload: {
    sessionId: 'test-session',
    content: 'Test message',
    streaming: false
  }
};
