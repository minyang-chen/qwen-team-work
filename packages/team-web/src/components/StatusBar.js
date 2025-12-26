import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
export function StatusBar() {
    const [authInfo, setAuthInfo] = useState(null);
    const [tokenLimit, setTokenLimit] = useState(32000);
    const { sessionId, sessionStats, tokensPerSecond, isStreaming } = useChatStore();
    useEffect(() => {
        fetch('/api/auth/info', {
            credentials: 'include',
            cache: 'no-store',
        })
            .then((res) => res.json())
            .then((data) => setAuthInfo(data))
            .catch(() => setAuthInfo(null));
        fetch('/api/settings')
            .then((res) => res.json())
            .then((data) => setTokenLimit(data.sessionTokenLimit))
            .catch(() => setTokenLimit(32000));
    }, []);
    if (!authInfo)
        return null;
    const tokenUsage = sessionStats?.tokenUsage?.totalTokens || 0;
    const percentage = (tokenUsage / tokenLimit) * 100;
    const color = percentage >= 90
        ? 'text-red-600'
        : percentage >= 80
            ? 'text-yellow-600'
            : 'text-gray-600';
    return (_jsx("div", { className: "border-t border-gray-200 bg-gray-50 px-4 py-1.5", children: _jsxs("div", { className: "max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 bg-green-500 rounded-full" }), _jsx("span", { className: "font-medium", children: authInfo.loginType === 'openai' ? 'OpenAI' : 'Qwen OAuth' })] }), authInfo.baseUrl && (_jsxs("span", { className: "text-gray-500", children: ["\u2022 ", authInfo.baseUrl] }))] }), sessionId && (_jsxs("div", { className: "flex items-center gap-4", children: [isStreaming && tokensPerSecond > 0 && (_jsxs("span", { className: "text-blue-600 font-medium", children: [tokensPerSecond, " tok/s"] })), _jsxs("div", { className: `flex items-center gap-2 ${color}`, children: [_jsxs("span", { children: ["Tokens: ", tokenUsage.toLocaleString(), " /", ' ', tokenLimit.toLocaleString()] }), _jsxs("span", { className: "font-medium", children: ["(", Math.round(percentage), "%)"] })] })] }))] }) }));
}
