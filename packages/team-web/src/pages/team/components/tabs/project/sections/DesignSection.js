import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const DesignSection = ({ designs, onUpdate, onDelete, onCreate }) => {
    const [newDesign, setNewDesign] = useState({});
    const handleCreate = () => {
        if (newDesign.title) {
            onCreate({
                title: newDesign.title,
                description: newDesign.description || '',
                type: newDesign.type || 'UI Design',
                status: newDesign.status || 'Draft',
                projectId: ''
            });
            setNewDesign({});
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-6", children: "Design" }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Design" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Design Title", value: newDesign.title || '', onChange: (e) => setNewDesign({ ...newDesign, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newDesign.type || 'UI Design', onChange: (e) => setNewDesign({ ...newDesign, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "UI Design", children: "UI Design" }), _jsx("option", { value: "UX Design", children: "UX Design" }), _jsx("option", { value: "Wireframe", children: "Wireframe" }), _jsx("option", { value: "Mockup", children: "Mockup" }), _jsx("option", { value: "Prototype", children: "Prototype" })] })] }), _jsx("textarea", { placeholder: "Design Description", value: newDesign.description || '', onChange: (e) => setNewDesign({ ...newDesign, description: e.target.value }), className: "mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 4 }), _jsx("button", { onClick: handleCreate, className: "mt-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700", children: "Create Design" })] }), _jsx("div", { className: "space-y-4", children: designs.map((design) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-lg font-medium", children: design.title }), _jsx("button", { onClick: () => onDelete(design._id), className: "text-red-600 hover:text-red-800", children: "Delete" })] }), _jsx("p", { className: "text-gray-600 mb-3", children: design.description }), _jsx("div", { className: "flex gap-4 text-sm", children: _jsx("span", { className: "px-2 py-1 rounded-full bg-pink-100 text-pink-800", children: design.type }) })] }, design._id))) })] }) }));
};
