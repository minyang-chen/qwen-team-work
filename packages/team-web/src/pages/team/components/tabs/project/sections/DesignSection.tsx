import React, { useState } from 'react';

interface Design {
  _id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  projectId: string;
}

interface DesignSectionProps {
  designs: Design[];
  onUpdate: (id: string, data: Partial<Design>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Design, '_id'>) => void;
}

export const DesignSection: React.FC<DesignSectionProps> = ({
  designs,
  onUpdate,
  onDelete,
  onCreate
}) => {
  const [newDesign, setNewDesign] = useState<Partial<Design>>({});

  const handleCreate = () => {
    if (newDesign.title) {
      onCreate({
        title: newDesign.title,
        description: newDesign.description || '',
        type: newDesign.type || 'UI Design',
        status: newDesign.status || 'Draft',
        projectId: ''
      });
      setNewDesign({});
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">Design</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Design</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Design Title"
              value={newDesign.title || ''}
              onChange={(e) => setNewDesign({ ...newDesign, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newDesign.type || 'UI Design'}
              onChange={(e) => setNewDesign({ ...newDesign, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UI Design">UI Design</option>
              <option value="UX Design">UX Design</option>
              <option value="Wireframe">Wireframe</option>
              <option value="Mockup">Mockup</option>
              <option value="Prototype">Prototype</option>
            </select>
          </div>
          <textarea
            placeholder="Design Description"
            value={newDesign.description || ''}
            onChange={(e) => setNewDesign({ ...newDesign, description: e.target.value })}
            className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            Create Design
          </button>
        </div>

        <div className="space-y-4">
          {designs.map((design) => (
            <div key={design._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{design.title}</h3>
                <button
                  onClick={() => onDelete(design._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <p className="text-gray-600 mb-3">{design.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="px-2 py-1 rounded-full bg-pink-100 text-pink-800">
                  {design.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
