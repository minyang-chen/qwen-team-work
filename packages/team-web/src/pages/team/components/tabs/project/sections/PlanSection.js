import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const PlanSection = ({ plans, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newPlan, setNewPlan] = useState({
        type: 'Project Plan',
        status: 'Draft',
        priority: 'Medium'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newPlan.title && activeProject) {
            onCreate({
                title: newPlan.title,
                description: newPlan.description || '',
                type: newPlan.type || 'Project Plan',
                status: newPlan.status || 'Draft',
                priority: newPlan.priority || 'Medium',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                startDate: newPlan.startDate,
                endDate: newPlan.endDate,
                owner: newPlan.owner,
                stakeholders: newPlan.stakeholders || [],
                objectives: newPlan.objectives || [],
                milestones: newPlan.milestones || [],
                resources: newPlan.resources || [],
                budget: newPlan.budget,
                risks: newPlan.risks || []
            });
            setNewPlan({ type: 'Project Plan', status: 'Draft', priority: 'Medium' });
        }
    };
    const handleEdit = (plan) => {
        setEditingId(plan._id);
        setEditData(plan);
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
            case 'Project Plan': return 'bg-blue-100 text-blue-800';
            case 'Sprint Plan': return 'bg-green-100 text-green-800';
            case 'Release Plan': return 'bg-purple-100 text-purple-800';
            case 'Risk Plan': return 'bg-red-100 text-red-800';
            case 'Communication Plan': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'Review': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Active': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Project Plans" }), _jsxs("span", { className: "text-sm text-gray-500", children: [plans.length, " plans"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Plan" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Plan title", value: newPlan.title || '', onChange: (e) => setNewPlan({ ...newPlan, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newPlan.type || 'Project Plan', onChange: (e) => setNewPlan({ ...newPlan, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Project Plan", children: "Project Plan" }), _jsx("option", { value: "Sprint Plan", children: "Sprint Plan" }), _jsx("option", { value: "Release Plan", children: "Release Plan" }), _jsx("option", { value: "Risk Plan", children: "Risk Plan" }), _jsx("option", { value: "Communication Plan", children: "Communication Plan" })] })] }), _jsx("textarea", { placeholder: "Plan description", value: newPlan.description || '', onChange: (e) => setNewPlan({ ...newPlan, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("select", { value: newPlan.priority || 'Medium', onChange: (e) => setNewPlan({ ...newPlan, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "High", children: "High Priority" }), _jsx("option", { value: "Medium", children: "Medium Priority" }), _jsx("option", { value: "Low", children: "Low Priority" })] }), _jsx("input", { type: "text", placeholder: "Plan owner", value: newPlan.owner || '', onChange: (e) => setNewPlan({ ...newPlan, owner: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "date", placeholder: "Start date", value: newPlan.startDate || '', onChange: (e) => setNewPlan({ ...newPlan, startDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "date", placeholder: "End date", value: newPlan.endDate || '', onChange: (e) => setNewPlan({ ...newPlan, endDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Stakeholders (comma-separated)", value: newPlan.stakeholders?.join(', ') || '', onChange: (e) => setNewPlan({
                                                ...newPlan,
                                                stakeholders: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                            }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "number", placeholder: "Budget", value: newPlan.budget || '', onChange: (e) => setNewPlan({ ...newPlan, budget: parseFloat(e.target.value) || undefined }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("button", { onClick: handleCreate, disabled: !newPlan.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Plan" })] })] }), _jsxs("div", { className: "space-y-4", children: [plans.map((plan) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === plan._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: plan.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(plan.type)}`, children: plan.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`, children: plan.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: plan.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3", children: [plan.owner && _jsxs("div", { children: ["Owner: ", _jsx("span", { className: "font-medium", children: plan.owner })] }), plan.startDate && _jsxs("div", { children: ["Start: ", _jsx("span", { className: "font-medium", children: new Date(plan.startDate).toLocaleDateString() })] }), plan.endDate && _jsxs("div", { children: ["End: ", _jsx("span", { className: "font-medium", children: new Date(plan.endDate).toLocaleDateString() })] })] }), plan.stakeholders && plan.stakeholders.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Stakeholders:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: plan.stakeholders.map((stakeholder, index) => (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs", children: stakeholder }, index))) })] })), plan.budget && (_jsxs("div", { className: "mb-3 text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Budget: " }), _jsxs("span", { className: "font-medium text-green-600", children: ["$", plan.budget.toLocaleString()] })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(plan.createdAt).toLocaleDateString(), plan.updatedAt !== plan.createdAt && (_jsxs("span", { children: [" \u2022 Updated: ", new Date(plan.updatedAt).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(plan), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(plan._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, plan._id))), plans.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No plans found. Create your first plan above." }))] })] }) }));
};
