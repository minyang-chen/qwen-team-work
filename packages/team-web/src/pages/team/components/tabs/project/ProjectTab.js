import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { TaskManagement } from './sections/TaskManagement';
import { TestingSection } from './sections/TestingSection';
import { RequirementsSection } from './sections/RequirementsSection';
import { ArchitectureSection } from './sections/ArchitectureSection';
import { DesignSection } from './sections/DesignSection';
import { ImplementationSection } from './sections/ImplementationSection';
import { CodeSection } from './sections/CodeSection';
import { IssuesSection } from './sections/IssuesSection';
import { GenericSection } from './sections/GenericSection';
import { PlanSection } from './sections/PlanSection';
import { DeliverableSection } from './sections/DeliverableSection';
import { AnalysisSection } from './sections/AnalysisSection';
import { MeetingsSection } from './sections/MeetingsSection';
import ProjectConfiguration from './ProjectConfiguration';
import ProjectMembers from './ProjectMembers';
import ProjectFiles from './ProjectFiles';
export const ProjectTab = (props) => {
    const [projectSubTab, setProjectSubTab] = useState('project');
    const [activeProject, setActiveProject] = useState(null);
    const [showProjectSelection, setShowProjectSelection] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [testCases, setTestCases] = useState([]);
    const [documents, setDocuments] = useState([]);
    const { selectedTeam } = props;
    // Reset to project selection when team changes
    useEffect(() => {
        if (selectedTeam) {
            setActiveProject(null);
            setShowProjectSelection(true);
        }
    }, [selectedTeam]);
    // Sidebar configuration with grouped sections
    const sidebarConfig = [
        // Core Project Management Sections
        { id: 'project', label: 'Project', icon: '📋', color: 'blue', group: 'Core Project Management' },
        { id: 'plan', label: 'Plan', icon: '📅', color: 'green', group: 'Core Project Management' },
        { id: 'deliverable', label: 'Deliverable', icon: '📦', color: 'purple', group: 'Core Project Management' },
        { id: 'requirements', label: 'Requirements', icon: '📝', color: 'blue', group: 'Core Project Management' },
        { id: 'analysis', label: 'Analysis', icon: '📊', color: 'indigo', group: 'Core Project Management' },
        // Development & Technical Sections
        { id: 'architecture', label: 'Architecture', icon: '🏗️', color: 'purple', group: 'Development & Technical' },
        { id: 'design', label: 'Design', icon: '🎨', color: 'pink', group: 'Development & Technical' },
        { id: 'implementation', label: 'Implementation', icon: '⚙️', color: 'orange', group: 'Development & Technical' },
        { id: 'code', label: 'Code', icon: '💻', color: 'gray', group: 'Development & Technical' },
        { id: 'tasks', label: 'Tasks', icon: '✅', color: 'green', group: 'Development & Technical' },
        // Quality & Communication Sections
        { id: 'issues', label: 'Issues', icon: '🐛', color: 'red', group: 'Quality & Communication' },
        { id: 'testing', label: 'Testing', icon: '🧪', color: 'teal', group: 'Quality & Communication' },
        { id: 'meetings', label: 'Meetings', icon: '👥', color: 'blue', group: 'Quality & Communication' },
        // Other Sections
        { id: 'documents', label: 'Documents', icon: '📄', color: 'gray', group: 'Other' },
        { id: 'notes', label: 'Notes', icon: '📝', color: 'yellow', group: 'Other' },
        { id: 'research', label: 'Research', icon: '🔬', color: 'cyan', group: 'Other' },
        { id: 'report', label: 'Report', icon: '📈', color: 'emerald', group: 'Other' },
        { id: 'support', label: 'Support', icon: '🎧', color: 'rose', group: 'Other' },
        // Management Sections
        { id: 'configuration', label: 'Configuration', icon: '⚙️', color: 'slate', group: 'Management' },
        { id: 'members', label: 'Members', icon: '👤', color: 'blue', group: 'Management' },
        { id: 'files', label: 'Files', icon: '📁', color: 'green', group: 'Management' }
    ];
    const handleSelectProject = (project) => {
        setActiveProject(project);
        setShowProjectSelection(false);
    };
    const handleBackToSelection = () => {
        setActiveProject(null);
        setShowProjectSelection(true);
        setShowCreateForm(false);
    };
    const getFilteredData = (items) => {
        if (!activeProject)
            return items;
        return items.filter(item => item.projectId === activeProject.id);
    };
    const getCount = (id) => {
        if (!activeProject)
            return 0;
        switch (id) {
            case 'project': return 1;
            case 'plan': return getFilteredData(props.plans || []).length;
            case 'deliverable': return getFilteredData(props.deliverables || []).length;
            case 'requirements': return getFilteredData(props.requirements).length;
            case 'analysis': return getFilteredData(props.analyses || []).length;
            case 'architecture': return getFilteredData(props.architectures).length;
            case 'design': return getFilteredData(props.designs).length;
            case 'implementation': return getFilteredData(props.implementations).length;
            case 'tasks': return getFilteredData(props.projectTasks).length;
            case 'code': return getFilteredData(props.codeRepos).length;
            case 'issues': return getFilteredData(props.issues).length;
            case 'testing': return getFilteredData(testCases).length;
            case 'meetings': return getFilteredData(props.meetings).length;
            case 'documents': return getFilteredData(documents).length;
            case 'notes': return getFilteredData(props.notes || []).length;
            case 'research': return getFilteredData(props.research || []).length;
            case 'report': return getFilteredData(props.reports || []).length;
            case 'support': return 0;
            case 'configuration': return 1;
            case 'members': return activeProject.members?.length || 0;
            case 'files': return activeProject.nfsFolders?.length || 0;
            default: return 0;
        }
    };
    // Show project selection page
    if (showProjectSelection) {
        return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Projects" }), _jsx("button", { onClick: () => setShowCreateForm(true), className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700", children: "Create Project" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: props.projects.map((project) => (_jsxs("div", { className: "bg-white rounded-lg shadow border p-6 cursor-pointer hover:shadow-md transition-shadow", onClick: () => handleSelectProject(project), children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: project.name }), _jsx("p", { className: "text-gray-600 mb-4", children: project.description }), _jsxs("div", { className: "flex justify-between items-center text-sm text-gray-500", children: [_jsx("span", { className: `px-2 py-1 rounded-full ${project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                            project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`, children: project.status }), _jsx("span", { children: project.startDate })] })] }, project.id || project.projectId || project._id))) })] }));
    }
    // Show create project form
    if (showCreateForm) {
        const [newProject, setNewProject] = useState({});
        const handleCreate = async () => {
            if (newProject.name && selectedTeam) {
                const projectData = {
                    name: newProject.name,
                    description: newProject.description || '',
                    status: newProject.status || 'Planning',
                    createdAt: new Date().toISOString(),
                    sectionConfig: {}, // All sections enabled by default
                    members: [], // Empty members list
                    nfsFolders: [], // Will be populated when folders are created
                    nfsPath: '' // Will be set when NFS is initialized
                };
                // Create the project first
                props.onCreateProject(projectData);
                // TODO: Add actual NFS folder creation API call here
                // For now, we'll simulate the NFS setup
                setShowCreateForm(false);
            }
        };
        return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6", children: [_jsxs("button", { onClick: handleBackToSelection, className: "text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Back to Projects"] }), _jsx("h1", { className: "text-2xl font-bold mb-6", children: "Create New Project" }), _jsx("div", { className: "bg-white rounded-lg shadow border p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Project Name" }), _jsx("input", { type: "text", value: newProject.name || '', onChange: (e) => setNewProject({ ...newProject, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Enter project name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Description" }), _jsx("textarea", { value: newProject.description || '', onChange: (e) => setNewProject({ ...newProject, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 4, placeholder: "Enter project description" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Status" }), _jsxs("select", { value: newProject.status || 'Planning', onChange: (e) => setNewProject({ ...newProject, status: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "Planning", children: "Planning" }), _jsx("option", { value: "Active", children: "Active" }), _jsx("option", { value: "On Hold", children: "On Hold" }), _jsx("option", { value: "Completed", children: "Completed" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Start Date" }), _jsx("input", { type: "date", value: newProject.startDate || '', onChange: (e) => setNewProject({ ...newProject, startDate: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "End Date" }), _jsx("input", { type: "date", value: newProject.endDate || '', onChange: (e) => setNewProject({ ...newProject, endDate: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] })] }), _jsxs("div", { className: "flex gap-4 pt-4", children: [_jsx("button", { onClick: handleCreate, className: "px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700", children: "Create Project" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700", children: "Cancel" })] })] }) })] }));
    }
    return (_jsx("div", { className: "max-w-7xl mx-auto px-6 py-4", children: !selectedTeam ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("div", { className: "text-center text-gray-500", children: "Please select a team to manage projects" }) })) : !activeProject ? (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Projects" }), _jsx("button", { onClick: () => setShowCreateForm(true), className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700", children: "Create Project" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: props.projects.map((project) => (_jsxs("div", { className: "bg-white rounded-lg shadow border p-6 cursor-pointer hover:shadow-md transition-shadow", onClick: () => handleSelectProject(project), children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: project.name }), _jsx("p", { className: "text-gray-600 mb-4", children: project.description }), _jsxs("div", { className: "flex justify-between items-center text-sm text-gray-500", children: [_jsx("span", { className: `px-2 py-1 rounded-full ${project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                            project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`, children: project.status }), _jsx("span", { children: project.startDate })] })] }, project.id || project.projectId || project._id))) })] })) : (_jsxs("div", { children: [_jsx("div", { className: "mb-8 pb-4 border-b", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("button", { onClick: handleBackToSelection, className: "text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1 text-sm", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Back to Projects"] }), _jsx("h1", { className: "text-3xl font-bold", children: activeProject.name }), _jsx("p", { className: "text-gray-600 mt-1", children: activeProject.description })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: `inline-block px-3 py-1 rounded-full text-sm font-medium ${activeProject.status === 'Active' ? 'bg-green-100 text-green-800' :
                                            activeProject.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`, children: activeProject.status }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: ["Created ", new Date(activeProject.createdAt).toLocaleDateString()] })] })] }) }), projectSubTab === 'project' ? (
                /* Grid Layout for All Sections */
                _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: sidebarConfig.map(item => (_jsxs("div", { onClick: () => setProjectSubTab(item.id), className: "bg-white rounded-lg shadow border p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: `p-3 rounded-lg ${item.color === 'blue' ? 'bg-blue-100' :
                                            item.color === 'green' ? 'bg-green-100' :
                                                item.color === 'purple' ? 'bg-purple-100' :
                                                    item.color === 'pink' ? 'bg-pink-100' :
                                                        item.color === 'orange' ? 'bg-orange-100' :
                                                            item.color === 'red' ? 'bg-red-100' :
                                                                item.color === 'teal' ? 'bg-teal-100' :
                                                                    item.color === 'yellow' ? 'bg-yellow-100' :
                                                                        item.color === 'cyan' ? 'bg-cyan-100' :
                                                                            item.color === 'emerald' ? 'bg-emerald-100' :
                                                                                item.color === 'rose' ? 'bg-rose-100' :
                                                                                    item.color === 'indigo' ? 'bg-indigo-100' :
                                                                                        item.color === 'slate' ? 'bg-slate-100' :
                                                                                            'bg-gray-100'}`, children: _jsx("span", { className: "text-2xl", children: item.icon }) }), _jsx("span", { className: `text-xs font-semibold px-2 py-1 rounded-full ${item.color === 'blue' ? 'bg-blue-200 text-blue-800' :
                                            item.color === 'green' ? 'bg-green-200 text-green-800' :
                                                item.color === 'purple' ? 'bg-purple-200 text-purple-800' :
                                                    item.color === 'pink' ? 'bg-pink-200 text-pink-800' :
                                                        item.color === 'orange' ? 'bg-orange-200 text-orange-800' :
                                                            item.color === 'red' ? 'bg-red-200 text-red-800' :
                                                                item.color === 'teal' ? 'bg-teal-200 text-teal-800' :
                                                                    item.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                                                                        item.color === 'cyan' ? 'bg-cyan-200 text-cyan-800' :
                                                                            item.color === 'emerald' ? 'bg-emerald-200 text-emerald-800' :
                                                                                item.color === 'rose' ? 'bg-rose-200 text-rose-800' :
                                                                                    item.color === 'indigo' ? 'bg-indigo-200 text-indigo-800' :
                                                                                        item.color === 'slate' ? 'bg-slate-200 text-slate-800' :
                                                                                            'bg-gray-200 text-gray-800'}`, children: getCount(item.id) })] }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: item.label }), _jsx("p", { className: "text-sm text-gray-500", children: item.id === 'project' ? 'Manage project details and settings' :
                                    item.id === 'plan' ? 'Create and track project plans' :
                                        item.id === 'deliverable' ? 'Track project deliverables' :
                                            item.id === 'requirements' ? 'Document project requirements' :
                                                item.id === 'analysis' ? 'Project analysis and insights' :
                                                    item.id === 'architecture' ? 'System architecture design' :
                                                        item.id === 'design' ? 'UI/UX and design assets' :
                                                            item.id === 'implementation' ? 'Development implementation' :
                                                                item.id === 'tasks' ? 'Manage project tasks' :
                                                                    item.id === 'code' ? 'Code repositories and version control' :
                                                                        item.id === 'issues' ? 'Bug tracking and issue management' :
                                                                            item.id === 'testing' ? 'Test cases and quality assurance' :
                                                                                item.id === 'meetings' ? 'Meeting notes and schedules' :
                                                                                    item.id === 'documents' ? 'Project documentation' :
                                                                                        item.id === 'notes' ? 'General project notes' :
                                                                                            item.id === 'research' ? 'Research findings and data' :
                                                                                                item.id === 'report' ? 'Project reports and analytics' :
                                                                                                    item.id === 'support' ? 'Support tickets and help desk' :
                                                                                                        item.id === 'configuration' ? 'Configure project sections and settings' :
                                                                                                            item.id === 'members' ? 'Manage project team members' :
                                                                                                                item.id === 'files' ? 'Manage project files and NFS storage' :
                                                                                                                    'Manage project components' })] }, item.id))) })) : (
                /* Sidebar + Content Layout for Section Details */
                _jsxs("div", { className: "flex gap-6", children: [_jsxs("div", { className: "w-64 bg-white rounded-lg shadow border p-4", children: [_jsxs("button", { onClick: () => setProjectSubTab('project'), className: "w-full mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm p-2 rounded hover:bg-blue-50", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Back to Dashboard"] }), _jsx("div", { className: "space-y-4", children: ['Core Project Management', 'Development & Technical', 'Quality & Communication', 'Other', 'Management'].map(groupName => (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2", children: groupName }), _jsx("div", { className: "space-y-1", children: sidebarConfig.filter(item => item.group === groupName).map(item => (_jsxs("button", { onClick: () => setProjectSubTab(item.id), className: `w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${projectSubTab === item.id
                                                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                                        : 'hover:bg-gray-100 text-gray-700'}`, children: [_jsx("span", { className: "text-lg", children: item.icon }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium", children: item.label }), _jsxs("div", { className: "text-xs text-gray-500", children: [getCount(item.id), " items"] })] })] }, item.id))) })] }, groupName))) })] }), _jsxs("div", { className: "flex-1", children: [projectSubTab === 'plan' && (_jsx(PlanSection, { plans: getFilteredData(props.plans || []), onUpdate: props.onUpdatePlan, onDelete: props.onDeletePlan, onCreate: props.onCreatePlan, activeProject: activeProject })), projectSubTab === 'deliverable' && (_jsx(DeliverableSection, { deliverables: getFilteredData(props.deliverables || []), onUpdate: props.onUpdateDeliverable, onDelete: props.onDeleteDeliverable, onCreate: props.onCreateDeliverable, activeProject: activeProject })), projectSubTab === 'requirements' && (_jsx(RequirementsSection, { requirements: getFilteredData(props.requirements), onUpdate: props.onUpdateRequirement, onDelete: props.onDeleteRequirement, onCreate: props.onCreateRequirement, activeProject: activeProject })), projectSubTab === 'analysis' && (_jsx(AnalysisSection, { analyses: getFilteredData(props.analyses || []), onUpdate: props.onUpdateAnalysis, onDelete: props.onDeleteAnalysis, onCreate: props.onCreateAnalysis, activeProject: activeProject })), projectSubTab === 'architecture' && (_jsx(ArchitectureSection, { architectures: getFilteredData(props.architectures), onUpdate: props.onUpdateArchitecture, onDelete: props.onDeleteArchitecture, onCreate: props.onCreateArchitecture, activeProject: activeProject })), projectSubTab === 'design' && (_jsx(DesignSection, { designs: getFilteredData(props.designs), onUpdate: props.onUpdateDesign, onDelete: props.onDeleteDesign, onCreate: props.onCreateDesign })), projectSubTab === 'implementation' && (_jsx(ImplementationSection, { implementations: getFilteredData(props.implementations), onUpdate: props.onUpdateImplementation, onDelete: props.onDeleteImplementation, onCreate: props.onCreateImplementation })), projectSubTab === 'tasks' && (_jsx(TaskManagement, { tasks: getFilteredData(props.projectTasks), onUpdate: props.onUpdateTask, onDelete: props.onDeleteTask, onCreate: props.onCreateTask, activeProject: activeProject })), projectSubTab === 'code' && (_jsx(CodeSection, { codeRepos: getFilteredData(props.codeRepos), onUpdate: props.onUpdateCodeRepo, onDelete: props.onDeleteCodeRepo, onCreate: props.onCreateCodeRepo })), projectSubTab === 'issues' && (_jsx(IssuesSection, { issues: getFilteredData(props.issues), onUpdate: props.onUpdateIssue, onDelete: props.onDeleteIssue, onCreate: props.onCreateIssue, activeProject: activeProject })), projectSubTab === 'testing' && (_jsx(TestingSection, { testCases: getFilteredData(testCases), onUpdate: (id, data) => setTestCases(testCases.map(t => t._id === id ? { ...t, ...data } : t)), onDelete: (id) => setTestCases(testCases.filter(t => t._id !== id)), onCreate: (data) => setTestCases([...testCases, { ...data, _id: Date.now().toString() }]) })), projectSubTab === 'meetings' && (_jsx(MeetingsSection, { meetings: getFilteredData(props.meetings), onUpdate: props.onUpdateMeeting, onDelete: props.onDeleteMeeting, onCreate: props.onCreateMeeting, activeProject: activeProject })), projectSubTab === 'documents' && (_jsx(GenericSection, { title: "Documents", items: getFilteredData(documents), onUpdate: (id, data) => setDocuments(documents.map(d => d._id === id ? { ...d, ...data } : d)), onDelete: (id) => setDocuments(documents.filter(d => d._id !== id)), onCreate: (data) => setDocuments([...documents, { ...data, _id: Date.now().toString() }]), color: "gray" })), projectSubTab === 'notes' && (_jsx(GenericSection, { title: "Notes", items: getFilteredData(props.notes || []), onUpdate: props.onUpdateNote, onDelete: props.onDeleteNote, onCreate: props.onCreateNote, color: "yellow" })), projectSubTab === 'research' && (_jsx(GenericSection, { title: "Research", items: getFilteredData(props.research || []), onUpdate: props.onUpdateResearch, onDelete: props.onDeleteResearch, onCreate: props.onCreateResearch, color: "cyan" })), projectSubTab === 'report' && (_jsx(GenericSection, { title: "Reports", items: getFilteredData(props.reports || []), onUpdate: props.onUpdateReport, onDelete: props.onDeleteReport, onCreate: props.onCreateReport, color: "emerald" })), projectSubTab === 'support' && (_jsx(GenericSection, { title: "Support Tickets", items: [], onUpdate: () => { }, onDelete: () => { }, onCreate: () => { }, color: "rose" })), projectSubTab === 'configuration' && (_jsx(ProjectConfiguration, { activeProject: activeProject, onUpdateProject: (project) => {
                                        setActiveProject(project);
                                        const projectId = project.id || project.projectId || project._id || project.id;
                                        props.onUpdateProject(projectId, project);
                                    } })), projectSubTab === 'members' && (_jsx(ProjectMembers, { activeProject: activeProject, onUpdateProject: (project) => {
                                        setActiveProject(project);
                                        const projectId = project.id || project.projectId || project._id || project.id;
                                        props.onUpdateProject(projectId, project);
                                    } })), projectSubTab === 'files' && (_jsx(ProjectFiles, { activeProject: activeProject, onUpdateProject: (project) => {
                                        setActiveProject(project);
                                        const projectId = project.id || project.projectId || project._id || project.id;
                                        props.onUpdateProject(projectId, project);
                                    } }))] })] }))] })) }));
};
