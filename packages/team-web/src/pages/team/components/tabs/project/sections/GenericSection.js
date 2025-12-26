import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const GenericSection = ({ title, items, onUpdate, onDelete, onCreate, color = 'blue' }) => {
    const [newItem, setNewItem] = useState({});
    const handleCreate = () => {
        if (newItem.title) {
            onCreate({
                title: newItem.title,
                description: newItem.description || '',
                status: newItem.status || 'Active',
                projectId: ''
            });
            setNewItem({});
        }
    };
    const colorClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        green: 'bg-green-600 hover:bg-green-700',
        purple: 'bg-purple-600 hover:bg-purple-700',
        indigo: 'bg-indigo-600 hover:bg-indigo-700',
        yellow: 'bg-yellow-600 hover:bg-yellow-700',
        cyan: 'bg-cyan-600 hover:bg-cyan-700',
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
        rose: 'bg-rose-600 hover:bg-rose-700',
        gray: 'bg-gray-600 hover:bg-gray-700'
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-6", children: title }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsxs("h3", { className: "text-md font-medium mb-3", children: ["Create New ", title.slice(0, -1)] }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", placeholder: `${title.slice(0, -1)} Title`, value: newItem.title || '', onChange: (e) => setNewItem({ ...newItem, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { placeholder: `${title.slice(0, -1)} Description`, value: newItem.description || '', onChange: (e) => setNewItem({ ...newItem, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("button", { onClick: handleCreate, className: `px-4 py-2 text-white rounded-md ${colorClasses[color] || colorClasses.blue}`, children: ["Create ", title.slice(0, -1)] })] })] }), _jsx("div", { className: "space-y-4", children: items.map((item) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-lg font-medium", children: item.title }), _jsx("button", { onClick: () => onDelete(item._id), className: "text-red-600 hover:text-red-800", children: "Delete" })] }), _jsx("p", { className: "text-gray-600", children: item.description })] }, item._id))) })] }) }));
};
