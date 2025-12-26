import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ArchitectureSection = ({ architectures, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newArchitecture, setNewArchitecture] = useState({
        type: 'System',
        status: 'Draft'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newArchitecture.title && activeProject) {
            onCreate({
                title: newArchitecture.title,
                description: newArchitecture.description || '',
                type: newArchitecture.type || 'System',
                status: newArchitecture.status || 'Draft',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                components: newArchitecture.components || [],
                technologies: newArchitecture.technologies || [],
                diagrams: newArchitecture.diagrams || [],
                constraints: newArchitecture.constraints,
                assumptions: newArchitecture.assumptions
            });
            setNewArchitecture({ type: 'System', status: 'Draft' });
        }
    };
    const handleEdit = (architecture) => {
        setEditingId(architecture._id);
        setEditData(architecture);
    };
    const handleSave = () => {
        if (editingId) {
            onUpdate(editingId, { ...editData, updatedAt: new Date().toISOString() });
            setEditingId(null);
            setEditData({});
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'System': return 'bg-blue-100 text-blue-800';
            case 'Software': return 'bg-green-100 text-green-800';
            case 'Data': return 'bg-purple-100 text-purple-800';
            case 'Security': return 'bg-red-100 text-red-800';
            case 'Network': return 'bg-yellow-100 text-yellow-800';
            case 'Infrastructure': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'Review': return 'bg-blue-100 text-blue-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Implemented': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Architecture" }), _jsxs("span", { className: "text-sm text-gray-500", children: [architectures.length, " designs"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Architecture Design" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Architecture title", value: newArchitecture.title || '', onChange: (e) => setNewArchitecture({ ...newArchitecture, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newArchitecture.type || 'System', onChange: (e) => setNewArchitecture({ ...newArchitecture, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "System", children: "System Architecture" }), _jsx("option", { value: "Software", children: "Software Architecture" }), _jsx("option", { value: "Data", children: "Data Architecture" }), _jsx("option", { value: "Security", children: "Security Architecture" }), _jsx("option", { value: "Network", children: "Network Architecture" }), _jsx("option", { value: "Infrastructure", children: "Infrastructure Architecture" })] })] }), _jsx("textarea", { placeholder: "Architecture description", value: newArchitecture.description || '', onChange: (e) => setNewArchitecture({ ...newArchitecture, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Technologies (comma-separated)", value: newArchitecture.technologies?.join(', ') || '', onChange: (e) => setNewArchitecture({
                                                ...newArchitecture,
                                                technologies: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                                            }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Components (comma-separated)", value: newArchitecture.components?.join(', ') || '', onChange: (e) => setNewArchitecture({
                                                ...newArchitecture,
                                                components: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                                            }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("textarea", { placeholder: "Constraints", value: newArchitecture.constraints || '', onChange: (e) => setNewArchitecture({ ...newArchitecture, constraints: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 }), _jsx("textarea", { placeholder: "Assumptions", value: newArchitecture.assumptions || '', onChange: (e) => setNewArchitecture({ ...newArchitecture, assumptions: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 })] }), _jsx("button", { onClick: handleCreate, disabled: !newArchitecture.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Architecture" })] })] }), _jsxs("div", { className: "space-y-4", children: [architectures.map((architecture) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === architecture._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: architecture.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(architecture.type)}`, children: architecture.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(architecture.status)}`, children: architecture.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: architecture.description }), architecture.technologies && architecture.technologies.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Technologies:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: architecture.technologies.map((tech, index) => (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs", children: tech }, index))) })] })), architecture.components && architecture.components.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Components:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: architecture.components.map((component, index) => (_jsx("span", { className: "px-2 py-1 bg-green-100 text-green-800 rounded text-xs", children: component }, index))) })] })), (architecture.constraints || architecture.assumptions) && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-3", children: [architecture.constraints && (_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Constraints:" }), _jsx("div", { className: "text-sm text-gray-600 bg-red-50 p-2 rounded", children: architecture.constraints })] })), architecture.assumptions && (_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Assumptions:" }), _jsx("div", { className: "text-sm text-gray-600 bg-yellow-50 p-2 rounded", children: architecture.assumptions })] }))] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(architecture.createdAt).toLocaleDateString(), architecture.updatedAt !== architecture.createdAt && (_jsxs("span", { children: [" \u2022 Updated: ", new Date(architecture.updatedAt).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(architecture), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(architecture._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, architecture._id))), architectures.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No architecture designs found. Create your first architecture design above." }))] })] }) }));
};
