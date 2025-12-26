import { ProjectSubTab } from '../../../types/team.types';

interface ProjectDetailsPageProps {
  activeProject: any;
  onBack: () => void;
  onSectionClick: (section: ProjectSubTab) => void;
}

export function ProjectDetailsPage({ activeProject, onBack, onSectionClick }: ProjectDetailsPageProps) {
  const sections = [
    { id: 'plan' as ProjectSubTab, label: 'Plan', icon: '📋', color: 'bg-blue-100 hover:bg-blue-200' },
    { id: 'deliverable' as ProjectSubTab, label: 'Deliverable', icon: '📦', color: 'bg-green-100 hover:bg-green-200' },
    { id: 'requirements' as ProjectSubTab, label: 'Requirements', icon: '📝', color: 'bg-purple-100 hover:bg-purple-200' },
    { id: 'analysis' as ProjectSubTab, label: 'Analysis', icon: '📊', color: 'bg-yellow-100 hover:bg-yellow-200' },
    { id: 'architecture' as ProjectSubTab, label: 'Architecture', icon: '🏗️', color: 'bg-indigo-100 hover:bg-indigo-200' },
    { id: 'design' as ProjectSubTab, label: 'Design', icon: '🎨', color: 'bg-pink-100 hover:bg-pink-200' },
    { id: 'implementation' as ProjectSubTab, label: 'Implementation', icon: '⚙️', color: 'bg-orange-100 hover:bg-orange-200' },
    { id: 'tasks' as ProjectSubTab, label: 'Tasks', icon: '✅', color: 'bg-teal-100 hover:bg-teal-200' },
    { id: 'code' as ProjectSubTab, label: 'Code', icon: '💻', color: 'bg-gray-100 hover:bg-gray-200' },
    { id: 'issues' as ProjectSubTab, label: 'Issues', icon: '🐛', color: 'bg-red-100 hover:bg-red-200' },
    { id: 'meetings' as ProjectSubTab, label: 'Meetings', icon: '👥', color: 'bg-cyan-100 hover:bg-cyan-200' },
    { id: 'documents' as ProjectSubTab, label: 'Documents', icon: '📄', color: 'bg-lime-100 hover:bg-lime-200' },
    { id: 'notes' as ProjectSubTab, label: 'Notes', icon: '📓', color: 'bg-amber-100 hover:bg-amber-200' },
    { id: 'research' as ProjectSubTab, label: 'Research', icon: '🔬', color: 'bg-violet-100 hover:bg-violet-200' },
    { id: 'report' as ProjectSubTab, label: 'Report', icon: '📈', color: 'bg-fuchsia-100 hover:bg-fuchsia-200' },
    { id: 'support' as ProjectSubTab, label: 'Support', icon: '🆘', color: 'bg-rose-100 hover:bg-rose-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          <h2 className="text-3xl font-bold text-gray-900">{activeProject.name}</h2>
          <p className="text-sm text-gray-600 mt-1">{activeProject.projectId}</p>
        </div>
        <span className={`px-3 py-1 rounded ${
          activeProject.status === 'Active' ? 'bg-green-100 text-green-800' :
          activeProject.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
          activeProject.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {activeProject.status}
        </span>
      </div>

      {/* Project Details */}
      {activeProject.description && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{activeProject.description}</p>
        </div>
      )}

      {/* Task Sections Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`p-6 rounded-lg border border-gray-300 ${section.color} transition-all hover:shadow-md flex flex-col items-center justify-center`}
          >
            <span className="text-4xl mb-2">{section.icon}</span>
            <span className="font-semibold text-gray-800">{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
