// Enhanced API configuration for team-web
export const API_CONFIG = {
  // Base URLs for enhanced services
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8003',
  
  // Enhanced endpoints
  ENDPOINTS: {
    // Enhanced AI service endpoints
    CHAT: '/api/chat/enhanced',
    CHAT_STREAM: '/api/chat/stream/enhanced',
    
    // Team collaboration endpoints
    TEAMS: '/api/teams',
    TEAM_MEMBERS: '/api/teams/:teamId/members',
    PROJECTS: '/api/teams/:teamId/projects',
    
    // Session management
    SESSIONS: '/api/sessions/enhanced',
    SESSION_COMPRESS: '/api/sessions/:sessionId/compress',
    
    // Tool execution
    TOOLS: '/api/tools/enhanced',
    TOOL_APPROVALS: '/api/teams/:teamId/projects/:projectId/approvals',
    
    // Real-time collaboration
    COLLABORATION: '/api/collaboration',
    CURSORS: '/api/collaboration/cursors',
    FILE_EDITS: '/api/collaboration/edits',
  },
  
  // WebSocket events for enhanced features
  WS_EVENTS: {
    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    
    // Team collaboration events
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    CURSOR_UPDATE: 'cursor_update',
    FILE_EDIT: 'file_edit',
    
    // AI streaming events
    AI_STREAM_CHUNK: 'ai_stream_chunk',
    AI_STREAM_COMPLETE: 'ai_stream_complete',
    AI_STREAM_ERROR: 'ai_stream_error',
    
    // Tool execution events
    TOOL_EXECUTION: 'tool_execution',
    TOOL_APPROVAL_REQUEST: 'tool_approval_request',
    
    // Team state events
    TEAM_STATE: 'team_state',
    SHARED_STATE_UPDATE: 'shared_state_update',
  },
  
  // Enhanced request configuration
  REQUEST_CONFIG: {
    timeout: 30000, // 30 seconds for enhanced AI requests
    retries: 3,
    retryDelay: 1000,
  },
  
  // Feature flags for enhanced capabilities
  FEATURES: {
    ENHANCED_AI: true,
    REAL_TIME_COLLABORATION: true,
    TOOL_EXECUTION: true,
    STREAMING_RESPONSES: true,
    TEAM_CONTEXT: true,
    SESSION_COMPRESSION: true,
  },
};

// Enhanced API client with team features
export class EnhancedApiClient {
  private baseUrl: string;
  private token?: string;
  
  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  setAuthToken(token: string) {
    this.token = token;
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Enhanced chat methods
  async sendEnhancedMessage(message: string, context: {
    teamId?: string;
    projectId?: string;
    sessionId: string;
    userId: string;
  }) {
    return this.request(API_CONFIG.ENDPOINTS.CHAT, {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...context,
      }),
    });
  }
  
  async *streamEnhancedMessage(message: string, context: {
    teamId?: string;
    projectId?: string;
    sessionId: string;
    userId: string;
  }) {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CHAT_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify({
        message,
        ...context,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              yield JSON.parse(data);
            } catch (error) {
              console.error('Failed to parse stream chunk:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  // Team management methods
  async getTeams(userId: string) {
    return this.request(`${API_CONFIG.ENDPOINTS.TEAMS}?userId=${userId}`);
  }
  
  async getTeamMembers(teamId: string) {
    return this.request(API_CONFIG.ENDPOINTS.TEAM_MEMBERS.replace(':teamId', teamId));
  }
  
  async getProjects(teamId: string) {
    return this.request(API_CONFIG.ENDPOINTS.PROJECTS.replace(':teamId', teamId));
  }
  
  // Session management methods
  async createEnhancedSession(userId: string, teamId?: string, projectId?: string) {
    return this.request(API_CONFIG.ENDPOINTS.SESSIONS, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        teamId,
        projectId,
        capabilities: ['compression', 'streaming', 'tools', 'collaboration'],
      }),
    });
  }
  
  async compressSession(sessionId: string) {
    return this.request(
      API_CONFIG.ENDPOINTS.SESSION_COMPRESS.replace(':sessionId', sessionId),
      { method: 'POST' }
    );
  }
  
  // Tool execution methods
  async executeEnhancedTool(toolName: string, parameters: any, context: {
    sessionId: string;
    teamId?: string;
    projectId?: string;
  }) {
    return this.request(API_CONFIG.ENDPOINTS.TOOLS, {
      method: 'POST',
      body: JSON.stringify({
        toolName,
        parameters,
        ...context,
      }),
    });
  }
}

export const apiClient = new EnhancedApiClient();
