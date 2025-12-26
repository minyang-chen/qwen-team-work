import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { teamApi } from '../../services/team/api';
export function TeamSignup({ onSuccess, onSwitchToLogin }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const data = await teamApi.signup({
                username: formData.username,
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password
            });
            if (data.error) {
                setError(data.error.message);
            }
            else {
                setApiKey(data.api_key);
            }
        }
        catch (err) {
            setError('Signup failed');
        }
        finally {
            setLoading(false);
        }
    };
    if (apiKey) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "max-w-md w-full bg-white p-8 rounded-lg shadow", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Registration Successful!" }), _jsxs("div", { className: "mb-4 p-4 bg-green-100 rounded", children: [_jsx("p", { className: "font-medium mb-2", children: "Your API Key:" }), _jsx("code", { className: "block p-2 bg-gray-100 rounded text-sm break-all", children: apiKey }), _jsx("p", { className: "text-sm mt-2 text-gray-600", children: "Save this key securely. You won't see it again." })] }), _jsx("button", { onClick: onSuccess, className: "w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700", children: "Continue to Login" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "max-w-md w-full bg-white p-8 rounded-lg shadow", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Create User Account" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Create your account first. You can create or join teams after logging in." }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-100 text-red-700 rounded", children: error })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Username" }), _jsx("input", { type: "text", value: formData.username, onChange: (e) => setFormData({ ...formData, username: e.target.value }), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Email" }), _jsx("input", { type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Full Name" }), _jsx("input", { type: "text", value: formData.full_name, onChange: (e) => setFormData({ ...formData, full_name: e.target.value }), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Password" }), _jsx("input", { type: "password", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Confirm Password" }), _jsx("input", { type: "password", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }), className: "w-full px-3 py-2 border rounded", required: true })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50", children: loading ? 'Creating Account...' : 'Sign Up' })] }), _jsxs("p", { className: "mt-4 text-center text-sm", children: ["Already have an account?", ' ', _jsx("button", { onClick: onSwitchToLogin, className: "text-blue-600 hover:underline", children: "Login" })] })] }) }));
}
