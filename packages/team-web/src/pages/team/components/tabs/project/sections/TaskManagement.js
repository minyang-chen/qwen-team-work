import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const TaskManagement = ({ tasks, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newTask, setNewTask] = useState({
        status: 'Todo',
        priority: 'Medium',
        type: 'Development',
        progress: 0
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [viewMode, setViewMode] = useState('list');
    const handleCreate = () => {
        if (newTask.title && activeProject) {
            onCreate({
                title: newTask.title,
                description: newTask.description || '',
                status: newTask.status || 'Todo',
                priority: newTask.priority || 'Medium',
                type: newTask.type || 'Development',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                assignedTo: newTask.assignedTo,
                reporter: newTask.reporter,
                estimatedHours: newTask.estimatedHours,
                actualHours: newTask.actualHours || 0,
                startDate: newTask.startDate,
                dueDate: newTask.dueDate,
                dependencies: newTask.dependencies || [],
                tags: newTask.tags || [],
                progress: newTask.progress || 0
            });
            setNewTask({ status: 'Todo', priority: 'Medium', type: 'Development', progress: 0 });
        }
    };
    const handleEdit = (task) => {
        setEditingId(task._id);
        setEditData(task);
    };
    const handleSave = () => {
        if (editingId) {
            const updateData = { ...editData, updatedAt: new Date().toISOString() };
            if (editData.status === 'Done' && !editData.completedDate) {
                updateData.completedDate = new Date().toISOString();
            }
            onUpdate(editingId, updateData);
            setEditingId(null);
            setEditData({});
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Todo': return 'bg-gray-100 text-gray-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Review': return 'bg-yellow-100 text-yellow-800';
            case 'Done': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'Development': return 'bg-blue-100 text-blue-800';
            case 'Testing': return 'bg-purple-100 text-purple-800';
            case 'Documentation': return 'bg-green-100 text-green-800';
            case 'Research': return 'bg-yellow-100 text-yellow-800';
            case 'Bug Fix': return 'bg-red-100 text-red-800';
            case 'Feature': return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const filteredTasks = tasks.filter(task => {
        const statusMatch = filterStatus === 'All' || task.status === filterStatus;
        const assigneeMatch = filterAssignee === 'All' || task.assignedTo === filterAssignee;
        return statusMatch && assigneeMatch;
    });
    const getTaskStats = () => {
        const total = tasks.length;
        const todo = tasks.filter(t => t.status === 'Todo').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const review = tasks.filter(t => t.status === 'Review').length;
        const done = tasks.filter(t => t.status === 'Done').length;
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
        return { total, todo, inProgress, review, done, overdue };
    };
    const stats = getTaskStats();
    const uniqueAssignees = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
    const renderKanbanView = () => {
        const columns = ['Todo', 'In Progress', 'Review', 'Done'];
        return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: columns.map(status => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("h3", { className: "font-medium mb-3 flex items-center justify-between", children: [status, _jsx("span", { className: "text-sm text-gray-500", children: filteredTasks.filter(t => t.status === status).length })] }), _jsx("div", { className: "space-y-3", children: filteredTasks.filter(t => t.status === status).map(task => (_jsxs("div", { className: "bg-white p-3 rounded border shadow-sm", children: [_jsx("h4", { className: "font-medium text-sm mb-2", children: task.title }), _jsxs("div", { className: "flex flex-wrap gap-1 mb-2", children: [_jsx("span", { className: `px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`, children: task.priority }), _jsx("span", { className: `px-2 py-1 rounded text-xs ${getTypeColor(task.type)}`, children: task.type })] }), task.assignedTo && (_jsxs("div", { className: "text-xs text-gray-500 mb-2", children: ["Assigned: ", task.assignedTo] })), task.dueDate && (_jsxs("div", { className: `text-xs mb-2 ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600' : 'text-gray-500'}`, children: ["Due: ", new Date(task.dueDate).toLocaleDateString()] })), task.progress !== undefined && task.progress > 0 && (_jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "flex justify-between text-xs text-gray-500 mb-1", children: [_jsx("span", { children: "Progress" }), _jsxs("span", { children: [task.progress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: { width: `${task.progress}%` } }) })] })), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => handleEdit(task), className: "px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(task._id), className: "px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700", children: "Delete" })] })] }, task._id))) })] }, status))) }));
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Task Management" }), _jsxs("div", { className: "flex gap-4 text-sm", children: [_jsxs("span", { className: "text-gray-500", children: ["Total: ", stats.total] }), _jsxs("span", { className: "text-blue-600", children: ["Todo: ", stats.todo] }), _jsxs("span", { className: "text-yellow-600", children: ["In Progress: ", stats.inProgress] }), _jsxs("span", { className: "text-green-600", children: ["Done: ", stats.done] }), stats.overdue > 0 && _jsxs("span", { className: "text-red-600", children: ["Overdue: ", stats.overdue] })] })] }), _jsxs("div", { className: "mb-6 flex flex-wrap gap-4 items-center", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setViewMode('list'), className: `px-3 py-2 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`, children: "List View" }), _jsx("button", { onClick: () => setViewMode('kanban'), className: `px-3 py-2 rounded text-sm ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`, children: "Kanban View" })] }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "All", children: "All Status" }), _jsx("option", { value: "Todo", children: "Todo" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Done", children: "Done" })] }), _jsxs("select", { value: filterAssignee, onChange: (e) => setFilterAssignee(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "All", children: "All Assignees" }), uniqueAssignees.map(assignee => (_jsx("option", { value: assignee, children: assignee }, assignee)))] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Task" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Task title", value: newTask.title || '', onChange: (e) => setNewTask({ ...newTask, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newTask.type || 'Development', onChange: (e) => setNewTask({ ...newTask, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Development", children: "Development" }), _jsx("option", { value: "Testing", children: "Testing" }), _jsx("option", { value: "Documentation", children: "Documentation" }), _jsx("option", { value: "Research", children: "Research" }), _jsx("option", { value: "Bug Fix", children: "Bug Fix" }), _jsx("option", { value: "Feature", children: "Feature" })] })] }), _jsx("textarea", { placeholder: "Task description", value: newTask.description || '', onChange: (e) => setNewTask({ ...newTask, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("select", { value: newTask.priority || 'Medium', onChange: (e) => setNewTask({ ...newTask, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Critical", children: "Critical" }), _jsx("option", { value: "High", children: "High" }), _jsx("option", { value: "Medium", children: "Medium" }), _jsx("option", { value: "Low", children: "Low" })] }), _jsx("input", { type: "text", placeholder: "Assigned to", value: newTask.assignedTo || '', onChange: (e) => setNewTask({ ...newTask, assignedTo: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "number", placeholder: "Est. hours", value: newTask.estimatedHours || '', onChange: (e) => setNewTask({ ...newTask, estimatedHours: parseInt(e.target.value) || undefined }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "date", placeholder: "Due date", value: newTask.dueDate || '', onChange: (e) => setNewTask({ ...newTask, dueDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("button", { onClick: handleCreate, disabled: !newTask.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Task" })] })] }), viewMode === 'kanban' ? renderKanbanView() : (_jsxs("div", { className: "space-y-4", children: [filteredTasks.map((task) => (_jsx("div", { className: `border rounded-lg p-4 ${getPriorityColor(task.priority)} border`, children: editingId === task._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("select", { value: editData.status || '', onChange: (e) => setEditData({ ...editData, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Todo", children: "Todo" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Done", children: "Done" })] }), _jsx("input", { type: "number", placeholder: "Progress %", value: editData.progress || '', onChange: (e) => setEditData({ ...editData, progress: parseInt(e.target.value) || 0 }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", min: "0", max: "100" }), _jsx("input", { type: "number", placeholder: "Actual hours", value: editData.actualHours || '', onChange: (e) => setEditData({ ...editData, actualHours: parseInt(e.target.value) || 0 }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "date", value: editData.startDate || '', onChange: (e) => setEditData({ ...editData, startDate: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: task.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(task.type)}`, children: task.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`, children: task.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: task.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3", children: [task.assignedTo && _jsxs("div", { children: ["Assigned: ", _jsx("span", { className: "font-medium", children: task.assignedTo })] }), task.estimatedHours && (_jsxs("div", { children: ["Hours: ", _jsxs("span", { className: "font-medium", children: [task.actualHours || 0, "/", task.estimatedHours] })] })), task.dueDate && (_jsxs("div", { children: ["Due: ", _jsx("span", { className: `font-medium ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600' : ''}`, children: new Date(task.dueDate).toLocaleDateString() })] }))] }), task.progress !== undefined && task.progress > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-500 mb-1", children: [_jsx("span", { children: "Progress" }), _jsxs("span", { children: [task.progress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: { width: `${task.progress}%` } }) })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(task.createdAt).toLocaleDateString(), task.completedDate && (_jsxs("span", { children: [" \u2022 Completed: ", new Date(task.completedDate).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(task), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(task._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, task._id))), filteredTasks.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: tasks.length === 0 ? 'No tasks found. Create your first task above.' : 'No tasks match the current filters.' }))] }))] }) }));
};
