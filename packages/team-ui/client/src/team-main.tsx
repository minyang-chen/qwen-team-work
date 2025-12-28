import React from 'react';
import ReactDOM from 'react-dom/client';
import { TeamApp } from './pages/team/TeamApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('team-root')!).render(
  <React.StrictMode>
    <TeamApp />
  </React.StrictMode>
);
