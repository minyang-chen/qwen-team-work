import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const IssuesSection = ({ issues, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newIssue, setNewIssue] = useState({
        type: 'Bug',
        priority: 'Medium',
        status: 'Open',
        severity: 'Minor'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const handleCreate = () => {
        if (newIssue.title && activeProject) {
            onCreate({
                title: newIssue.title,
                description: newIssue.description || '',
                type: newIssue.type || 'Bug',
                priority: newIssue.priority || 'Medium',
                status: newIssue.status || 'Open',
                severity: newIssue.severity || 'Minor',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                assignedTo: newIssue.assignedTo,
                reporter: newIssue.reporter,
                labels: newIssue.labels || [],
                estimatedHours: newIssue.estimatedHours,
                actualHours: newIssue.actualHours,
                dueDate: newIssue.dueDate,
                resolution: newIssue.resolution
            });
            setNewIssue({ type: 'Bug', priority: 'Medium', status: 'Open', severity: 'Minor' });
        }
    };
    const handleEdit = (issue) => {
        setEditingId(issue._id);
        setEditData(issue);
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
            case 'Bug': return 'bg-red-100 text-red-800';
            case 'Feature': return 'bg-green-100 text-green-800';
            case 'Enhancement': return 'bg-blue-100 text-blue-800';
            case 'Task': return 'bg-yellow-100 text-yellow-800';
            case 'Epic': return 'bg-purple-100 text-purple-800';
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
    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'bg-gray-100 text-gray-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Review': return 'bg-yellow-100 text-yellow-800';
            case 'Testing': return 'bg-purple-100 text-purple-800';
            case 'Closed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const filteredIssues = issues.filter(issue => {
        const statusMatch = filterStatus === 'All' || issue.status === filterStatus;
        const typeMatch = filterType === 'All' || issue.type === filterType;
        return statusMatch && typeMatch;
    });
    const getIssueStats = () => {
        const total = issues.length;
        const open = issues.filter(i => i.status === 'Open').length;
        const inProgress = issues.filter(i => i.status === 'In Progress').length;
        const closed = issues.filter(i => i.status === 'Closed').length;
        return { total, open, inProgress, closed };
    };
    const stats = getIssueStats();
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Issues & Bugs" }), _jsxs("div", { className: "flex gap-4 text-sm", children: [_jsxs("span", { className: "text-gray-500", children: ["Total: ", stats.total] }), _jsxs("span", { className: "text-red-600", children: ["Open: ", stats.open] }), _jsxs("span", { className: "text-blue-600", children: ["In Progress: ", stats.inProgress] }), _jsxs("span", { className: "text-green-600", children: ["Closed: ", stats.closed] })] })] }), _jsxs("div", { className: "mb-6 flex gap-4", children: [_jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "All", children: "All Status" }), _jsx("option", { value: "Open", children: "Open" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Testing", children: "Testing" }), _jsx("option", { value: "Closed", children: "Closed" })] }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "All", children: "All Types" }), _jsx("option", { value: "Bug", children: "Bug" }), _jsx("option", { value: "Feature", children: "Feature" }), _jsx("option", { value: "Enhancement", children: "Enhancement" }), _jsx("option", { value: "Task", children: "Task" }), _jsx("option", { value: "Epic", children: "Epic" })] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Issue" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Issue title", value: newIssue.title || '', onChange: (e) => setNewIssue({ ...newIssue, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newIssue.type || 'Bug', onChange: (e) => setNewIssue({ ...newIssue, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Bug", children: "Bug" }), _jsx("option", { value: "Feature", children: "Feature Request" }), _jsx("option", { value: "Enhancement", children: "Enhancement" }), _jsx("option", { value: "Task", children: "Task" }), _jsx("option", { value: "Epic", children: "Epic" })] })] }), _jsx("textarea", { placeholder: "Issue description", value: newIssue.description || '', onChange: (e) => setNewIssue({ ...newIssue, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("select", { value: newIssue.priority || 'Medium', onChange: (e) => setNewIssue({ ...newIssue, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Critical", children: "Critical" }), _jsx("option", { value: "High", children: "High" }), _jsx("option", { value: "Medium", children: "Medium" }), _jsx("option", { value: "Low", children: "Low" })] }), _jsxs("select", { value: newIssue.severity || 'Minor', onChange: (e) => setNewIssue({ ...newIssue, severity: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Blocker", children: "Blocker" }), _jsx("option", { value: "Major", children: "Major" }), _jsx("option", { value: "Minor", children: "Minor" }), _jsx("option", { value: "Trivial", children: "Trivial" })] }), _jsx("input", { type: "text", placeholder: "Assigned to", value: newIssue.assignedTo || '', onChange: (e) => setNewIssue({ ...newIssue, assignedTo: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "number", placeholder: "Est. hours", value: newIssue.estimatedHours || '', onChange: (e) => setNewIssue({ ...newIssue, estimatedHours: parseInt(e.target.value) || undefined }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "date", placeholder: "Due date", value: newIssue.dueDate || '', onChange: (e) => setNewIssue({ ...newIssue, dueDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Labels (comma-separated)", value: newIssue.labels?.join(', ') || '', onChange: (e) => setNewIssue({
                                                ...newIssue,
                                                labels: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                                            }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("button", { onClick: handleCreate, disabled: !newIssue.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Issue" })] })] }), _jsxs("div", { className: "space-y-4", children: [filteredIssues.map((issue) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === issue._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("select", { value: editData.status || '', onChange: (e) => setEditData({ ...editData, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Open", children: "Open" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Testing", children: "Testing" }), _jsx("option", { value: "Closed", children: "Closed" })] }), _jsx("input", { type: "number", placeholder: "Actual hours", value: editData.actualHours || '', onChange: (e) => setEditData({ ...editData, actualHours: parseInt(e.target.value) || undefined }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Resolution", value: editData.resolution || '', onChange: (e) => setEditData({ ...editData, resolution: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: issue.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(issue.type)}`, children: issue.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getPriorityColor(issue.priority)}`, children: issue.priority }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(issue.status)}`, children: issue.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: issue.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3", children: [_jsxs("div", { children: ["Severity: ", _jsx("span", { className: "font-medium", children: issue.severity })] }), issue.assignedTo && _jsxs("div", { children: ["Assigned: ", _jsx("span", { className: "font-medium", children: issue.assignedTo })] }), issue.estimatedHours && (_jsxs("div", { children: ["Hours: ", _jsxs("span", { className: "font-medium", children: [issue.actualHours || 0, "/", issue.estimatedHours] })] }))] }), issue.labels && issue.labels.length > 0 && (_jsx("div", { className: "mb-3", children: _jsx("div", { className: "flex flex-wrap gap-1", children: issue.labels.map((label, index) => (_jsx("span", { className: "px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs", children: label }, index))) }) })), issue.dueDate && (_jsxs("div", { className: "mb-3 text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Due: " }), _jsx("span", { className: `font-medium ${new Date(issue.dueDate) < new Date() ? 'text-red-600' : 'text-gray-700'}`, children: new Date(issue.dueDate).toLocaleDateString() })] })), issue.resolution && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Resolution:" }), _jsx("div", { className: "text-sm text-gray-600 bg-green-50 p-2 rounded", children: issue.resolution })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(issue.createdAt).toLocaleDateString(), issue.updatedAt !== issue.createdAt && (_jsxs("span", { children: [" \u2022 Updated: ", new Date(issue.updatedAt).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(issue), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(issue._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, issue._id))), filteredIssues.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: issues.length === 0 ? 'No issues found. Create your first issue above.' : 'No issues match the current filters.' }))] })] }) }));
};
