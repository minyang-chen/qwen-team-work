import React, { useState } from 'react';

interface Deliverable {
  _id: string;
  title: string;
  description: string;
  type: 'Document' | 'Software' | 'Report' | 'Presentation' | 'Training' | 'Other';
  status: 'Not Started' | 'In Progress' | 'Review' | 'Approved' | 'Delivered';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  deliveredDate?: string;
  assignedTo?: string;
  reviewer?: string;
  progress?: number;
  dependencies?: string[];
  acceptanceCriteria?: string;
  deliveryMethod?: string;
  location?: string;
}

interface DeliverableSectionProps {
  deliverables: Deliverable[];
  onUpdate: (id: string, data: Partial<Deliverable>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Deliverable, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const DeliverableSection: React.FC<DeliverableSectionProps> = ({
  deliverables,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newDeliverable, setNewDeliverable] = useState<Partial<Deliverable>>({
    type: 'Document',
    status: 'Not Started',
    priority: 'Medium',
    progress: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Deliverable>>({});

  const handleCreate = () => {
    if (newDeliverable.title && activeProject) {
      onCreate({
        title: newDeliverable.title,
        description: newDeliverable.description || '',
        type: newDeliverable.type as Deliverable['type'] || 'Document',
        status: newDeliverable.status as Deliverable['status'] || 'Not Started',
        priority: newDeliverable.priority as Deliverable['priority'] || 'Medium',
        projectId: activeProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: newDeliverable.dueDate,
        assignedTo: newDeliverable.assignedTo,
        reviewer: newDeliverable.reviewer,
        progress: newDeliverable.progress || 0,
        dependencies: newDeliverable.dependencies || [],
        acceptanceCriteria: newDeliverable.acceptanceCriteria,
        deliveryMethod: newDeliverable.deliveryMethod,
        location: newDeliverable.location
      });
      setNewDeliverable({ type: 'Document', status: 'Not Started', priority: 'Medium', progress: 0 });
    }
  };

  const handleEdit = (deliverable: Deliverable) => {
    setEditingId(deliverable._id);
    setEditData(deliverable);
  };

  const handleSave = () => {
    if (editingId) {
      const updateData = { ...editData, updatedAt: new Date().toISOString() };
      if (editData.status === 'Delivered' && !editData.deliveredDate) {
        updateData.deliveredDate = new Date().toISOString();
      }
      onUpdate(editingId, updateData);
      setEditingId(null);
      setEditData({});
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Document': return 'bg-blue-100 text-blue-800';
      case 'Software': return 'bg-green-100 text-green-800';
      case 'Report': return 'bg-purple-100 text-purple-800';
      case 'Presentation': return 'bg-yellow-100 text-yellow-800';
      case 'Training': return 'bg-indigo-100 text-indigo-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Review': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Delivered': return 'bg-purple-100 text-purple-800';
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

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Deliverables</h2>
          <span className="text-sm text-gray-500">{deliverables.length} deliverables</span>
        </div>

        {/* Create New Deliverable */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Deliverable</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Deliverable title"
                value={newDeliverable.title || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newDeliverable.type || 'Document'}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, type: e.target.value as Deliverable['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Document">Document</option>
                <option value="Software">Software</option>
                <option value="Report">Report</option>
                <option value="Presentation">Presentation</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <textarea
              placeholder="Deliverable description"
              value={newDeliverable.description || ''}
              onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={newDeliverable.priority || 'Medium'}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, priority: e.target.value as Deliverable['priority'] })}
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
                value={newDeliverable.assignedTo || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, assignedTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Reviewer"
                value={newDeliverable.reviewer || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, reviewer: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="Due date"
                value={newDeliverable.dueDate || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Delivery method"
                value={newDeliverable.deliveryMethod || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, deliveryMethod: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location/URL"
                value={newDeliverable.location || ''}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, location: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <textarea
              placeholder="Acceptance criteria"
              value={newDeliverable.acceptanceCriteria || ''}
              onChange={(e) => setNewDeliverable({ ...newDeliverable, acceptanceCriteria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <button
              onClick={handleCreate}
              disabled={!newDeliverable.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Deliverable
            </button>
          </div>
        </div>

        {/* Deliverables List */}
        <div className="space-y-4">
          {deliverables.map((deliverable) => (
            <div key={deliverable._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === deliverable._id ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={editData.status || ''}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as Deliverable['status'] })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Delivered">Delivered</option>
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
                    <h3 className="text-md font-medium">{deliverable.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(deliverable.type)}`}>
                        {deliverable.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(deliverable.priority)}`}>
                        {deliverable.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(deliverable.status)}`}>
                        {deliverable.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{deliverable.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                    {deliverable.assignedTo && <div>Assigned: <span className="font-medium">{deliverable.assignedTo}</span></div>}
                    {deliverable.reviewer && <div>Reviewer: <span className="font-medium">{deliverable.reviewer}</span></div>}
                    {deliverable.dueDate && (
                      <div>
                        Due: <span className={`font-medium ${new Date(deliverable.dueDate) < new Date() && deliverable.status !== 'Delivered' ? 'text-red-600' : ''}`}>
                          {new Date(deliverable.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {deliverable.progress !== undefined && deliverable.progress > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{deliverable.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${deliverable.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {deliverable.acceptanceCriteria && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Acceptance Criteria:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{deliverable.acceptanceCriteria}</div>
                    </div>
                  )}

                  {(deliverable.deliveryMethod || deliverable.location) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                      {deliverable.deliveryMethod && (
                        <div>
                          <span className="text-gray-500">Method: </span>
                          <span className="font-medium">{deliverable.deliveryMethod}</span>
                        </div>
                      )}
                      {deliverable.location && (
                        <div>
                          <span className="text-gray-500">Location: </span>
                          <span className="font-medium">{deliverable.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(deliverable.createdAt).toLocaleDateString()}
                      {deliverable.deliveredDate && (
                        <span> • Delivered: {new Date(deliverable.deliveredDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(deliverable)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(deliverable._id)}
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
          {deliverables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No deliverables found. Create your first deliverable above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
