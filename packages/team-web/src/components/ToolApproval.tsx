import { useChatStore, type ToolCall } from '../store/chatStore';

export function ToolApproval() {
  const { pendingToolCalls, approveToolCall, rejectToolCall } = useChatStore();

  if (pendingToolCalls.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Tool Approval Required
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve the following tool calls
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {pendingToolCalls.map((toolCall) => (
            <ToolCallCard
              key={toolCall.id}
              toolCall={toolCall}
              onApprove={() => approveToolCall(toolCall.id)}
              onReject={() => rejectToolCall(toolCall.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ToolCallCardProps {
  toolCall: ToolCall;
  onApprove: () => void;
  onReject: () => void;
}

function ToolCallCard({ toolCall, onApprove, onReject }: ToolCallCardProps) {
  const isDecided = toolCall.status !== 'pending';

  return (
    <div
      className={`border rounded-xl p-4 ${
        toolCall.status === 'approved'
          ? 'border-green-300 bg-green-50'
          : toolCall.status === 'rejected'
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{toolCall.name}</h3>
          {isDecided && (
            <span
              className={`text-xs font-medium ${
                toolCall.status === 'approved'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {toolCall.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <pre className="text-xs text-gray-700 overflow-x-auto">
          {JSON.stringify(toolCall.args, null, 2)}
        </pre>
      </div>

      {!isDecided && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
