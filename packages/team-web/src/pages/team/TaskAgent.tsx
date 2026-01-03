import { useEffect, useState, useRef } from 'react';
import { API_BASE, STORAGE_BASE } from '../../config/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Type assertions for third-party components
const ReactMarkdownComponent = ReactMarkdown as any;
const SyntaxHighlighterComponent = SyntaxHighlighter as any;

interface TaskAgentProps {
  workspaceType: 'private' | 'team';
  selectedTeamId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    name: string;
  }>;
  metrics?: {
    responseTime?: number; // in milliseconds
    tokensPerSecond?: number;
    totalTokens?: number;
  };
}

interface Conversation {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  name: string;
  preview: string;
}

export function TaskAgent({ workspaceType, selectedTeamId }: TaskAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Ensure currentSessionId is never undefined
  const safeCurrentSessionId = currentSessionId || '';
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [autoSave, setAutoSave] = useState(true);
  const [contexts, setContexts] = useState<Array<{name: string, type: string, content?: string, url?: string}>>([]);
  const [skills, setSkills] = useState<Array<{name: string, description: string}>>([]);
  const messageStartTimes = useRef<Map<string, number>>(new Map());
  const messageTokenCounts = useRef<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time AI communication
  const { socket, isConnected: wsConnected } = useWebSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMessageContent = (message: Message) => {
    return (
      <div className="space-y-2">
        {/* Show attachment icon if attachments exist */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex items-center space-x-2 mb-2">
            {message.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                title={`View ${attachment.name}`}
              >
                <span>
                  {attachment.type === 'image' ? '🖼️' :
                   attachment.type === 'video' ? '🎥' :
                   attachment.type === 'audio' ? '🎵' : '📄'}
                </span>
                <span className="max-w-[100px] truncate">{attachment.name}</span>
              </a>
            ))}
          </div>
        )}

        {/* Show small preview for images */}
        {message.attachments?.map((attachment, index) => (
          attachment.type === 'image' && (
            <div key={`preview-${index}`} className="mb-2">
              <img 
                src={attachment.url} 
                alt={attachment.name}
                className="max-w-[200px] rounded shadow-sm cursor-pointer hover:opacity-90"
                onClick={() => window.open(attachment.url, '_blank')}
                title="Click to view full size"
              />
            </div>
          )
        ))}
        
        {/* Then show text content */}
        <ReactMarkdownComponent
          className="prose prose-base max-w-none"
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighterComponent
                  style={tomorrow}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-md"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighterComponent>
              ) : (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdownComponent>
      </div>
    );
  };

  useEffect(() => {
    scrollToBottom();
    
    // Auto-save conversation when messages change (only if enabled)
    if (autoSave && messages.length > 0 && safeCurrentSessionId) {
      saveConversationToStorage();
    }
  }, [messages]);

  const saveConversationToStorage = async () => {
    try {
      const token = localStorage.getItem('team_session_token');
      if (!token || !safeCurrentSessionId) return;

      await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        })
      });
      
      // Refresh conversation list to show updated preview
      loadConversationList();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Handle Socket.IO AI stream chunks
  useEffect(() => {
    if (socket && wsConnected) {
      const handleAIStreamChunk = (data: any) => {
        if (data.type === 'chunk' && data.messageId) {
          setLoading(false); // Hide loading indicator on first chunk
          
          // Track first chunk time
          if (!messageStartTimes.current.has(data.messageId)) {
            const now = Date.now();
            messageStartTimes.current.set(data.messageId, now);
            console.log('[Metrics] Started tracking for message:', data.messageId, 'at', now);
          }
          
          // Track token count (approximate: ~4 chars per token)
          const currentCount = messageTokenCounts.current.get(data.messageId) || 0;
          const newCount = currentCount + Math.ceil(data.content.length / 4);
          messageTokenCounts.current.set(data.messageId, newCount);
          console.log('[Metrics] Token count for', data.messageId, ':', newCount);
          
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, content: msg.content + data.content }
              : msg
          ));
        } else if (data.type === 'complete') {
          setLoading(false);
          
          // Calculate metrics
          const startTime = messageStartTimes.current.get(data.messageId);
          const tokenCount = messageTokenCounts.current.get(data.messageId);
          
          console.log('[Metrics] Complete for message:', data.messageId);
          console.log('[Metrics] Start time:', startTime);
          console.log('[Metrics] Token count:', tokenCount);
          console.log('[Metrics] Current maps:', {
            startTimes: Array.from(messageStartTimes.current.entries()),
            tokenCounts: Array.from(messageTokenCounts.current.entries())
          });
          
          if (startTime && tokenCount) {
            const responseTime = Date.now() - startTime;
            const tokensPerSecond = (tokenCount / responseTime) * 1000;
            
            console.log('[Metrics] Calculated:', { responseTime, tokensPerSecond, tokenCount });
            
            setMessages(prev => prev.map(msg => 
              msg.id === data.messageId 
                ? { 
                    ...msg, 
                    metrics: {
                      responseTime,
                      tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
                      totalTokens: tokenCount
                    }
                  }
                : msg
            ));
            
            // Clean up
            messageStartTimes.current.delete(data.messageId);
            messageTokenCounts.current.delete(data.messageId);
          } else {
            console.log('[Metrics] ERROR: Missing data for metrics calculation');
          }
        } else if (data.type === 'error') {
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, content: 'Error: ' + data.message }
              : msg
          ));
          setLoading(false);
        }
      };

      socket.on('ai_stream_chunk', handleAIStreamChunk);

      return () => {
        socket.off('ai_stream_chunk', handleAIStreamChunk);
      };
    }
  }, [socket, wsConnected]);

  useEffect(() => {
    console.log('[DEBUG] TaskAgent component mounted');
    // Check authentication first
    const token = localStorage.getItem('team_session_token');
    if (!token) {
      console.log('[DEBUG] No team session token found');
      return;
    }
    
    console.log('[DEBUG] Creating new conversation and loading list');
    // Create new conversation on mount
    createNewConversation();
    loadConversationList();
  }, []);

  const createNewConversation = async () => {
    console.log('[DEBUG] createNewConversation called');
    try {
      const token = localStorage.getItem('team_session_token');
      if (!token) {
        console.log('[DEBUG] No token in createNewConversation');
        return;
      }
      
      console.log('[DEBUG] Calling createConversationOnFirstMessage');
      // Create conversation immediately instead of waiting for first message
      const sessionId = await createConversationOnFirstMessage();
      if (sessionId) {
        console.log('[DEBUG] Session created:', sessionId);
        setCurrentSessionId(sessionId);
      } else {
        console.log('[DEBUG] No session ID returned');
      }
      setMessages([]);
    } catch (error) {
      console.error('[DEBUG] Error in createNewConversation:', error);
    }
  };

  const createConversationOnFirstMessage = async () => {
    console.log('[DEBUG] createConversationOnFirstMessage started');
    try {
      const token = localStorage.getItem('team_session_token');
      if (!token) {
        console.log('[DEBUG] No token found');
        return null;
      }
      
      console.log('[DEBUG] Making POST request to /api/sessions');
      const response = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('[DEBUG] Response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Response data:', data);
        setCurrentSessionId(data.sessionId);
        loadConversationList();
        return data.sessionId;
      } else if (response.status === 401) {
        console.log('[DEBUG] 401 Unauthorized - redirecting to login');
        window.location.href = '/team/login';
      } else {
        console.log('[DEBUG] Request failed with status:', response.status);
      }
      return null;
    } catch (error) {
      console.error('[DEBUG] Error in createConversationOnFirstMessage:', error);
      return null;
    }
  };

  const loadConversationList = async () => {
    try {
      const token = localStorage.getItem('team_session_token');
      const response = await fetch(`${STORAGE_BASE}/api/conversations/list?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        setConversations([]);
      }
    } catch (error) {
      setConversations([]);
    }
  };

  const switchConversation = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('team_session_token');
      const response = await fetch(`${STORAGE_BASE}/api/conversations/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(data.sessionId);
        const formattedMessages = data.messages.map((msg: any, index: number) => ({
          id: index.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        
        // Load contexts and skills
        const [ctxRes, skillRes] = await Promise.all([
          fetch(`${STORAGE_BASE}/api/conversations/${sessionId}/contexts`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${STORAGE_BASE}/api/conversations/${sessionId}/skills`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          setContexts(ctxData.contexts || []);
        }
        if (skillRes.ok) {
          const skillData = await skillRes.json();
          setSkills(skillData.skills || []);
        }
      }
    } catch (error) {
    }
  };

  const loadConversation = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('team_session_token');
      const response = await fetch(`${STORAGE_BASE}/api/conversations/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(data.sessionId);
        const formattedMessages = (data.messages || []).map((msg: any, index: number) => ({
          id: index.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const renameConversation = async (sessionId: string, newName: string) => {
    try {
      const token = localStorage.getItem('team_session_token');
      const response = await fetch(`${STORAGE_BASE}/api/conversations/${sessionId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        loadConversationList();
        setEditingConversation(null);
      } else {
        const errorData = await response.text();
      }
    } catch (error) {
    }
  };

  const deleteConversation = async (sessionId: string) => {
    if (!confirm('Delete this conversation?')) return;
    
    try {
      const token = localStorage.getItem('team_session_token');
      console.log('[DELETE] Deleting conversation:', sessionId);
      
      const response = await fetch(`${STORAGE_BASE}/api/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('[DELETE] Response status:', response.status);
      
      if (response.ok) {
        console.log('[DELETE] Successfully deleted, reloading list');
        
        // Remove from local state immediately
        setConversations(prev => prev.filter(c => c.sessionId !== sessionId));
        
        // If deleting current conversation, create new one
        if (sessionId === currentSessionId) {
          createNewConversation();
        }
        
        // Reload list from server
        await loadConversationList();
      } else {
        const error = await response.text();
        console.error('[DELETE] Failed to delete:', error);
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('[DELETE] Error:', error);
      alert('Error deleting conversation');
    }
  };

  const searchConversations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    
    try {
      const token = localStorage.getItem('team_session_token');
      const response = await fetch(`${STORAGE_BASE}/api/conversations/search?query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.conversations || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const groupConversationsByDate = (convs: Conversation[]) => {
    if (!convs || !Array.isArray(convs)) {
      return {};
    }
    
    const groups: { [key: string]: Conversation[] } = {};
    
    convs.forEach(conv => {
      const date = new Date(conv.lastActivity);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString();
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(conv);
    });
    
    return groups;
  };

  const startEdit = (sessionId: string, currentName: string) => {
    setEditingConversation(sessionId);
    setEditName(currentName);
  };

  const handleCommand = async (command: string): Promise<boolean> => {
    const token = localStorage.getItem('team_session_token');
    if (!token || !safeCurrentSessionId) return false;

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    try {
      if (cmd === '/help') {
        // Show ALL commands: frontend + backend
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Available Commands:**

**Context & Skill Commands (Frontend):**
- \`/contexts\` - Display all contexts
- \`/context add_url {name} {url}\` - Add URL context
- \`/context add {name} {description}\` - Add text block context
- \`/context remove {name}\` - Remove context
- \`/skills\` - Display all skills
- \`/skill add {name} {description}\` - Add skill
- \`/skill remove {name}\` - Remove skill
- \`/skill edit {name} {description}\` - Edit skill

**AI Agent Commands (Backend):**
- \`/help\` - Show this help message
- \`/clear\` - Clear conversation history
- \`/stats\` - Show session statistics
- \`/model\` - Show current model
- \`/quit\`, \`/exit\` - Exit (not applicable in web)
- \`/compress\` - Compress conversation history
- \`/about\` - About this application
- \`/save_session {name}\` - Save current session
- \`/load_session {name}\` - Load saved session
- \`/sessions\` - List all saved sessions
- \`/delete_session {name}\` - Delete saved session
- \`/agent\` - Show current agent
- \`/agents\` - List all available agents
- \`/switch_agent {id}\` - Switch to a different agent

Use \`!\` prefix for direct shell commands (e.g., \`!ls -la\`)`,
          timestamp: new Date()
        }]);
        return true;
      }

      if (cmd === '/contexts') {
        const res = await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/contexts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setContexts(data.contexts || []);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.contexts?.length ? 
            `**Contexts:**\n${data.contexts.map((c: any) => `- ${c.name} (${c.type})`).join('\n')}` :
            'No contexts added yet.',
          timestamp: new Date()
        }]);
        return true;
      }

      if (cmd === '/context') {
        const action = parts[1]?.toLowerCase();
        if (action === 'add_url' && parts.length >= 4) {
          const name = parts[2];
          const url = parts.slice(3).join(' ');
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/contexts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, type: 'url', url })
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Added context "${name}" with URL: ${url}`,
            timestamp: new Date()
          }]);
          return true;
        }
        if (action === 'add' && parts.length >= 4) {
          const name = parts[2];
          const content = parts.slice(3).join(' ');
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/contexts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, type: 'block', content })
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Added context "${name}"`,
            timestamp: new Date()
          }]);
          return true;
        }
        if (action === 'remove' && parts.length >= 3) {
          const name = parts[2];
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/contexts/${name}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Removed context "${name}"`,
            timestamp: new Date()
          }]);
          return true;
        }
      }

      if (cmd === '/skills') {
        const res = await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/skills`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSkills(data.skills || []);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.skills?.length ?
            `**Skills:**\n${data.skills.map((s: any) => `- ${s.name}: ${s.description}`).join('\n')}` :
            'No skills added yet.',
          timestamp: new Date()
        }]);
        return true;
      }

      if (cmd === '/skill') {
        const action = parts[1]?.toLowerCase();
        if (action === 'add' && parts.length >= 4) {
          const name = parts[2];
          const description = parts.slice(3).join(' ');
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, description })
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Added skill "${name}"`,
            timestamp: new Date()
          }]);
          return true;
        }
        if (action === 'remove' && parts.length >= 3) {
          const name = parts[2];
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/skills/${name}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Removed skill "${name}"`,
            timestamp: new Date()
          }]);
          return true;
        }
        if (action === 'edit' && parts.length >= 4) {
          const name = parts[2];
          const description = parts.slice(3).join(' ');
          await fetch(`${STORAGE_BASE}/api/conversations/${safeCurrentSessionId}/skills/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ description })
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✓ Updated skill "${name}"`,
            timestamp: new Date()
          }]);
          return true;
        }
      }
    } catch (error) {
      console.error('Command error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✗ Command failed: ${error}`,
        timestamp: new Date()
      }]);
      return true;
    }

    return false;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Check if it's a command
    if (input.startsWith('/')) {
      const handled = await handleCommand(input);
      if (handled) {
        setInput('');
        return;
      }
    }

    const token = localStorage.getItem('team_session_token');
    if (!token) {
      window.location.href = '/team/login';
      return;
    }

    // Create conversation on first message if not exists
    let sessionId = safeCurrentSessionId;
    if (!sessionId || sessionId === '') {
      sessionId = await createConversationOnFirstMessage();
      if (!sessionId) return;
    }

    const userId = localStorage.getItem('team_username') || 'anonymous';

    // Upload files to storage API first
    let attachments: Array<{type: 'image' | 'video' | 'audio' | 'document', url: string, name: string}> = [];
    
    if (uploadedFiles.length > 0) {
      try {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('sessionId', sessionId);
        
        uploadedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch(`${STORAGE_BASE}/api/attachments/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          attachments = data.attachments.map((att: any) => ({
            type: att.type,
            url: `${STORAGE_BASE}${att.url}`,
            name: att.name
          }));
        } else {
          console.error('Failed to upload attachments');
        }
      } catch (error) {
        console.error('Error uploading attachments:', error);
      }
    }

    // Extract text content from text-based files and append to message
    let enhancedMessage = input;
    if (uploadedFiles.length > 0) {
      const fileContents = await Promise.all(
        uploadedFiles.map(async (file) => {
          // Read text-based files
          if (file.type.includes('text') || 
              file.type.includes('json') || 
              file.type.includes('javascript') ||
              file.type.includes('typescript') ||
              file.name.endsWith('.md') ||
              file.name.endsWith('.txt') ||
              file.name.endsWith('.json') ||
              file.name.endsWith('.js') ||
              file.name.endsWith('.ts') ||
              file.name.endsWith('.tsx') ||
              file.name.endsWith('.jsx')) {
            const text = await file.text();
            return `\n\n--- Content of ${file.name} ---\n${text}\n--- End of ${file.name} ---`;
          }
          return `\n\n[File attached: ${file.name} (${file.type})]`;
        })
      );
      enhancedMessage = input + fileContents.join('');
    }

    // Append contexts and skills to message
    if (contexts.length > 0 || skills.length > 0) {
      let contextBlock = '\n\n--- Session Context ---\n';
      
      if (contexts.length > 0) {
        contextBlock += '\nContexts:\n';
        contexts.forEach(ctx => {
          if (ctx.type === 'url') {
            contextBlock += `- ${ctx.name}: ${ctx.url}\n`;
          } else {
            contextBlock += `- ${ctx.name}: ${ctx.content}\n`;
          }
        });
      }
      
      if (skills.length > 0) {
        contextBlock += '\nSkills:\n';
        skills.forEach(skill => {
          contextBlock += `- ${skill.name}: ${skill.description}\n`;
        });
      }
      
      contextBlock += '--- End Session Context ---\n';
      enhancedMessage += contextBlock;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    console.log('[DEBUG] User message created:', {
      hasAttachments: !!userMessage.attachments,
      attachmentCount: attachments.length,
      attachments: attachments
    });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedFiles([]); // Clear uploaded files after sending
    setLoading(true);

    // Create assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Send message via Socket.IO if connected
      if (wsConnected && socket) {
        console.log('[DEBUG] Sending ai_chat message:', {
          userId,
          sessionId: safeCurrentSessionId,
          message: enhancedMessage,
          messageId: assistantMessageId
        });
        
        socket.emit('ai_chat', {
          userId,
          sessionId: safeCurrentSessionId,
          message: enhancedMessage,
          messageId: assistantMessageId
        });
      } else {
        console.log('[DEBUG] WebSocket not connected. wsConnected:', wsConnected, 'socket:', !!socket);
        // Fallback: show error message
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'WebSocket connection not available. Please refresh the page and try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
      setLoading(false);
    }
  };

  const cancelRequest = () => {
    if (socket && wsConnected) {
      socket.emit('chat:cancel');
    }
    setLoading(false);
    
    // Remove the last assistant message if it's empty
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content.trim()) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Conversation Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Conversations</h3>
              <button
                onClick={createNewConversation}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                New
              </button>
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchConversations(e.target.value);
              }}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {searchQuery ? (
              // Search Results
              searchLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <div className="px-3 py-2 bg-blue-50 text-xs font-medium text-blue-700 border-b">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map((conv) => (
                    <div key={conv.sessionId} className="p-3 border-b border-gray-100">
                      <div
                        onClick={() => {
                          switchConversation(conv.sessionId);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {conv.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {conv.preview}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No conversations found matching "{searchQuery}"
                </div>
              )
            ) : (
              // Grouped Conversations
              Object.entries(groupConversationsByDate(conversations || [])).map(([date, convs]) => (
                <div key={date}>
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 border-b">
                    {date}
                  </div>
                  {convs.map((conv) => (
                    <div
                      key={conv.sessionId}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${
                        conv.sessionId === currentSessionId ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      {editingConversation === conv.sessionId ? (
                        <div className="space-y-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-sm border rounded px-2 py-1"
                            onKeyPress={(e) => e.key === 'Enter' && renameConversation(conv.sessionId, editName)}
                            autoFocus
                          />
                          <div className="flex space-x-1">
                            <button
                              onClick={() => renameConversation(conv.sessionId, editName)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingConversation(null)}
                              className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            onClick={() => switchConversation(conv.sessionId)}
                            className="cursor-pointer"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {conv.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(conv.lastActivity).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {conv.messageCount} messages
                            </div>
                          </div>
                          <div className="flex space-x-1 mt-2">
                            <button
                              onClick={() => loadConversation(conv.sessionId)}
                              className="text-xs text-green-600 hover:text-green-800"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => startEdit(conv.sessionId, conv.name)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => deleteConversation(conv.sessionId)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <p className="text-sm text-gray-700">
                Session: {safeCurrentSessionId ? safeCurrentSessionId.substring(0, 20) : 'No session'}
              </p>
              <span className="text-sm">
                {wsConnected ? (
                  <span className="text-green-600">● Connected</span>
                ) : (
                  <span className="text-red-600">● Disconnected</span>
                )}
              </span>
              <label className="flex items-center space-x-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-600">Auto-save</span>
              </label>
            </div>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showSidebar ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className={`px-4 py-2 rounded-lg relative ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white max-w-xs lg:max-w-md'
                    : 'bg-gray-100 text-gray-900 max-w-[80%]'
                }`}
              >
                <div className="space-y-2">
                  {renderMessageContent(message)}
                  <div className="flex items-center justify-between text-xs mt-1 opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.role === 'assistant' && message.metrics && (
                      <span className="ml-2">
                        {(message.metrics.responseTime / 1000).toFixed(1)}s • {message.metrics.tokensPerSecond} tok/s
                      </span>
                    )}
                    {message.role === 'assistant' && !message.metrics && (
                      <span className="ml-2 text-gray-400">No metrics</span>
                    )}
                  </div>
                </div>
                
                {/* Message Actions */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <button
                    onClick={() => navigator.clipboard.writeText(message.content)}
                    className={`p-1 rounded hover:bg-opacity-20 ${message.role === 'user' ? 'hover:bg-white' : 'hover:bg-gray-400'}`}
                    title="Copy"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => {
                      setInput(message.content);
                      setMessages(prev => prev.filter(m => m.id !== message.id));
                    }}
                    className={`p-1 rounded hover:bg-opacity-20 ${message.role === 'user' ? 'hover:bg-white' : 'hover:bg-gray-400'}`}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setMessages(prev => prev.filter(m => m.id !== message.id))}
                    className={`p-1 rounded hover:bg-opacity-20 ${message.role === 'user' ? 'hover:bg-white' : 'hover:bg-gray-400'}`}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 w-full px-4 py-2 rounded-lg">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">Assistant is typing...</span>
                  </div>
                  <button
                    onClick={cancelRequest}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          {/* Contexts and Skills Display */}
          {(contexts.length > 0 || skills.length > 0) && (
            <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200 text-xs">
              {contexts.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Contexts:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contexts.map((ctx, i) => (
                      <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {ctx.name} ({ctx.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {skills.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {skills.map((skill, i) => (
                      <span key={i} className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File attachments preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm">
                  <span className="mr-2">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your team project..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.html,.htm,.md,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.swift,.kt,.scala,.sh,.bash,.json,.xml,.yaml,.yml,.css,.scss,.sass,.sql,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.svg,.webp,.mp3,.wav,.ogg,.mp4,.webm,.avi,.mov"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              title="Upload files"
            >
              📎
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
