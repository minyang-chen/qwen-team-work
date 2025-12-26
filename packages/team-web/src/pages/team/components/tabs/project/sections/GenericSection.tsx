import React, { useState } from 'react';

interface GenericItem {
  _id: string;
  title: string;
  description: string;
  status?: string;
  projectId: string;
}

interface GenericSectionProps {
  title: string;
  items: GenericItem[];
  onUpdate: (id: string, data: Partial<GenericItem>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<GenericItem, '_id'>) => void;
  color?: string;
}

export const GenericSection: React.FC<GenericSectionProps> = ({
  title,
  items,
  onUpdate,
  onDelete,
  onCreate,
  color = 'blue'
}) => {
  const [newItem, setNewItem] = useState<Partial<GenericItem>>({});

  const handleCreate = () => {
    if (newItem.title) {
      onCreate({
        title: newItem.title,
        description: newItem.description || '',
        status: newItem.status || 'Active',
        projectId: ''
      });
      setNewItem({});
    }
  };

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
    gray: 'bg-gray-600 hover:bg-gray-700'
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">{title}</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New {title.slice(0, -1)}</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder={`${title.slice(0, -1)} Title`}
              value={newItem.title || ''}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder={`${title.slice(0, -1)} Description`}
              value={newItem.description || ''}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              onClick={handleCreate}
              className={`px-4 py-2 text-white rounded-md ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}
            >
              Create {title.slice(0, -1)}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <button
                  onClick={() => onDelete(item._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
