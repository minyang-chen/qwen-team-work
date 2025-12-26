import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export function Settings({ isOpen, onClose }) {
    const [settings, setSettings] = useState({
        sessionTokenLimit: 32000,
        visionModelPreview: true,
        vlmSwitchMode: 'ask',
    });
    const [authInfo, setAuthInfo] = useState(null);
    useEffect(() => {
        if (isOpen) {
            setAuthInfo(null); // Clear previous data
            fetch('/api/auth/info', {
                credentials: 'include',
                cache: 'no-store',
            })
                .then((res) => res.json())
                .then((data) => setAuthInfo(data))
                .catch(() => setAuthInfo(null));
        }
    }, [isOpen]);
    const handleSave = () => {
        // Save to localStorage or send to server
        localStorage.setItem('qwen-settings', JSON.stringify(settings));
        onClose();
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Settings" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Configure your Qwen Code experience" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [authInfo && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900 mb-3", children: "Connection Information" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-xs text-gray-600", children: "Login Type:" }), _jsx("span", { className: "text-xs font-medium text-gray-900", children: authInfo.loginType === 'openai'
                                                        ? 'OpenAI Compatible'
                                                        : 'Qwen OAuth' })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-xs text-gray-600", children: "Base URL:" }), _jsx("span", { className: "text-xs font-medium text-gray-900 truncate ml-2", children: authInfo.baseUrl || 'N/A' })] }), authInfo.model && (_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-xs text-gray-600", children: "Model:" }), _jsx("span", { className: "text-xs font-medium text-gray-900", children: authInfo.model })] }))] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Session Token Limit" }), _jsx("input", { type: "number", value: settings.sessionTokenLimit, onChange: (e) => setSettings({
                                        ...settings,
                                        sessionTokenLimit: parseInt(e.target.value),
                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", min: "1000", step: "1000" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Maximum tokens per conversation session (default: 32000)" })] }), _jsx("div", { children: _jsxs("label", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-sm font-semibold text-gray-900", children: "Vision Model Preview" }), _jsx("span", { className: "text-xs text-gray-500", children: "Enable automatic vision model detection for images" })] }), _jsx("input", { type: "checkbox", checked: settings.visionModelPreview, onChange: (e) => setSettings({
                                            ...settings,
                                            visionModelPreview: e.target.checked,
                                        }), className: "w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 mb-2", children: "Vision Model Switch Mode" }), _jsxs("select", { value: settings.vlmSwitchMode, onChange: (e) => setSettings({
                                        ...settings,
                                        vlmSwitchMode: e.target.value,
                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "ask", children: "Ask each time" }), _jsx("option", { value: "once", children: "Switch once per query" }), _jsx("option", { value: "session", children: "Switch for entire session" }), _jsx("option", { value: "persist", children: "Never switch automatically" })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "How to handle vision model switching when images are detected" })] })] }), _jsxs("div", { className: "px-6 py-4 border-t border-gray-200 flex gap-3", children: [_jsx("button", { onClick: handleSave, className: "flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium", children: "Save" }), _jsx("button", { onClick: onClose, className: "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors", children: "Cancel" })] })] }) }));
}
