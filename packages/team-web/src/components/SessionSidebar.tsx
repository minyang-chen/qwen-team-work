import { useChatStore, type Session } from '../store/chatStore';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionSidebar({ isOpen, onClose }: SessionSidebarProps) {
  const {
    sessions,
    sessionId,
    setSessionId,
    addSession,
    removeSession,
    clearMessages,
  } = useChatStore();

  const handleNewSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const { sessionId: newId } = await res.json();
        const newSession: Session = {
          id: newId,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        };
        addSession(newSession);
        setSessionId(newId);
        clearMessages();
        onClose();
      }
    } catch (error) {
    }
  };

  const handleSwitchSession = (id: string) => {
    setSessionId(id);
    clearMessages();
    onClose();
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      removeSession(id);
      if (sessionId === id && sessions.length > 1) {
        const nextSession = sessions.find((s) => s.id !== id);
        if (nextSession) setSessionId(nextSession.id);
      }
    } catch (error) {
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Sessions</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                session.id === sessionId
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Session {session.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.lastActivity).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete session"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleNewSession}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md"
          >
            + New Session
          </button>
        </div>
      </div>
    </>
  );
}
