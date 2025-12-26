import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const AnalysisSection = ({ analyses, onUpdate, onDelete, onCreate, activeProject }) => {
    const [newAnalysis, setNewAnalysis] = useState({
        type: 'Requirements Analysis',
        status: 'Draft',
        priority: 'Medium'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const handleCreate = () => {
        if (newAnalysis.title && activeProject) {
            onCreate({
                title: newAnalysis.title,
                description: newAnalysis.description || '',
                type: newAnalysis.type || 'Requirements Analysis',
                status: newAnalysis.status || 'Draft',
                priority: newAnalysis.priority || 'Medium',
                projectId: activeProject.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                analyst: newAnalysis.analyst,
                reviewer: newAnalysis.reviewer,
                methodology: newAnalysis.methodology,
                findings: newAnalysis.findings,
                recommendations: newAnalysis.recommendations,
                dataSource: newAnalysis.dataSource,
                attachments: newAnalysis.attachments || []
            });
            setNewAnalysis({ type: 'Requirements Analysis', status: 'Draft', priority: 'Medium' });
        }
    };
    const handleEdit = (analysis) => {
        setEditingId(analysis._id);
        setEditData(analysis);
    };
    const handleSave = () => {
        if (editingId) {
            const updateData = { ...editData, updatedAt: new Date().toISOString() };
            if (editData.status === 'Completed' && !editData.completionDate) {
                updateData.completionDate = new Date().toISOString();
            }
            onUpdate(editingId, updateData);
            setEditingId(null);
            setEditData({});
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'Requirements Analysis': return 'bg-blue-100 text-blue-800';
            case 'Risk Analysis': return 'bg-red-100 text-red-800';
            case 'Cost Analysis': return 'bg-green-100 text-green-800';
            case 'Performance Analysis': return 'bg-purple-100 text-purple-800';
            case 'Security Analysis': return 'bg-orange-100 text-orange-800';
            case 'Market Analysis': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Review': return 'bg-yellow-100 text-yellow-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Approved': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Project Analysis" }), _jsxs("span", { className: "text-sm text-gray-500", children: [analyses.length, " analyses"] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Analysis" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Analysis title", value: newAnalysis.title || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, title: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newAnalysis.type || 'Requirements Analysis', onChange: (e) => setNewAnalysis({ ...newAnalysis, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Requirements Analysis", children: "Requirements Analysis" }), _jsx("option", { value: "Risk Analysis", children: "Risk Analysis" }), _jsx("option", { value: "Cost Analysis", children: "Cost Analysis" }), _jsx("option", { value: "Performance Analysis", children: "Performance Analysis" }), _jsx("option", { value: "Security Analysis", children: "Security Analysis" }), _jsx("option", { value: "Market Analysis", children: "Market Analysis" })] })] }), _jsx("textarea", { placeholder: "Analysis description", value: newAnalysis.description || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("select", { value: newAnalysis.priority || 'Medium', onChange: (e) => setNewAnalysis({ ...newAnalysis, priority: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "High", children: "High Priority" }), _jsx("option", { value: "Medium", children: "Medium Priority" }), _jsx("option", { value: "Low", children: "Low Priority" })] }), _jsx("input", { type: "text", placeholder: "Analyst", value: newAnalysis.analyst || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, analyst: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Reviewer", value: newAnalysis.reviewer || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, reviewer: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("input", { type: "text", placeholder: "Methodology", value: newAnalysis.methodology || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, methodology: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "text", placeholder: "Data source", value: newAnalysis.dataSource || '', onChange: (e) => setNewAnalysis({ ...newAnalysis, dataSource: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("button", { onClick: handleCreate, disabled: !newAnalysis.title, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300", children: "Create Analysis" })] })] }), _jsxs("div", { className: "space-y-4", children: [analyses.map((analysis) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: editingId === analysis._id ? (_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("textarea", { value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("select", { value: editData.status || '', onChange: (e) => setEditData({ ...editData, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Draft", children: "Draft" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Review", children: "Review" }), _jsx("option", { value: "Completed", children: "Completed" }), _jsx("option", { value: "Approved", children: "Approved" })] }), _jsx("input", { type: "text", placeholder: "Methodology", value: editData.methodology || '', onChange: (e) => setEditData({ ...editData, methodology: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("textarea", { placeholder: "Findings", value: editData.findings || '', onChange: (e) => setEditData({ ...editData, findings: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsx("textarea", { placeholder: "Recommendations", value: editData.recommendations || '', onChange: (e) => setEditData({ ...editData, recommendations: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSave, className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700", children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), className: "px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700", children: "Cancel" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("h3", { className: "text-md font-medium", children: analysis.title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getTypeColor(analysis.type)}`, children: analysis.type }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${getStatusColor(analysis.status)}`, children: analysis.status })] })] }), _jsx("p", { className: "text-gray-600 mb-3", children: analysis.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3", children: [analysis.analyst && _jsxs("div", { children: ["Analyst: ", _jsx("span", { className: "font-medium", children: analysis.analyst })] }), analysis.reviewer && _jsxs("div", { children: ["Reviewer: ", _jsx("span", { className: "font-medium", children: analysis.reviewer })] }), analysis.methodology && _jsxs("div", { children: ["Method: ", _jsx("span", { className: "font-medium", children: analysis.methodology })] })] }), analysis.dataSource && (_jsxs("div", { className: "mb-3 text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Data Source: " }), _jsx("span", { className: "font-medium", children: analysis.dataSource })] })), analysis.findings && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Findings:" }), _jsx("div", { className: "text-sm text-gray-600 bg-blue-50 p-3 rounded", children: analysis.findings })] })), analysis.recommendations && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Recommendations:" }), _jsx("div", { className: "text-sm text-gray-600 bg-green-50 p-3 rounded", children: analysis.recommendations })] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Created: ", new Date(analysis.createdAt).toLocaleDateString(), analysis.completionDate && (_jsxs("span", { children: [" \u2022 Completed: ", new Date(analysis.completionDate).toLocaleDateString()] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(analysis), className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700", children: "Edit" }), _jsx("button", { onClick: () => onDelete(analysis._id), className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700", children: "Delete" })] })] })] })) }, analysis._id))), analyses.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No analyses found. Create your first analysis above." }))] })] }) }));
};
