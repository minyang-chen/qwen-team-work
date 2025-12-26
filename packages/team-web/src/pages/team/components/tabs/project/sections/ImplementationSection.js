import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ImplementationSection = ({ implementations, onUpdate, onDelete, onCreate }) => {
    const [newImplementation, setNewImplementation] = useState({});
    const handleCreate = () => {
        if (newImplementation.title) {
            onCreate({
                title: newImplementation.title,
                description: newImplementation.description || '',
                technology: newImplementation.technology || 'JavaScript',
                status: newImplementation.status || 'Planning',
                projectId: ''
            });
            setNewImplementation({});
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-6", children: "Implementation" }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Implementation" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Implementation Title", value: newImplementation.title || '', onChange: (e) => setNewImplementation({ ...newImplementation, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newImplementation.technology || 'JavaScript', onChange: (e) => setNewImplementation({ ...newImplementation, technology: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "JavaScript", children: "JavaScript" }), _jsx("option", { value: "TypeScript", children: "TypeScript" }), _jsx("option", { value: "Python", children: "Python" }), _jsx("option", { value: "Java", children: "Java" }), _jsx("option", { value: "C#", children: "C#" }), _jsx("option", { value: "Go", children: "Go" }), _jsx("option", { value: "Rust", children: "Rust" })] })] }), _jsx("textarea", { placeholder: "Implementation Description", value: newImplementation.description || '', onChange: (e) => setNewImplementation({ ...newImplementation, description: e.target.value }), className: "mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 4 }), _jsx("button", { onClick: handleCreate, className: "mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700", children: "Create Implementation" })] }), _jsx("div", { className: "space-y-4", children: implementations.map((impl) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-lg font-medium", children: impl.title }), _jsx("button", { onClick: () => onDelete(impl._id), className: "text-red-600 hover:text-red-800", children: "Delete" })] }), _jsx("p", { className: "text-gray-600 mb-3", children: impl.description }), _jsx("div", { className: "flex gap-4 text-sm", children: _jsx("span", { className: "px-2 py-1 rounded-full bg-orange-100 text-orange-800", children: impl.technology }) })] }, impl._id))) })] }) }));
};
