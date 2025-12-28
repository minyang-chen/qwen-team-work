import React from 'react';
import { Team } from '../types/team.types';

interface TeamSelectorProps {
  myTeams: Team[];
  selectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
}

export function TeamSelector({ myTeams, selectedTeam, onSelectTeam }: TeamSelectorProps) {
  if (myTeams.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Select Team</label>
      <select
        value={selectedTeam?.id || ''}
        onChange={(e) => {
          const team = myTeams.find(t => t.id === e.target.value);
          if (team) onSelectTeam(team);
        }}
        className="w-full px-3 py-2 border rounded-lg"
      >
        <option value="">-- Select a team --</option>
        {myTeams.map(team => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
