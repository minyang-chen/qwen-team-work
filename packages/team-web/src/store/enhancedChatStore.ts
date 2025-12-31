import { create } from 'zustand';

interface EnhancedChatState {
  // Enhanced message types
  messages: Array<{
    id: string;
    type: 'user' | 'assistant' | 'system' | 'tool_execution' | 'collaboration';
    content: string;
    timestamp: number;
    userId?: string;
    teamId?: string;
    projectId?: string;
    toolResults?: any[];
    metadata?: Record<string, any>;
  }>;
  
  // Streaming state
  isStreaming: boolean;
  streamingMessage: string;
  
  // Team context
  currentTeam?: {
    teamId: string;
    teamName: string;
    projectId?: string;
    projectName?: string;
    members: Array<{
      userId: string;
      username: string;
      isOnline: boolean;
    }>;
  };
  
  // Enhanced settings
  settings: {
    model: string;
    enableCollaboration: boolean;
    enableToolExecution: boolean;
    enableStreaming: boolean;
    autoApproveTools: string[];
    teamSyncEnabled: boolean;
  };
  
  // Actions
  addMessage: (message: Omit<EnhancedChatState['messages'][0], 'id' | 'timestamp'>) => void;
  updateStreamingMessage: (content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  setTeamContext: (team: EnhancedChatState['currentTeam']) => void;
  updateSettings: (settings: Partial<EnhancedChatState['settings']>) => void;
  addToolResult: (messageId: string, toolResult: any) => void;
  updateTeamMembers: (members: EnhancedChatState['currentTeam']['members']) => void;
}

export const useEnhancedChatStore = create<EnhancedChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingMessage: '',
  currentTeam: undefined,
  settings: {
    model: 'qwen-coder-plus',
    enableCollaboration: true,
    enableToolExecution: true,
    enableStreaming: true,
    autoApproveTools: ['read_file', 'ls', 'grep'],
    teamSyncEnabled: true,
  },

  addMessage: (message) => {
    const newMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  updateStreamingMessage: (content) => {
    set({ streamingMessage: content });
  },

  setStreaming: (isStreaming) => {
    set({ isStreaming });
    if (!isStreaming) {
      // Add streaming message to history when complete
      const { streamingMessage, currentTeam } = get();
      if (streamingMessage.trim()) {
        get().addMessage({
          type: 'assistant',
          content: streamingMessage,
          teamId: currentTeam?.teamId,
          projectId: currentTeam?.projectId,
        });
        set({ streamingMessage: '' });
      }
    }
  },

  clearMessages: () => {
    set({ messages: [], streamingMessage: '', isStreaming: false });
  },

  setTeamContext: (team) => {
    set({ currentTeam: team });
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  addToolResult: (messageId, toolResult) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolResults: [...(msg.toolResults || []), toolResult],
              metadata: {
                ...msg.metadata,
                lastToolUpdate: Date.now(),
              },
            }
          : msg
      ),
    }));
  },

  updateTeamMembers: (members) => {
    set((state) => ({
      currentTeam: state.currentTeam
        ? { ...state.currentTeam, members }
        : undefined,
    }));
  },
}));
