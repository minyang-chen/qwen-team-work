import React from 'react';
import { ProjectSubTab } from '../../types/team.types';

interface ProjectTabProps {
  projectSubTab: ProjectSubTab;
  setProjectSubTab: (tab: ProjectSubTab) => void;
  selectedTeam: any;
  requirements: any[];
  reqForm: any;
  setReqForm: (form: any) => void;
  addRequirement: (team: any) => void;
  updateRequirement: (team: any, id: string, data: any) => void;
  deleteRequirement: (team: any, id: string) => void;
  architectures: any[];
  archForm: any;
  setArchForm: (form: any) => void;
  addArchitecture: (team: any) => void;
  updateArchitecture: (team: any, id: string, data: any) => void;
  deleteArchitecture: (team: any, id: string) => void;
  designs: any[];
  designForm: any;
  setDesignForm: (form: any) => void;
  addDesign: (team: any) => void;
  updateDesign: (team: any, id: string, data: any) => void;
  deleteDesign: (team: any, id: string) => void;
  implementations: any[];
  implForm: any;
  setImplForm: (form: any) => void;
  addImplementation: (team: any) => void;
  updateImplementation: (team: any, id: string, data: any) => void;
  deleteImplementation: (team: any, id: string) => void;
  projectTasks: any[];
  taskForm: any;
  setTaskForm: (form: any) => void;
  addTask: (team: any) => void;
  updateTask: (team: any, id: string, data: any) => void;
  deleteTask: (team: any, id: string) => void;
  codeRepos: any[];
  repoForm: any;
  setRepoForm: (form: any) => void;
  addCode: (team: any) => void;
  updateCode: (team: any, id: string, data: any) => void;
  deleteCode: (team: any, id: string) => void;
  issues: any[];
  issueForm: any;
  setIssueForm: (form: any) => void;
  addIssue: (team: any) => void;
  updateIssue: (team: any, id: string, data: any) => void;
  deleteIssue: (team: any, id: string) => void;
  meetings: any[];
  meetingForm: any;
  setMeetingForm: (form: any) => void;
  addMeeting: (team: any) => void;
  updateMeeting: (team: any, id: string, data: any) => void;
  deleteMeeting: (team: any, id: string) => void;
  setRequirements: (items: any[]) => void;
  setArchitectures: (items: any[]) => void;
  setDesigns: (items: any[]) => void;
  setImplementations: (items: any[]) => void;
  setProjectTasks: (items: any[]) => void;
  setCodeRepos: (items: any[]) => void;
  setIssues: (items: any[]) => void;
  setMeetings: (items: any[]) => void;
}

const sidebarItems = [
  { id: 'requirements', label: 'Requirements', icon: '📋' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'implementation', label: 'Implementation', icon: '⚙️' },
  { id: 'tasks', label: 'Tasks', icon: '✓' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'issues', label: 'Issues', icon: '🐛' },
  { id: 'meetings', label: 'Meetings', icon: '📅' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'support', label: 'Support', icon: '🎧' }
];

const fieldConfigs = {
  requirements: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'priority', placeholder: 'Priority'}, {name: 'status', placeholder: 'Status'}],
  architecture: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'diagram_url', placeholder: 'Diagram URL'}],
  design: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'mockup_url', placeholder: 'Mockup URL'}],
  implementation: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'status', placeholder: 'Status'}, {name: 'progress', type: 'number', placeholder: 'Progress (%)'}],
  tasks: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'assignee', placeholder: 'Assignee'}, {name: 'status', placeholder: 'Status'}, {name: 'priority', placeholder: 'Priority'}],
  code: [{name: 'name', placeholder: 'Repository Name'}, {name: 'url', placeholder: 'URL'}, {name: 'branch', placeholder: 'Branch'}, {name: 'description', placeholder: 'Description'}],
  issues: [{name: 'title', placeholder: 'Title'}, {name: 'description', placeholder: 'Description'}, {name: 'severity', placeholder: 'Severity'}, {name: 'status', placeholder: 'Status'}, {name: 'assignee', placeholder: 'Assignee'}],
  meetings: [{name: 'title', placeholder: 'Title'}, {name: 'date', type: 'date', placeholder: 'Date'}, {name: 'time', type: 'time', placeholder: 'Time'}, {name: 'agenda', placeholder: 'Agenda'}, {name: 'notes', placeholder: 'Notes'}]
};

export function ProjectTab(props: ProjectTabProps) {
  const { projectSubTab, setProjectSubTab, selectedTeam } = props;
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const loadDocuments = async () => {
    if (!selectedTeam) return;
    try {
      const data = await fetch(`/api/files/list?workspace_type=team&team_id=${selectedTeam.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
      }).then(r => r.json());
      setDocuments(data.files || []);
    } catch (err) {
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeam) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_type', 'team');
    formData.append('team_id', selectedTeam.id);

    try {
      await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` },
        body: formData
      });
      loadDocuments();
    } catch (err) {
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
        },
        body: JSON.stringify({ path: filePath })
      });
      loadDocuments();
    } catch (err) {
    }
  };

  React.useEffect(() => {
    if (projectSubTab === 'documents' && selectedTeam) {
      loadDocuments();
    }
  }, [projectSubTab, selectedTeam]);

  const renderSection = (title: string, items: any[], form: any, setForm: any, addFn: any, updateFn: any, deleteFn: any, setItems: any, fields: any[]) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">{title}</h2>
      <div className="mb-6 space-y-3">
        {fields.map(field => (
          <input key={field.name} type={field.type || 'text'} placeholder={field.placeholder} value={form[field.name]} onChange={(e) => setForm({...form, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
        ))}
        <button onClick={() => addFn(selectedTeam)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add {title}</button>
      </div>
      <div className="space-y-3">
        {(items || []).map((item) => (
          <div key={item._id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
            {item.editing ? (
              <div className="space-y-2">
                {fields.map(field => (
                  <input key={field.name} type={field.type || 'text'} defaultValue={item[field.name]} onChange={(e) => item[field.name] = field.type === 'number' ? Number(e.target.value) : e.target.value} className="w-full px-2 py-1 border rounded" />
                ))}
                <div className="flex gap-2">
                  <button onClick={() => { updateFn(selectedTeam, item._id, item); setItems(items.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-3 py-1 text-sm bg-green-600 text-white rounded">Save</button>
                  <button onClick={() => setItems(items.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-3 py-1 text-sm bg-gray-400 text-white rounded">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-gray-900">{item.title || item.name}</div>
                <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setItems(items.map(i => i._id === item._id ? {...i, editing: true} : i))} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button onClick={() => deleteFn(selectedTeam, item._id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setProjectSubTab(item.id as ProjectSubTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                projectSubTab === item.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!selectedTeam ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">Please select a team to manage projects</p>
            </div>
          </div>
        ) : (
          <div>
            {projectSubTab === 'requirements' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Requirements</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addRequirement(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="req-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="req-title" value={props.reqForm.title || ''} onChange={(e) => props.setReqForm({...props.reqForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter requirement title" required />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="req-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="req-description" rows={3} value={props.reqForm.description || ''} onChange={(e) => props.setReqForm({...props.reqForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the requirement"></textarea>
                        </div>
                        <div>
                          <label htmlFor="req-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                          <select id="req-priority" value={props.reqForm.priority || ''} onChange={(e) => props.setReqForm({...props.reqForm, priority: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="req-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select id="req-status" value={props.reqForm.status || ''} onChange={(e) => props.setReqForm({...props.reqForm, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select status</option>
                            <option value="Draft">Draft</option>
                            <option value="Review">Review</option>
                            <option value="Approved">Approved</option>
                            <option value="Implemented">Implemented</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Requirement</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.requirements || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No requirements yet. Add one above!</div>
                      ) : (
                        (props.requirements || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={3} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select defaultValue={item.priority} onChange={(e) => item.priority = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                      <option value="Low">Low</option>
                                      <option value="Medium">Medium</option>
                                      <option value="High">High</option>
                                      <option value="Critical">Critical</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select defaultValue={item.status} onChange={(e) => item.status = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                      <option value="Draft">Draft</option>
                                      <option value="Review">Review</option>
                                      <option value="Approved">Approved</option>
                                      <option value="Implemented">Implemented</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateRequirement(selectedTeam, item._id, item); props.setRequirements(props.requirements.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setRequirements(props.requirements.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                  <div className="flex gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.priority === 'Critical' ? 'bg-red-100 text-red-800' : item.priority === 'High' ? 'bg-orange-100 text-orange-800' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{item.priority}</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Implemented' ? 'bg-green-100 text-green-800' : item.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                                <div className="flex gap-3">
                                  <button onClick={() => props.setRequirements(props.requirements.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteRequirement(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'architecture' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Architecture</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addArchitecture(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="arch-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="arch-title" value={props.archForm.title || ''} onChange={(e) => props.setArchForm({...props.archForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter architecture title" required />
                        </div>
                        <div>
                          <label htmlFor="arch-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="arch-description" rows={4} value={props.archForm.description || ''} onChange={(e) => props.setArchForm({...props.archForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the architecture"></textarea>
                        </div>
                        <div>
                          <label htmlFor="arch-diagram" className="block text-sm font-medium text-gray-700 mb-1">Diagram URL</label>
                          <input type="url" id="arch-diagram" value={props.archForm.diagram_url || ''} onChange={(e) => props.setArchForm({...props.archForm, diagram_url: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://example.com/diagram.png" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Architecture</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.architectures || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No architecture documents yet. Add one above!</div>
                      ) : (
                        (props.architectures || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={4} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagram URL</label>
                                  <input type="url" defaultValue={item.diagram_url} onChange={(e) => item.diagram_url = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateArchitecture(selectedTeam, item._id, item); props.setArchitectures(props.architectures.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setArchitectures(props.architectures.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.title}</h3>
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                {item.diagram_url && (
                                  <div className="mb-4">
                                    <a href={item.diagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      View Diagram
                                    </a>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button onClick={() => props.setArchitectures(props.architectures.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteArchitecture(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'design' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Design</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addDesign(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="design-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="design-title" value={props.designForm.title || ''} onChange={(e) => props.setDesignForm({...props.designForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter design title" required />
                        </div>
                        <div>
                          <label htmlFor="design-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="design-description" rows={4} value={props.designForm.description || ''} onChange={(e) => props.setDesignForm({...props.designForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the design"></textarea>
                        </div>
                        <div>
                          <label htmlFor="design-mockup" className="block text-sm font-medium text-gray-700 mb-1">Mockup URL</label>
                          <input type="url" id="design-mockup" value={props.designForm.mockup_url || ''} onChange={(e) => props.setDesignForm({...props.designForm, mockup_url: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://example.com/mockup.png" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Design</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.designs || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No designs yet. Add one above!</div>
                      ) : (
                        (props.designs || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={4} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Mockup URL</label>
                                  <input type="url" defaultValue={item.mockup_url} onChange={(e) => item.mockup_url = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateDesign(selectedTeam, item._id, item); props.setDesigns(props.designs.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setDesigns(props.designs.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.title}</h3>
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                {item.mockup_url && (
                                  <div className="mb-4">
                                    <a href={item.mockup_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      View Mockup
                                    </a>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button onClick={() => props.setDesigns(props.designs.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteDesign(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'implementation' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Implementation</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addImplementation(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="impl-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="impl-title" value={props.implForm.title || ''} onChange={(e) => props.setImplForm({...props.implForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter implementation title" required />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="impl-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="impl-description" rows={3} value={props.implForm.description || ''} onChange={(e) => props.setImplForm({...props.implForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the implementation"></textarea>
                        </div>
                        <div>
                          <label htmlFor="impl-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select id="impl-status" value={props.implForm.status || ''} onChange={(e) => props.setImplForm({...props.implForm, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select status</option>
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Testing">Testing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="impl-progress" className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                          <input type="number" id="impl-progress" min="0" max="100" value={props.implForm.progress || ''} onChange={(e) => props.setImplForm({...props.implForm, progress: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0-100" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Implementation</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.implementations || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No implementations yet. Add one above!</div>
                      ) : (
                        (props.implementations || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={3} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select defaultValue={item.status} onChange={(e) => item.status = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                      <option value="Not Started">Not Started</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Testing">Testing</option>
                                      <option value="Completed">Completed</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                                    <input type="number" min="0" max="100" defaultValue={item.progress} onChange={(e) => item.progress = Number(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateImplementation(selectedTeam, item._id, item); props.setImplementations(props.implementations.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setImplementations(props.implementations.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Completed' ? 'bg-green-100 text-green-800' : item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : item.status === 'Testing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                {item.progress !== undefined && (
                                  <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                      <span>Progress</span>
                                      <span>{item.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="bg-blue-600 h-2 rounded-full" style={{width: `${item.progress}%`}}></div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button onClick={() => props.setImplementations(props.implementations.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteImplementation(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'tasks' && (
              <div className="max-w-6xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addTask(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                          <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="task-title" value={props.taskForm.title || ''} onChange={(e) => props.setTaskForm({...props.taskForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter task title" required />
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="task-description" rows={2} value={props.taskForm.description || ''} onChange={(e) => props.setTaskForm({...props.taskForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the task"></textarea>
                        </div>
                        <div>
                          <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                          <input type="text" id="task-assignee" value={props.taskForm.assignee || ''} onChange={(e) => props.setTaskForm({...props.taskForm, assignee: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Assigned to" />
                        </div>
                        <div>
                          <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select id="task-status" value={props.taskForm.status || ''} onChange={(e) => props.setTaskForm({...props.taskForm, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select status</option>
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                          <select id="task-priority" value={props.taskForm.priority || ''} onChange={(e) => props.setTaskForm({...props.taskForm, priority: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Task</button>
                      </div>
                    </form>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(props.projectTasks || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No tasks yet. Add one above!</td>
                            </tr>
                          ) : (
                            (props.projectTasks || []).map((item) => (
                              <tr key={item._id} className="hover:bg-gray-50">
                                {item.editing ? (
                                  <>
                                    <td className="px-6 py-4">
                                      <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Title" />
                                      <textarea rows={2} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full mt-2 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Description"></textarea>
                                    </td>
                                    <td className="px-6 py-4">
                                      <input type="text" defaultValue={item.assignee} onChange={(e) => item.assignee = e.target.value} className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                    </td>
                                    <td className="px-6 py-4">
                                      <select defaultValue={item.status} onChange={(e) => item.status = e.target.value} className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="To Do">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                      </select>
                                    </td>
                                    <td className="px-6 py-4">
                                      <select defaultValue={item.priority} onChange={(e) => item.priority = e.target.value} className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                      </select>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                      <button onClick={() => { props.updateTask(selectedTeam, item._id, item); props.setProjectTasks(props.projectTasks.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="text-green-600 hover:text-green-900 mr-3">Save</button>
                                      <button onClick={() => props.setProjectTasks(props.projectTasks.map(i => i._id === item._id ? {...i, editing: false} : i))} className="text-gray-600 hover:text-gray-900">Cancel</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                      {item.description && <div className="text-sm text-gray-500 mt-1">{item.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{item.assignee || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Done' ? 'bg-green-100 text-green-800' : item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.priority === 'High' ? 'bg-red-100 text-red-800' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{item.priority}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button onClick={() => props.setProjectTasks(props.projectTasks.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                      <button onClick={() => props.deleteTask(selectedTeam, item._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'code' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Code Repositories</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addCode(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="repo-name" className="block text-sm font-medium text-gray-700 mb-1">Repository Name</label>
                          <input type="text" id="repo-name" value={props.repoForm.name || ''} onChange={(e) => props.setRepoForm({...props.repoForm, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="my-project" required />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                          <input type="url" id="repo-url" value={props.repoForm.url || ''} onChange={(e) => props.setRepoForm({...props.repoForm, url: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://github.com/user/repo" required />
                        </div>
                        <div>
                          <label htmlFor="repo-branch" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                          <input type="text" id="repo-branch" value={props.repoForm.branch || ''} onChange={(e) => props.setRepoForm({...props.repoForm, branch: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="main" />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="repo-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="repo-description" rows={2} value={props.repoForm.description || ''} onChange={(e) => props.setRepoForm({...props.repoForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Brief description"></textarea>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Repository</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.codeRepos || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No repositories yet. Add one above!</div>
                      ) : (
                        (props.codeRepos || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository Name</label>
                                  <input type="text" defaultValue={item.name} onChange={(e) => item.name = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                                  <input type="url" defaultValue={item.url} onChange={(e) => item.url = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                  <input type="text" defaultValue={item.branch} onChange={(e) => item.branch = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={2} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateCode(selectedTeam, item._id, item); props.setCodeRepos(props.codeRepos.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setCodeRepos(props.codeRepos.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                  </div>
                                  {item.branch && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{item.branch}</span>}
                                </div>
                                {item.description && <p className="text-sm text-gray-600 mb-3">{item.description}</p>}
                                <div className="mb-4">
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    View Repository
                                  </a>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => props.setCodeRepos(props.codeRepos.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteCode(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'issues' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Issues</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addIssue(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="issue-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="issue-title" value={props.issueForm.title || ''} onChange={(e) => props.setIssueForm({...props.issueForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter issue title" required />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="issue-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="issue-description" rows={3} value={props.issueForm.description || ''} onChange={(e) => props.setIssueForm({...props.issueForm, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the issue"></textarea>
                        </div>
                        <div>
                          <label htmlFor="issue-severity" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                          <select id="issue-severity" value={props.issueForm.severity || ''} onChange={(e) => props.setIssueForm({...props.issueForm, severity: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select severity</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="issue-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select id="issue-status" value={props.issueForm.status || ''} onChange={(e) => props.setIssueForm({...props.issueForm, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="issue-assignee" className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                          <input type="text" id="issue-assignee" value={props.issueForm.assignee || ''} onChange={(e) => props.setIssueForm({...props.issueForm, assignee: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Assigned to" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Issue</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.issues || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No issues yet. Add one above!</div>
                      ) : (
                        (props.issues || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea rows={3} defaultValue={item.description} onChange={(e) => item.description = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                    <select defaultValue={item.severity} onChange={(e) => item.severity = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                      <option value="Low">Low</option>
                                      <option value="Medium">Medium</option>
                                      <option value="High">High</option>
                                      <option value="Critical">Critical</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select defaultValue={item.status} onChange={(e) => item.status = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                      <option value="Open">Open</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Resolved">Resolved</option>
                                      <option value="Closed">Closed</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                                  <input type="text" defaultValue={item.assignee} onChange={(e) => item.assignee = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateIssue(selectedTeam, item._id, item); props.setIssues(props.issues.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setIssues(props.issues.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                  <div className="flex gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.severity === 'Critical' ? 'bg-red-100 text-red-800' : item.severity === 'High' ? 'bg-orange-100 text-orange-800' : item.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{item.severity}</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Closed' || item.status === 'Resolved' ? 'bg-green-100 text-green-800' : item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                {item.assignee && (
                                  <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                    <span className="text-sm text-gray-600">Assigned to: <span className="font-medium">{item.assignee}</span></span>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button onClick={() => props.setIssues(props.issues.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteIssue(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'meetings' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Meetings</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); props.addMeeting(selectedTeam); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" id="meeting-title" value={props.meetingForm.title || ''} onChange={(e) => props.setMeetingForm({...props.meetingForm, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter meeting title" required />
                        </div>
                        <div>
                          <label htmlFor="meeting-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input type="date" id="meeting-date" value={props.meetingForm.date || ''} onChange={(e) => props.setMeetingForm({...props.meetingForm, date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label htmlFor="meeting-time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                          <input type="time" id="meeting-time" value={props.meetingForm.time || ''} onChange={(e) => props.setMeetingForm({...props.meetingForm, time: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="meeting-agenda" className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                          <textarea id="meeting-agenda" rows={3} value={props.meetingForm.agenda || ''} onChange={(e) => props.setMeetingForm({...props.meetingForm, agenda: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Meeting agenda"></textarea>
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="meeting-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea id="meeting-notes" rows={3} value={props.meetingForm.notes || ''} onChange={(e) => props.setMeetingForm({...props.meetingForm, notes: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Meeting notes"></textarea>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Meeting</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      {(props.meetings || []).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No meetings yet. Add one above!</div>
                      ) : (
                        (props.meetings || []).map((item) => (
                          <div key={item._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                            {item.editing ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input type="text" defaultValue={item.title} onChange={(e) => item.title = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input type="date" defaultValue={item.date} onChange={(e) => item.date = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input type="time" defaultValue={item.time} onChange={(e) => item.time = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                                  <textarea rows={3} defaultValue={item.agenda} onChange={(e) => item.agenda = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                  <textarea rows={3} defaultValue={item.notes} onChange={(e) => item.notes = e.target.value} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => { props.updateMeeting(selectedTeam, item._id, item); props.setMeetings(props.meetings.map(i => i._id === item._id ? {...i, editing: false} : i)); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Save</button>
                                  <button onClick={() => props.setMeetings(props.meetings.map(i => i._id === item._id ? {...i, editing: false} : i))} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                  {item.date && item.time && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      <span>{item.date} at {item.time}</span>
                                    </div>
                                  )}
                                </div>
                                {item.agenda && (
                                  <div className="mb-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Agenda</h4>
                                    <p className="text-sm text-gray-600">{item.agenda}</p>
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                                    <p className="text-sm text-gray-600">{item.notes}</p>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button onClick={() => props.setMeetings(props.meetings.map(i => i._id === item._id ? {...i, editing: true} : i))} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                  <button onClick={() => props.deleteMeeting(selectedTeam, item._id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'documents' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Project Documents</h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-8">
                      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">Upload Document</label>
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">Any file type supported</p>
                          </div>
                          <input id="file-upload" type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                        </label>
                      </div>
                      {uploading && (
                        <div className="mt-3 flex items-center text-sm text-blue-600">
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {documents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <p className="mt-4">No documents uploaded yet</p>
                        </div>
                      ) : (
                        documents.map((doc) => (
                          <div key={doc._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex-shrink-0 mt-1">
                                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.filename}</h3>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                      {(doc.size / 1024).toFixed(2)} KB
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      {new Date(doc.uploadDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => handleDelete(doc.path)} className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {projectSubTab === 'support' && (
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="ticket-subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                          <input type="text" id="ticket-subject" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter ticket subject" required />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="ticket-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea id="ticket-description" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe your issue"></textarea>
                        </div>
                        <div>
                          <label htmlFor="ticket-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                          <select id="ticket-priority" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="ticket-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <select id="ticket-category" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select category</option>
                            <option value="Technical">Technical</option>
                            <option value="Billing">Billing</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Submit Ticket</button>
                      </div>
                    </form>
                    <div className="space-y-4">
                      <div className="text-center py-12 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <p className="mt-4">No support tickets yet. Submit one above!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
