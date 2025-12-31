import React, { useState, useEffect } from 'react';
import { useEnhancedWebSocket } from '../hooks/useEnhancedWebSocket';

interface TeamMember {
  userId: string;
  username: string;
  isOnline: boolean;
  cursor?: { file: string; line: number; column: number };
  lastActivity: number;
}

interface CollaborationPanelProps {
  teamId: string;
  projectId: string;
  userId: string;
  sessionId: string;
}

export function CollaborationPanel({
  teamId,
  projectId,
  userId,
  sessionId
}: CollaborationPanelProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  
  const {
    isConnected,
    connectionError,
    userJoinMessages,
    userLeaveMessages,
    cursorUpdates,
    fileEdits,
    toolExecutions,
    updateCursor,
    sendFileEdit,
    sendToolExecution
  } = useEnhancedWebSocket({ teamId, projectId, userId, sessionId });

  // Update team members based on join/leave messages
  useEffect(() => {
    const latestJoins = userJoinMessages.slice(-10);
    const latestLeaves = userLeaveMessages.slice(-10);
    
    // Build current member list
    const memberMap = new Map<string, TeamMember>();
    
    // Add joined members
    latestJoins.forEach(msg => {
      memberMap.set(msg.data.userId, {
        userId: msg.data.userId,
        username: `User ${msg.data.userId}`,
        isOnline: true,
        lastActivity: msg.timestamp || Date.now()
      });
    });
    
    // Remove left members
    latestLeaves.forEach(msg => {
      memberMap.delete(msg.data.userId);
    });
    
    setTeamMembers(Array.from(memberMap.values()));
  }, [userJoinMessages, userLeaveMessages]);

  // Update cursors based on cursor updates
  useEffect(() => {
    const latestCursorUpdates = cursorUpdates.slice(-20);
    
    setTeamMembers(prev => prev.map(member => {
      const cursorUpdate = latestCursorUpdates
        .reverse()
        .find(msg => msg.data.userId === member.userId);
      
      if (cursorUpdate) {
        return {
          ...member,
          cursor: cursorUpdate.data.cursor,
          lastActivity: cursorUpdate.timestamp || member.lastActivity
        };
      }
      
      return member;
    }));
  }, [cursorUpdates]);

  const handleCursorMove = (file: string, line: number, column: number) => {
    setActiveFile(file);
    updateCursor({ file, line, column });
  };

  const handleFileEdit = (file: string, changes: any[]) => {
    sendFileEdit({ file, changes });
  };

  const handleToolStart = (toolName: string) => {
    sendToolExecution(toolName, 'started');
  };

  const handleToolComplete = (toolName: string, result: any) => {
    sendToolExecution(toolName, 'completed', result);
  };

  return (
    <div className="collaboration-panel bg-gray-50 border-l border-gray-200 w-80 p-4">
      {/* Connection Status */}
      <div className="mb-4">
        <div className={`flex items-center gap-2 text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        {connectionError && (
          <div className="text-red-500 text-xs mt-1">{connectionError}</div>
        )}
      </div>

      {/* Team Members */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Team Members ({teamMembers.length})</h3>
        <div className="space-y-2">
          {teamMembers.map(member => (
            <div key={member.userId} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
              <div className={`w-3 h-3 rounded-full ${
                member.isOnline ? 'bg-green-400' : 'bg-gray-300'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{member.username}</div>
                {member.cursor && (
                  <div className="text-xs text-gray-500">
                    {member.cursor.file}:{member.cursor.line}:{member.cursor.column}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent File Edits */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Edits</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {fileEdits.slice(-5).reverse().map((edit, index) => (
            <div key={index} className="p-2 bg-blue-50 rounded text-sm">
              <div className="font-medium">{edit.data.userId}</div>
              <div className="text-gray-600">{edit.data.file}</div>
              <div className="text-xs text-gray-500">
                {new Date(edit.timestamp || 0).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tool Executions */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Tool Activity</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {toolExecutions.slice(-5).reverse().map((execution, index) => (
            <div key={index} className="p-2 bg-yellow-50 rounded text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  execution.data.status === 'completed' ? 'bg-green-400' :
                  execution.data.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <span className="font-medium">{execution.data.toolName}</span>
              </div>
              <div className="text-gray-600">{execution.data.userId}</div>
              <div className="text-xs text-gray-500">
                {new Date(execution.timestamp || 0).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Info (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs">
          <div>Team: {teamId}</div>
          <div>Project: {projectId}</div>
          <div>Active File: {activeFile}</div>
          <div>Messages: {userJoinMessages.length + userLeaveMessages.length + cursorUpdates.length + fileEdits.length + toolExecutions.length}</div>
        </div>
      )}
    </div>
  );
}
