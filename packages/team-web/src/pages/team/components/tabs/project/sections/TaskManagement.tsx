import React, { useState } from 'react';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  type: 'Development' | 'Testing' | 'Documentation' | 'Research' | 'Bug Fix' | 'Feature';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  reporter?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  dependencies?: string[];
  tags?: string[];
  progress?: number;
}

interface TaskManagementProps {
  tasks: Task[];
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Task, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({
  tasks,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'Todo',
    priority: 'Medium',
    type: 'Development',
    progress: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const handleCreate = () => {
    if (newTask.title && activeProject) {
      onCreate({
        title: newTask.title,
        description: newTask.description || '',
        status: newTask.status as Task['status'] || 'Todo',
        priority: newTask.priority as Task['priority'] || 'Medium',
        type: newTask.type as Task['type'] || 'Development',
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

  const handleEdit = (task: Task) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Review': return 'bg-yellow-100 text-yellow-800';
      case 'Done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(status => (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center justify-between">
              {status}
              <span className="text-sm text-gray-500">
                {filteredTasks.filter(t => t.status === status).length}
              </span>
            </h3>
            <div className="space-y-3">
              {filteredTasks.filter(t => t.status === status).map(task => (
                <div key={task._id} className="bg-white p-3 rounded border shadow-sm">
                  <h4 className="font-medium text-sm mb-2">{task.title}</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(task.type)}`}>
                      {task.type}
                    </span>
                  </div>
                  {task.assignedTo && (
                    <div className="text-xs text-gray-500 mb-2">
                      Assigned: {task.assignedTo}
                    </div>
                  )}
                  {task.dueDate && (
                    <div className={`text-xs mb-2 ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600' : 'text-gray-500'}`}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(task)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(task._id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Task Management</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">Total: {stats.total}</span>
            <span className="text-blue-600">Todo: {stats.todo}</span>
            <span className="text-yellow-600">In Progress: {stats.inProgress}</span>
            <span className="text-green-600">Done: {stats.done}</span>
            {stats.overdue > 0 && <span className="text-red-600">Overdue: {stats.overdue}</span>}
          </div>
        </div>

        {/* View Toggle and Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded text-sm ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Kanban View
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Assignees</option>
            {uniqueAssignees.map(assignee => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
        </div>

        {/* Create New Task */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Task</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title || ''}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newTask.type || 'Development'}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as Task['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Development">Development</option>
                <option value="Testing">Testing</option>
                <option value="Documentation">Documentation</option>
                <option value="Research">Research</option>
                <option value="Bug Fix">Bug Fix</option>
                <option value="Feature">Feature</option>
              </select>
            </div>
            <textarea
              placeholder="Task description"
              value={newTask.description || ''}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={newTask.priority || 'Medium'}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input
                type="text"
                placeholder="Assigned to"
                value={newTask.assignedTo || ''}
                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Est. hours"
                value={newTask.estimatedHours || ''}
                onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseInt(e.target.value) || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="Due date"
                value={newTask.dueDate || ''}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newTask.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Task
            </button>
          </div>
        </div>

        {/* Tasks Display */}
        {viewMode === 'kanban' ? renderKanbanView() : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task._id} className={`border rounded-lg p-4 ${getPriorityColor(task.priority)} border`}>
                {editingId === task._id ? (
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <select
                        value={editData.status || ''}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value as Task['status'] })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Todo">Todo</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Done">Done</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Progress %"
                        value={editData.progress || ''}
                        onChange={(e) => setEditData({ ...editData, progress: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                      />
                      <input
                        type="number"
                        placeholder="Actual hours"
                        value={editData.actualHours || ''}
                        onChange={(e) => setEditData({ ...editData, actualHours: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={editData.startDate || ''}
                        onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
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
                      <h3 className="text-md font-medium">{task.title}</h3>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(task.type)}`}>
                          {task.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                      {task.assignedTo && <div>Assigned: <span className="font-medium">{task.assignedTo}</span></div>}
                      {task.estimatedHours && (
                        <div>
                          Hours: <span className="font-medium">{task.actualHours || 0}/{task.estimatedHours}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div>
                          Due: <span className={`font-medium ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600' : ''}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {task.progress !== undefined && task.progress > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                        {task.completedDate && (
                          <span> • Completed: {new Date(task.completedDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(task)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(task._id)}
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
            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {tasks.length === 0 ? 'No tasks found. Create your first task above.' : 'No tasks match the current filters.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
