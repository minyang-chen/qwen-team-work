import React, { useState } from 'react';

interface CodeRepo {
  _id: string;
  name: string;
  description: string;
  url: string;
  language: string;
  status: string;
  projectId: string;
}

interface CodeSectionProps {
  codeRepos: CodeRepo[];
  onUpdate: (id: string, data: Partial<CodeRepo>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<CodeRepo, '_id'>) => void;
}

export const CodeSection: React.FC<CodeSectionProps> = ({
  codeRepos,
  onUpdate,
  onDelete,
  onCreate
}) => {
  const [newRepo, setNewRepo] = useState<Partial<CodeRepo>>({});

  const handleCreate = () => {
    if (newRepo.name) {
      onCreate({
        name: newRepo.name,
        description: newRepo.description || '',
        url: newRepo.url || '',
        language: newRepo.language || 'JavaScript',
        status: newRepo.status || 'Active',
        projectId: ''
      });
      setNewRepo({});
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">Code Repositories</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Add New Repository</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Repository Name"
              value={newRepo.name || ''}
              onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              placeholder="Repository URL"
              value={newRepo.url || ''}
              onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newRepo.language || 'JavaScript'}
              onChange={(e) => setNewRepo({ ...newRepo, language: e.target.value })}
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
            <select
              value={newRepo.status || 'Active'}
              onChange={(e) => setNewRepo({ ...newRepo, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="Deprecated">Deprecated</option>
            </select>
          </div>
          <textarea
            placeholder="Repository Description"
            value={newRepo.description || ''}
            onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
            className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Add Repository
          </button>
        </div>

        <div className="space-y-4">
          {codeRepos.map((repo) => (
            <div key={repo._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{repo.name}</h3>
                <button
                  onClick={() => onDelete(repo._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <p className="text-gray-600 mb-3">{repo.description}</p>
              {repo.url && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 mb-3 block"
                >
                  {repo.url}
                </a>
              )}
              <div className="flex gap-4 text-sm">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                  {repo.language}
                </span>
                <span className={`px-2 py-1 rounded-full ${
                  repo.status === 'Active' ? 'bg-green-100 text-green-800' :
                  repo.status === 'Archived' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {repo.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
