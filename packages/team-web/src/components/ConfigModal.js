import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
export function ConfigModal({ isOpen, onClose, type }) {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(false);
    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/config/${type}`);
            const data = await response.json();
            setConfig(data);
        }
        catch (error) {
        }
        finally {
            setLoading(false);
        }
    }, [type]);
    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen, fetchConfig]);
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-2xl font-bold text-gray-900", children: [type === 'individual' ? 'Individual' : 'Team', " Settings"] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }) }), _jsx("div", { className: "p-6 overflow-y-auto max-h-[calc(80vh-140px)]", children: loading ? (_jsx("div", { className: "text-center py-8", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" }) })) : (_jsx("div", { className: "space-y-4", children: Object.entries(config).map(([key, value]) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: key }), _jsx("input", { type: "text", value: value, readOnly: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono text-sm" })] }, key))) })) }), _jsx("div", { className: "p-6 border-t border-gray-200", children: _jsx("button", { onClick: onClose, className: "w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors", children: "Close" }) })] }) }));
}
