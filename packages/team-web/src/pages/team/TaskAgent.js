import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../../config/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useWebSocket } from '../../hooks/useWebSocket';
// Type assertions for third-party components
const ReactMarkdownComponent = ReactMarkdown;
const SyntaxHighlighterComponent = SyntaxHighlighter;
export function TaskAgent({ workspaceType, selectedTeamId }) {
    const { socket, isConnected } = useWebSocket();
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState('');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [editingConversation, setEditingConversation] = useState(null);
    const [editName, setEditName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const renderMessageContent = (message) => {
        return (_jsxs("div", { className: "space-y-2", children: [_jsx(ReactMarkdownComponent, { className: "prose prose-sm max-w-none", components: {
                        code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (_jsx(SyntaxHighlighterComponent, { style: tomorrow, language: match[1], PreTag: "div", className: "rounded-md", ...props, children: String(children).replace(/\n$/, '') })) : (_jsx("code", { className: "bg-gray-100 px-1 py-0.5 rounded text-xs", ...props, children: children }));
                        },
                    }, children: message.content }), message.attachments?.map((attachment, index) => (_jsxs("div", { className: "mt-2", children: [attachment.type === 'image' && (_jsx("img", { src: attachment.url, alt: attachment.name, className: "max-w-xs rounded-lg shadow-sm" })), attachment.type === 'video' && (_jsx("video", { src: attachment.url, controls: true, className: "max-w-xs rounded-lg shadow-sm" })), attachment.type === 'audio' && (_jsx("audio", { src: attachment.url, controls: true, className: "w-full max-w-xs" })), attachment.type === 'document' && (_jsxs("a", { href: attachment.url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100", children: ["\uD83D\uDCC4 ", attachment.name] }))] }, index)))] }));
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        if (!socket) return;
        
        console.log('Setting up WebSocket event listeners', { service: 'team-web' });
        
        socket.on('connect', () => {
            console.log('WebSocket connected');
        });
        
        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
        
        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        socket.on('message:chunk', (chunk) => {
            console.log('Received message:chunk', chunk);
            if (chunk.type === 'text' && chunk.data.text) {
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.streaming) {
                        return prev.map((msg, index) => 
                            index === prev.length - 1 
                                ? { ...msg, content: msg.content + chunk.data.text }
                                : msg
                        );
                    }
                    return prev;
                });
            }
        });
        
        socket.on('message:complete', () => {
            console.log('Received message:complete');
            setMessages(prev => prev.map((msg, index) => 
                index === prev.length - 1 && msg.streaming
                    ? { ...msg, streaming: false }
                    : msg
            ));
            setLoading(false);
        });
        
        socket.on('message:error', (error) => {
            console.error('Received message:error', error);
            setLoading(false);
            const errorMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        });
        
        return () => {
            console.log('Cleaning up WebSocket event listeners');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('error');
            socket.off('message:chunk');
            socket.off('message:complete');
            socket.off('message:error');
        };
    }, [socket]);
    
    useEffect(() => {
        // Check authentication first
        const token = localStorage.getItem('team_session_token');
        if (!token) {
            return;
        }
        // Create new conversation on mount
        createNewConversation();
        loadConversationList();
    }, []);
    const createNewConversation = async () => {
        try {
            const token = localStorage.getItem('team_session_token');
            if (!token) {
                return;
            }
            // Don't create conversation yet, just set up for new session
            setCurrentSessionId('');
            setMessages([]);
        }
        catch (error) {
        }
    };
    const createConversationOnFirstMessage = async () => {
        try {
            const token = localStorage.getItem('team_session_token');
            console.log('createConversationOnFirstMessage token check:', { hasToken: !!token, tokenLength: token?.length });
            if (!token) {
                return null;
            }
            console.log('Making request to /api/sessions with token');
            const response = await fetch(`${API_BASE}/api/sessions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Session creation response:', { status: response.status, ok: response.ok });
            if (response.ok) {
                const data = await response.json();
                console.log('Session created successfully:', data);
                setCurrentSessionId(data.sessionId);
                // Don't call loadConversationList immediately - let it be called separately
                return data.sessionId;
            }
            else if (response.status === 401) {
                console.log('401 Unauthorized - redirecting to login');
                window.location.href = '/team/login';
            } else {
                console.log('Session creation failed with status:', response.status);
            }
            return null;
        }
        catch (error) {
            console.error('Session creation error:', error);
            return null;
        }
    };
    const loadConversationList = async () => {
        try {
            const token = localStorage.getItem('team_session_token');
            const response = await fetch(`${API_BASE}/api/sessions`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setConversations(data.sessions || []);
            }
            else {
            }
        }
        catch (error) {
        }
    };
    const switchConversation = async (sessionId) => {
        try {
            const token = localStorage.getItem('team_session_token');
            const response = await fetch(`${API_BASE}/api/conversations/${sessionId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentSessionId(data.sessionId);
                const formattedMessages = data.messages.map((msg, index) => ({
                    id: index.toString(),
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(formattedMessages);
            }
        }
        catch (error) {
        }
    };
    const renameConversation = async (sessionId, newName) => {
        try {
            if (!sessionId || sessionId === 'null') {
                console.log('Invalid sessionId for rename:', sessionId);
                return;
            }
            
            const token = localStorage.getItem('team_session_token');
            // Use session API instead of conversation API
            const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/rename`, {
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
            }
            else {
                const errorData = await response.text();
                console.log('Rename failed:', errorData);
            }
        }
        catch (error) {
            console.error('Rename error:', error);
        }
    };
    const deleteConversation = async (sessionId) => {
        if (!confirm('Delete this conversation?'))
            return;
        try {
            const token = localStorage.getItem('team_session_token');
            const response = await fetch(`${API_BASE}/api/conversations/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                if (sessionId === currentSessionId) {
                    createNewConversation();
                }
                loadConversationList();
            }
        }
        catch (error) {
        }
    };
    const searchConversations = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const token = localStorage.getItem('team_session_token');
            const response = await fetch(`${API_BASE}/api/conversations/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.conversations);
            }
        }
        catch (error) {
        }
    };
    const groupConversationsByDate = (convs) => {
        const groups = {};
        if (!convs || !Array.isArray(convs)) return groups;
        convs.forEach(conv => {
            const date = new Date(conv.lastActivity);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            let groupKey;
            if (date.toDateString() === today.toDateString()) {
                groupKey = 'Today';
            }
            else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'Yesterday';
            }
            else {
                groupKey = date.toLocaleDateString();
            }
            if (!groups[groupKey])
                groups[groupKey] = [];
            groups[groupKey].push(conv);
        });
        return groups;
    };
    const startEdit = (sessionId, currentName) => {
        setEditingConversation(sessionId);
        setEditName(currentName);
    };
    const sendMessage = async () => {
        console.log('sendMessage called', { 
            service: 'team-web',
            input: input.trim(), 
            loading, 
            socket, 
            isConnected 
        });
        
        if (!input.trim() || loading || !socket) {
            console.log('sendMessage early return:', { hasInput: !!input.trim(), loading, hasSocket: !!socket });
            return;
        }
        
        const token = localStorage.getItem('team_session_token');
        console.log('Auth token check:', { hasToken: !!token, tokenLength: token?.length });
        if (!token) {
            console.log('No auth token, redirecting to login');
            window.location.href = '/team/login';
            return;
        }

        console.log('Creating conversation if needed, currentSessionId:', currentSessionId);
        
        // Create conversation on first message if not exists
        let sessionId = currentSessionId;
        if (!sessionId) {
            sessionId = await createConversationOnFirstMessage();
            console.log('Created new session:', sessionId);
            if (!sessionId) return;
        }

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };
        
        console.log('Adding user message and sending via WebSocket');
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Create assistant message for streaming
        const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            streaming: true
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Extract userId from JWT token
        const authToken = localStorage.getItem('team_session_token');
        let userId = 'anonymous';
        if (authToken) {
            try {
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                userId = payload.userId || payload.id || 'anonymous';
            } catch (e) {
                console.error('Failed to decode token:', e);
            }
        }

        // Send via WebSocket
        const messageData = {
            userId: userId,
            sessionId: sessionId,
            message: input
        };
        
        console.log('Emitting chat:message', messageData);
        console.log('Socket connected?', socket.connected);
        console.log('Socket ID:', socket.id);
        
        socket.emit('chat:message', messageData);
        
        // Confirm message was sent
        console.log('Message emitted successfully');
        
        // Add debugging for WebSocket events
        socket.on('message:error', (error) => {
            console.error('Received message:error', error);
            setLoading(false);
        });
        
        socket.on('error', (error) => {
            console.error('WebSocket error during message send:', error);
            setLoading(false);
        });
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    return (_jsxs("div", { className: "flex h-full bg-white", children: [showSidebar && (_jsxs("div", { className: "w-64 border-r border-gray-200 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-sm font-medium text-gray-900", children: "Conversations" }), _jsx("button", { onClick: createNewConversation, className: "text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700", children: "New" })] }), _jsx("input", { type: "text", placeholder: "Search conversations...", value: searchQuery, onChange: (e) => {
                                    setSearchQuery(e.target.value);
                                    searchConversations(e.target.value);
                                }, className: "w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: searchQuery ? (
                        // Search Results
                        searchResults.length > 0 ? (searchResults.map((conv) => (_jsx("div", { className: "p-3 border-b border-gray-100", children: _jsxs("div", { onClick: () => switchConversation(conv.sessionId), className: "cursor-pointer hover:bg-gray-50 p-1 rounded", children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: conv.name }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: conv.preview })] }) }, conv.sessionId)))) : (_jsx("div", { className: "p-4 text-center text-gray-500 text-sm", children: "No results found" }))) : (
                        // Grouped Conversations
                        Object.entries(groupConversationsByDate(conversations)).map(([date, convs]) => (_jsxs("div", { children: [_jsx("div", { className: "px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 border-b", children: date }), convs.map((conv) => (_jsx("div", { className: `p-3 border-b border-gray-100 hover:bg-gray-50 ${conv.sessionId === currentSessionId ? 'bg-blue-50 border-blue-200' : ''}`, children: editingConversation === conv.sessionId ? (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { value: editName, onChange: (e) => setEditName(e.target.value), className: "w-full text-sm border rounded px-2 py-1", onKeyPress: (e) => e.key === 'Enter' && renameConversation(conv.sessionId, editName), autoFocus: true }), _jsxs("div", { className: "flex space-x-1", children: [_jsx("button", { onClick: () => renameConversation(conv.sessionId, editName), className: "text-xs bg-green-600 text-white px-2 py-1 rounded", children: "Save" }), _jsx("button", { onClick: () => setEditingConversation(null), className: "text-xs bg-gray-500 text-white px-2 py-1 rounded", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { onClick: () => switchConversation(conv.sessionId), className: "cursor-pointer", children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: conv.name }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [conv.messageCount, " messages \u2022 ", new Date(conv.lastActivity).toLocaleTimeString()] })] }), _jsxs("div", { className: "flex space-x-1 mt-2", children: [_jsx("button", { onClick: () => startEdit(conv.sessionId, conv.name), className: "text-xs text-blue-600 hover:text-blue-800", children: "Rename" }), _jsx("button", { onClick: () => deleteConversation(conv.sessionId), className: "text-xs text-red-600 hover:text-red-800", children: "Delete" })] })] })) }, conv.sessionId)))] }, date)))) })] })), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Team Assistant" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Session: ", (currentSessionId || 'New Session').substring(0, 20), " | Workspace: Team Mode | WebSocket: ", _jsx("span", { className: isConnected ? 'text-green-600' : 'text-red-600', children: isConnected ? 'Connected' : 'Disconnected' })] })] }), _jsx("button", { onClick: () => setShowSidebar(!showSidebar), className: "text-gray-500 hover:text-gray-700", children: showSidebar ? '←' : '→' })] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [messages.map((message) => (_jsx("div", { className: `flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsx("div", { className: `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-900'}`, children: _jsxs("div", { className: "space-y-2", children: [renderMessageContent(message), _jsx("p", { className: "text-xs mt-1 opacity-70", children: message.timestamp.toLocaleTimeString() })] }) }) }, message.id))), loading && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" }), _jsx("span", { className: "text-sm", children: "Assistant is typing..." })] }) }) })), _jsx("div", { ref: messagesEndRef })] }), _jsx("div", { className: "border-t border-gray-200 p-4", children: _jsxs("div", { className: "flex space-x-2", children: [_jsx("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyPress: handleKeyPress, placeholder: "Ask me anything about your team project...", className: "flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 }), _jsx("button", { onClick: sendMessage, disabled: !input.trim() || loading, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: "Send" })] }) })] })] }));
}
