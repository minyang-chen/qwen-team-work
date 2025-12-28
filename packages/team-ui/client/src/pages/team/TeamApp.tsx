import { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { TeamLogin } from './TeamLogin';
import { TeamSignup } from './TeamSignup';
import { TeamSelect } from './TeamSelect';
import { TeamDashboard } from './TeamDashboard';

export function TeamApp() {
  const [view, setView] = useState<'login' | 'signup' | 'select' | 'workspace'>(
    'login',
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateAndSetView = async () => {
      const token = localStorage.getItem('team_session_token');
      const selectedTeam = localStorage.getItem('selectedTeam');
      const activeProject = localStorage.getItem('activeProject');
      const path = window.location.pathname;

      if (token) {
        // Validate token by making a test API call
        try {
          const response = await fetch(`${API_BASE}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            // Token is invalid, clear it
            localStorage.removeItem('team_session_token');
            setIsAuthenticated(false);
            setView('login');
            if (path !== '/team/login') {
              window.history.replaceState({}, '', '/team/login');
            }
            return;
          }
        } catch {
          // Network error or invalid token
          localStorage.removeItem('team_session_token');
          setIsAuthenticated(false);
          setView('login');
          if (path !== '/team/login') {
            window.history.replaceState({}, '', '/team/login');
          }
          return;
        }

        setIsAuthenticated(true);

        // Handle /team/workspace route - requires team and project
        if (path === '/team/workspace') {
          if (selectedTeam && activeProject) {
            setView('workspace');
          } else {
            // No team or project selected, redirect to project selection
            setView('select');
            window.history.replaceState({}, '', '/team/project');
          }
        }
        // Handle /team/project route - team/project selection
        else if (path === '/team/project') {
          setView('select');
        }
        // Handle /team/login when authenticated - redirect to project selection
        else if (path === '/team/login') {
          setView('select');
          window.history.replaceState({}, '', '/team/project');
        }
        // Handle signup route
        else if (path === '/team/signup') {
          setView('signup');
        }
        // Default to project selection
        else {
          setView('select');
          window.history.replaceState({}, '', '/team/project');
        }
      } else {
        // Not authenticated
        if (path === '/team/signup') {
          setView('signup');
        } else {
          // Redirect to login for any other route
          setView('login');
          if (path !== '/team/login') {
            window.history.replaceState({}, '', '/team/login');
          }
        }
      }
    };

    validateAndSetView();

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const currentToken = localStorage.getItem('team_session_token');
      const currentTeam = localStorage.getItem('selectedTeam');
      const currentProject = localStorage.getItem('activeProject');

      if (!currentToken) {
        setView('login');
        setIsAuthenticated(false);
      } else if (currentPath === '/team/workspace') {
        if (currentTeam && currentProject) {
          setView('workspace');
        } else {
          setView('select');
          window.history.replaceState({}, '', '/team/project');
        }
      } else if (currentPath === '/team/project') {
        setView('select');
      } else if (currentPath === '/team/login') {
        if (currentToken) {
          setView('select');
          window.history.replaceState({}, '', '/team/project');
        } else {
          setView('login');
        }
      } else if (currentPath === '/team/signup') {
        setView('signup');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setView('select');
    window.history.pushState({}, '', '/team/project');
  };

  const handleSignupSuccess = () => {
    setView('login');
    window.history.pushState({}, '', '/team/login');
  };

  const handleTeamSelected = () => {
    setView('workspace');
    window.history.pushState({}, '', '/team/workspace');
  };

  const handleSwitchToSignup = () => {
    setView('signup');
    window.history.pushState({}, '', '/team/signup');
  };

  const handleSwitchToLogin = () => {
    setView('login');
    window.history.pushState({}, '', '/team/login');
  };

  const handleLogout = () => {
    localStorage.removeItem('team_session_token');
    localStorage.removeItem('selectedTeam');
    localStorage.removeItem('activeProject');
    setIsAuthenticated(false);
    setView('login');
    window.history.pushState({}, '', '/team/login');
  };

  if (view === 'workspace' && isAuthenticated) {
    return <TeamDashboard onLogout={handleLogout} />;
  }

  if (view === 'select' && isAuthenticated) {
    return (
      <TeamSelect onTeamSelected={handleTeamSelected} onLogout={handleLogout} />
    );
  }

  if (view === 'signup') {
    return (
      <TeamSignup
        onSuccess={handleSignupSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  return (
    <TeamLogin
      onSuccess={handleLoginSuccess}
      onSwitchToSignup={handleSwitchToSignup}
    />
  );
}
