import { API_BASE } from '../../config/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('team_session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const teamApi = {
  async signup(data: {
    username: string;
    email: string;
    full_name: string;
    password: string;
  }) {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.session_token) {
      localStorage.setItem('team_session_token', data.session_token);
      localStorage.setItem('team_username', username);
    }
    return data;
  },

  async createTeam(
    team_name: string,
    specialization?: string,
    description?: string,
  ) {
    const res = await fetch(`${API_BASE}/api/teams/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ team_name, specialization, description }),
    });
    return res.json();
  },

  async joinTeam(team_id: string) {
    const res = await fetch(`${API_BASE}/api/teams/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ team_id }),
    });
    return res.json();
  },

  async listTeams() {
    const res = await fetch(`${API_BASE}/api/team/list`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async selectTeam(teamId: string) {
    const res = await fetch(`${API_BASE}/api/team/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ teamId }),
    });
    return res.json();
  },

  logout() {
    localStorage.removeItem('team_session_token');
    localStorage.removeItem('team_username');
  },

  async listFiles(workspace_type: string, team_id?: string) {
    const params = new URLSearchParams({ workspace_type });
    if (team_id) params.append('team_id', team_id);

    const res = await fetch(`${API_BASE}/api/files/list?${params}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async uploadFile(file: File, workspace_type: string, team_id?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_type', workspace_type);
    if (team_id) formData.append('team_id', team_id);

    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    return res.json();
  },

  async downloadFile(filePath: string) {
    const params = new URLSearchParams({ path: filePath });
    const res = await fetch(`${API_BASE}/api/files/download?${params}`, {
      headers: getAuthHeader(),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'download';
    a.click();
  },

  async deleteFile(filePath: string) {
    const res = await fetch(`${API_BASE}/api/files/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ path: filePath }),
    });
    return res.json();
  },

  async searchFiles(
    query: string,
    workspace_type: string,
    team_id?: string,
    limit = 10,
  ) {
    const res = await fetch(`${API_BASE}/api/files/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ query, workspace_type, team_id, limit }),
    });
    return res.json();
  },

  async searchTeams(query: string) {
    const params = new URLSearchParams({ query });
    const res = await fetch(`${API_BASE}/api/teams/search?${params}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getUserTeams() {
    const res = await fetch(`${API_BASE}/api/teams/my-teams`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getActiveTeam() {
    const res = await fetch(`${API_BASE}/api/team/active`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async deleteTeam(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ team_id: teamId }),
    });
    return res.json();
  },

  async updateTeam(
    teamId: string,
    updates: {
      team_name?: string;
      specialization?: string;
      description?: string;
    },
  ) {
    const res = await fetch(`${API_BASE}/api/teams/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ team_id: teamId, ...updates }),
    });
    return res.json();
  },

  // Project management APIs
  async getRequirements(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createRequirement(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateRequirement(
    teamId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/requirements/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      },
    );
    return res.json();
  },
  async deleteRequirement(teamId: string, id: string) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/requirements/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeader(),
      },
    );
    return res.json();
  },

  async getArchitecture(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createArchitecture(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateArchitecture(
    teamId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/architecture/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      },
    );
    return res.json();
  },
  async deleteArchitecture(teamId: string, id: string) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/architecture/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeader(),
      },
    );
    return res.json();
  },

  async getDesign(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/design`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createDesign(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateDesign(
    teamId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/design/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteDesign(teamId: string, id: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/design/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getImplementation(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createImplementation(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateImplementation(
    teamId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/implementation/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      },
    );
    return res.json();
  },
  async deleteImplementation(teamId: string, id: string) {
    const res = await fetch(
      `${API_BASE}/api/teams/${teamId}/implementation/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeader(),
      },
    );
    return res.json();
  },

  async getTasks(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createTask(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateTask(teamId: string, id: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTask(teamId: string, id: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getCode(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/code`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createCode(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateCode(teamId: string, id: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/code/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteCode(teamId: string, id: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/code/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getIssues(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createIssue(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateIssue(teamId: string, id: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteIssue(teamId: string, id: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getMeetings(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
  async createMeeting(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateMeeting(
    teamId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteMeeting(teamId: string, id: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  // Projects
  async createProject(teamId: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async listProjects(teamId: string) {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}/projects`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },
};
