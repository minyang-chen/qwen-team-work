interface ProjectSelectionPageProps {
  projects: any[];
  onSelectProject: (project: any) => void;
  onCreateNew: () => void;
}

export function ProjectSelectionPage({ projects, onSelectProject, onCreateNew }: ProjectSelectionPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6">Select a Project</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Create New Project Card */}
        <button
          onClick={onCreateNew}
          className="p-6 border-2 border-dashed border-blue-400 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center min-h-[200px]"
        >
          <svg className="w-12 h-12 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-lg font-semibold text-blue-600">Create New Project</span>
        </button>

        {/* Existing Projects */}
        {projects.map((project) => (
          <button
            key={project._id}
            onClick={() => onSelectProject(project)}
            className="p-6 border border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left min-h-[200px] flex flex-col"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              <span className={`px-2 py-1 text-xs rounded ${
                project.status === 'Active' ? 'bg-green-100 text-green-800' :
                project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{project.projectId}</p>
            {project.description && (
              <p className="text-sm text-gray-700 line-clamp-3 flex-grow">{project.description}</p>
            )}
            {project.manager && (
              <p className="text-xs text-gray-500 mt-2">Manager: {project.manager}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
