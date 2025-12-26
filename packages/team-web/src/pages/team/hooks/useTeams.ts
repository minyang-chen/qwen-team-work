import { useState } from 'react';
import { teamApi } from '../../../services/team/api';
import { Team, TeamMember } from '../types/team.types';

export function useTeams() {
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [initialized, setInitialized] = useState(false);

  const loadMyTeams = async () => {
    try {
      const data = await teamApi.getUserTeams();
      if (data.teams) {
        setMyTeams(data.teams);

        // Auto-select active team from session only on first load
        if (!initialized) {
          const activeTeamData = await teamApi.getActiveTeam();
          if (activeTeamData.activeTeamId && data.teams.length > 0) {
            const activeTeam = data.teams.find(
              (t: Team) => t.id === activeTeamData.activeTeamId,
            );
            if (activeTeam) {
              setSelectedTeam(activeTeam);
              loadTeamMembers(activeTeam.id);
            }
          }
          setInitialized(true);
        }
      }
    } catch {
    }
  };

  const handleCreateTeam = async (setMessage: (msg: string) => void) => {
    try {
      const data = await teamApi.createTeam(
        teamName,
        specialization,
        description,
      );
      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage(`Team created! Workspace: ${data.workspace_path}`);
        setTeamName('');
        setSpecialization('');
        setDescription('');
        loadMyTeams();
      }
    } catch {
      setMessage('Failed to create team');
    }
  };

  const handleJoinTeam = async (setMessage: (msg: string) => void) => {
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('team_session_token')}`,
        },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage(`Joined team! Workspace: ${data.workspace_path}`);
        setTeamId('');
        setTeamSearchResults([]);
        loadMyTeams();
      }
    } catch {
      setMessage('Failed to join team');
    }
  };

  const handleTeamSearch = async (setMessage: (msg: string) => void) => {
    try {
      const data = await teamApi.searchTeams(teamSearchQuery);
      if (data.teams) setTeamSearchResults(data.teams);
    } catch {
      setMessage('Team search failed');
    }
  };

  const handleDeleteTeam = async (
    teamId: string,
    setMessage: (msg: string) => void,
  ) => {
    if (!confirm('Delete this team? This action cannot be undone.')) return;

    try {
      const data = await teamApi.deleteTeam(teamId);
      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage('Team deleted successfully');
        loadMyTeams();
      }
    } catch {
      setMessage('Failed to delete team');
    }
  };

  const handleUpdateTeam = async (
    teamId: string,
    updates: {
      team_name?: string;
      specialization?: string;
      description?: string;
    },
    setMessage: (msg: string) => void,
  ) => {
    try {
      const data = await teamApi.updateTeam(teamId, updates);
      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage('Team updated successfully');
        loadMyTeams();
      }
    } catch {
      setMessage('Failed to update team');
    }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
    await teamApi.selectTeam(team.id);
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const res = await fetch(
        `/api/teams/${teamId}/members`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('team_session_token')}`,
          },
        },
      );
      const data = await res.json();
      if (data.members) setTeamMembers(data.members);
    } catch {
    }
  };

  const handleAddMember = async (setMessage: (msg: string) => void) => {
    if (!selectedTeam || !newMemberEmail.trim()) return;

    try {
      const res = await fetch(
        `/api/teams/${selectedTeam.id}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('team_session_token')}`,
          },
          body: JSON.stringify({ email: newMemberEmail }),
        },
      );
      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage('Member added successfully');
        setNewMemberEmail('');
        loadTeamMembers(selectedTeam.id);
      }
    } catch {
      setMessage('Failed to add member');
    }
  };

  const handleRemoveMember = async (
    memberId: string,
    setMessage: (msg: string) => void,
  ) => {
    if (!selectedTeam || !confirm('Remove this member?')) return;

    try {
      const res = await fetch(
        `/api/teams/${selectedTeam.id}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('team_session_token')}`,
          },
        },
      );
      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error.message}`);
      } else {
        setMessage('Member removed successfully');
        loadTeamMembers(selectedTeam.id);
      }
    } catch {
      setMessage('Failed to remove member');
    }
  };

  return {
    myTeams,
    selectedTeam,
    setSelectedTeam,
    teamMembers,
    teamSearchQuery,
    setTeamSearchQuery,
    teamSearchResults,
    setTeamSearchResults,
    teamName,
    setTeamName,
    specialization,
    setSpecialization,
    description,
    setDescription,
    teamId,
    setTeamId,
    newMemberEmail,
    setNewMemberEmail,
    loadMyTeams,
    handleCreateTeam,
    handleJoinTeam,
    handleTeamSearch,
    handleDeleteTeam,
    handleUpdateTeam,
    handleSelectTeam,
    loadTeamMembers,
    handleAddMember,
    handleRemoveMember,
  };
}
