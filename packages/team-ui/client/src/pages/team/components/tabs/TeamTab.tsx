import React, { useState } from 'react';
import {
  TeamSubTab,
  Notification,
  Team,
  TeamMember,
} from '../../types/team.types';

interface TeamTabProps {
  teamSubTab: TeamSubTab;
  setTeamSubTab: (tab: TeamSubTab) => void;
  myTeams: Team[];
  selectedTeam: Team | null;
  handleSelectTeam: (team: Team) => void;
  teamMembers: TeamMember[];
  newMemberEmail: string;
  setNewMemberEmail: (email: string) => void;
  handleAddMember: (setMessage: (msg: string) => void) => void;
  handleRemoveMember: (
    memberId: string,
    setMessage: (msg: string) => void,
  ) => void;
  handleDeleteTeam: (teamId: string, setMessage: (msg: string) => void) => void;
  handleUpdateTeam?: (
    teamId: string,
    updates: {
      team_name?: string;
      specialization?: string;
      description?: string;
    },
    setMessage: (msg: string) => void,
  ) => void;
  teamName: string;
  setTeamName: (name: string) => void;
  specialization: string;
  setSpecialization: (spec: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  handleCreateTeam: (setMessage: (msg: string) => void) => void;
  teamId: string;
  setTeamId: (id: string) => void;
  teamSearchQuery: string;
  setTeamSearchQuery: (query: string) => void;
  teamSearchResults: Team[];
  handleTeamSearch: (setMessage: (msg: string) => void) => void;
  handleJoinTeam: (setMessage: (msg: string) => void) => void;
  broadcastMessage: string;
  setBroadcastMessage: (msg: string) => void;
  broadcastType: string;
  setBroadcastType: (type: string) => void;
  handleSendBroadcast: (
    selectedTeam: Team | null,
    setMessage: (msg: string) => void,
    loadNotifications: (teamId: string) => void,
  ) => void;
  loadNotifications: (teamId: string) => void;
  notifications: Notification[];
  setMessage: (msg: string) => void;
}

export function TeamTab(props: TeamTabProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpec, setEditSpec] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const {
    teamSubTab,
    setTeamSubTab,
    myTeams,
    selectedTeam,
    handleSelectTeam,
    teamMembers,
    newMemberEmail,
    setNewMemberEmail,
    handleAddMember,
    handleRemoveMember,
    handleDeleteTeam,
    handleUpdateTeam,
    teamName,
    setTeamName,
    specialization,
    setSpecialization,
    description,
    setDescription,
    handleCreateTeam,
    teamId,
    setTeamId,
    teamSearchQuery,
    setTeamSearchQuery,
    teamSearchResults,
    handleTeamSearch,
    handleJoinTeam,
    broadcastMessage,
    setBroadcastMessage,
    broadcastType,
    setBroadcastType,
    handleSendBroadcast,
    loadNotifications,
    notifications,
    setMessage,
  } = props;

  const onCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateTeam(setMessage);
  };

  const onJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinTeam(setMessage);
  };

  const onAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddMember(setMessage);
  };

  const onBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendBroadcast(selectedTeam, setMessage, loadNotifications);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setEditName(team.team_name);
    setEditSpec(team.specialization || '');
    setEditDesc(team.description || '');
  };

  const closeEditModal = () => {
    setEditingTeam(null);
    setEditName('');
    setEditSpec('');
    setEditDesc('');
  };

  const onUpdateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam && handleUpdateTeam) {
      handleUpdateTeam(
        editingTeam.id,
        {
          team_name: editName,
          specialization: editSpec,
          description: editDesc,
        },
        setMessage,
      );
      closeEditModal();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4">
            <nav className="space-y-1">
              <button
                onClick={() => setTeamSubTab('my-teams')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${teamSubTab === 'my-teams' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span>My Teams</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {myTeams.length}
                </span>
              </button>
              <button
                onClick={() => setTeamSubTab('create-team')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${teamSubTab === 'create-team' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Team
              </button>
              <button
                onClick={() => setTeamSubTab('join-team')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${teamSubTab === 'join-team' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Join Team
              </button>
              <button
                onClick={() => setTeamSubTab('notifications')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${teamSubTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span>Notifications</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {selectedTeam
                    ? notifications.filter((n) => n.team_id === selectedTeam.id)
                        .length
                    : 0}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow">
          <div className="p-6">
            {teamSubTab === 'my-teams' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  My Teams
                </h2>
                <ul
                  role="list"
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8"
                >
                  {myTeams.length > 0 ? (
                    myTeams.map((team) => (
                      <li
                        key={team.id}
                        onClick={() => handleSelectTeam(team)}
                        className={`col-span-1 divide-y divide-gray-200 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${selectedTeam?.id === team.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className="flex w-full items-start justify-between space-x-6 p-6">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="truncate text-sm font-medium text-gray-900">
                                {team.team_name}
                              </h3>
                              <span
                                className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${team.role === 'admin' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}
                              >
                                {team.role}
                              </span>
                            </div>
                            {team.specialization && (
                              <p className="text-xs text-gray-500 mb-2">
                                {team.specialization}
                              </p>
                            )}
                            {team.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {team.description}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                              <svg
                                className="h-6 w-6 text-gray-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {team.role === 'admin' && (
                          <div className="-mt-px flex divide-x divide-gray-200">
                            <div className="flex w-0 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(team);
                                }}
                                className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Edit
                              </button>
                            </div>
                            <div className="flex w-0 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTeam(team.id, setMessage);
                                }}
                                className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="col-span-full">
                      <div className="text-center py-12">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                          No teams
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Get started by creating a new team or joining an
                          existing one.
                        </p>
                      </div>
                    </li>
                  )}
                </ul>

                {selectedTeam && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Team Members - {selectedTeam.team_name}
                    </h4>
                    {selectedTeam.role === 'admin' && (
                      <form onSubmit={onAddMember} className="mb-6">
                        <div className="flex gap-3">
                          <input
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="Enter member email"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Add Member
                          </button>
                        </div>
                      </form>
                    )}
                    <div className="overflow-hidden border border-gray-200 rounded-lg mb-6">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr key="header">
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Member
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Role
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teamMembers.map((member) => {
                            return (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                      <svg
                                        className="h-5 w-5 text-gray-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900">
                                        {member.username || member.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}
                                  >
                                    {member.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {selectedTeam.role === 'admin' &&
                                  member.role !== 'admin' ? (
                                    <button
                                      onClick={() =>
                                        handleRemoveMember(
                                          member.id,
                                          setMessage,
                                        )
                                      }
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {selectedTeam.role === 'admin' && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Send Broadcast Message
                        </h4>
                        <form onSubmit={onBroadcast} className="space-y-4">
                          <div>
                            <label
                              htmlFor="broadcast-type"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Message Type
                            </label>
                            <select
                              id="broadcast-type"
                              value={broadcastType}
                              onChange={(e) => setBroadcastType(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="general">General</option>
                              <option value="announcement">Announcement</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor="broadcast-message"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Message
                            </label>
                            <textarea
                              id="broadcast-message"
                              value={broadcastMessage}
                              onChange={(e) =>
                                setBroadcastMessage(e.target.value)
                              }
                              placeholder="Enter broadcast message..."
                              rows={4}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                          >
                            Send Broadcast
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : teamSubTab === 'notifications' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Team Notifications
                </h3>
                {selectedTeam ? (
                  <div className="flow-root">
                    <ul role="list" className="-mb-8">
                      {notifications.filter(
                        (n) => n.team_id === selectedTeam.id,
                      ).length > 0 ? (
                        notifications
                          .filter((n) => n.team_id === selectedTeam.id)
                          .map((notification, idx, arr) => (
                            <li key={notification._id}>
                              <div className="relative pb-8">
                                {idx !== arr.length - 1 && (
                                  <span
                                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span
                                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${notification.type === 'urgent' ? 'bg-red-500' : notification.type === 'announcement' ? 'bg-blue-500' : 'bg-gray-400'}`}
                                    >
                                      <svg
                                        className="h-5 w-5 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                      </svg>
                                    </span>
                                  </div>
                                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-900">
                                          {notification.from_user || 'System'}
                                        </span>{' '}
                                        {notification.type && (
                                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                            {notification.type}
                                          </span>
                                        )}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-700">
                                        {notification.message}
                                      </p>
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                      <time dateTime={notification.created_at}>
                                        {new Date(
                                          notification.created_at,
                                        ).toLocaleDateString()}
                                      </time>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))
                      ) : (
                        <li className="text-gray-500 text-sm py-4">
                          No notifications for this team
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Please select a team to view notifications
                  </p>
                )}
              </div>
            ) : teamSubTab === 'create-team' ? (
              <form onSubmit={onCreateTeam} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Photo
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        <svg
                          className="h-12 w-12 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="team-photo"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 hover:text-blue-500"
                      >
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Upload a photo</span>
                        </div>
                        <input
                          id="team-photo"
                          name="team-photo"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="team-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="specialization"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Specialization (Optional)
                  </label>
                  <input
                    type="text"
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g., Development, Design, Marketing"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your team..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Team
                </button>
              </form>
            ) : teamSubTab === 'join-team' ? (
              <div className="space-y-6">
                {/* Search Teams Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Search Teams
                  </h3>
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      placeholder="Search by team name or specialization"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleTeamSearch(setMessage)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Search
                    </button>
                  </div>

                  {teamSearchResults.length > 0 && (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr key="search-header">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Specialization
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Members
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team ID
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teamSearchResults.map((team) => (
                            <tr key={team.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {team.team_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {team.specialization || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {team.member_count || 0} members
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {team.id}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setTeamId(team.id);
                                    setTimeout(() => {
                                      const form = document.getElementById(
                                        'join-team-form',
                                      ) as HTMLFormElement;
                                      if (form) form.requestSubmit();
                                    }, 0);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Join
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Join Team Form */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Join Team by ID
                  </h3>
                  <form
                    id="join-team-form"
                    onSubmit={onJoinTeam}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="team-id"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Team ID
                      </label>
                      <input
                        type="text"
                        id="team-id"
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        placeholder="Enter team ID to join"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Ask your team admin for the team ID
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Join Team
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Team</h3>
            </div>
            <form onSubmit={onUpdateTeam} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="edit-team-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Team Name
                </label>
                <input
                  type="text"
                  id="edit-team-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="edit-specialization"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Specialization
                </label>
                <input
                  type="text"
                  id="edit-specialization"
                  value={editSpec}
                  onChange={(e) => setEditSpec(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
