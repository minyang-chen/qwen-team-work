import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const DeliverableSection = ({ deliverables, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newDeliverable, setNewDeliverable] = useState({
        type: 'Document',
        status: 'Not Started',
        priority: 'Medium',
        progress: 0
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newDeliverable.title && activeProject) {
            onCreate({
                title: newDeliverable.title,
                description: newDeliverable.description || '',
                type: newDeliverable.type || 'Document',
                status: newDeliverable.status || 'Not Started',
                priority: newDeliverable.priority || 'Medium',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                dueDate: newDeliverable.dueDate,
                assignedTo: newDeliverable.assignedTo,
                reviewer: newDeliverable.reviewer,
                progress: newDeliverable.progress || 0,
                dependencies: newDeliverable.dependencies || [],
                acceptanceCriteria: newDeliverable.acceptanceCriteria,
                deliveryMethod: newDeliverable.deliveryMethod,
                location: newDeliverable.location
            });
            setNewDeliverable({ type: 'Document', status: 'Not Started', priority: 'Medium', progress: 0 });
        }
    };
    const handleEdit = (deliverable) => {
        setEditingId(deliverable._id);
        setEditData(deliverable);
    };
    const handleSave = () => {
        if (editingId) {
            const updateData = { ...editData, updatedAt: new Date().toISOString() };
            if (editData.status === 'Delivered' && !editData.deliveredDate) {
                updateData.deliveredDate = new Date().toISOString();
            }
            onUpdate(editingId, updateData);
            setEditingId(null);
            setEditData({});
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'Document': return 'bg-blue-100 text-blue-800';
            case 'Software': return 'bg-green-100 text-green-800';
            case 'Report': return 'bg-purple-100 text-purple-800';
            case 'Presentation': return 'bg-yellow-100 text-yellow-800';
            case 'Training': return 'bg-indigo-100 text-indigo-800';
            case 'Other': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Not Started': return 'bg-gray-100 text-gray-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Review': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Delivered': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'bg-red-100 text-red-800';
            case 'High': return 'bg-orange-100 text-orange-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Deliverables" }), _jsxs("span", { className: "text-sm text-gray-500", children: [deliverables.length, " deliverables"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Deliverable" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Deliverable title", value: newDeliverable.title || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newDeliverable.type || 'Document', onChange: (e) => setNewDeliverable({ ...newDeliverable, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Document", children: "Document" }), _jsx("option", { value: "Software", children: "Software" }), _jsx("option", { value: "Report", children: "Report" }), _jsx("option", { value: "Presentation", children: "Presentation" }), _jsx("option", { value: "Training", children: "Training" }), _jsx("option", { value: "Other", children: "Other" })] })] }), _jsx("textarea", { placeholder: "Deliverable description", value: newDeliverable.description || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("select", { value: newDeliverable.priority || 'Medium', onChange: (e) => setNewDeliverable({ ...newDeliverable, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Critical", children: "Critical" }), _jsx("option", { value: "High", children: "High" }), _jsx("option", { value: "Medium", children: "Medium" }), _jsx("option", { value: "Low", children: "Low" })] }), _jsx("input", { type: "text", placeholder: "Assigned to", value: newDeliverable.assignedTo || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, assignedTo: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Reviewer", value: newDeliverable.reviewer || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, reviewer: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "date", placeholder: "Due date", value: newDeliverable.dueDate || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, dueDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Delivery method", value: newDeliverable.deliveryMethod || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, deliveryMethod: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Location/URL", value: newDeliverable.location || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, location: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("textarea", { placeholder: "Acceptance criteria", value: newDeliverable.acceptanceCriteria || '', onChange: (e) => setNewDeliverable({ ...newDeliverable, acceptanceCriteria: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 2 }), _jsx("button", { onClick: handleCreate, disabled: !newDeliverable.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Deliverable" })] })] }), _jsxs("div", { className: "space-y-4", children: [deliverables.map((deliverable) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === deliverable._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("select", { value: editData.status || '', onChange: (e) => setEditData({ ...editData, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Not Started", children: "Not Started" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Approved", children: "Approved" }), _jsx("option", { value: "Delivered", children: "Delivered" })] }), _jsx("input", { type: "number", placeholder: "Progress %", value: editData.progress || '', onChange: (e) => setEditData({ ...editData, progress: parseInt(e.target.value) || 0 }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", min: "0", max: "100" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: deliverable.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(deliverable.type)}`, children: deliverable.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getPriorityColor(deliverable.priority)}`, children: deliverable.priority }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(deliverable.status)}`, children: deliverable.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: deliverable.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3", children: [deliverable.assignedTo && _jsxs("div", { children: ["Assigned: ", _jsx("span", { className: "font-medium", children: deliverable.assignedTo })] }), deliverable.reviewer && _jsxs("div", { children: ["Reviewer: ", _jsx("span", { className: "font-medium", children: deliverable.reviewer })] }), deliverable.dueDate && (_jsxs("div", { children: ["Due: ", _jsx("span", { className: `font-medium ${new Date(deliverable.dueDate) < new Date() && deliverable.status !== 'Delivered' ? 'text-red-600' : ''}`, children: new Date(deliverable.dueDate).toLocaleDateString() })] }))] }), deliverable.progress !== undefined && deliverable.progress > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-500 mb-1", children: [_jsx("span", { children: "Progress" }), _jsxs("span", { children: [deliverable.progress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: { width: `${deliverable.progress}%` } }) })] })), deliverable.acceptanceCriteria && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Acceptance Criteria:" }), _jsx("div", { className: "text-sm text-gray-600 bg-gray-50 p-2 rounded", children: deliverable.acceptanceCriteria })] })), (deliverable.deliveryMethod || deliverable.location) && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm", children: [deliverable.deliveryMethod && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Method: " }), _jsx("span", { className: "font-medium", children: deliverable.deliveryMethod })] })), deliverable.location && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Location: " }), _jsx("span", { className: "font-medium", children: deliverable.location })] }))] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(deliverable.createdAt).toLocaleDateString(), deliverable.deliveredDate && (_jsxs("span", { children: [" \u2022 Delivered: ", new Date(deliverable.deliveredDate).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(deliverable), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(deliverable._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, deliverable._id))), deliverables.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No deliverables found. Create your first deliverable above." }))] })] }) }));
};
