import { useState, useEffect } from 'react';
import { teamApi } from '../../services/team/api';

interface Team {
  id: string;
  name: string;
  role?: string;
  memberCount?: number;
}

export function TeamSelect({ onTeamSelected }: { onTeamSelected: () => void }) {
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedJoinTeam, setSelectedJoinTeam] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const data = await teamApi.listTeams();
      setMyTeams(data.myTeams || []);
      setAvailableTeams(data.availableTeams || []);
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    try {
      await teamApi.selectTeam(teamId);
      onTeamSelected();
    } catch {
      setError('Failed to select team');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await teamApi.createTeam(newTeamName);
      if (result.team_id) {
        await handleSelectTeam(result.team_id);
      }
    } catch {
      setError('Failed to create team');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamApi.joinTeam(selectedJoinTeam);
      await handleSelectTeam(selectedJoinTeam);
    } catch {
      setError('Failed to join team');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          Select Team
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* My Teams */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold mb-3">My Teams</h3>
          {myTeams.length === 0 ? (
            <p className="text-gray-500">
              You haven&apos;t joined any teams yet.
            </p>
          ) : (
            <div className="space-y-2">
              {myTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className="p-4 border rounded hover:bg-blue-50 cursor-pointer transition"
                >
                  <div className="font-medium">{team.name}</div>
                  <div className="text-sm text-gray-600">Role: {team.role}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Create Team
          </button>
          <button
            onClick={() => setShowJoin(!showJoin)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Join Team
          </button>
        </div>

        {/* Create Team Form */}
        {showCreate && (
          <form
            onSubmit={handleCreateTeam}
            className="mb-6 p-4 bg-gray-50 rounded"
          >
            <h4 className="font-semibold mb-3">Create New Team</h4>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full px-3 py-2 border rounded mb-3"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Create & Select
            </button>
          </form>
        )}

        {/* Join Team Form */}
        {showJoin && (
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-3">Available Teams</h4>
            {availableTeams.length === 0 ? (
              <p className="text-gray-500">No available teams to join.</p>
            ) : (
              <form onSubmit={handleJoinTeam} className="space-y-2">
                {availableTeams.map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center p-3 border rounded hover:bg-white cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="team"
                      value={team.id}
                      onChange={(e) => setSelectedJoinTeam(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-gray-600">
                        {team.memberCount} members
                      </div>
                    </div>
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={!selectedJoinTeam}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Join & Select
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
