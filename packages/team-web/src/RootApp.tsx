import { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { TeamApp } from './pages/team/TeamApp';
import { App } from './App';

export function RootApp() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Root landing page
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage />;
  }

  // Team workspace routes
  if (currentPath.startsWith('/team')) {
    return <TeamApp />;
  }

  // Individual workspace routes
  if (currentPath.startsWith('/individual')) {
    return <App />;
  }

  // Default to landing page
  return <LandingPage />;
}
