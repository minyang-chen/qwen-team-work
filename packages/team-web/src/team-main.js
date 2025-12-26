import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TeamApp } from './pages/team/TeamApp';
import './index.css';
ReactDOM.createRoot(document.getElementById('team-root')).render(_jsx(React.StrictMode, { children: _jsx(TeamApp, {}) }));
