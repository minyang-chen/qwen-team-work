import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ProjectDetailsPage({ activeProject, onBack, onSectionClick }) {
    const sections = [
        { id: 'plan', label: 'Plan', icon: '📋', color: 'bg-blue-100 hover:bg-blue-200' },
        { id: 'deliverable', label: 'Deliverable', icon: '📦', color: 'bg-green-100 hover:bg-green-200' },
        { id: 'requirements', label: 'Requirements', icon: '📝', color: 'bg-purple-100 hover:bg-purple-200' },
        { id: 'analysis', label: 'Analysis', icon: '📊', color: 'bg-yellow-100 hover:bg-yellow-200' },
        { id: 'architecture', label: 'Architecture', icon: '🏗️', color: 'bg-indigo-100 hover:bg-indigo-200' },
        { id: 'design', label: 'Design', icon: '🎨', color: 'bg-pink-100 hover:bg-pink-200' },
        { id: 'implementation', label: 'Implementation', icon: '⚙️', color: 'bg-orange-100 hover:bg-orange-200' },
        { id: 'tasks', label: 'Tasks', icon: '✅', color: 'bg-teal-100 hover:bg-teal-200' },
        { id: 'code', label: 'Code', icon: '💻', color: 'bg-gray-100 hover:bg-gray-200' },
        { id: 'issues', label: 'Issues', icon: '🐛', color: 'bg-red-100 hover:bg-red-200' },
        { id: 'meetings', label: 'Meetings', icon: '👥', color: 'bg-cyan-100 hover:bg-cyan-200' },
        { id: 'documents', label: 'Documents', icon: '📄', color: 'bg-lime-100 hover:bg-lime-200' },
        { id: 'notes', label: 'Notes', icon: '📓', color: 'bg-amber-100 hover:bg-amber-200' },
        { id: 'research', label: 'Research', icon: '🔬', color: 'bg-violet-100 hover:bg-violet-200' },
        { id: 'report', label: 'Report', icon: '📈', color: 'bg-fuchsia-100 hover:bg-fuchsia-200' },
        { id: 'support', label: 'Support', icon: '🆘', color: 'bg-rose-100 hover:bg-rose-200' },
    ];
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("button", { onClick: onBack, className: "text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Back to Projects"] }), _jsx("h2", { className: "text-3xl font-bold text-gray-900", children: activeProject.name }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: activeProject.projectId })] }), _jsx("span", { className: `px-3 py-1 rounded ${activeProject.status === 'Active' ? 'bg-green-100 text-green-800' :
                            activeProject.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                                activeProject.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'}`, children: activeProject.status })] }), activeProject.description && (_jsx("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg", children: _jsx("p", { className: "text-gray-700", children: activeProject.description }) })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: sections.map((section) => (_jsxs("button", { onClick: () => onSectionClick(section.id), className: `p-6 rounded-lg border border-gray-300 ${section.color} transition-all hover:shadow-md flex flex-col items-center justify-center`, children: [_jsx("span", { className: "text-4xl mb-2", children: section.icon }), _jsx("span", { className: "font-semibold text-gray-800", children: section.label })] }, section.id))) })] }));
}
