import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { teamApi } from '../../services/team/api';
import { TaskAgent } from './TaskAgent';
import { Navigation } from './components/Navigation';
import { DashboardTab } from './components/tabs/DashboardTab';
import { ProjectTab } from './components/tabs/project/ProjectTab';
import { KnowledgeTab } from './components/tabs/KnowledgeTab';
import { TeamTab } from './components/tabs/TeamTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { useProfile } from './hooks/useProfile';
import { useTeams } from './hooks/useTeams';
import { useTodos } from './hooks/useTodos';
import { useCalendar } from './hooks/useCalendar';
import { useNotifications } from './hooks/useNotifications';
import { useKnowledge } from './hooks/useKnowledge';
import { useProject } from './hooks/useProject';
export function TeamDashboard({ onTeamSelected, onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [workspaceType] = useState('team');
    const [selectedTeamId] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [dashboardSubTab, setDashboardSubTab] = useState('notifications');
    const [projectSubTab, setProjectSubTab] = useState('project');
    const [teamSubTab, setTeamSubTab] = useState('my-teams');
    const [teamActionTab, setTeamActionTab] = useState('create');
    const [activeProject, setActiveProject] = useState(null);
    const [showProjectSelection, setShowProjectSelection] = useState(true);
    // Clear message when switching tabs
    useEffect(() => {
        setMessage('');
    }, [activeTab]);
    // Wrap setActiveProject to persist to localStorage
    const handleSetActiveProject = (proj) => {
        setActiveProject(proj);
        project.setActiveProject(proj);
    };
    // Initialize all hooks
    const profile = useProfile();
    const teams = useTeams();
    const todos = useTodos();
    const calendar = useCalendar();
    const notifications = useNotifications();
    const knowledge = useKnowledge();
    const project = useProject();
    /* eslint-disable react-hooks/exhaustive-deps */
    // Load initial data
    useEffect(() => {
        knowledge.loadFiles(workspaceType, selectedTeamId || undefined);
        teams.loadMyTeams();
        todos.loadTodos();
        setUsername(localStorage.getItem('team_username') || '');
        profile.loadProfile();
        // Load active project from localStorage
        const savedProject = project.getActiveProject();
        if (savedProject) {
            setActiveProject(savedProject);
            setShowProjectSelection(false);
        }
    }, [workspaceType, selectedTeamId]);
    // Load notifications when team is selected
    useEffect(() => {
        if (teams.selectedTeam) {
            notifications.loadNotifications(teams.selectedTeam.id);
            project.loadProjects(teams.selectedTeam);
        }
    }, [teams.selectedTeam?.id]);
    // Load active team notifications for dashboard
    useEffect(() => {
        if (activeTab === 'dashboard' && teams.selectedTeam) {
            notifications.loadNotifications(teams.selectedTeam.id);
        }
    }, [activeTab, teams.selectedTeam?.id]);
    // Load project data when team is selected and project tab is active
    useEffect(() => {
        const loadActiveTeamProject = async () => {
            if (activeTab === 'projects') {
                if (teams.selectedTeam) {
                    project.loadProjectData(teams.selectedTeam);
                }
                else if (teams.myTeams.length > 0) {
                    // Auto-select active team if not already selected
                    const activeTeamData = await teamApi.getActiveTeam();
                    if (activeTeamData.activeTeamId) {
                        const activeTeam = teams.myTeams.find((t) => t.id === activeTeamData.activeTeamId);
                        if (activeTeam) {
                            teams.setSelectedTeam(activeTeam);
                            project.loadProjectData(activeTeam);
                        }
                    }
                }
            }
        };
        loadActiveTeamProject();
    }, [activeTab, teams.selectedTeam?.id, teams.myTeams.length]);
    // Load notifications when team tab is active and team is selected
    useEffect(() => {
        if (teams.selectedTeam &&
            activeTab === 'team' &&
            teamSubTab === 'notifications') {
            notifications.loadNotifications(teams.selectedTeam.id);
        }
    }, [teams.selectedTeam?.id, activeTab, teamSubTab]);
    /* eslint-enable react-hooks/exhaustive-deps */
    const handleLogout = () => {
        teamApi.logout();
        localStorage.removeItem('selectedTeam');
        localStorage.removeItem('activeProject');
        if (onLogout) {
            onLogout();
        }
        else {
            window.location.href = '/team';
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Navigation, { activeTab: activeTab, setActiveTab: setActiveTab, username: username, handleLogout: handleLogout, selectedTeam: teams.selectedTeam }), message && (_jsx("div", { className: "max-w-7xl mx-auto px-4 py-2", children: _jsx("div", { className: "p-4 bg-blue-100 rounded", children: message }) })), activeTab === 'task-assistant' ? (_jsx("div", { className: "h-[calc(100vh-80px)]", children: _jsx(TaskAgent, { workspaceType: workspaceType, selectedTeamId: teams.selectedTeam?.id || '' }) })) : activeTab === 'dashboard' ? (_jsx(DashboardTab, { dashboardSubTab: dashboardSubTab, setDashboardSubTab: setDashboardSubTab, notifications: notifications.notifications, selectedNotification: notifications.selectedNotification, setSelectedNotification: notifications.setSelectedNotification, replyMessage: notifications.replyMessage, setReplyMessage: notifications.setReplyMessage, handleSendReply: notifications.handleSendReply, todos: todos.todos, setTodos: todos.setTodos, newTodo: todos.newTodo, setNewTodo: todos.setNewTodo, addTodo: todos.addTodo, toggleTodo: todos.toggleTodo, deleteTodo: todos.deleteTodo, updateTodo: todos.updateTodo, startEditing: todos.startEditing, cancelEditing: todos.cancelEditing, currentMonth: calendar.currentMonth, setCurrentMonth: calendar.setCurrentMonth, calendarEvents: calendar.calendarEvents, setCalendarEvents: calendar.setCalendarEvents, eventForm: calendar.eventForm, setEventForm: calendar.setEventForm, addCalendarEvent: calendar.addCalendarEvent, deleteCalendarEvent: calendar.deleteCalendarEvent, previousMonth: calendar.previousMonth, nextMonth: calendar.nextMonth, selectedTeam: teams.selectedTeam, message: message, setMessage: setMessage })) : activeTab === 'projects' ? (_jsx(_Fragment, { children: _jsx(ProjectTab, { projectSubTab: projectSubTab, setProjectSubTab: setProjectSubTab, selectedTeam: teams.selectedTeam, activeProject: activeProject, setActiveProject: handleSetActiveProject, showProjectSelection: showProjectSelection, setShowProjectSelection: setShowProjectSelection, projects: project.projects, projectForm: project.projectForm, setProjectForm: project.setProjectForm, addProject: project.addProject, updateProject: project.updateProject, deleteProject: project.deleteProject, plans: project.plans, planForm: project.planForm, setPlanForm: project.setPlanForm, addPlan: project.addPlan, updatePlan: project.updatePlan, deletePlan: project.deletePlan, deliverables: project.deliverables, deliverableForm: project.deliverableForm, setDeliverableForm: project.setDeliverableForm, addDeliverable: project.addDeliverable, updateDeliverable: project.updateDeliverable, deleteDeliverable: project.deleteDeliverable, requirements: project.requirements, reqForm: project.reqForm, setReqForm: project.setReqForm, addRequirement: project.addRequirement, updateRequirement: project.updateRequirement, deleteRequirement: project.deleteRequirement, analyses: project.analyses, analysisForm: project.analysisForm, setAnalysisForm: project.setAnalysisForm, addAnalysis: project.addAnalysis, updateAnalysis: project.updateAnalysis, deleteAnalysis: project.deleteAnalysis, architectures: project.architectures, archForm: project.archForm, setArchForm: project.setArchForm, addArchitecture: project.addArchitecture, updateArchitecture: project.updateArchitecture, deleteArchitecture: project.deleteArchitecture, designs: project.designs, designForm: project.designForm, setDesignForm: project.setDesignForm, addDesign: project.addDesign, updateDesign: project.updateDesign, deleteDesign: project.deleteDesign, implementations: project.implementations, implForm: project.implForm, setImplForm: project.setImplForm, addImplementation: project.addImplementation, updateImplementation: project.updateImplementation, deleteImplementation: project.deleteImplementation, projectTasks: project.projectTasks, taskForm: project.taskForm, setTaskForm: project.setTaskForm, addTask: project.addTask, updateTask: project.updateTask, deleteTask: project.deleteTask, codeRepos: project.codeRepos, repoForm: project.repoForm, setRepoForm: project.setRepoForm, addCode: project.addCode, updateCode: project.updateCode, deleteCode: project.deleteCode, issues: project.issues, issueForm: project.issueForm, setIssueForm: project.setIssueForm, addIssue: project.addIssue, updateIssue: project.updateIssue, deleteIssue: project.deleteIssue, meetings: project.meetings, meetingForm: project.meetingForm, setMeetingForm: project.setMeetingForm, addMeeting: project.addMeeting, updateMeeting: project.updateMeeting, deleteMeeting: project.deleteMeeting, notes: project.notes, noteForm: project.noteForm, setNoteForm: project.setNoteForm, addNote: project.addNote, updateNote: project.updateNote, deleteNote: project.deleteNote, research: project.research, researchForm: project.researchForm, setResearchForm: project.setResearchForm, addResearch: project.addResearch, updateResearch: project.updateResearch, deleteResearch: project.deleteResearch, reports: project.reports, reportForm: project.reportForm, setReportForm: project.setReportForm, addReport: project.addReport, updateReport: project.updateReport, deleteReport: project.deleteReport, setProjects: project.setProjects, setPlans: project.setPlans, setDeliverables: project.setDeliverables, setRequirements: project.setRequirements, setAnalyses: project.setAnalyses, setArchitectures: project.setArchitectures, setDesigns: project.setDesigns, setImplementations: project.setImplementations, setProjectTasks: project.setProjectTasks, setCodeRepos: project.setCodeRepos, setIssues: project.setIssues, setMeetings: project.setMeetings, setNotes: project.setNotes, setResearch: project.setResearch, setReports: project.setReports }) })) : activeTab === 'knowledge' ? (_jsx(KnowledgeTab, { files: knowledge.files, searchQuery: knowledge.searchQuery, setSearchQuery: knowledge.setSearchQuery, searchResults: knowledge.searchResults, workspaceType: workspaceType, selectedTeamId: selectedTeamId, handleFileUpload: knowledge.handleFileUpload, handleDelete: knowledge.handleDelete, handleSearch: knowledge.handleSearch, message: message, setMessage: setMessage })) : activeTab === 'team' ? (_jsx(_Fragment, { children: _jsx(TeamTab, { teamSubTab: teamSubTab, setTeamSubTab: setTeamSubTab, teamActionTab: teamActionTab, setTeamActionTab: setTeamActionTab, myTeams: teams.myTeams, selectedTeam: teams.selectedTeam, handleSelectTeam: teams.handleSelectTeam, teamMembers: teams.teamMembers, newMemberEmail: teams.newMemberEmail, setNewMemberEmail: teams.setNewMemberEmail, handleAddMember: teams.handleAddMember, handleRemoveMember: teams.handleRemoveMember, handleDeleteTeam: teams.handleDeleteTeam, handleUpdateTeam: teams.handleUpdateTeam, teamName: teams.teamName, setTeamName: teams.setTeamName, specialization: teams.specialization, setSpecialization: teams.setSpecialization, description: teams.description, setDescription: teams.setDescription, handleCreateTeam: teams.handleCreateTeam, teamId: teams.teamId, setTeamId: teams.setTeamId, teamSearchQuery: teams.teamSearchQuery, setTeamSearchQuery: teams.setTeamSearchQuery, teamSearchResults: teams.teamSearchResults, handleTeamSearch: teams.handleTeamSearch, handleJoinTeam: teams.handleJoinTeam, broadcastMessage: profile.broadcastMessage, setBroadcastMessage: profile.setBroadcastMessage, broadcastType: profile.broadcastType, setBroadcastType: profile.setBroadcastType, handleSendBroadcast: profile.handleSendBroadcast, loadNotifications: notifications.loadNotifications, notifications: notifications.notifications, message: message, setMessage: setMessage }) })) : activeTab === 'profile' ? (_jsx(ProfileTab, { profileData: profile.profileData, setProfileData: profile.setProfileData, isEditingProfile: profile.isEditingProfile, setIsEditingProfile: profile.setIsEditingProfile, handleUpdateProfile: profile.handleUpdateProfile, handleRegenerateApiKey: profile.handleRegenerateApiKey, loadProfile: profile.loadProfile, setMessage: setMessage })) : null] }));
}
