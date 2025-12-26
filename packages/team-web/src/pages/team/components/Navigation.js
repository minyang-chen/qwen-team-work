import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Navigation({ activeTab, setActiveTab, username, handleLogout, selectedTeam, }) {
    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'task-assistant', label: 'Task Assistant' },
        { id: 'projects', label: 'Projects' },
        { id: 'knowledge', label: 'Knowledge' },
        { id: 'team', label: 'Team' },
        { id: 'profile', label: 'Profile' },
    ];
    return (_jsx("nav", { className: "bg-white shadow-sm border-b sticky top-0 z-10", children: _jsx("div", { className: "max-w-7xl mx-auto px-4", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent", children: selectedTeam ? `${selectedTeam.team_name || selectedTeam.name}` : 'Team Workspace' }), _jsx("div", { className: "flex gap-2", children: tabs.map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), className: `px-4 py-2 font-medium rounded transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'}`, children: tab.label }, tab.id))) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [username && (_jsx("span", { className: "text-gray-700 text-xs", children: username })), _jsx("button", { onClick: handleLogout, className: "px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300", children: "Logout" })] })] }) }) }));
}
