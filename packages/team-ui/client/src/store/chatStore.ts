import { create } from 'zustand';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  files?: FileAttachment[];
}

export interface FileView {
  path: string;
  content: string;
}

export interface Session {
  id: string;
  createdAt: string;
  lastActivity: string;
}

export interface SessionStats {
  messageCount: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  createdAt: Date;
  lastActivity: Date;
}

interface ChatStore {
  sessionId: string | null;
  sessions: Session[];
  messages: Message[];
  isStreaming: boolean;
  currentMessage: string;
  pendingToolCalls: ToolCall[];
  currentFile: FileView | null;
  isSettingsOpen: boolean;
  sessionStats: SessionStats | null;
  messageWindowSize: number;
  tokensPerSecond: number;
  streamStartTime: number | null;
  streamTokenCount: number;

  setSessionId: (id: string) => void;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  addMessage: (message: Message) => void;
  appendToCurrentMessage: (text: string) => void;
  finalizeCurrentMessage: () => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  deleteMessage: (id: string) => void;
  updateMessage: (id: string, content: string) => void;
  addPendingToolCall: (toolCall: ToolCall) => void;
  approveToolCall: (id: string) => void;
  rejectToolCall: (id: string) => void;
  clearPendingToolCalls: () => void;
  openFile: (file: FileView) => void;
  closeFile: () => void;
  updateFileContent: (content: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSessionStats: (stats: SessionStats | null) => void;
  loadSettings: () => Promise<void>;
  startStreaming: () => void;
  updateStreamMetrics: (tokenCount: number) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessionId: null,
  sessions: [],
  messages: [],
  isStreaming: false,
  currentMessage: '',
  pendingToolCalls: [],
  currentFile: null,
  isSettingsOpen: false,
  sessionStats: null,
  messageWindowSize: 100,
  tokensPerSecond: 0,
  streamStartTime: null,
  streamTokenCount: 0,

  setSessionId: (id) => set({ sessionId: id }),

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  removeSession: (id) =>
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

  addMessage: (message) =>
    set((state) => {
      const newMessages = [...state.messages, message];
      return { messages: newMessages.slice(-state.messageWindowSize) };
    }),

  appendToCurrentMessage: (text) =>
    set((state) => ({ currentMessage: state.currentMessage + text })),

  finalizeCurrentMessage: () => {
    const { currentMessage } = get();
    if (currentMessage.trim()) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: currentMessage,
            timestamp: new Date(),
          },
        ],
        currentMessage: '',
      }));
    } else {
      set({ currentMessage: '' });
    }
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: () => set({ messages: [], currentMessage: '' }),

  deleteMessage: (id) =>
    set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m,
      ),
    })),

  addPendingToolCall: (toolCall) =>
    set((state) => ({
      pendingToolCalls: [...state.pendingToolCalls, toolCall],
    })),

  approveToolCall: (id) =>
    set((state) => ({
      pendingToolCalls: state.pendingToolCalls.map((tc) =>
        tc.id === id ? { ...tc, status: 'approved' as const } : tc,
      ),
    })),

  rejectToolCall: (id) =>
    set((state) => ({
      pendingToolCalls: state.pendingToolCalls.map((tc) =>
        tc.id === id ? { ...tc, status: 'rejected' as const } : tc,
      ),
    })),

  clearPendingToolCalls: () => set({ pendingToolCalls: [] }),

  openFile: (file) => set({ currentFile: file }),

  closeFile: () => set({ currentFile: null }),

  updateFileContent: (content) =>
    set((state) => ({
      currentFile: state.currentFile ? { ...state.currentFile, content } : null,
    })),

  openSettings: () => set({ isSettingsOpen: true }),

  closeSettings: () => set({ isSettingsOpen: false }),

  setSessionStats: (stats) => set({ sessionStats: stats }),

  startStreaming: () =>
    set({
      streamStartTime: Date.now(),
      streamTokenCount: 0,
      tokensPerSecond: 0,
    }),

  updateStreamMetrics: (tokenCount) => {
    const state = get();
    if (state.streamStartTime) {
      const elapsed = (Date.now() - state.streamStartTime) / 1000;
      const tps = elapsed > 0 ? tokenCount / elapsed : 0;
      set({ streamTokenCount: tokenCount, tokensPerSecond: Math.round(tps) });
    }
  },

  loadSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        set({ messageWindowSize: settings.messageWindowSize });
      }
    } catch (error) {
    }
  },
}));
