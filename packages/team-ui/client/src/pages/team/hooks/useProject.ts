import { useState } from 'react';
import { teamApi } from '../../../services/team/api';
import {
  Requirement, Architecture, Design, Implementation, ProjectTask, CodeRepo, Issue, Meeting,
  RequirementForm, ArchitectureForm, DesignForm, ImplementationForm, TaskForm, RepoForm, IssueForm, MeetingForm,
  Team
} from '../types/team.types';

export function useProject() {
  const [projects, setProjects] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const loadProjects = async (selectedTeam: Team | null) => {
    if (!selectedTeam) return;
    try {
      const data = await teamApi.listProjects(selectedTeam.id);
      setProjects(data || []);
    } catch (err) {
    }
  };
  const [architectures, setArchitectures] = useState<Architecture[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [codeRepos, setCodeRepos] = useState<CodeRepo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [projectForm, setProjectForm] = useState({ 
    name: '', description: '', status: '', manager: '', startDate: '', endDate: '', deadline: '', 
    budget: '', marketSegments: '', products: '', targetUser: '', sponsor: '', funding: '', 
    dependencies: '', approvals: [] as string[], teams: [] as string[], members: [] as string[] 
  });

  // Active project persistence helpers
  const getActiveProjectId = () => {
    try {
      const activeProject = localStorage.getItem('activeProject');
      return activeProject ? JSON.parse(activeProject).projectId : null;
    } catch {
      return null;
    }
  };

  const getActiveProject = () => {
    try {
      const activeProject = localStorage.getItem('activeProject');
      return activeProject ? JSON.parse(activeProject) : null;
    } catch {
      return null;
    }
  };

  const setActiveProject = (project: any) => {
    try {
      if (project) {
        localStorage.setItem('activeProject', JSON.stringify(project));
      } else {
        localStorage.removeItem('activeProject');
      }
    } catch (err) {
    }
  };
  const [reqForm, setReqForm] = useState<RequirementForm>({ title: '', description: '', priority: 'medium', status: 'draft' });
  const [archForm, setArchForm] = useState<ArchitectureForm>({ title: '', description: '', diagram_url: '' });
  const [designForm, setDesignForm] = useState<DesignForm>({ title: '', description: '', mockup_url: '' });
  const [implForm, setImplForm] = useState<ImplementationForm>({ title: '', description: '', status: 'planned', progress: 0 });
  const [taskForm, setTaskForm] = useState<TaskForm>({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium' });
  const [repoForm, setRepoForm] = useState<RepoForm>({ name: '', url: '', branch: 'main', description: '' });
  const [issueForm, setIssueForm] = useState<IssueForm>({ title: '', description: '', severity: 'medium', status: 'open', assignee: '' });
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({ title: '', date: '', time: '', agenda: '', notes: '' });

  const loadProjectData = async (selectedTeam: Team | null) => {
    if (!selectedTeam) return;
    try {
      const [reqs, archs, desgs, impls, tsks, cds, iss, mtgs] = await Promise.all([
        teamApi.getRequirements(selectedTeam.id),
        teamApi.getArchitecture(selectedTeam.id),
        teamApi.getDesign(selectedTeam.id),
        teamApi.getImplementation(selectedTeam.id),
        teamApi.getTasks(selectedTeam.id),
        teamApi.getCode(selectedTeam.id),
        teamApi.getIssues(selectedTeam.id),
        teamApi.getMeetings(selectedTeam.id)
      ]);
      setRequirements(reqs);
      setArchitectures(archs);
      setDesigns(desgs);
      setImplementations(impls);
      setProjectTasks(tsks);
      setCodeRepos(cds);
      setIssues(iss);
      setMeetings(mtgs);
    } catch (err) {
    }
  };

  // Projects CRUD
  const addProject = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !projectForm.name) return { success: false, error: 'Missing required fields' };
    try {
      const result = await teamApi.createProject(selectedTeam.id, projectForm);
      if (result.success) {
        setProjects([result.data, ...projects]);
        setProjectForm({ name: '', description: '', status: '', manager: '', startDate: '', endDate: '', deadline: '', budget: '', marketSegments: '', products: '', targetUser: '', sponsor: '', funding: '', dependencies: '', approvals: [], teams: [], members: [] });
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Failed to create project' };
    } catch (err) {
      return { success: false, error: 'Failed to create project' };
    }
  };

  const updateProject = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setProjects(projects.map(p => p._id === id ? data : p));
    } catch (err) {
    }
  };

  const deleteProject = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setProjects(projects.filter(p => p._id !== id));
    } catch (err) {
    }
  };

  // Plans CRUD
  const [plans, setPlans] = useState<any[]>([]);
  const [planForm, setPlanForm] = useState({ phase: '', milestone: '', startDate: '', endDate: '' });

  const addPlan = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !planForm.phase) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...planForm };
      setPlans([item, ...plans]);
      setPlanForm({ phase: '', milestone: '', startDate: '', endDate: '' });
    } catch (err) {
    }
  };

  const updatePlan = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setPlans(plans.map(p => p._id === id ? data : p));
    } catch (err) {
    }
  };

  const deletePlan = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setPlans(plans.filter(p => p._id !== id));
    } catch (err) {
    }
  };

  // Deliverables CRUD
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [deliverableForm, setDeliverableForm] = useState({ name: '', type: '', dueDate: '', status: '' });

  const addDeliverable = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !deliverableForm.name) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...deliverableForm };
      setDeliverables([item, ...deliverables]);
      setDeliverableForm({ name: '', type: '', dueDate: '', status: '' });
    } catch (err) {
    }
  };

  const updateDeliverable = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setDeliverables(deliverables.map(d => d._id === id ? data : d));
    } catch (err) {
    }
  };

  const deleteDeliverable = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setDeliverables(deliverables.filter(d => d._id !== id));
    } catch (err) {
    }
  };

  // Requirements CRUD
  const addRequirement = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !reqForm.title) return;
    try {
      const item = await teamApi.createRequirement(selectedTeam.id, reqForm);
      setRequirements([item, ...requirements]);
      setReqForm({ title: '', description: '', priority: 'medium', status: 'draft' });
    } catch (err) {
    }
  };

  const updateRequirement = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateRequirement(selectedTeam.id, id, data);
      setRequirements(requirements.map(r => r._id === id ? updated : r));
    } catch (err) {
    }
  };

  const deleteRequirement = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteRequirement(selectedTeam.id, id);
      setRequirements(requirements.filter(r => r._id !== id));
    } catch (err) {
    }
  };

  // Analyses CRUD
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analysisForm, setAnalysisForm] = useState({ title: '', type: '', findings: '', date: '' });

  const addAnalysis = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !analysisForm.title) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...analysisForm };
      setAnalyses([item, ...analyses]);
      setAnalysisForm({ title: '', type: '', findings: '', date: '' });
    } catch (err) {
    }
  };

  const updateAnalysis = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setAnalyses(analyses.map(a => a._id === id ? data : a));
    } catch (err) {
    }
  };

  const deleteAnalysis = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setAnalyses(analyses.filter(a => a._id !== id));
    } catch (err) {
    }
  };

  // Architecture CRUD
  const addArchitecture = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !archForm.title) return;
    try {
      const item = await teamApi.createArchitecture(selectedTeam.id, archForm);
      setArchitectures([item, ...architectures]);
      setArchForm({ title: '', description: '', diagram_url: '' });
    } catch (err) {
    }
  };

  const updateArchitecture = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateArchitecture(selectedTeam.id, id, data);
      setArchitectures(architectures.map(a => a._id === id ? updated : a));
    } catch (err) {
    }
  };

  const deleteArchitecture = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteArchitecture(selectedTeam.id, id);
      setArchitectures(architectures.filter(a => a._id !== id));
    } catch (err) {
    }
  };

  // Design CRUD
  const addDesign = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !designForm.title) return;
    try {
      const item = await teamApi.createDesign(selectedTeam.id, designForm);
      setDesigns([item, ...designs]);
      setDesignForm({ title: '', description: '', mockup_url: '' });
    } catch (err) {
    }
  };

  const updateDesign = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateDesign(selectedTeam.id, id, data);
      setDesigns(designs.map(d => d._id === id ? updated : d));
    } catch (err) {
    }
  };

  const deleteDesign = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteDesign(selectedTeam.id, id);
      setDesigns(designs.filter(d => d._id !== id));
    } catch (err) {
    }
  };

  // Implementation CRUD
  const addImplementation = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !implForm.title) return;
    try {
      const item = await teamApi.createImplementation(selectedTeam.id, implForm);
      setImplementations([item, ...implementations]);
      setImplForm({ title: '', description: '', status: 'planned', progress: 0 });
    } catch (err) {
    }
  };

  const updateImplementation = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateImplementation(selectedTeam.id, id, data);
      setImplementations(implementations.map(i => i._id === id ? updated : i));
    } catch (err) {
    }
  };

  const deleteImplementation = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteImplementation(selectedTeam.id, id);
      setImplementations(implementations.filter(i => i._id !== id));
    } catch (err) {
    }
  };

  // Task CRUD
  const addTask = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !taskForm.title) return;
    try {
      const item = await teamApi.createTask(selectedTeam.id, taskForm);
      setProjectTasks([item, ...projectTasks]);
      setTaskForm({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium' });
    } catch (err) {
    }
  };

  const updateTask = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateTask(selectedTeam.id, id, data);
      setProjectTasks(projectTasks.map(t => t._id === id ? updated : t));
    } catch (err) {
    }
  };

  const deleteTask = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteTask(selectedTeam.id, id);
      setProjectTasks(projectTasks.filter(t => t._id !== id));
    } catch (err) {
    }
  };

  // Code CRUD
  const addCode = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !repoForm.name) return;
    try {
      const item = await teamApi.createCode(selectedTeam.id, repoForm);
      setCodeRepos([item, ...codeRepos]);
      setRepoForm({ name: '', url: '', branch: 'main', description: '' });
    } catch (err) {
    }
  };

  const updateCode = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateCode(selectedTeam.id, id, data);
      setCodeRepos(codeRepos.map(c => c._id === id ? updated : c));
    } catch (err) {
    }
  };

  const deleteCode = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteCode(selectedTeam.id, id);
      setCodeRepos(codeRepos.filter(c => c._id !== id));
    } catch (err) {
    }
  };

  // Issue CRUD
  const addIssue = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !issueForm.title) return;
    try {
      const item = await teamApi.createIssue(selectedTeam.id, issueForm);
      setIssues([item, ...issues]);
      setIssueForm({ title: '', description: '', severity: 'medium', status: 'open', assignee: '' });
    } catch (err) {
    }
  };

  const updateIssue = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateIssue(selectedTeam.id, id, data);
      setIssues(issues.map(i => i._id === id ? updated : i));
    } catch (err) {
    }
  };

  const deleteIssue = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteIssue(selectedTeam.id, id);
      setIssues(issues.filter(i => i._id !== id));
    } catch (err) {
    }
  };

  // Meeting CRUD
  const addMeeting = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !meetingForm.title) return;
    try {
      const item = await teamApi.createMeeting(selectedTeam.id, meetingForm);
      setMeetings([item, ...meetings]);
      setMeetingForm({ title: '', date: '', time: '', agenda: '', notes: '' });
    } catch (err) {
    }
  };

  const updateMeeting = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      const updated = await teamApi.updateMeeting(selectedTeam.id, id, data);
      setMeetings(meetings.map(m => m._id === id ? updated : m));
    } catch (err) {
    }
  };

  const deleteMeeting = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      await teamApi.deleteMeeting(selectedTeam.id, id);
      setMeetings(meetings.filter(m => m._id !== id));
    } catch (err) {
    }
  };

  // Notes state and CRUD
  const [notes, setNotes] = useState<any[]>([]);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', category: '', date: '' });

  const addNote = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !noteForm.title) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...noteForm };
      setNotes([item, ...notes]);
      setNoteForm({ title: '', content: '', category: '', date: '' });
    } catch (err) {
    }
  };

  const updateNote = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setNotes(notes.map(n => n._id === id ? data : n));
    } catch (err) {
    }
  };

  const deleteNote = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setNotes(notes.filter(n => n._id !== id));
    } catch (err) {
    }
  };

  // Research state and CRUD
  const [research, setResearch] = useState<any[]>([]);
  const [researchForm, setResearchForm] = useState({ topic: '', description: '', status: '', findings: '' });

  const addResearch = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !researchForm.topic) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...researchForm };
      setResearch([item, ...research]);
      setResearchForm({ topic: '', description: '', status: '', findings: '' });
    } catch (err) {
    }
  };

  const updateResearch = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setResearch(research.map(r => r._id === id ? data : r));
    } catch (err) {
    }
  };

  const deleteResearch = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setResearch(research.filter(r => r._id !== id));
    } catch (err) {
    }
  };

  // Reports state and CRUD
  const [reports, setReports] = useState<any[]>([]);
  const [reportForm, setReportForm] = useState({ title: '', type: '', date: '', summary: '' });

  const addReport = async (selectedTeam: Team | null) => {
    if (!selectedTeam || !reportForm.title) return;
    try {
      const item = { _id: Date.now().toString(), projectId: getActiveProjectId(), ...reportForm };
      setReports([item, ...reports]);
      setReportForm({ title: '', type: '', date: '', summary: '' });
    } catch (err) {
    }
  };

  const updateReport = async (selectedTeam: Team | null, id: string, data: any) => {
    if (!selectedTeam) return;
    try {
      setReports(reports.map(r => r._id === id ? data : r));
    } catch (err) {
    }
  };

  const deleteReport = async (selectedTeam: Team | null, id: string) => {
    if (!selectedTeam) return;
    try {
      setReports(reports.filter(r => r._id !== id));
    } catch (err) {
    }
  };

  return {
    projects, setProjects, projectForm, setProjectForm, addProject, updateProject, deleteProject, loadProjects,
    plans, setPlans, planForm, setPlanForm, addPlan, updatePlan, deletePlan,
    deliverables, setDeliverables, deliverableForm, setDeliverableForm, addDeliverable, updateDeliverable, deleteDeliverable,
    requirements, setRequirements, reqForm, setReqForm, addRequirement, updateRequirement, deleteRequirement,
    analyses, setAnalyses, analysisForm, setAnalysisForm, addAnalysis, updateAnalysis, deleteAnalysis,
    architectures, setArchitectures, archForm, setArchForm, addArchitecture, updateArchitecture, deleteArchitecture,
    designs, setDesigns, designForm, setDesignForm, addDesign, updateDesign, deleteDesign,
    implementations, setImplementations, implForm, setImplForm, addImplementation, updateImplementation, deleteImplementation,
    projectTasks, setProjectTasks, taskForm, setTaskForm, addTask, updateTask, deleteTask,
    codeRepos, setCodeRepos, repoForm, setRepoForm, addCode, updateCode, deleteCode,
    issues, setIssues, issueForm, setIssueForm, addIssue, updateIssue, deleteIssue,
    meetings, setMeetings, meetingForm, setMeetingForm, addMeeting, updateMeeting, deleteMeeting,
    notes, setNotes, noteForm, setNoteForm, addNote, updateNote, deleteNote,
    research, setResearch, researchForm, setResearchForm, addResearch, updateResearch, deleteResearch,
    reports, setReports, reportForm, setReportForm, addReport, updateReport, deleteReport,
    loadProjectData,
    getActiveProject,
    setActiveProject
  };
}
