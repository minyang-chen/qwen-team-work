import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { teamApi } from '../../services/team/api';
export function TeamSelect({ onTeamSelected, onLogout }) {
    const [myTeams, setMyTeams] = useState([]);
    const [availableTeams, setAvailableTeams] = useState([]);
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
        }
        catch {
            setError('Failed to load teams');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectTeam = async (teamId) => {
        try {
            await teamApi.selectTeam(teamId);
            onTeamSelected();
        }
        catch {
            setError('Failed to select team');
        }
    };
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const result = await teamApi.createTeam(newTeamName);
            if (result.team_id) {
                await handleSelectTeam(result.team_id);
            }
        }
        catch {
            setError('Failed to create team');
        }
    };
    const handleJoinTeam = async (e) => {
        e.preventDefault();
        try {
            await teamApi.joinTeam(selectedJoinTeam);
            await handleSelectTeam(selectedJoinTeam);
        }
        catch {
            setError('Failed to join team');
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-lg", children: "Loading teams..." }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-4", children: _jsxs("div", { className: "max-w-2xl w-full bg-white p-8 rounded-lg shadow", children: [_jsx("h2", { className: "text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6", children: "Select Team" }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-100 text-red-700 rounded", children: error })), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-xl font-semibold mb-3", children: "My Teams" }), myTeams.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "You haven't joined any teams yet." })) : (_jsx("div", { className: "space-y-2", children: myTeams.map((team) => (_jsxs("div", { onClick: () => handleSelectTeam(team.id), className: "p-4 border rounded hover:bg-blue-50 cursor-pointer transition", children: [_jsx("div", { className: "font-medium", children: team.name }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Role: ", team.role] })] }, team.id))) }))] }), _jsxs("div", { className: "flex gap-4 mb-6", children: [_jsx("button", { onClick: () => setShowCreate(!showCreate), className: "flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700", children: "Create Team" }), _jsx("button", { onClick: () => setShowJoin(!showJoin), className: "flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700", children: "Join Team" })] }), showCreate && (_jsxs("form", { onSubmit: handleCreateTeam, className: "mb-6 p-4 bg-gray-50 rounded", children: [_jsx("h4", { className: "font-semibold mb-3", children: "Create New Team" }), _jsx("input", { type: "text", value: newTeamName, onChange: (e) => setNewTeamName(e.target.value), placeholder: "Team name", className: "w-full px-3 py-2 border rounded mb-3", required: true }), _jsx("button", { type: "submit", className: "w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700", children: "Create & Select" })] })), showJoin && (_jsxs("div", { className: "p-4 bg-gray-50 rounded", children: [_jsx("h4", { className: "font-semibold mb-3", children: "Available Teams" }), availableTeams.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "No available teams to join." })) : (_jsxs("form", { onSubmit: handleJoinTeam, className: "space-y-2", children: [availableTeams.map((team) => (_jsxs("label", { className: "flex items-center p-3 border rounded hover:bg-white cursor-pointer", children: [_jsx("input", { type: "radio", name: "team", value: team.id, onChange: (e) => setSelectedJoinTeam(e.target.value), className: "mr-3" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: team.name }), _jsxs("div", { className: "text-sm text-gray-600", children: [team.memberCount, " members"] })] })] }, team.id))), _jsx("button", { type: "submit", disabled: !selectedJoinTeam, className: "w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50", children: "Join & Select" })] }))] }))] }) }));
}
