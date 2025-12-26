import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const RequirementsSection = ({ requirements, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newRequirement, setNewRequirement] = useState({
        priority: 'Medium',
        status: 'Draft',
        type: 'Functional'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newRequirement.title && activeProject) {
            onCreate({
                title: newRequirement.title,
                description: newRequirement.description || '',
                priority: newRequirement.priority || 'Medium',
                status: newRequirement.status || 'Draft',
                type: newRequirement.type || 'Functional',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                assignedTo: newRequirement.assignedTo,
                acceptanceCriteria: newRequirement.acceptanceCriteria,
                dependencies: newRequirement.dependencies || []
            });
            setNewRequirement({ priority: 'Medium', status: 'Draft', type: 'Functional' });
        }
    };
    const handleEdit = (requirement) => {
        setEditingId(requirement._id);
        setEditData(requirement);
    };
    const handleSave = () => {
        if (editingId) {
            onUpdate(editingId, { ...editData, updatedAt: new Date().toISOString() });
            setEditingId(null);
            setEditData({});
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-green-100 text-green-800';
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
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Requirements" }), _jsxs("span", { className: "text-sm text-gray-500", children: [requirements.length, " total"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Requirement" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Requirement title", value: newRequirement.title || '', onChange: (e) => setNewRequirement({ ...newRequirement, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newRequirement.type || 'Functional', onChange: (e) => setNewRequirement({ ...newRequirement, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Functional", children: "Functional" }), _jsx("option", { value: "Non-Functional", children: "Non-Functional" }), _jsx("option", { value: "Business", children: "Business" }), _jsx("option", { value: "Technical", children: "Technical" })] })] }), _jsx("textarea", { placeholder: "Requirement description", value: newRequirement.description || '', onChange: (e) => setNewRequirement({ ...newRequirement, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("select", { value: newRequirement.priority || 'Medium', onChange: (e) => setNewRequirement({ ...newRequirement, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "High", children: "High Priority" }), _jsx("option", { value: "Medium", children: "Medium Priority" }), _jsx("option", { value: "Low", children: "Low Priority" })] }), _jsxs("select", { value: newRequirement.status || 'Draft', onChange: (e) => setNewRequirement({ ...newRequirement, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Draft", children: "Draft" }), _jsx("option", { value: "Review", children: "Under Review" }), _jsx("option", { value: "Approved", children: "Approved" }), _jsx("option", { value: "Implemented", children: "Implemented" })] }), _jsx("input", { type: "text", placeholder: "Assigned to", value: newRequirement.assignedTo || '', onChange: (e) => setNewRequirement({ ...newRequirement, assignedTo: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("textarea", { placeholder: "Acceptance criteria", value: newRequirement.acceptanceCriteria || '', onChange: (e) => setNewRequirement({ ...newRequirement, acceptanceCriteria: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 }), _jsx("button", { onClick: handleCreate, disabled: !newRequirement.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Requirement" })] })] }), _jsxs("div", { className: "space-y-4", children: [requirements.map((requirement) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === requirement._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: requirement.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getPriorityColor(requirement.priority)}`, children: requirement.priority }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(requirement.status)}`, children: requirement.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: requirement.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3", children: [_jsxs("div", { children: ["Type: ", _jsx("span", { className: "font-medium", children: requirement.type })] }), requirement.assignedTo && _jsxs("div", { children: ["Assigned: ", _jsx("span", { className: "font-medium", children: requirement.assignedTo })] })] }), requirement.acceptanceCriteria && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Acceptance Criteria:" }), _jsx("div", { className: "text-sm text-gray-600 bg-gray-50 p-2 rounded", children: requirement.acceptanceCriteria })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(requirement.createdAt).toLocaleDateString(), requirement.updatedAt !== requirement.createdAt && (_jsxs("span", { children: [" \u2022 Updated: ", new Date(requirement.updatedAt).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(requirement), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(requirement._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, requirement._id))), requirements.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No requirements found. Create your first requirement above." }))] })] }) }));
};
