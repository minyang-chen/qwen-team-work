import React, { useState } from 'react';

interface Requirement {
  _id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Review' | 'Approved' | 'Implemented';
  type: 'Functional' | 'Non-Functional' | 'Business' | 'Technical';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  acceptanceCriteria?: string;
  dependencies?: string[];
}

interface RequirementsSectionProps {
  requirements: Requirement[];
  onUpdate: (id: string, data: Partial<Requirement>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Requirement, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const RequirementsSection: React.FC<RequirementsSectionProps> = ({
  requirements,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newRequirement, setNewRequirement] = useState<Partial<Requirement>>({
    priority: 'Medium',
    status: 'Draft',
    type: 'Functional'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Requirement>>({});

  const handleCreate = () => {
    if (newRequirement.title && activeProject) {
      onCreate({
        title: newRequirement.title,
        description: newRequirement.description || '',
        priority: newRequirement.priority as 'High' | 'Medium' | 'Low' || 'Medium',
        status: newRequirement.status as 'Draft' | 'Review' | 'Approved' | 'Implemented' || 'Draft',
        type: newRequirement.type as 'Functional' | 'Non-Functional' | 'Business' | 'Technical' || 'Functional',
        projectId: activeProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: newRequirement.assignedTo,
        acceptanceCriteria: newRequirement.acceptanceCriteria,
        dependencies: newRequirement.dependencies || []
      });
      setNewRequirement({ priority: 'Medium', status: 'Draft', type: 'Functional' });
    }
  };

  const handleEdit = (requirement: Requirement) => {
    setEditingId(requirement._id);
    setEditData(requirement);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdate(editingId, { ...editData, updatedAt: new Date().toISOString() });
      setEditingId(null);
      setEditData({});
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Review': return 'bg-blue-100 text-blue-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Implemented': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <span className="text-sm text-gray-500">{requirements.length} total</span>
        </div>

        {/* Create New Requirement */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Requirement</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Requirement title"
                value={newRequirement.title || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newRequirement.type || 'Functional'}
                onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Functional">Functional</option>
                <option value="Non-Functional">Non-Functional</option>
                <option value="Business">Business</option>
                <option value="Technical">Technical</option>
              </select>
            </div>
            <textarea
              placeholder="Requirement description"
              value={newRequirement.description || ''}
              onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={newRequirement.priority || 'Medium'}
                onChange={(e) => setNewRequirement({ ...newRequirement, priority: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              <select
                value={newRequirement.status || 'Draft'}
                onChange={(e) => setNewRequirement({ ...newRequirement, status: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Implemented">Implemented</option>
              </select>
              <input
                type="text"
                placeholder="Assigned to"
                value={newRequirement.assignedTo || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, assignedTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <textarea
              placeholder="Acceptance criteria"
              value={newRequirement.acceptanceCriteria || ''}
              onChange={(e) => setNewRequirement({ ...newRequirement, acceptanceCriteria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <button
              onClick={handleCreate}
              disabled={!newRequirement.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Requirement
            </button>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-4">
          {requirements.map((requirement) => (
            <div key={requirement._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === requirement._id ? (
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
                    <h3 className="text-md font-medium">{requirement.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(requirement.priority)}`}>
                        {requirement.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(requirement.status)}`}>
                        {requirement.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{requirement.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                    <div>Type: <span className="font-medium">{requirement.type}</span></div>
                    {requirement.assignedTo && <div>Assigned: <span className="font-medium">{requirement.assignedTo}</span></div>}
                  </div>
                  {requirement.acceptanceCriteria && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Acceptance Criteria:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{requirement.acceptanceCriteria}</div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(requirement.createdAt).toLocaleDateString()}
                      {requirement.updatedAt !== requirement.createdAt && (
                        <span> • Updated: {new Date(requirement.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(requirement)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(requirement._id)}
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
          {requirements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No requirements found. Create your first requirement above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
