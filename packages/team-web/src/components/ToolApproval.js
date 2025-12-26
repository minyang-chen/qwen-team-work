import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useChatStore } from '../store/chatStore';
export function ToolApproval() {
    const { pendingToolCalls, approveToolCall, rejectToolCall } = useChatStore();
    if (pendingToolCalls.length === 0)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Tool Approval Required" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Review and approve the following tool calls" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 space-y-4", children: pendingToolCalls.map((toolCall) => (_jsx(ToolCallCard, { toolCall: toolCall, onApprove: () => approveToolCall(toolCall.id), onReject: () => rejectToolCall(toolCall.id) }, toolCall.id))) })] }) }));
}
function ToolCallCard({ toolCall, onApprove, onReject }) {
    const isDecided = toolCall.status !== 'pending';
    return (_jsxs("div", { className: `border rounded-xl p-4 ${toolCall.status === 'approved'
            ? 'border-green-300 bg-green-50'
            : toolCall.status === 'rejected'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white'}`, children: [_jsx("div", { className: "flex items-start justify-between mb-3", children: _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: toolCall.name }), isDecided && (_jsx("span", { className: `text-xs font-medium ${toolCall.status === 'approved'
                                ? 'text-green-600'
                                : 'text-red-600'}`, children: toolCall.status === 'approved' ? '✓ Approved' : '✗ Rejected' }))] }) }), _jsx("div", { className: "bg-gray-50 rounded-lg p-3 mb-3", children: _jsx("pre", { className: "text-xs text-gray-700 overflow-x-auto", children: JSON.stringify(toolCall.args, null, 2) }) }), !isDecided && (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onApprove, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium", children: "Approve" }), _jsx("button", { onClick: onReject, className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium", children: "Reject" })] }))] }));
}
