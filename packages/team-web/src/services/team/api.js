import { API_BASE } from '../../config/api';
const getAuthHeader = () => {
    const token = localStorage.getItem('team_session_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};
export const teamApi = {
    async signup(data) {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async login(username, password) {
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
    async createTeam(team_name, specialization, description) {
        const res = await fetch(`${API_BASE}/api/teams/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ team_name, specialization, description }),
        });
        return res.json();
    },
    async joinTeam(team_id) {
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
    async selectTeam(teamId) {
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
    async listFiles(workspace_type, team_id) {
        const params = new URLSearchParams({ workspace_type });
        if (team_id)
            params.append('team_id', team_id);
        const res = await fetch(`${API_BASE}/api/files/list?${params}`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async uploadFile(file, workspace_type, team_id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspace_type', workspace_type);
        if (team_id)
            formData.append('team_id', team_id);
        const res = await fetch(`${API_BASE}/api/files/upload`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: formData,
        });
        return res.json();
    },
    async downloadFile(filePath) {
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
    async deleteFile(filePath) {
        const res = await fetch(`${API_BASE}/api/files/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ path: filePath }),
        });
        return res.json();
    },
    async searchFiles(query, workspace_type, team_id, limit = 10) {
        const res = await fetch(`${API_BASE}/api/files/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ query, workspace_type, team_id, limit }),
        });
        return res.json();
    },
    async searchTeams(query) {
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
    async deleteTeam(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ team_id: teamId }),
        });
        return res.json();
    },
    async updateTeam(teamId, updates) {
        const res = await fetch(`${API_BASE}/api/teams/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ team_id: teamId, ...updates }),
        });
        return res.json();
    },
    // Project management APIs
    async getRequirements(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createRequirement(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateRequirement(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteRequirement(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/requirements/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getArchitecture(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createArchitecture(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateArchitecture(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteArchitecture(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/architecture/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getDesign(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/design`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createDesign(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/design`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateDesign(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/design/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteDesign(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/design/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getImplementation(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createImplementation(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateImplementation(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteImplementation(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/implementation/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getTasks(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createTask(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateTask(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteTask(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/tasks/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getCode(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/code`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createCode(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateCode(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/code/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteCode(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/code/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getIssues(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createIssue(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateIssue(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteIssue(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/issues/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async getMeetings(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
    async createMeeting(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateMeeting(teamId, id, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteMeeting(teamId, id) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/meetings/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
    // Projects
    async createProject(teamId, data) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async listProjects(teamId) {
        const res = await fetch(`${API_BASE}/api/teams/${teamId}/projects`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },
};
