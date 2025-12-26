import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TeamSelector({ myTeams, selectedTeam, onSelectTeam }) {
    if (myTeams.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Select Team" }), _jsxs("select", { value: selectedTeam?.id || '', onChange: (e) => {
                    const team = myTeams.find(t => t.id === e.target.value);
                    if (team)
                        onSelectTeam(team);
                }, className: "w-full px-3 py-2 border rounded-lg", children: [_jsx("option", { value: "", children: "-- Select a team --" }), myTeams.map(team => (_jsx("option", { value: team.id, children: team.name }, team.id)))] })] }));
}
