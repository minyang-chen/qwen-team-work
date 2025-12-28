import React, { useState } from 'react';

interface Analysis {
  _id: string;
  title: string;
  description: string;
  type: 'Requirements Analysis' | 'Risk Analysis' | 'Cost Analysis' | 'Performance Analysis' | 'Security Analysis' | 'Market Analysis';
  status: 'Draft' | 'In Progress' | 'Review' | 'Completed' | 'Approved';
  priority: 'High' | 'Medium' | 'Low';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  analyst?: string;
  reviewer?: string;
  methodology?: string;
  findings?: string;
  recommendations?: string;
  dataSource?: string;
  completionDate?: string;
  attachments?: string[];
}

interface AnalysisSectionProps {
  analyses: Analysis[];
  onUpdate: (id: string, data: Partial<Analysis>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Analysis, '_id'>) => void;
  activeProject: { id: string; name: string } | null;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  analyses,
  onUpdate,
  onDelete,
  onCreate,
  activeProject
}) => {
  const [newAnalysis, setNewAnalysis] = useState<Partial<Analysis>>({
    type: 'Requirements Analysis',
    status: 'Draft',
    priority: 'Medium'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Analysis>>({});

  const handleCreate = () => {
    if (newAnalysis.title && activeProject) {
      onCreate({
        title: newAnalysis.title,
        description: newAnalysis.description || '',
        type: newAnalysis.type as Analysis['type'] || 'Requirements Analysis',
        status: newAnalysis.status as Analysis['status'] || 'Draft',
        priority: newAnalysis.priority as Analysis['priority'] || 'Medium',
        projectId: activeProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analyst: newAnalysis.analyst,
        reviewer: newAnalysis.reviewer,
        methodology: newAnalysis.methodology,
        findings: newAnalysis.findings,
        recommendations: newAnalysis.recommendations,
        dataSource: newAnalysis.dataSource,
        attachments: newAnalysis.attachments || []
      });
      setNewAnalysis({ type: 'Requirements Analysis', status: 'Draft', priority: 'Medium' });
    }
  };

  const handleEdit = (analysis: Analysis) => {
    setEditingId(analysis._id);
    setEditData(analysis);
  };

  const handleSave = () => {
    if (editingId) {
      const updateData = { ...editData, updatedAt: new Date().toISOString() };
      if (editData.status === 'Completed' && !editData.completionDate) {
        updateData.completionDate = new Date().toISOString();
      }
      onUpdate(editingId, updateData);
      setEditingId(null);
      setEditData({});
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Requirements Analysis': return 'bg-blue-100 text-blue-800';
      case 'Risk Analysis': return 'bg-red-100 text-red-800';
      case 'Cost Analysis': return 'bg-green-100 text-green-800';
      case 'Performance Analysis': return 'bg-purple-100 text-purple-800';
      case 'Security Analysis': return 'bg-orange-100 text-orange-800';
      case 'Market Analysis': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Review': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Approved': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Project Analysis</h2>
          <span className="text-sm text-gray-500">{analyses.length} analyses</span>
        </div>

        {/* Create New Analysis */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Analysis</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Analysis title"
                value={newAnalysis.title || ''}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newAnalysis.type || 'Requirements Analysis'}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, type: e.target.value as Analysis['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Requirements Analysis">Requirements Analysis</option>
                <option value="Risk Analysis">Risk Analysis</option>
                <option value="Cost Analysis">Cost Analysis</option>
                <option value="Performance Analysis">Performance Analysis</option>
                <option value="Security Analysis">Security Analysis</option>
                <option value="Market Analysis">Market Analysis</option>
              </select>
            </div>
            <textarea
              placeholder="Analysis description"
              value={newAnalysis.description || ''}
              onChange={(e) => setNewAnalysis({ ...newAnalysis, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={newAnalysis.priority || 'Medium'}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, priority: e.target.value as Analysis['priority'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              <input
                type="text"
                placeholder="Analyst"
                value={newAnalysis.analyst || ''}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, analyst: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Reviewer"
                value={newAnalysis.reviewer || ''}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, reviewer: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Methodology"
                value={newAnalysis.methodology || ''}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, methodology: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Data source"
                value={newAnalysis.dataSource || ''}
                onChange={(e) => setNewAnalysis({ ...newAnalysis, dataSource: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newAnalysis.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Create Analysis
            </button>
          </div>
        </div>

        {/* Analysis List */}
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div key={analysis._id} className="border border-gray-200 rounded-lg p-4">
              {editingId === analysis._id ? (
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
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as Analysis['status'] })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Approved">Approved</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Methodology"
                      value={editData.methodology || ''}
                      onChange={(e) => setEditData({ ...editData, methodology: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    placeholder="Findings"
                    value={editData.findings || ''}
                    onChange={(e) => setEditData({ ...editData, findings: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <textarea
                    placeholder="Recommendations"
                    value={editData.recommendations || ''}
                    onChange={(e) => setEditData({ ...editData, recommendations: e.target.value })}
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
                    <h3 className="text-md font-medium">{analysis.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(analysis.type)}`}>
                        {analysis.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(analysis.status)}`}>
                        {analysis.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{analysis.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                    {analysis.analyst && <div>Analyst: <span className="font-medium">{analysis.analyst}</span></div>}
                    {analysis.reviewer && <div>Reviewer: <span className="font-medium">{analysis.reviewer}</span></div>}
                    {analysis.methodology && <div>Method: <span className="font-medium">{analysis.methodology}</span></div>}
                  </div>

                  {analysis.dataSource && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-500">Data Source: </span>
                      <span className="font-medium">{analysis.dataSource}</span>
                    </div>
                  )}

                  {analysis.findings && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Findings:</div>
                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">{analysis.findings}</div>
                    </div>
                  )}

                  {analysis.recommendations && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Recommendations:</div>
                      <div className="text-sm text-gray-600 bg-green-50 p-3 rounded">{analysis.recommendations}</div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(analysis.createdAt).toLocaleDateString()}
                      {analysis.completionDate && (
                        <span> • Completed: {new Date(analysis.completionDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(analysis)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(analysis._id)}
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
          {analyses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No analyses found. Create your first analysis above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
