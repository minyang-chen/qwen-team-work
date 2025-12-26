import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export const TestingSection = ({ testCases, onUpdate, onDelete, onCreate }) => {
    const [newTest, setNewTest] = React.useState({});
    const handleCreate = () => {
        if (newTest.name) {
            onCreate({
                name: newTest.name,
                description: newTest.description || '',
                status: newTest.status || 'pending',
                type: newTest.type || 'Unit Test',
                projectId: ''
            });
            setNewTest({});
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'passed': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const stats = {
        total: testCases.length,
        passed: testCases.filter(t => t.status === 'passed').length,
        failed: testCases.filter(t => t.status === 'failed').length,
        pending: testCases.filter(t => t.status === 'pending').length
    };
    return (_jsx("div", { className: "bg-white rounded-lg shadow border", children: _jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-6", children: "Testing" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { className: "bg-blue-50 p-4 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-blue-600", children: stats.total }), _jsx("div", { className: "text-sm text-blue-600", children: "Total Tests" })] }), _jsxs("div", { className: "bg-green-50 p-4 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-green-600", children: stats.passed }), _jsx("div", { className: "text-sm text-green-600", children: "Passed" })] }), _jsxs("div", { className: "bg-red-50 p-4 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-red-600", children: stats.failed }), _jsx("div", { className: "text-sm text-red-600", children: "Failed" })] }), _jsxs("div", { className: "bg-yellow-50 p-4 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-yellow-600", children: stats.pending }), _jsx("div", { className: "text-sm text-yellow-600", children: "Pending" })] })] }), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "text-md font-medium mb-3", children: "Create New Test" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx("input", { type: "text", placeholder: "Test Name", value: newTest.name || '', onChange: (e) => setNewTest({ ...newTest, name: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { value: newTest.type || 'Unit Test', onChange: (e) => setNewTest({ ...newTest, type: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Unit Test", children: "Unit Test" }), _jsx("option", { value: "Integration Test", children: "Integration Test" }), _jsx("option", { value: "E2E Test", children: "E2E Test" }), _jsx("option", { value: "Performance Test", children: "Performance Test" })] }), _jsxs("select", { value: newTest.status || 'pending', onChange: (e) => setNewTest({ ...newTest, status: e.target.value }), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "passed", children: "Passed" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsx("textarea", { placeholder: "Test Description", value: newTest.description || '', onChange: (e) => setNewTest({ ...newTest, description: e.target.value }), className: "mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 }), _jsx("button", { onClick: handleCreate, className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700", children: "Create Test" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Test Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Type" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Description" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: testCases.map((test) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: test.name }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: test.type }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`, children: test.status }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500 max-w-xs truncate", children: test.description }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium", children: [_jsx("button", { onClick: () => onUpdate(test._id, {
                                                        status: test.status === 'passed' ? 'failed' : 'passed'
                                                    }), className: "text-blue-600 hover:text-blue-900 mr-3", children: "Toggle Status" }), _jsx("button", { onClick: () => onDelete(test._id), className: "text-red-600 hover:text-red-900", children: "Delete" })] })] }, test._id))) })] }) })] }) }));
};
