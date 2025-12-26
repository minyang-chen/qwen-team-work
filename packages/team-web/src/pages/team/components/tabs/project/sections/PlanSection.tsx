import React, { useState } from 'react';

interface Plan {
  _id: string;
  title: string;
  description: string;
  type: 'Project Plan' | 'Sprint Plan' | 'Release Plan' | 'Risk Plan' | 'Communication Plan';
  status: 'Draft' | 'Review' | 'Approved' | 'Active' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  stakeholders?: string[];
  objectives?: string[];
  milestones?: { name: string; date: string; status: string }[];
  resources?: string[];
  budget?: number;
  risks?: string[];
}

interface PlanSectionProps {
  plans: Plan[];
  onUpdate: (id: string, data: Partial<Plan>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Plan, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const PlanSection: React.FC<PlanSectionProps> = ({
  plans,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    type: 'Project Plan',
    status: 'Draft',
    priority: 'Medium'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});

  const handleCreate = () => {
    if (newPlan.title && activeProject) {
      onCreate({
        title: newPlan.title,
        description: newPlan.description || '',
        type: newPlan.type as Plan['type'] || 'Project Plan',
        status: newPlan.status as Plan['status'] || 'Draft',
        priority: newPlan.priority as Plan['priority'] || 'Medium',
        projectId: activeProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startDate: newPlan.startDate,
        endDate: newPlan.endDate,
        owner: newPlan.owner,
        stakeholders: newPlan.stakeholders || [],
        objectives: newPlan.objectives || [],
        milestones: newPlan.milestones || [],
        resources: newPlan.resources || [],
        budget: newPlan.budget,
        risks: newPlan.risks || []
      });
      setNewPlan({ type: 'Project Plan', status: 'Draft', priority: 'Medium' });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan._id);
    setEditData(plan);
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
      case 'Project Plan': return 'bg-blue-100 text-blue-800';
      case 'Sprint Plan': return 'bg-green-100 text-green-800';
      case 'Release Plan': return 'bg-purple-100 text-purple-800';
      case 'Risk Plan': return 'bg-red-100 text-red-800';
      case 'Communication Plan': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Review': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Project Plans</h2>
          <span className="text-sm text-gray-500">{plans.length} plans</span>
        </div>

        {/* Create New Plan */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Plan</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Plan title"
                value={newPlan.title || ''}
                onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPlan.type || 'Project Plan'}
                onChange={(e) => setNewPlan({ ...newPlan, type: e.target.value as Plan['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Project Plan">Project Plan</option>
                <option value="Sprint Plan">Sprint Plan</option>
                <option value="Release Plan">Release Plan</option>
                <option value="Risk Plan">Risk Plan</option>
                <option value="Communication Plan">Communication Plan</option>
              </select>
            </div>
            <textarea
              placeholder="Plan description"
              value={newPlan.description || ''}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={newPlan.priority || 'Medium'}
                onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as Plan['priority'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              <input
                type="text"
                placeholder="Plan owner"
                value={newPlan.owner || ''}
                onChange={(e) => setNewPlan({ ...newPlan, owner: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="Start date"
                value={newPlan.startDate || ''}
                onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="End date"
                value={newPlan.endDate || ''}
                onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Stakeholders (comma-separated)"
                value={newPlan.stakeholders?.join(', ') || ''}
                onChange={(e) => setNewPlan({ 
                  ...newPlan, 
                  stakeholders: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Budget"
                value={newPlan.budget || ''}
                onChange={(e) => setNewPlan({ ...newPlan, budget: parseFloat(e.target.value) || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newPlan.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Plan
            </button>
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === plan._id ? (
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
                    <h3 className="text-md font-medium">{plan.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(plan.type)}`}>
                        {plan.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{plan.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                    {plan.owner && <div>Owner: <span className="font-medium">{plan.owner}</span></div>}
                    {plan.startDate && <div>Start: <span className="font-medium">{new Date(plan.startDate).toLocaleDateString()}</span></div>}
                    {plan.endDate && <div>End: <span className="font-medium">{new Date(plan.endDate).toLocaleDateString()}</span></div>}
                  </div>

                  {plan.stakeholders && plan.stakeholders.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Stakeholders:</div>
                      <div className="flex flex-wrap gap-1">
                        {plan.stakeholders.map((stakeholder, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {stakeholder}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.budget && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-500">Budget: </span>
                      <span className="font-medium text-green-600">${plan.budget.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(plan.createdAt).toLocaleDateString()}
                      {plan.updatedAt !== plan.createdAt && (
                        <span> • Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(plan._id)}
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
          {plans.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No plans found. Create your first plan above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
