import React, { useState } from 'react';
import { Project } from '../../../types/team.types';

interface ProjectConfigurationProps {
  activeProject: Project;
  onUpdateProject: (project: Project) => void;
}

const ProjectConfiguration: React.FC<ProjectConfigurationProps> = ({
  activeProject,
  onUpdateProject,
}) => {
  const [config, setConfig] = useState(activeProject.sectionConfig || {});

  const sections = [
    { key: 'requirements', label: 'Requirements', category: 'Core Project Management' },
    { key: 'plan', label: 'Plan', category: 'Core Project Management' },
    { key: 'deliverable', label: 'Deliverable', category: 'Core Project Management' },
    { key: 'analysis', label: 'Analysis', category: 'Core Project Management' },
    { key: 'architecture', label: 'Architecture', category: 'Development & Technical' },
    { key: 'design', label: 'Design', category: 'Development & Technical' },
    { key: 'implementation', label: 'Implementation', category: 'Development & Technical' },
    { key: 'code', label: 'Code', category: 'Development & Technical' },
    { key: 'tasks', label: 'Tasks', category: 'Development & Technical' },
    { key: 'issues', label: 'Issues', category: 'Quality & Communication' },
    { key: 'testing', label: 'Testing', category: 'Quality & Communication' },
    { key: 'meetings', label: 'Meetings', category: 'Quality & Communication' },
    { key: 'documents', label: 'Documents', category: 'Other' },
    { key: 'notes', label: 'Notes', category: 'Other' },
    { key: 'research', label: 'Research', category: 'Other' },
    { key: 'report', label: 'Report', category: 'Other' },
    { key: 'support', label: 'Support', category: 'Other' },
  ];

  const handleToggle = (sectionKey: string) => {
    const newConfig = { ...config, [sectionKey]: !config[sectionKey] };
    setConfig(newConfig);
    onUpdateProject({ ...activeProject, sectionConfig: newConfig });
  };

  const groupedSections = sections.reduce((acc, section) => {
    if (!acc[section.category]) acc[section.category] = [];
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Project Section Configuration</h3>
      <p className="text-gray-600 mb-6">Enable or disable project sections to customize your dashboard.</p>
      
      {Object.entries(groupedSections).map(([category, sectionList]) => (
        <div key={category} className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">{category}</h4>
          <div className="grid grid-cols-2 gap-3">
            {sectionList.map((section) => (
              <label key={section.key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config[section.key] !== false}
                  onChange={() => handleToggle(section.key)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{section.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectConfiguration;
