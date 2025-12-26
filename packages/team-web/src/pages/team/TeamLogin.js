import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { teamApi } from '../../services/team/api';
export function TeamLogin({ onSuccess, onSwitchToSignup }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await teamApi.login(username, password);
            if (data.error) {
                setError(data.error.message);
            }
            else {
                onSuccess();
            }
        }
        catch (err) {
            setError('Login failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "max-w-md w-full bg-white p-8 rounded-lg shadow", children: [_jsx("h2", { className: "text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6", children: "User Login" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Login to access your workspace and teams." }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-100 text-red-700 rounded", children: error })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Username" }), _jsx("input", { type: "text", value: username, onChange: (e) => setUsername(e.target.value), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50", children: loading ? 'Logging in...' : 'Login' })] }), _jsxs("p", { className: "mt-4 text-center text-sm", children: ["Don't have an account?", ' ', _jsx("button", { onClick: onSwitchToSignup, className: "text-blue-600 hover:underline", children: "Sign up" })] })] }) }));
}
