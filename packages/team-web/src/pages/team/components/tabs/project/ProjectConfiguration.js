import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const ProjectConfiguration = ({ activeProject, onUpdateProject, }) => {
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
    const handleToggle = (sectionKey) => {
        const newConfig = { ...config, [sectionKey]: !config[sectionKey] };
        setConfig(newConfig);
        onUpdateProject({ ...activeProject, sectionConfig: newConfig });
    };
    const groupedSections = sections.reduce((acc, section) => {
        if (!acc[section.category])
            acc[section.category] = [];
        acc[section.category].push(section);
        return acc;
    }, {});
    return (_jsxs("div", { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Project Section Configuration" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Enable or disable project sections to customize your dashboard." }), Object.entries(groupedSections).map(([category, sectionList]) => (_jsxs("div", { className: "mb-6", children: [_jsx("h4", { className: "font-medium text-gray-800 mb-3", children: category }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: sectionList.map((section) => (_jsxs("label", { className: "flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50", children: [_jsx("input", { type: "checkbox", checked: config[section.key] !== false, onChange: () => handleToggle(section.key), className: "w-4 h-4 text-blue-600" }), _jsx("span", { className: "text-sm", children: section.label })] }, section.key))) })] }, category)))] }));
};
export default ProjectConfiguration;
