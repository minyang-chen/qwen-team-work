import React, { useState } from 'react';

interface Implementation {
  _id: string;
  title: string;
  description: string;
  technology: string;
  status: string;
  projectId: string;
}

interface ImplementationSectionProps {
  implementations: Implementation[];
  onUpdate: (id: string, data: Partial<Implementation>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<Implementation, '_id'>) => void;
}

export const ImplementationSection: React.FC<ImplementationSectionProps> = ({
  implementations,
  onUpdate,
  onDelete,
  onCreate
}) => {
  const [newImplementation, setNewImplementation] = useState<Partial<Implementation>>({});

  const handleCreate = () => {
    if (newImplementation.title) {
      onCreate({
        title: newImplementation.title,
        description: newImplementation.description || '',
        technology: newImplementation.technology || 'JavaScript',
        status: newImplementation.status || 'Planning',
        projectId: ''
      });
      setNewImplementation({});
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">Implementation</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Implementation Title"
              value={newImplementation.title || ''}
              onChange={(e) => setNewImplementation({ ...newImplementation, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newImplementation.technology || 'JavaScript'}
              onChange={(e) => setNewImplementation({ ...newImplementation, technology: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C#">C#</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>
          <textarea
            placeholder="Implementation Description"
            value={newImplementation.description || ''}
            onChange={(e) => setNewImplementation({ ...newImplementation, description: e.target.value })}
            className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Create Implementation
          </button>
        </div>

        <div className="space-y-4">
          {implementations.map((impl) => (
            <div key={impl._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{impl.title}</h3>
                <button
                  onClick={() => onDelete(impl._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <p className="text-gray-600 mb-3">{impl.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                  {impl.technology}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
