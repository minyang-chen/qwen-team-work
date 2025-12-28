import React, { useState } from 'react';

interface Architecture {
  _id: string;
  title: string;
  description: string;
  type: 'System' | 'Software' | 'Data' | 'Security' | 'Network' | 'Infrastructure';
  status: 'Draft' | 'Review' | 'Approved' | 'Implemented';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  components?: string[];
  technologies?: string[];
  diagrams?: string[];
  constraints?: string;
  assumptions?: string;
}

interface ArchitectureSectionProps {
  architectures: Architecture[];
  onUpdate: (id: string, data: Partial<Architecture>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Architecture, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const ArchitectureSection: React.FC<ArchitectureSectionProps> = ({
  architectures,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newArchitecture, setNewArchitecture] = useState<Partial<Architecture>>({
    type: 'System',
    status: 'Draft'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Architecture>>({});

  const handleCreate = () => {
    if (newArchitecture.title && activeProject) {
      onCreate({
        title: newArchitecture.title,
        description: newArchitecture.description || '',
        type: newArchitecture.type as Architecture['type'] || 'System',
        status: newArchitecture.status as Architecture['status'] || 'Draft',
        projectId: activeProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        components: newArchitecture.components || [],
        technologies: newArchitecture.technologies || [],
        diagrams: newArchitecture.diagrams || [],
        constraints: newArchitecture.constraints,
        assumptions: newArchitecture.assumptions
      });
      setNewArchitecture({ type: 'System', status: 'Draft' });
    }
  };

  const handleEdit = (architecture: Architecture) => {
    setEditingId(architecture._id);
    setEditData(architecture);
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
      case 'System': return 'bg-blue-100 text-blue-800';
      case 'Software': return 'bg-green-100 text-green-800';
      case 'Data': return 'bg-purple-100 text-purple-800';
      case 'Security': return 'bg-red-100 text-red-800';
      case 'Network': return 'bg-yellow-100 text-yellow-800';
      case 'Infrastructure': return 'bg-gray-100 text-gray-800';
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
          <h2 className="text-lg font-semibold">Architecture</h2>
          <span className="text-sm text-gray-500">{architectures.length} designs</span>
        </div>

        {/* Create New Architecture */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Architecture Design</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Architecture title"
                value={newArchitecture.title || ''}
                onChange={(e) => setNewArchitecture({ ...newArchitecture, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newArchitecture.type || 'System'}
                onChange={(e) => setNewArchitecture({ ...newArchitecture, type: e.target.value as Architecture['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="System">System Architecture</option>
                <option value="Software">Software Architecture</option>
                <option value="Data">Data Architecture</option>
                <option value="Security">Security Architecture</option>
                <option value="Network">Network Architecture</option>
                <option value="Infrastructure">Infrastructure Architecture</option>
              </select>
            </div>
            <textarea
              placeholder="Architecture description"
              value={newArchitecture.description || ''}
              onChange={(e) => setNewArchitecture({ ...newArchitecture, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Technologies (comma-separated)"
                value={newArchitecture.technologies?.join(', ') || ''}
                onChange={(e) => setNewArchitecture({ 
                  ...newArchitecture, 
                  technologies: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Components (comma-separated)"
                value={newArchitecture.components?.join(', ') || ''}
                onChange={(e) => setNewArchitecture({ 
                  ...newArchitecture, 
                  components: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                placeholder="Constraints"
                value={newArchitecture.constraints || ''}
                onChange={(e) => setNewArchitecture({ ...newArchitecture, constraints: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <textarea
                placeholder="Assumptions"
                value={newArchitecture.assumptions || ''}
                onChange={(e) => setNewArchitecture({ ...newArchitecture, assumptions: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newArchitecture.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Architecture
            </button>
          </div>
        </div>

        {/* Architecture List */}
        <div className="space-y-4">
          {architectures.map((architecture) => (
            <div key={architecture._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === architecture._id ? (
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
                    <h3 className="text-md font-medium">{architecture.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(architecture.type)}`}>
                        {architecture.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(architecture.status)}`}>
                        {architecture.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{architecture.description}</p>
                  
                  {architecture.technologies && architecture.technologies.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Technologies:</div>
                      <div className="flex flex-wrap gap-1">
                        {architecture.technologies.map((tech, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {architecture.components && architecture.components.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Components:</div>
                      <div className="flex flex-wrap gap-1">
                        {architecture.components.map((component, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {component}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(architecture.constraints || architecture.assumptions) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {architecture.constraints && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Constraints:</div>
                          <div className="text-sm text-gray-600 bg-red-50 p-2 rounded">{architecture.constraints}</div>
                        </div>
                      )}
                      {architecture.assumptions && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Assumptions:</div>
                          <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">{architecture.assumptions}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(architecture.createdAt).toLocaleDateString()}
                      {architecture.updatedAt !== architecture.createdAt && (
                        <span> • Updated: {new Date(architecture.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(architecture)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(architecture._id)}
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
          {architectures.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No architecture designs found. Create your first architecture design above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
