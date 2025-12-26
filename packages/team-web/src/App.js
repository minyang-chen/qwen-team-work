import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { Login } from './components/Login';
import { useChatStore } from './store/chatStore';
export function App() {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const { setSessionId, setSessions, addSession, loadSettings } = useChatStore();
    useEffect(() => {
        async function init() {
            try {
                // Load settings first
                await loadSettings();
                // Check authentication first
                const authRes = await fetch('/api/sessions', {
                    credentials: 'include',
                });
                if (!authRes.ok) {
                    setAuthenticated(false);
                    setLoading(false);
                    // Redirect to /individual/login if not on login page
                    const path = window.location.pathname;
                    if (path !== '/individual/login' && path.startsWith('/individual')) {
                        window.history.replaceState({}, '', '/individual/login');
                    }
                    return;
                }
                const sessions = await authRes.json();
                setSessions(sessions);
                // Create or use first session
                if (sessions.length > 0) {
                    setSessionId(sessions[0].id);
                }
                else {
                    const newSessionRes = await fetch('/api/sessions', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                    });
                    if (newSessionRes.ok) {
                        const { sessionId } = await newSessionRes.json();
                        const newSession = {
                            id: sessionId,
                            createdAt: new Date().toISOString(),
                            lastActivity: new Date().toISOString(),
                        };
                        addSession(newSession);
                        setSessionId(sessionId);
                    }
                }
                setAuthenticated(true);
                // Redirect to /individual/codeagent if authenticated and on login page
                const path = window.location.pathname;
                if (path === '/individual/login') {
                    window.history.replaceState({}, '', '/individual/codeagent');
                }
            }
            catch (error) {
                setAuthenticated(false);
            }
            finally {
                setLoading(false);
            }
        }
        init();
    }, [setSessionId, setSessions, addSession, loadSettings]);
    const handleLoginSuccess = () => {
        setAuthenticated(true);
        window.location.href = '/individual/codeagent';
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" }), _jsx("div", { className: "text-xl font-medium text-gray-700", children: "Loading..." })] }) }));
    }
    if (!authenticated) {
        return _jsx(Login, { onSuccess: handleLoginSuccess });
    }
    return _jsx(ChatContainer, {});
}
