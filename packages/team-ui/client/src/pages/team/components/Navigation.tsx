import { TabType, WorkspaceType } from '../types/team.types';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  username: string;
  handleLogout: () => void;
  selectedTeam: { id: string; name: string } | null;
}

export function Navigation({
  activeTab,
  setActiveTab,
  username,
  handleLogout,
  selectedTeam,
}: NavigationProps) {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'task-assistant', label: 'Task Assistant' },
    { id: 'projects', label: 'Projects' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'team', label: 'Team' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {selectedTeam ? `${selectedTeam.team_name}` : 'Team Workspace'}
            </h1>
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {username && (
              <span className="text-gray-700 text-xs">{username}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
