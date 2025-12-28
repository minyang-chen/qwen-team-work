import React, { useState } from 'react';

interface Issue {
  _id: string;
  title: string;
  description: string;
  type: 'Bug' | 'Feature' | 'Enhancement' | 'Task' | 'Epic';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Review' | 'Testing' | 'Closed';
  severity: 'Blocker' | 'Major' | 'Minor' | 'Trivial';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  reporter?: string;
  labels?: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  resolution?: string;
}

interface IssuesSectionProps {
  issues: Issue[];
  onUpdate: (id: string, data: Partial<Issue>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Issue, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({
  issues,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newIssue, setNewIssue] = useState<Partial<Issue>>({
    type: 'Bug',
    priority: 'Medium',
    status: 'Open',
    severity: 'Minor'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Issue>>({});
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  const handleCreate = () => {
    if (newIssue.title && activeProject) {
      onCreate({
        title: newIssue.title,
        description: newIssue.description || '',
        type: newIssue.type as Issue['type'] || 'Bug',
        priority: newIssue.priority as Issue['priority'] || 'Medium',
        status: newIssue.status as Issue['status'] || 'Open',
        severity: newIssue.severity as Issue['severity'] || 'Minor',
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

  const handleEdit = (issue: Issue) => {
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Bug': return 'bg-red-100 text-red-800';
      case 'Feature': return 'bg-green-100 text-green-800';
      case 'Enhancement': return 'bg-blue-100 text-blue-800';
      case 'Task': return 'bg-yellow-100 text-yellow-800';
      case 'Epic': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
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

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Issues & Bugs</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">Total: {stats.total}</span>
            <span className="text-red-600">Open: {stats.open}</span>
            <span className="text-blue-600">In Progress: {stats.inProgress}</span>
            <span className="text-green-600">Closed: {stats.closed}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Testing">Testing</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Bug">Bug</option>
            <option value="Feature">Feature</option>
            <option value="Enhancement">Enhancement</option>
            <option value="Task">Task</option>
            <option value="Epic">Epic</option>
          </select>
        </div>

        {/* Create New Issue */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Issue</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Issue title"
                value={newIssue.title || ''}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newIssue.type || 'Bug'}
                onChange={(e) => setNewIssue({ ...newIssue, type: e.target.value as Issue['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Bug">Bug</option>
                <option value="Feature">Feature Request</option>
                <option value="Enhancement">Enhancement</option>
                <option value="Task">Task</option>
                <option value="Epic">Epic</option>
              </select>
            </div>
            <textarea
              placeholder="Issue description"
              value={newIssue.description || ''}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={newIssue.priority || 'Medium'}
                onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as Issue['priority'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                value={newIssue.severity || 'Minor'}
                onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as Issue['severity'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Blocker">Blocker</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
                <option value="Trivial">Trivial</option>
              </select>
              <input
                type="text"
                placeholder="Assigned to"
                value={newIssue.assignedTo || ''}
                onChange={(e) => setNewIssue({ ...newIssue, assignedTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Est. hours"
                value={newIssue.estimatedHours || ''}
                onChange={(e) => setNewIssue({ ...newIssue, estimatedHours: parseInt(e.target.value) || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                placeholder="Due date"
                value={newIssue.dueDate || ''}
                onChange={(e) => setNewIssue({ ...newIssue, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Labels (comma-separated)"
                value={newIssue.labels?.join(', ') || ''}
                onChange={(e) => setNewIssue({ 
                  ...newIssue, 
                  labels: e.target.value.split(',').map(l => l.trim()).filter(l => l) 
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newIssue.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Issue
            </button>
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div key={issue._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === issue._id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={editData.status || ''}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as Issue['status'] })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Testing">Testing</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Actual hours"
                      value={editData.actualHours || ''}
                      onChange={(e) => setEditData({ ...editData, actualHours: parseInt(e.target.value) || undefined })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Resolution"
                      value={editData.resolution || ''}
                      onChange={(e) => setEditData({ ...editData, resolution: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-medium">{issue.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(issue.type)}`}>
                        {issue.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(issue.priority)}`}>
                        {issue.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{issue.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                    <div>Severity: <span className="font-medium">{issue.severity}</span></div>
                    {issue.assignedTo && <div>Assigned: <span className="font-medium">{issue.assignedTo}</span></div>}
                    {issue.estimatedHours && (
                      <div>
                        Hours: <span className="font-medium">{issue.actualHours || 0}/{issue.estimatedHours}</span>
                      </div>
                    )}
                  </div>

                  {issue.labels && issue.labels.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {issue.dueDate && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-500">Due: </span>
                      <span className={`font-medium ${new Date(issue.dueDate) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                        {new Date(issue.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {issue.resolution && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Resolution:</div>
                      <div className="text-sm text-gray-600 bg-green-50 p-2 rounded">{issue.resolution}</div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(issue.createdAt).toLocaleDateString()}
                      {issue.updatedAt !== issue.createdAt && (
                        <span> • Updated: {new Date(issue.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(issue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(issue._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredIssues.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {issues.length === 0 ? 'No issues found. Create your first issue above.' : 'No issues match the current filters.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
